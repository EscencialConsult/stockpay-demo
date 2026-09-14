const { Router } = require('express')
const { authenticate, requireRoles } = require('../middleware/auth')
const { ventaSchema, gastoSchema, cierreSchema } = require('../schemas/posSchemas')
const { registrarVenta, registrarGasto, cerrarCaja } = require('../services/posService')

const router = Router()
router.use(authenticate)

// POST /api/pos/sales — Cajero registra venta
router.post('/sales', requireRoles('cajero', 'administrador', 'subadministrador'), async (req, res) => {
  const parsed = ventaSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = await registrarVenta({ ...parsed.data, cajeroId: req.user.userId })
  res.status(201).json(result)
})

// POST /api/pos/gastos — Cajero registra gasto/salida de caja
router.post('/gastos', requireRoles('cajero', 'administrador', 'subadministrador'), async (req, res) => {
  const parsed = gastoSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = await registrarGasto({ ...parsed.data, registradoPor: req.user.userId })
  res.status(201).json(result)
})

// POST /api/pos/cash-close — Cierre de caja (solo admin/subadmin)
router.post('/cash-close', requireRoles('administrador', 'subadministrador'), async (req, res) => {
  const parsed = cierreSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = await cerrarCaja({ ...parsed.data, cajeroId: req.user.userId })
  res.status(201).json(result)
})

module.exports = router
