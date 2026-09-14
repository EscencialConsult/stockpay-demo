const { Router } = require('express')
const { authenticate, requireRoles } = require('../middleware/auth')
const { carcassEntrySchema } = require('../schemas/yieldSchemas')
const { registerCarcassEntry } = require('../services/yieldService')

const router = Router()

router.post('/carcass-entry', authenticate, requireRoles('administrador', 'subadministrador'), async (req, res) => {
  const parsed = carcassEntrySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = await registerCarcassEntry({ ...parsed.data, registradoPor: req.user.userId })
  const status = result.advertencias.length > 0 ? 207 : 201
  res.status(status).json(result)
})

module.exports = router
