const { z } = require('zod')

const detalleEmisionSchema = z.object({
  productoId:    z.string().min(1),
  kilosEnviados: z.number().positive(),
})

const emisionSchema = z.object({
  sucursalOrigenId:  z.string().min(1),
  sucursalDestinoId: z.string().min(1),
  detalles:          z.array(detalleEmisionSchema).min(1),
})

const detalleConfirmacionSchema = z.object({
  productoId:    z.string().min(1),
  kilosRecibidos: z.number().nonnegative(),
})

const confirmacionSchema = z.object({
  conteos: z.array(detalleConfirmacionSchema).min(1),
})

module.exports = { emisionSchema, confirmacionSchema }
