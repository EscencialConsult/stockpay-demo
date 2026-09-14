const { Router }    = require('express')
const { PrismaClient } = require('@prisma/client')
const bcrypt        = require('bcryptjs')
const jwt           = require('jsonwebtoken')

const router = Router()
const prisma = new PrismaClient()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' })
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  })

  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Credenciales inválidas.' })
  }

  const ok = await bcrypt.compare(password, usuario.passwordHash)
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales inválidas.' })
  }

  const token = jwt.sign(
    { userId: usuario.id, rol: usuario.rol, sucursalId: usuario.sucursalId ?? null },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )

  res.json({
    token,
    user: {
      id:         usuario.id,
      nombre:     usuario.nombre,
      email:      usuario.email,
      rol:        usuario.rol,
      sucursalId: usuario.sucursalId ?? null,
    },
  })
})

module.exports = router
