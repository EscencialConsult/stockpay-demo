const jwt = require('jsonwebtoken')

function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Sin permisos para esta operación' })
    }
    next()
  }
}

/**
 * Matriz de permisos por rol:
 *
 * administrador    → acceso total (sin restricción)
 * subadministrador → ingresos, stock, movimientos, clientes, catálogo lectura/escritura
 * socio            → GET a todo, prohibido cualquier mutación
 * cajero           → únicamente rutas POS, cierre de caja y confirmación de ventas internas
 *
 * soloLectura se aplica como segundo middleware en rutas donde el socio puede leer
 * pero no escribir. El acceso inicial se controla con requireRoles.
 */
function soloLectura(req, res, next) {
  const METODOS_MUTACION = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (req.user?.rol === 'socio' && METODOS_MUTACION.includes(req.method)) {
    return res.status(403).json({ error: 'El rol socio tiene acceso de solo lectura.' })
  }
  next()
}

module.exports = { authenticate, requireRoles, soloLectura }
