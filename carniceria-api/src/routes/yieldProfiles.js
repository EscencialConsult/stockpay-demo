const { Router } = require('express')
const { authenticate, requireRoles } = require('../middleware/auth')
const { upsertYieldProfileSchema } = require('../schemas/yieldSchemas')
const { getYieldProfiles, upsertYieldProfile, deactivateYieldProfile } = require('../services/yieldService')

const router = Router()
router.use(authenticate, requireRoles('administrador', 'subadministrador'))

router.get('/:tipoMediaId', async (req, res) => {
  const perfiles = await getYieldProfiles(req.params.tipoMediaId)
  const totalPorcentaje = perfiles.reduce((acc, p) => acc + Number(p.porcentaje), 0)
  res.json({ perfiles, totalPorcentaje: +totalPorcentaje.toFixed(2) })
})

router.put('/:tipoMediaId', async (req, res) => {
  const parsed = upsertYieldProfileSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const perfil = await upsertYieldProfile(
    req.params.tipoMediaId, parsed.data.productoId, parsed.data.porcentaje, req.user.userId
  )
  res.json(perfil)
})

router.delete('/:id', async (req, res) => {
  await deactivateYieldProfile(req.params.id)
  res.json({ ok: true })
})

module.exports = router
