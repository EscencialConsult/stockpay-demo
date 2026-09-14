const { z } = require('zod')

const upsertYieldProfileSchema = z.object({
  productoId: z.string().min(1),
  porcentaje: z.number().positive().max(100),
})

const carcassEntrySchema = z.object({
  sucursalId:     z.string().min(1),
  tipoMediaId:    z.string().min(1),
  pesoRealKg:     z.number().positive(),
  pesoDesbasteKg: z.number().positive(),
  cantidadMedias: z.number().int().positive().default(1),
  proveedor:      z.string().optional(),
  notas:          z.string().optional(),
})

module.exports = { upsertYieldProfileSchema, carcassEntrySchema }
