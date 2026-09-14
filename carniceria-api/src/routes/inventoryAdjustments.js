const { Router } = require('express')
const { authenticate, requireRoles } = require('../middleware/auth')
const { conciliacionSchema } = require('../schemas/adjustmentSchemas')
const { createSnapshot, conciliate } = require('../services/inventoryService')

const router = Router()
router.use(authenticate, requireRoles('administrador', 'subadministrador'))

router.post('/snapshots', async (req, res) => {
  const { sucursalId } = req.body
  if (!sucursalId) return res.status(400).json({ error: 'sucursalId requerido' })

  const result = await createSnapshot(sucursalId, req.user.userId)
  res.status(201).json(result)
})

router.post('/adjustments', async (req, res) => {
  const parsed = conciliacionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const result = await conciliate(parsed.data.snapshotId, parsed.data.conteos)
  const status = result.faltantes > 0 || result.sobrantes > 0 ? 207 : 200
  res.status(status).json(result)
})

module.exports = router
