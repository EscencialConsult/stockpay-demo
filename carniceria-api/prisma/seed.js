/**
 * Seed de desarrollo — crea usuarios de prueba para cada rol.
 * Ejecutar: node prisma/seed.js
 *
 * Credenciales generadas:
 *   admin@test.com          / Admin1234!   → administrador
 *   subadmin@test.com       / Admin1234!   → subadministrador
 *   socio@test.com          / Admin1234!   → socio
 *   cajero@test.com         / Admin1234!   → cajero (sucursal 1)
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt           = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Admin1234!', 10)

  // Sucursal de prueba
  const sucursal = await prisma.sucursal.upsert({
    where:  { id: 'sucursal-demo-01' },
    update: {},
    create: { id: 'sucursal-demo-01', nombre: 'Sucursal Central', activa: true },
  })

  const usuarios = [
    { id: 'user-admin-01',    email: 'admin@test.com',    nombre: 'Admin Demo',    rol: 'administrador',    sucursalId: null },
    { id: 'user-subadmin-01', email: 'subadmin@test.com', nombre: 'Subadmin Demo', rol: 'subadministrador', sucursalId: sucursal.id },
    { id: 'user-socio-01',    email: 'socio@test.com',    nombre: 'Socio Demo',    rol: 'socio',            sucursalId: null },
    { id: 'user-cajero-01',   email: 'cajero@test.com',   nombre: 'Cajero Demo',   rol: 'cajero',           sucursalId: sucursal.id },
  ]

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where:  { email: u.email },
      update: { passwordHash: hash },
      create: { ...u, passwordHash: hash, activo: true },
    })
    console.log(`✓ ${u.rol}: ${u.email}`)
  }

  console.log('\nSeed completo. Contraseña para todos: Admin1234!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
