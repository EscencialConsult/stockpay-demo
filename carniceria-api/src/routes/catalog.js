const { Router }               = require('express')
const { PrismaClient, Prisma } = require('@prisma/client')
const crypto                   = require('crypto')
const { authenticate, requireRoles, soloLectura } = require('../middleware/auth')
const { productoCreateSchema, productoUpdateSchema } = require('../schemas/catalogSchemas')

const router = Router()
const prisma = new PrismaClient()

const PIN_TTL_MS = 30 * 60 * 1000 // 30 minutos

router.use(authenticate)

// Mapeo de campos únicos → mensaje amigable
const UNIQUE_FIELD_LABELS = { plu: 'PLU', codigoEan: 'código de barras EAN' }

function handlePrismaUnique(error, res) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const campo = error.meta?.target?.[0] ?? 'campo'
    const label = UNIQUE_FIELD_LABELS[campo] ?? campo
    return res.status(409).json({ error: `El ${label} ya existe en el catálogo. Los códigos deben ser únicos en todo el sistema.` })
  }
  return null
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin + (process.env.JWT_SECRET ?? '')).digest('hex')
}

// ── GET /api/catalog ──────────────────────────────────────────────────────────
// Todos los roles. Sin filtro de provisional: la query solo devuelve activos no provisionales
// (o todos si el admin usa ?incluirProvisionales=true desde su panel).
router.get('/', soloLectura, async (req, res) => {
  const { q, familia, categoria, activo, pagina = '1', limite = '50', incluirProvisionales } = req.query
  const esAdmin = ['administrador', 'subadministrador'].includes(req.user.rol)

  const skip = (Math.max(1, parseInt(pagina)) - 1) * Math.min(200, parseInt(limite))
  const take = Math.min(200, parseInt(limite))

  const where = {
    // Las sucursales ven solo activos no provisionales; los admins pueden ver todo
    ...(esAdmin && incluirProvisionales === 'true' ? {} : { provisional: false }),
    ...(activo !== undefined ? { activo: activo === 'true' } : { activo: true }),
    ...(q        && { descripcion: { contains: q, mode: 'insensitive' } }),
    ...(familia  && { familia }),
    ...(categoria && { categoria }),
  }

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({ where, orderBy: [{ familia: 'asc' }, { descripcion: 'asc' }], skip, take }),
    prisma.producto.count({ where }),
  ])

  res.json({ data: productos, total, pagina: parseInt(pagina), limite: take })
})

// ── GET /api/catalog/familias ─────────────────────────────────────────────────
// Lista de familias/categorías únicas — debe ir ANTES de /:id
router.get('/familias', soloLectura, async (_req, res) => {
  const [familias, categorias] = await Promise.all([
    prisma.producto.findMany({ where: { familia: { not: null }, provisional: false }, distinct: ['familia'], select: { familia: true } }),
    prisma.producto.findMany({ where: { categoria: { not: null }, provisional: false }, distinct: ['categoria'], select: { categoria: true } }),
  ])
  res.json({ familias: familias.map(f => f.familia).sort(), categorias: categorias.map(c => c.categoria).sort() })
})

