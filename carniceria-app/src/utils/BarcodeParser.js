const SCALE_PREFIXES = ['20','21','22','23','24','25','26','27','28','29']
const MIN_PESO_KG = 0.05
const MAX_PESO_KG = 50

export function parseBarcode(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 13) return { type: 'unknown', raw, plu: null, embeddedPrice: null, checkDigit: null }

  const prefix  = digits.slice(0, 2)
  const isScale = SCALE_PREFIXES.includes(prefix)

  if (!isScale) return { type: 'ean13_manufacturer', raw, plu: null, embeddedPrice: null, checkDigit: digits[12] }

  return {
    type:          'scale',
    raw,
    plu:           digits.slice(2, 6),
    embeddedPrice: parseInt(digits.slice(6, 11), 10),
    checkDigit:    digits[12],
  }
}

export function resolveScaleBarcode(parsed, catalog) {
  const base = { ...parsed, producto: null, precioFinal: null, pesoKg: null, correctionApplied: false, correctionOffset: 0, error: null }

  if (parsed.type !== 'scale' || parsed.plu === null || parsed.embeddedPrice === null) return base

  const producto = catalog.find(p => p.plu === parsed.plu) ?? null
  if (!producto) return { ...base, error: 'PLU_NOT_FOUND' }

  const OFFSETS = [0, 10_000, 20_000, 30_000, 40_000]
  const validCandidates = OFFSETS
    .map(offset => ({ offset, price: parsed.embeddedPrice + offset, pesoKg: (parsed.embeddedPrice + offset) / producto.precioPorKg }))
    .filter(c => c.pesoKg >= MIN_PESO_KG && c.pesoKg <= MAX_PESO_KG)

  if (validCandidates.length === 0) {
    return { ...base, producto, precioFinal: parsed.embeddedPrice,
      pesoKg: parseFloat((parsed.embeddedPrice / producto.precioPorKg).toFixed(3)) }
  }

  if (validCandidates.length > 1) return { ...base, producto, error: 'AMBIGUOUS_CORRECTION' }

  const { offset, price, pesoKg } = validCandidates[0]
  return { ...parsed, producto, precioFinal: price, pesoKg: parseFloat(pesoKg.toFixed(3)),
    correctionApplied: offset > 0, correctionOffset: offset, error: null }
}
