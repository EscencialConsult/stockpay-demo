const { PrismaClient, TipoMovimiento, UnidadMedida, EstadoSnapshot, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()
const TOLERANCIA_MERMA_KG = 10

async function createSnapshot(sucursalId, creadoPor) {
  const movimientos = await prisma.movimientoStock.groupBy({
    by: ['productoId', 'unidadMedida'],
    where: { sucursalId },
    _sum: { cantidad: true },
  })

  const snapshot = await prisma.$transaction(async tx => {
    const snap = await tx.inventarioSnapshot.create({ data: { sucursalId, creadoPor } })

    const items = movimientos
      .filter(m => m._sum.cantidad !== null)
      .map(m => ({
        snapshotId:   snap.id,
        productoId:   m.productoId,
        unidadMedida: m.unidadMedida,
        stockTeorico: m._sum.cantidad,
      }))

    await tx.itemSnapshot.createMany({ data: items })
    return snap
  })

  return { snapshotId: snapshot.id, fecha: snapshot.fecha, totalProductos: movimientos.length }
}

async function conciliate(snapshotId, conteos) {
  const snapshot = await prisma.inventarioSnapshot.findUniqueOrThrow({
    where:   { id: snapshotId },
    include: { items: { include: { producto: { select: { descripcion: true } } } } },
  })

  if (snapshot.estado === EstadoSnapshot.conciliado) {
    throw new Error('Este snapshot ya fue conciliado.')
  }

  const detalles        = []
  const movimientosNuevos = []
  const itemUpdates     = []

  for (const conteo of conteos) {
    const item = snapshot.items.find(i => i.productoId === conteo.productoId)
    if (!item) continue

    const esUnidad   = item.unidadMedida === UnidadMedida.UN
    const tolerancia = esUnidad ? 0 : TOLERANCIA_MERMA_KG
    const teorico    = Number(item.stockTeorico)
    const fisico     = conteo.cantidadFisica
    const diferencia = parseFloat((teorico - fisico).toFixed(3))

    if (diferencia === 0) {
      detalles.push({ productoId: item.productoId, descripcion: item.producto.descripcion,
        unidadMedida: item.unidadMedida, stockTeorico: teorico, stockFisico: fisico,
        diferencia: 0, esFaltante: false, tipoMovimiento: TipoMovimiento.ajuste_inventario })
      continue
    }

    const esSobrante     = diferencia < 0
    const esFaltante     = diferencia > tolerancia
    const tipoMovimiento = (!esSobrante && Math.abs(diferencia) <= tolerancia)
      ? TipoMovimiento.merma_esperada
      : TipoMovimiento.ajuste_inventario

    movimientosNuevos.push({
      sucursalId:   snapshot.sucursalId,
      productoId:   item.productoId,
      tipo:         tipoMovimiento,
      cantidad:     new Prisma.Decimal(-diferencia),
      unidadMedida: item.unidadMedida,
      snapshotId,
      notas: esFaltante ? 'Faltante detectado en ajuste de inventario' : undefined,
    })

    itemUpdates.push({ id: item.id, stockFisico: fisico, diferencia, esFaltante: esFaltante || esSobrante })
    detalles.push({ productoId: item.productoId, descripcion: item.producto.descripcion,
      unidadMedida: item.unidadMedida, stockTeorico: teorico, stockFisico: fisico,
      diferencia, esFaltante: esFaltante || esSobrante, tipoMovimiento })
  }

  await prisma.$transaction(async tx => {
    await Promise.all(itemUpdates.map(u =>
      tx.itemSnapshot.update({ where: { id: u.id },
        data: { stockFisico: u.stockFisico, diferencia: u.diferencia, esFaltante: u.esFaltante } })
    ))
    if (movimientosNuevos.length > 0) await tx.movimientoStock.createMany({ data: movimientosNuevos })
    await tx.inventarioSnapshot.update({ where: { id: snapshotId }, data: { estado: EstadoSnapshot.conciliado } })
  })

  return {
    snapshotId,
    totalProductos:   detalles.length,
    dentroTolerancia: detalles.filter(d => d.tipoMovimiento === TipoMovimiento.merma_esperada).length,
    faltantes:        detalles.filter(d => d.esFaltante && d.diferencia > 0).length,
    sobrantes:        detalles.filter(d => d.diferencia < 0).length,
    detalles,
  }
}

module.exports = { createSnapshot, conciliate }
