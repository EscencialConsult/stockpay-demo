const express = require('express')
const authRouter                 = require('./routes/auth')
const yieldProfilesRouter        = require('./routes/yieldProfiles')
const inventoryRouter            = require('./routes/inventory')
const inventoryAdjustmentsRouter = require('./routes/inventoryAdjustments')
const internalSalesRouter        = require('./routes/internalSales')
const posRouter                  = require('./routes/pos')
const clientesRouter             = require('./routes/clientes')
const catalogRouter              = require('./routes/catalog')
const reportsRouter              = require('./routes/reports')

require('./jobs/alertasStockNegativo') // registra el cron al arrancar el proceso

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth',          authRouter)

app.use('/api/yield-profiles',  yieldProfilesRouter)
app.use('/api/inventory',       inventoryRouter)
app.use('/api/inventory',       inventoryAdjustmentsRouter)
app.use('/api/internal-sales',  internalSalesRouter)
app.use('/api/pos',             posRouter)
app.use('/api/clientes',        clientesRouter)
app.use('/api/catalog',         catalogRouter)
app.use('/api/reports',         reportsRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`API escuchando en :${PORT}`))

module.exports = app
