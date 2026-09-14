/**
 * Sprint 7 — Reportes y Control de Gestión
 *
 *   GET /api/reports/rentabilidad   — ingresos reales por sucursal
 *   GET /api/reports/inventory-diff — diferencias de inventario por snapshot
 *   GET /api/reports/ranking        — top productos por volumen/facturación
 *
 * Modelo de ingresos de la sucursal ORIGEN en ventas internas:
 *   "La sucursal compradora se configura como cliente con un 10% de descuento.
 *    Ese margen constituye la ganancia de la sucursal que deshuesa y envía."
 *
 * Por eso rentabilidad suma:
 *   totalFacturado = VentaPublico.totalImporte + VentaInterna.totalImporte (como origen)
 *
 * Lo que NO suma: los ingresos del destino. El destino gana cuando vende al público final.
 */

const { Router }       = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireRoles, soloLectura } = require('../middleware/auth')

const router = Router()
const prisma = new PrismaClient()

router.use(authenticate)
router.use(soloLectura)
router.use(requireRoles('administrador', 'subadministrador', 'socio'))

function parseFecha(str, fallback) {
  const d = new Date(str)
  return isNaN(d.getTime()) ? fallback : d
}

function entradaMapa(sucursalId, nombre) {
  return {
    sucursalId,
    sucursalNombre:      nombre,
    totalVentasPublico:  0,
    totalVentasInternas: 0,
    totalFacturado:      0,
    cantidadTickets:     0,
    ticketPromedio:      0,
    porMedioPago:        {},
    porFamilia:          {},
  }
}

// ── GET /api/reports/rentabilidad ─────────────────────────────────────────────
router.get('/rentabilidad', async (req, res) => {
  const desde = parseFecha(req.query.desde, new Date(Date.now() - 30 * 86400000))
  const hasta = parseFecha(req.query.hasta, new Date())
  hasta.setHours(23, 59, 59, 999)
  const filtroPorSucursal = req.query.sucursalId ? { sucursalId: req.query.sucursalId } : {}

  // 1. Ventas al público (tabla Venta)
  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: desde, lte: hasta }, ...filtroPorSucursal },
    select: {
      sucursalId:   true,
      totalImporte: true,
      sucursal:     { select: { nombre: true } },
      pagos:        { select: { medioPago: true, monto: true } },
      items:        { select: { subtotal: true, producto: { select: { familia: true } } } },
    },
  })

  const mapa = {}

  for (const v of ventas) {
    if (!mapa[v.sucursalId]) mapa[v.sucursalId] = entradaMapa(v.sucursalId, v.sucursal.nombre)
    const s = mapa[v.sucursalId]
    const importe = Number(v.totalImporte)
    s.totalVentasPublico += importe
    s.totalFacturado     += importe
    s.cantidadTickets    += 1

    for (const p of v.pagos) {
      s.porMedioPago[p.medioPago] = (s.porMedioPago[p.medioPago] ?? 0) + Number(p.monto)
    }
    for (const item of v.items) {
      const fam = item.producto.familia ?? 'Sin familia'
      s.porFamilia[fam] = (s.porFamilia[fam] ?? 0) + Number(item.subtotal)
    }
  }

  // 2. Ventas internas CONFIRMADAS donde la sucursal es ORIGEN (es quien generó el ingreso)
  //    NO se suma el destino: el destino gana cuando vende esa mercadería al público final.
  const filtroOrigenVI = req.query.sucursalId
    ? { sucursalOrigenId: req.query.sucursalId }
    : {}

  const ventasInternas = await prisma.ventaInterna.findMany({
    where: {
      estado:       'CONFIRMADA',
      fechaEmision: { gte: desde, lte: hasta },
      ...filtroOrigenVI,
    },
    select: {
      sucursalOrigenId: true,
      totalImporte:     true,
      sucursalOrigen:   { select: { nombre: true } },
    },
  })

  for (const vi of ventasInternas) {
    const key = vi.sucursalOrigenId
    if (!mapa[key]) mapa[key] = entradaMapa(key, vi.sucursalOrigen.nombre)
    const s = mapa[key]
    const importe = Number(vi.totalImporte)
    s.totalVentasInternas += importe
    s.totalFacturado      += importe
    // Las ventas internas no tienen medio de pago (son crédito entre sucursales)
    // pero sí se puede desglosar por familia si se quisiera en el futuro
  }

  const resultado = Object.values(mapa).map(s => ({
    ...s,
    totalVentasPublico:  parseFloat(s.totalVentasPublico.toFixed(2)),
    totalVentasInternas: parseFloat(s.totalVentasInternas.toFixed(2)),
    totalFacturado:      parseFloat(s.totalFacturado.toFixed(2)),
    ticketPromedio: s.cantidadTickets > 0
      ? parseFloat((s.totalVentasPublico / s.cantidadTickets).toFixed(2))
      : 0,
    porMedioPago: Object.fromEntries(
      Object.entries(s.porMedioPago).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
    ),
    porFamilia: Object.fromEntries(
      Object.entries(s.porFamilia)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, parseFloat(v.toFixed(2))])
    ),
  }))

  res.json({ desde, hasta, sucursales: resultado })
})

