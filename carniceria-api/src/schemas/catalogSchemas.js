const { z } = require('zod')

const productoCreateSchema = z.object({
  descripcion:  z.string().min(1).max(200).trim(),
  plu:          z.string().max(20).trim().nullable().optional(),
  codigoEan:    z.string().length(13).nullable().optional(),
  familia:      z.string().max(100).trim().nullable().optional(),
  categoria:    z.string().max(100).trim().nullable().optional(),
  precio:       z.number().positive({ message: 'El precio debe ser mayor a cero.' }),
  unidadMedida: z.enum(['KG', 'UN']),
})

// En edición todos los campos son opcionales — solo se pisan los que se envíen
const productoUpdateSchema = productoCreateSchema.partial().extend({
  activo: z.boolean().optional(),
})

module.exports = { productoCreateSchema, productoUpdateSchema }
