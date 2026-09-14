const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireRoles } = require('../middleware/auth')

const router  = Router()
const prisma  = new PrismaClient()

router.use(authenticate)

// GET /api/clientes?q=texto — búsqueda rápida para el POS
router.get('/', async (req, res) => {
  const q = (req.query.q ?? '').trim()
  if (q.length < 2) return res.json([])

  const clientes = await prisma.cliente.findMany({
    where: {
      activo: true,
      OR: [
        { nombre:    { contains: q, mode: 'insensitive' } },
        { documento: { contains: q, mode: 'insensitive' } },
        { telefono:  { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id:                   true,
      nombre:               true,
      documento:            true,
      telefono:             true,
      saldoCuentaCorriente: true,
    },
    take: 8,
    orderBy: { nombre: 'asc' },
  })

  res.json(clientes)
})

// POST /api/clientes — alta de cliente (solo admin/subadmin)
router.post('/', requireRoles('administrador', 'subadministrador'), async (req, res) => {
  const { nombre, documento, telefono } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' })

  const cliente = await prisma.cliente.create({
    data: { nombre: nombre.trim(), documento: documento?.trim() ?? null, telefono: telefono?.trim() ?? null },
  })
  res.status(201).json(cliente)
})

// GET /api/clientes/:id/movimientos — historial de cuenta corriente
router.get('/:id/movimientos', requireRoles('administrador', 'subadministrador', 'socio'), async (req, res) => {
  const movimientos = await prisma.movimientoCuentaCorriente.findMany({
    where:   { clienteId: req.params['id'] },
    include: { sucursal: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
    take:    100,
  })
  res.json(movimientos)
})

module.exports = router