// ── GET /api/reports/inventory-diff ───────────────────────────────────────────
router.get('/inventory-diff', async (req, res) => {
  const { sucursalId, snapshotId } = req.query
  if (!sucursalId) return res.status(400).json({ error: 'sucursalId es requerido.' })

  const snapshot = snapshotId
    ? await prisma.inventarioSnapshot.findUnique({
        where:   { id: snapshotId },
        include: {
          sucursal: { select: { nombre: true } },
          items: { include: { producto: { select: { descripcion: true, familia: true } } } },
        },
      })
    : await prisma.inventarioSnapshot.findFirst({
        where:   { sucursalId, estado: 'conciliado' },
        orderBy: { fecha: 'desc' },
        include: {
          sucursal: { select: { nombre: true } },
          items: { include: { producto: { select: { descripcion: true, familia: true } } } },
        },
      })

  if (!snapshot) return res.status(404).json({ error: 'No hay snapshot conciliado para esta sucursal.' })

  const items = snapshot.items.map(i => ({
    productoId:   i.productoId,
    descripcion:  i.producto.descripcion,
    familia:      i.producto.familia ?? 'Sin familia',
    unidadMedida: i.unidadMedida,
    stockTeorico: Number(i.stockTeorico),
    stockFisico:  i.stockFisico !== null ? Number(i.stockFisico) : null,
    diferencia:   i.diferencia  !== null ? Number(i.diferencia)  : null,
    esFaltante:   i.esFaltante ?? false,
  }))

  const faltantes     = items.filter(i => i.esFaltante)
  const totalFaltante = faltantes.reduce((acc, i) => acc + Math.abs(i.diferencia ?? 0), 0)

  res.json({
    snapshotId:  snapshot.id,
    sucursal:    snapshot.sucursal.nombre,
    fecha:       snapshot.fecha,
    estado:      snapshot.estado,
    items,
    resumen: {
      totalProductos:  items.length,
      conFaltante:     faltantes.length,
      totalFaltanteKg: parseFloat(totalFaltante.toFixed(3)),
    },
  })
})

// ── GET /api/reports/ranking ───────────────────────────────────────────────────
router.get('/ranking', async (req, res) => {
  const desde  = parseFecha(req.query.desde, new Date(Date.now() - 30 * 86400000))
  const hasta  = parseFecha(req.query.hasta, new Date())
  hasta.setHours(23, 59, 59, 999)
  const limite = Math.min(100, Math.max(1, parseInt(req.query.limite ?? '20')))

  const rows = req.query.sucursalId
    ? await prisma.$queryRaw`
        SELECT
          p.id                               AS "productoId",
          p.descripcion                      AS "descripcion",
          COALESCE(p.familia, 'Sin familia') AS "familia",
          p."unidadMedida"                   AS "unidadMedida",
          s.id                               AS "sucursalId",
          s.nombre                           AS "sucursalNombre",
          SUM(vi.cantidad)::float            AS "cantidadVendida",
          SUM(vi.subtotal)::float            AS "totalFacturado"
        FROM "VentaItem" vi
        JOIN "Producto"  p ON p.id  = vi."productoId"
        JOIN "Venta"     v ON v.id  = vi."ventaId"
        JOIN "Sucursal"  s ON s.id  = v."sucursalId"
        WHERE v.fecha >= ${desde}
          AND v.fecha <= ${hasta}
          AND v."sucursalId" = ${req.query.sucursalId}
        GROUP BY p.id, p.descripcion, p.familia, p."unidadMedida", s.id, s.nombre
        ORDER BY SUM(vi.subtotal) DESC
        LIMIT ${limite}
      `
    : await prisma.$queryRaw`
        SELECT
          p.id                               AS "productoId",
          p.descripcion                      AS "descripcion",
          COALESCE(p.familia, 'Sin familia') AS "familia",
          p."unidadMedida"                   AS "unidadMedida",
          s.id                               AS "sucursalId",
          s.nombre                           AS "sucursalNombre",
          SUM(vi.cantidad)::float            AS "cantidadVendida",
          SUM(vi.subtotal)::float            AS "totalFacturado"
        FROM "VentaItem" vi
        JOIN "Producto"  p ON p.id  = vi."productoId"
        JOIN "Venta"     v ON v.id  = vi."ventaId"
        JOIN "Sucursal"  s ON s.id  = v."sucursalId"
        WHERE v.fecha >= ${desde}
          AND v.fecha <= ${hasta}
        GROUP BY p.id, p.descripcion, p.familia, p."unidadMedida", s.id, s.nombre
        ORDER BY SUM(vi.subtotal) DESC
        LIMIT ${limite}
      `

  const porFamilia = {}
  for (const r of rows) {
    const fam = r.familia
    if (!porFamilia[fam]) porFamilia[fam] = { familia: fam, totalFacturado: 0, items: [] }
    porFamilia[fam].totalFacturado += r.totalFacturado ?? 0
    porFamilia[fam].items.push({
      productoId:      r.productoId,
      descripcion:     r.descripcion,
      unidadMedida:    r.unidadMedida,
      sucursalId:      r.sucursalId,
      sucursalNombre:  r.sucursalNombre,
      cantidadVendida: parseFloat((r.cantidadVendida ?? 0).toFixed(3)),
      totalFacturado:  parseFloat((r.totalFacturado  ?? 0).toFixed(2)),
    })
  }

  res.json({
    desde,
    hasta,
    rankingFlat: rows.map(r => ({
      ...r,
      cantidadVendida: parseFloat((r.cantidadVendida ?? 0).toFixed(3)),
      totalFacturado:  parseFloat((r.totalFacturado  ?? 0).toFixed(2)),
    })),
    porFamilia: Object.values(porFamilia)
      .map(f => ({ ...f, totalFacturado: parseFloat(f.totalFacturado.toFixed(2)) }))
      .sort((a, b) => b.totalFacturado - a.totalFacturado),
  })
})

module.exports = router
