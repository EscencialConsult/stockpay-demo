const { PrismaClient, TipoMovimiento, EstadoVentaInterna, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()

// Descuento parametrizable: 10% por defecto (sucursal destino = cliente interno)
const DESCUENTO_DEFAULT = 10

/**
 * EMISIÓN — Sucursal origen pesa y registra la salida.
 *
 * 1. Calcula el importe con descuento para cada producto.
 * 2. Crea VentaInterna en PENDIENTE + VentaInternaDetalle.
 * 3. Inserta reserva_venta_interna (negativo) en MovimientoStock de origen.
 *    Esto bloquea los kilos para que no se vendan al público mientras viajan.
 */
async function emitirVentaInterna(input, emitidaPor) {
  const porcentajeDescuento = input.porcentajeDescuento ?? DESCUENTO_DEFAULT

  // Resolver precios actuales del catálogo para cada producto
  const productoIds = input.detalles.map(d => d.productoId)
  const productos   = await prisma.producto.findMany({
    where: { id: { in: productoIds }, activo: true },
  })

  if (productos.length !== productoIds.length) {
    throw new Error('Uno o más productos no existen o están inactivos.')
  }

  const precioMap = Object.fromEntries(productos.map(p => [p.id, Number(p.precio)]))

  const detallesCalculados = input.detalles.map(d => {
    const precioOrigen     = precioMap[d.productoId]
    const precioDescuento  = parseFloat((precioOrigen * (1 - porcentajeDescuento / 100)).toFixed(2))
    return { ...d, precioOrigen, precioDescuento }
  })

  const totalImporte = detallesCalculados.reduce(
    (acc, d) => acc + d.kilosEnviados * d.precioDescuento,
    0
  )

  const ventaInterna = await prisma.$transaction(async tx => {
    const venta = await tx.ventaInterna.create({
      data: {
        sucursalOrigenId:   input.sucursalOrigenId,
        sucursalDestinoId:  input.sucursalDestinoId,
        porcentajeDescuento,
        totalImporte:       parseFloat(totalImporte.toFixed(2)),
        emitidaPor,
        detalles: {
          create: detallesCalculados.map(d => ({
            productoId:             d.productoId,
            kilosEnviados:          d.kilosEnviados,
            precioUnitarioOrigen:   d.precioOrigen,
            precioUnitarioDescuento: d.precioDescuento,
          })),
        },
      },
      include: { detalles: true },
    })

    // Reserva temporal: bloquea el stock en origen
    await tx.movimientoStock.createMany({
      data: detallesCalculados.map(d => ({
        sucursalId:    input.sucursalOrigenId,
        productoId:    d.productoId,
        tipo:          TipoMovimiento.reserva_venta_interna,
        cantidad:      new Prisma.Decimal(-d.kilosEnviados), // negativo = reserva
        unidadMedida:  'KG',
        ventaInternaId: venta.id,
        notas:         `Reserva para venta interna hacia ${input.sucursalDestinoId}`,
      })),
    })

    return venta
  })

  return ventaInterna
}

/**
 * CONFIRMACIÓN — Sucursal destino controla kilos y acepta la recepción.
 *
 * Transacción atómica de 5 pasos:
 * 1. Marca VentaInterna como CONFIRMADA y guarda kilosRecibidos.
 * 2. Revierte la reserva_venta_interna en origen.
 * 3. Inserta el egreso real en origen (venta_interna negativo, por kilosEnviados).
 * 4. Inserta el ingreso en destino (ingreso_interno positivo, por kilosRecibidos).
 * 5. [PARCHE CONTABLE] Si kilosEnviados > kilosRecibidos, inserta merma_transito_interno
 *    en origen por la diferencia exacta. El inventario global cuadra; la merma queda
 *    trazada para auditar qué sucursal pierde kilos sistemáticamente en envíos.
 */
async function confirmarVentaInterna(ventaInternaId, conteos, confirmadaPor) {
  const venta = await prisma.ventaInterna.findUniqueOrThrow({
    where:   { id: ventaInternaId },
    include: { detalles: true },
  })

  if (venta.estado !== EstadoVentaInterna.PENDIENTE) {
    throw new Error(`La venta interna ya está en estado ${venta.estado}.`)
  }

  const conteoMap = Object.fromEntries(conteos.map(c => [c.productoId, c.kilosRecibidos]))

  await prisma.$transaction(async tx => {
    // 1. Actualizar estado + kilosRecibidos en cada detalle
    await tx.ventaInterna.update({
      where: { id: ventaInternaId },
      data:  { estado: EstadoVentaInterna.CONFIRMADA, fechaRecepcion: new Date(), confirmadaPor },
    })

    await Promise.all(venta.detalles.map(d =>
      tx.ventaInternaDetalle.update({
        where: { id: d.id },
        data:  { kilosRecibidos: conteoMap[d.productoId] ?? 0 },
      })
    ))

    const movimientos = []

    for (const detalle of venta.detalles) {
      const kilosRecibidos = conteoMap[detalle.productoId] ?? 0

      // 2. Revertir reserva (positivo cancela el negativo de la emisión)
      movimientos.push({
        sucursalId:    venta.sucursalOrigenId,
        productoId:    detalle.productoId,
        tipo:          TipoMovimiento.reserva_venta_interna,
        cantidad:      new Prisma.Decimal(Number(detalle.kilosEnviados)), // cancela la reserva
        unidadMedida:  'KG',
        ventaInternaId,
        notas:         'Reversión de reserva — venta confirmada',
      })

      // 3. Egreso definitivo en origen (kilosEnviados son los que salieron)
      movimientos.push({
        sucursalId:    venta.sucursalOrigenId,
        productoId:    detalle.productoId,
        tipo:          TipoMovimiento.venta_interna,
        cantidad:      new Prisma.Decimal(-Number(detalle.kilosEnviados)),
        unidadMedida:  'KG',
        ventaInternaId,
      })

      // 4. Ingreso en destino (solo los kilos que el destino aceptó)
      if (kilosRecibidos > 0) {
        movimientos.push({
          sucursalId:    venta.sucursalDestinoId,
          productoId:    detalle.productoId,
          tipo:          TipoMovimiento.ingreso_interno,
          cantidad:      new Prisma.Decimal(kilosRecibidos),
          unidadMedida:  'KG',
          ventaInternaId,
        })
      }

      // 5. PARCHE CONTABLE: merma en tránsito
      const kilosEnviados = Number(detalle.kilosEnviados)
      const diferenciaTránsito = parseFloat((kilosEnviados - kilosRecibidos).toFixed(3))
      if (diferenciaTránsito > 0) {
        movimientos.push({
          sucursalId:    venta.sucursalOrigenId,
          productoId:    detalle.productoId,
          tipo:          TipoMovimiento.merma_transito_interno,
          cantidad:      new Prisma.Decimal(-diferenciaTránsito),
          unidadMedida:  'KG',
          ventaInternaId,
          notas:         `Merma en tránsito: enviado ${kilosEnviados} kg, recibido ${kilosRecibidos} kg`,
        })
      }
    }

    await tx.movimientoStock.createMany({ data: movimientos })
  })

  return { ventaInternaId, estado: 'CONFIRMADA', confirmadaPor }
}

module.exports = { emitirVentaInterna, confirmarVentaInterna }