// ── GET /api/catalog/provisional ─────────────────────────────────────────────
// Productos provisionales pendientes de aprobación — solo admin/subadmin
router.get('/provisional', requireRoles('administrador', 'subadministrador'), async (_req, res) => {
  const productos = await prisma.producto.findMany({
    where:   { provisional: true, activo: true },
    include: { sucursalOrigen: { select: { nombre: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(productos)
})

// ── POST /api/catalog/emergency-pin ──────────────────────────────────────────
// Admin/subadmin genera un PIN de 6 dígitos de un solo uso (TTL 30 min).
// El PIN se devuelve en claro UNA sola vez para ser comunicado a la sucursal.
router.post('/emergency-pin', requireRoles('administrador', 'subadministrador'), async (req, res) => {
  const pin = String(crypto.randomInt(100000, 999999))

  const registro = await prisma.pinEmergencia.create({
    data: {
      pinHash:           hashPin(pin),
      sucursalDestinoId: req.body.sucursalDestinoId ?? null,
      generadoPor:       req.user.userId,
      venceEn:           new Date(Date.now() + PIN_TTL_MS),
    },
  })

  res.status(201).json({
    pin,              // en claro solo en esta respuesta
    venceEn: registro.venceEn,
    mensaje: 'PIN de uso único válido por 30 minutos. Comunicalo a la sucursal de forma segura.',
  })
})

// ── POST /api/catalog/emergency-creation ─────────────────────────────────────
// Cajero o subadmin de la sucursal remota usa el PIN + escanea el código de barras
// para crear un producto provisional. El admin lo aprueba desde /provisional.
router.post('/emergency-creation', requireRoles('administrador', 'subadministrador', 'cajero'), async (req, res) => {
  const { codigo_autorizacion, codigo_barras, descripcion, precio_venta } = req.body

  if (!codigo_autorizacion || !codigo_barras || !descripcion || !precio_venta) {
    return res.status(400).json({ error: 'Campos requeridos: codigo_autorizacion, codigo_barras, descripcion, precio_venta.' })
  }
  if (typeof precio_venta !== 'number' || precio_venta <= 0) {
    return res.status(400).json({ error: 'precio_venta debe ser un número positivo.' })
  }

  // 1. Validar PIN: activo, no vencido, no usado
  const pinHash = hashPin(codigo_autorizacion)
  const pin = await prisma.pinEmergencia.findFirst({
    where: { pinHash, activo: true, usadoEn: null, venceEn: { gt: new Date() } },
  })
  if (!pin) {
    return res.status(401).json({ error: 'Código de autorización inválido, vencido o ya utilizado.' })
  }

  // 2. Verificar que el PIN sea válido para la sucursal del usuario (si tiene restricción)
  if (pin.sucursalDestinoId && pin.sucursalDestinoId !== req.user.sucursalId) {
    return res.status(401).json({ error: 'Este código de autorización no es válido para tu sucursal.' })
  }

  // 3. El código de barras no debe existir ya en el catálogo
  const duplicado = await prisma.producto.findFirst({ where: { codigoEan: codigo_barras } })
  if (duplicado) {
    return res.status(409).json({ error: 'El código de barras ya existe en el catálogo.' })
  }

  // 4. Crear producto provisional + consumir PIN — transacción atómica
  const producto = await prisma.$transaction(async tx => {
    await tx.pinEmergencia.update({
      where: { id: pin.id },
      data:  { usadoEn: new Date(), activo: false },
    })

    return tx.producto.create({
      data: {
        descripcion:      descripcion.trim(),
        codigoEan:        codigo_barras,
        precio:           precio_venta,
        unidadMedida:     req.body.unidad_medida ?? 'KG',
        provisional:      true,
        sucursalOrigenId: req.user.sucursalId ?? null,
        activo:           true,
      },
    })
  })

  res.status(201).json({
    ...producto,
    mensaje: 'Producto creado en modo provisional. Visible únicamente en esta sucursal hasta la aprobación del administrador.',
  })
})

// ── POST /api/catalog ─────────────────────────────────────────────────────────
router.post('/', requireRoles('administrador', 'subadministrador'), async (req, res) => {
  const parsed = productoCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    const producto = await prisma.producto.create({ data: parsed.data })
    res.status(201).json(producto)
  } catch (err) {
    if (handlePrismaUnique(err, res)) return
    throw err
  }
})

// ── PUT /api/catalog/:id ──────────────────────────────────────────────────────
// Aprobación de provisional: enviar { provisional: false, plu: "...", familia: "..." }
router.put('/:id', requireRoles('administrador', 'subadministrador'), async (req, res) => {
  const parsed = productoUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  if (!Object.keys(parsed.data).length) return res.status(400).json({ error: 'No se recibieron campos para actualizar.' })

  // Al aprobar un provisional, limpiar la referencia a la sucursal de origen
  const data = { ...parsed.data }
  if (parsed.data.provisional === false) data.sucursalOrigenId = null

  try {
    const producto = await prisma.producto.update({ where: { id: req.params['id'] }, data })
    res.json(producto)
  } catch (err) {
    if (handlePrismaUnique(err, res)) return
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Producto no encontrado.' })
    }
    throw err
  }
})

// ── DELETE /api/catalog/:id ───────────────────────────────────────────────────
router.delete('/:id', requireRoles('administrador'), async (req, res) => {
  try {
    await prisma.producto.update({ where: { id: req.params['id'] }, data: { activo: false } })
    res.status(204).send()
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Producto no encontrado.' })
    }
    throw err
  }
})

module.exports = router
