const { Router } = require('express')
const { authenticate, requireRoles } = require('../middleware/auth')
const { emisionSchema, confirmacionSchema } = require('../schemas/internalSaleSchemas')
const { emitirVentaInterna, confirmarVentaInterna } = require('../services/internalSaleService')

const router = Router()
router.use(authenticate)

// POST /api/internal-sales
// Solo cajeros y subadmins de la sucursal origen pueden emitir
router.post('/', requireRoles('administrador', 'subadministrador', 'cajero'), async (req, res) => {
  const parsed = emisionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const venta = await emitirVentaInterna(parsed.data, req.user.userId)
  res.status(201).json(venta)
})

// POST /api/internal-sales/:id/confirm
// Solo cajeros y subadmins de la sucursal destino pueden confirmar
router.post('/:id/confirm', requireRoles('administrador', 'subadministrador', 'cajero'), async (req, res) => {
  const parsed = confirmacionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = await confirmarVentaInterna(req.params.id, parsed.data.conteos, req.user.userId)
  res.json(result)
})

module.exports = router
