const { PrismaClient, TipoMovimiento, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Registra una venta al público.
 *
 * Stock negativo permitido por diseño: el sistema no bloquea la venta si el
 * stock calculado queda en negativo. El desfasaje entre retiro físico y carga
 * administrativa es inherente al negocio. El cron job de alertas detectará
 * stocks negativos que persistan más de 5 días.
 *
 * Cuenta corriente: si uno de los pagos es 'cuenta_corriente', la transacción
 * aplica un DÉBITO en MovimientoCuentaCorriente usando SELECT FOR UPDATE sobre
 * el registro del cliente para serializar escrituras concurrentes.
 */
async function registrarVenta(input) {
  const productoIds = input.items.map(i => i.productoId)
  const productos   = await prisma.producto.findMany({ where: { id: { in: productoIds }, activo: true } })
  if (productos.length !== productoIds.length) throw new Error('Producto inactivo o inexistente en el carrito.')

  const prodMap = Object.fromEntries(productos.map(p => [p.id, p]))

  for (const item of input.items) {
    const prod = prodMap[item.productoId]
    if (prod.unidadMedida === 'UN' && !Number.isInteger(item.cantidad)) {
      throw new Error(`${prod.descripcion} se vende por unidad — la cantidad debe ser entera.`)
    }
  }

  const itemsCalculados = input.items.map(i => {
    const prod = prodMap[i.productoId]
    return {
      productoId:     i.productoId,
      cantidad:       i.cantidad,
      unidadMedida:   prod.unidadMedida,
      precioUnitario: Number(prod.precio),
      subtotal:       parseFloat((i.cantidad * Number(prod.precio)).toFixed(2)),
    }
  })

  const totalImporte = itemsCalculados.reduce((acc, i) => acc + i.subtotal, 0)
  const totalPagado  = input.pagos.reduce((acc, p) => acc + p.monto, 0)

  if (totalPagado < totalImporte - 0.01) {
    throw new Error(`Pago insuficiente. Total: $${totalImporte.toFixed(2)}, pagado: $${totalPagado.toFixed(2)}.`)
  }

  const pagoCuentaCorriente = input.pagos.find(p => p.medioPago === 'cuenta_corriente')

  const resultado = await prisma.$transaction(async tx => {
    // 1. Crear venta con ítems y pagos
    const v = await tx.venta.create({
      data: {
        sucursalId:   input.sucursalId,
        cajeroId:     input.cajeroId,
        clienteId:    input.clienteId ?? null,
        totalImporte: parseFloat(totalImporte.toFixed(2)),
        items: { create: itemsCalculados.map(i => ({
          productoId:     i.productoId,
          cantidad:       i.cantidad,
          unidadMedida:   i.unidadMedida,
          precioUnitario: i.precioUnitario,
          subtotal:       i.subtotal,
        }))},
        pagos: { create: input.pagos.map(p => ({ medioPago: p.medioPago, monto: p.monto })) },
      },
      include: { items: true, pagos: true },
    })

    // 2. Descontar stock — se permite quedar negativo (ver docstring)
    await tx.movimientoStock.createMany({
      data: itemsCalculados.map(i => ({
        sucursalId:   input.sucursalId,
        productoId:   i.productoId,
        tipo:         TipoMovimiento.venta,
        cantidad:     new Prisma.Decimal(-i.cantidad),
        unidadMedida: i.unidadMedida,
        ventaId:      v.id,
      })),
    })

    // 3. Movimiento de cuenta corriente si aplica
    let ccInfo = null
    if (pagoCuentaCorriente && input.clienteId) {
      // SELECT FOR UPDATE serializa escrituras concurrentes sobre el mismo cliente.
      // Si dos sucursales intentan debitar al mismo cliente en el mismo instante,
      // Postgres bloquea la segunda hasta que la primera haga COMMIT. Solo así el
      // saldoResultante de la segunda refleja el saldo real post-primera.
      const rows = await tx.$queryRaw`
        SELECT "saldoCuentaCorriente", nombre
        FROM "Cliente"
        WHERE id = ${input.clienteId} AND activo = true
        FOR UPDATE
      `
      if (!rows.length) throw new Error('Cliente no encontrado o inactivo.')

      const saldoAnterior = Number(rows[0].saldoCuentaCorriente)
      const debito        = pagoCuentaCorriente.monto
      const saldoResultante = parseFloat((saldoAnterior + debito).toFixed(2))

      await tx.movimientoCuentaCorriente.create({
        data: {
          clienteId:      input.clienteId,
          sucursalId:     input.sucursalId,
          ventaId:        v.id,
          tipo:           'DEBITO',
          monto:          debito,
          saldoResultante,
        },
      })

      await tx.cliente.update({
        where: { id: input.clienteId },
        data:  { saldoCuentaCorriente: saldoResultante },
      })

      ccInfo = {
        saldoAnterior,
        debito,
        saldoResultante,
        clienteNombre:    rows[0].nombre,
        clienteDocumento: null, // se agrega abajo fuera de la tx si se necesita para el ticket
      }
    }

    return { v, ccInfo }
  })

  // Recuperar documento del cliente para el ticket (fuera de la tx para no extenderla)
  if (resultado.ccInfo && input.clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: input.clienteId }, select: { documento: true } })
    resultado.ccInfo.clienteDocumento = cliente?.documento ?? null
  }

  return {
    ventaId:        resultado.v.id,
    totalImporte,
    totalPagado,
    vuelto:         parseFloat((totalPagado - totalImporte).toFixed(2)),
    items:          itemsCalculados,
    cuentaCorriente: resultado.ccInfo,
  }
}

async function registrarGasto(input) {
  return prisma.gastoCaja.create({ data: input })
}

async function cerrarCaja(input) {
  const { sucursalId, cajeroId, fechaDia, declarado } = input

  const inicio = new Date(fechaDia)
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(fechaDia)
  fin.setHours(23, 59, 59, 999)

  const pagos = await prisma.ventaPago.findMany({
    where: { venta: { sucursalId, fecha: { gte: inicio, lte: fin } } },
  })

  const sistemaMap = {}
  for (const p of pagos) {
    sistemaMap[p.medioPago] = (sistemaMap[p.medioPago] ?? 0) + Number(p.monto)
  }

  const gastos = await prisma.gastoCaja.findMany({
    where: { sucursalId, fecha: { gte: inicio, lte: fin } },
  })
  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0)
  if (sistemaMap['efectivo']) sistemaMap['efectivo'] -= totalGastos

  const totalVentas  = Object.values(sistemaMap).reduce((a, b) => a + b, 0)
  const declaradoMap = Object.fromEntries(declarado.map(d => [d.medioPago, d.monto]))

  const detalles = Object.keys({ ...sistemaMap, ...declaradoMap }).map(mp => ({
    medioPago:      mp,
    montoSistema:   parseFloat((sistemaMap[mp] ?? 0).toFixed(2)),
    montoDeclarado: parseFloat((declaradoMap[mp] ?? 0).toFixed(2)),
    diferencia:     parseFloat(((declaradoMap[mp] ?? 0) - (sistemaMap[mp] ?? 0)).toFixed(2)),
  }))

  return prisma.cierreCajaHistorial.create({
    data: {
      sucursalId,
      fechaDia: inicio,
      cajeroId,
      totalVentas: parseFloat(totalVentas.toFixed(2)),
      totalGastos: parseFloat(totalGastos.toFixed(2)),
      detalles: { create: detalles },
    },
    include: { detalles: true },
  })
}

module.exports = { registrarVenta, registrarGasto, cerrarCaja }
