const { z } = require('zod')

const conteoFisicoSchema = z.object({
  productoId:     z.string().min(1),
  cantidadFisica: z.number().nonnegative(),
})

const conciliacionSchema = z.object({
  snapshotId: z.string().min(1),
  conteos:    z.array(conteoFisicoSchema).min(1),
})

module.exports = { conciliacionSchema }
