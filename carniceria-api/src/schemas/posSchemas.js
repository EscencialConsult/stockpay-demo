const { z } = require('zod')

const MEDIOS_PAGO = ['efectivo','tarjeta_credito','tarjeta_debito','qr','transferencia','billetera_virtual','cuenta_corriente']

const ventaItemSchema = z.object({
  productoId: z.string().min(1),
  cantidad:   z.number().positive(),
})

const ventaPagoSchema = z.object({
  medioPago: z.enum(MEDIOS_PAGO),
  monto:     z.number().positive(),
})

const ventaSchema = z.object({
  sucursalId: z.string().min(1),
  clienteId:  z.string().optional(),
  items:      z.array(ventaItemSchema).min(1),
  pagos:      z.array(ventaPagoSchema).min(1),
}).refine(
  data => {
    const tieneCuentaCorriente = data.pagos.some(p => p.medioPago === 'cuenta_corriente')
    return !(tieneCuentaCorriente && !data.clienteId)
  },
  { message: 'Se requiere clienteId cuando el pago incluye cuenta corriente.' }
)

const gastoSchema = z.object({
  sucursalId: z.string().min(1),
  concepto:   z.string().min(1),
  monto:      z.number().positive(),
})

const cierrePagoSchema = z.object({
  medioPago: z.enum(MEDIOS_PAGO),
  monto:     z.number().nonnegative(),
})

const cierreSchema = z.object({
  sucursalId: z.string().min(1),
  fechaDia:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  declarado:  z.array(cierrePagoSchema),
})

module.exports = { ventaSchema, gastoSchema, cierreSchema }
