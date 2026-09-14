const { PrismaClient, TipoMovimiento, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()

async function registerCarcassEntry(input) {
  const perfiles = await prisma.yieldProfile.findMany({
    where:   { tipoMediaId: input.tipoMediaId, activo: true },
    include: { producto: true },
  })

  if (perfiles.length === 0) {
    throw new Error(`Sin perfil de rendimiento activo para tipoMediaId=${input.tipoMediaId}`)
  }

  const totalPorcentaje = perfiles.reduce((acc, p) => acc + Number(p.porcentaje), 0)
  const advertencias = []

  if (Math.abs(totalPorcentaje - 100) > 0.5) {
    advertencias.push(
      `Los porcentajes del perfil suman ${totalPorcentaje.toFixed(2)}% (se esperaba ~100%). Diferencia registrada como merma sistémica.`
    )
  }

  const desglose = perfiles.map(p => ({
    productoId:  p.productoId,
    descripcion: p.producto.descripcion,
    porcentaje:  Number(p.porcentaje),
    cantidadKg: parseFloat(
      new Prisma.Decimal(input.pesoDesbasteKg)
        .mul(p.porcentaje)
        .div(100)
        .toDecimalPlaces(3)
        .toString()
    ),
  }))

  const result = await prisma.$transaction(async tx => {
    const ingreso = await tx.ingresoMedia.create({
      data: {
        sucursalId:     input.sucursalId,
        tipoMediaId:    input.tipoMediaId,
        pesoRealKg:     input.pesoRealKg,
        pesoDesbasteKg: input.pesoDesbasteKg,
        cantidadMedias: input.cantidadMedias,
        proveedor:      input.proveedor,
        registradoPor:  input.registradoPor,
        notas:          input.notas,
      },
    })

    await tx.movimientoStock.createMany({
      data: desglose.map(corte => ({
        sucursalId:    input.sucursalId,
        productoId:    corte.productoId,
        tipo:          TipoMovimiento.ingreso_despiece,
        cantidad:      corte.cantidadKg,
        unidadMedida:  'KG',
        ingresoMediaId: ingreso.id,
      })),
    })

    return ingreso
  })

  return { ingresoId: result.id, pesoDesbasteKg: input.pesoDesbasteKg, desglose, advertencias }
}

async function getYieldProfiles(tipoMediaId) {
  return prisma.yieldProfile.findMany({
    where:   { tipoMediaId, activo: true },
    include: { producto: { select: { id: true, descripcion: true, plu: true } } },
    orderBy: { porcentaje: 'desc' },
  })
}

async function upsertYieldProfile(tipoMediaId, productoId, porcentaje, updatedBy) {
  return prisma.yieldProfile.upsert({
    where:  { tipoMediaId_productoId: { tipoMediaId, productoId } },
    update: { porcentaje, updatedBy, activo: true },
    create: { tipoMediaId, productoId, porcentaje, updatedBy },
  })
}

async function deactivateYieldProfile(id) {
  return prisma.yieldProfile.update({ where: { id }, data: { activo: false } })
}

module.exports = { registerCarcassEntry, getYieldProfiles, upsertYieldProfile, deactivateYieldProfile }
