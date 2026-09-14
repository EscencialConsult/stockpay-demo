/**
 * Cron job — alertas de stock negativo persistente.
 *
 * Corre a las 03:00 AM. Algoritmo optimizado con base en el último
 * InventarioSnapshot conciliado de cada sucursal:
 *
 *   stock_actual(producto) = stockTeorico(snapshot) + SUM(movimientos > snapshot.fecha)
 *
 * Esto reduce la ventana de cálculo de "toda la historia" a "los últimos
 * N días desde el último ajuste". El full scan solo aplica a sucursales
 * nuevas sin ningún snapshot, que por definición tienen pocos registros.
 *
 * Instalación: npm install node-cron
 */

const cron   = require('node-cron')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function detectarStocksNegativos() {
  console.log('[alertas] Iniciando escaneo de stocks negativos (modo snapshot)...')

  const sucursales = await prisma.sucursal.findMany({
    where:  { activa: true },
    select: { id: true },
  })

  const cincoDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  let creadas = 0

  for (const sucursal of sucursales) {

    // 1. Último snapshot conciliado — base de cálculo estable
    const ultimoSnapshot = await prisma.inventarioSnapshot.findFirst({
      where:   { sucursalId: sucursal.id, estado: 'conciliado' },
      orderBy: { fecha: 'desc' },
      include: { items: { select: { productoId: true, stockTeorico: true, unidadMedida: true } } },
    })

    let stocksNegativos = []

    if (ultimoSnapshot) {
      // 2a. Solo movimientos POSTERIORES al snapshot (ventana estrecha)
      const movPost = await prisma.movimientoStock.groupBy({
        by:    ['productoId'],
        where: { sucursalId: sucursal.id, fecha: { gt: ultimoSnapshot.fecha } },
        _sum:  { cantidad: true },
      })

      const deltaMap = Object.fromEntries(
        movPost.map(m => [m.productoId, Number(m._sum.cantidad ?? 0)])
      )
      const snapshotProductIds = new Set(ultimoSnapshot.items.map(i => i.productoId))

      // Productos que estaban en el snapshot
      const deSnapshot = ultimoSnapshot.items
        .map(i => ({
          productoId: i.productoId,
          stock: Number(i.stockTeorico) + (deltaMap[i.productoId] ?? 0),
        }))
        .filter(s => s.stock < 0)

      // Productos nuevos que aparecieron DESPUÉS del snapshot (no están en ItemSnapshot)
      const nuevosNegativos = movPost
        .filter(m => !snapshotProductIds.has(m.productoId) && Number(m._sum.cantidad ?? 0) < 0)
        .map(m => ({ productoId: m.productoId, stock: Number(m._sum.cantidad ?? 0) }))

      stocksNegativos = [...deSnapshot, ...nuevosNegativos]

    } else {
      // 2b. Sin snapshot: sucursal nueva, full scan sobre pocos registros
      const todos = await prisma.movimientoStock.groupBy({
        by:   ['productoId'],
        where: { sucursalId: sucursal.id },
        _sum:  { cantidad: true },
      })
      stocksNegativos = todos
        .filter(m => Number(m._sum.cantidad ?? 0) < 0)
        .map(m => ({ productoId: m.productoId, stock: Number(m._sum.cantidad ?? 0) }))
    }

    if (!stocksNegativos.length) continue

    // 3. Para cada negativo: ¿hubo ingreso correctivo en los últimos 5 días?
    for (const { productoId, stock } of stocksNegativos) {
      const ingresoReciente = await prisma.movimientoStock.findFirst({
        where: {
          sucursalId: sucursal.id,
          productoId,
          cantidad:   { gt: 0 },
          fecha:      { gte: cincoDiasAtras },
        },
      })
      if (ingresoReciente) continue

      const alertaExistente = await prisma.alertaSistema.findFirst({
        where: { sucursalId: sucursal.id, productoId, tipo: 'stock_negativo_5_dias', resuelta: false },
      })
      if (alertaExistente) continue

      await prisma.alertaSistema.create({
        data: {
          sucursalId: sucursal.id,
          productoId,
          tipo:    'stock_negativo_5_dias',
          detalle: `Stock teórico: ${stock.toFixed(3)} — sin ingreso correctivo en los últimos 5 días.`,
        },
      })
      creadas++
    }
  }

  console.log(`[alertas] Escaneo completo. Alertas nuevas: ${creadas}`)
}

cron.schedule('0 3 * * *', () => {
  detectarStocksNegativos().catch(err => console.error('[alertas] Error:', err))
})

module.exports = { detectarStocksNegativos }
