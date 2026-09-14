// ─────────────────────────────────────────────────────────────────────────────
// Datos de demostración — reemplazados por la API real cuando el backend esté conectado
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_SUCURSALES = [
  { id: 'suc-001', nombre: 'Central / Depósito', activa: true },
  { id: 'suc-002', nombre: 'Sucursal Norte',     activa: true },
  { id: 'suc-003', nombre: 'Sucursal Sur',        activa: true },
  { id: 'suc-004', nombre: 'Yuto',               activa: true },
  { id: 'suc-005', nombre: 'Menudencias',        activa: true },
]

export const MOCK_USERS = {
  'admin@test.com':    { id: 'u-admin',    nombre: 'Roberto Sánchez', email: 'admin@test.com',    rol: 'administrador',    sucursalId: null,      password: 'Admin1234!' },
  'subadmin@test.com': { id: 'u-subadmin', nombre: 'Daniela Ruiz',   email: 'subadmin@test.com', rol: 'subadministrador', sucursalId: 'suc-001', password: 'Admin1234!' },
  'socio@test.com':    { id: 'u-socio',    nombre: 'Jorge Sánchez',  email: 'socio@test.com',    rol: 'socio',            sucursalId: null,      password: 'Admin1234!' },
  'cajero@test.com':   { id: 'u-cajero',   nombre: 'Carla Medina',   email: 'cajero@test.com',   rol: 'cajero',           sucursalId: 'suc-002', password: 'Admin1234!' },
}

// ── Catálogo de productos ─────────────────────────────────────────────────────

export const MOCK_CATALOG = [
  { id: 'p01', descripcion: 'Asado de tira',        plu: '0001', codigoEan: null,            familia: 'Vacuno',    precio: 3200, unidadMedida: 'KG', activo: true },
  { id: 'p02', descripcion: 'Bife de chorizo',       plu: '0002', codigoEan: null,            familia: 'Vacuno',    precio: 5800, unidadMedida: 'KG', activo: true },
  { id: 'p03', descripcion: 'Milanesa de nalga',     plu: '0003', codigoEan: null,            familia: 'Vacuno',    precio: 4200, unidadMedida: 'KG', activo: true },
  { id: 'p04', descripcion: 'Tapa de asado',         plu: '0004', codigoEan: null,            familia: 'Vacuno',    precio: 2800, unidadMedida: 'KG', activo: true },
  { id: 'p05', descripcion: 'Vacío',                 plu: '0005', codigoEan: null,            familia: 'Vacuno',    precio: 3600, unidadMedida: 'KG', activo: true },
  { id: 'p06', descripcion: 'Entraña',               plu: '0006', codigoEan: null,            familia: 'Vacuno',    precio: 6200, unidadMedida: 'KG', activo: true },
  { id: 'p07', descripcion: 'Costilla',              plu: '0007', codigoEan: null,            familia: 'Vacuno',    precio: 2400, unidadMedida: 'KG', activo: true },
  { id: 'p08', descripcion: 'Matambre vacuno',       plu: '0008', codigoEan: null,            familia: 'Vacuno',    precio: 3100, unidadMedida: 'KG', activo: true },
  { id: 'p09', descripcion: 'Paleta',                plu: '0009', codigoEan: null,            familia: 'Vacuno',    precio: 2600, unidadMedida: 'KG', activo: true },
  { id: 'p10', descripcion: 'Osobuco',               plu: '0010', codigoEan: null,            familia: 'Vacuno',    precio: 2200, unidadMedida: 'KG', activo: true },
  { id: 'p11', descripcion: 'Matambre de cerdo',     plu: '0020', codigoEan: null,            familia: 'Cerdo',     precio: 2400, unidadMedida: 'KG', activo: true },
  { id: 'p12', descripcion: 'Bondiola entera',       plu: '0021', codigoEan: null,            familia: 'Cerdo',     precio: 2200, unidadMedida: 'KG', activo: true },
  { id: 'p13', descripcion: 'Pollo entero',          plu: '0030', codigoEan: null,            familia: 'Pollo',     precio: 1800, unidadMedida: 'KG', activo: true },
  { id: 'p14', descripcion: 'Pata muslo',            plu: '0031', codigoEan: null,            familia: 'Pollo',     precio: 1600, unidadMedida: 'KG', activo: true },
  { id: 'p15', descripcion: 'Pechuga sin hueso',     plu: '0032', codigoEan: null,            familia: 'Pollo',     precio: 2100, unidadMedida: 'KG', activo: true },
  { id: 'p16', descripcion: 'Chorizo parrillero',    plu: '0040', codigoEan: null,            familia: 'Embutidos', precio: 3000, unidadMedida: 'KG', activo: true },
  { id: 'p17', descripcion: 'Morcilla',              plu: '0041', codigoEan: null,            familia: 'Embutidos', precio: 2600, unidadMedida: 'KG', activo: true },
  { id: 'p18', descripcion: 'Chinchulín',            plu: '0050', codigoEan: null,            familia: 'Achuras',   precio: 2800, unidadMedida: 'KG', activo: true },
  { id: 'p19', descripcion: 'Riñón',                 plu: '0051', codigoEan: null,            familia: 'Achuras',   precio: 1800, unidadMedida: 'KG', activo: true },
  { id: 'p20', descripcion: 'Carbón 5kg',            plu: '0060', codigoEan: '7798054320015', familia: 'Insumos',   precio: 1800, unidadMedida: 'UN', activo: true },
  { id: 'p21', descripcion: 'Sal gruesa 1kg',        plu: '0061', codigoEan: '7790070000055', familia: 'Insumos',   precio: 400,  unidadMedida: 'UN', activo: true },
  { id: 'p22', descripcion: 'Gaseosa 2.25L',         plu: '0062', codigoEan: '7790580521027', familia: 'Bebidas',   precio: 1200, unidadMedida: 'UN', activo: true },
  { id: 'p23', descripcion: 'Huevo',                 plu: '0063', codigoEan: null,            familia: 'Insumos',   precio: 120,  unidadMedida: 'UN', activo: true },
]

// ── Perfil de rendimiento (despiece) ─────────────────────────────────────────

export const MOCK_YIELD_PROFILES = {
  vacuno: {
    nombre: 'Media res vacuna',
    cortes: [
      { productoId: 'p01', descripcion: 'Asado de tira',     porcentaje: 8.2 },
      { productoId: 'p02', descripcion: 'Bife de chorizo',   porcentaje: 3.8 },
      { productoId: 'p03', descripcion: 'Milanesa de nalga', porcentaje: 6.4 },
      { productoId: 'p04', descripcion: 'Tapa de asado',     porcentaje: 4.1 },
      { productoId: 'p05', descripcion: 'Vacío',             porcentaje: 5.2 },
      { productoId: 'p06', descripcion: 'Entraña',           porcentaje: 2.1 },
      { productoId: 'p07', descripcion: 'Costilla',          porcentaje: 7.5 },
      { productoId: 'p08', descripcion: 'Matambre vacuno',   porcentaje: 3.2 },
      { productoId: 'p09', descripcion: 'Paleta',            porcentaje: 6.1 },
      { productoId: 'p10', descripcion: 'Osobuco',           porcentaje: 4.4 },
      { productoId: 'p18', descripcion: 'Chinchulín',        porcentaje: 2.8 },
      { productoId: 'p19', descripcion: 'Riñón',             porcentaje: 1.6 },
    ],
    mermaHueso: 44.6,
  },
  cerdo: {
    nombre: 'Media res porcina',
    cortes: [
      { productoId: 'p11', descripcion: 'Matambre de cerdo', porcentaje: 12.4 },
      { productoId: 'p12', descripcion: 'Bondiola entera',   porcentaje: 14.8 },
      { productoId: 'p16', descripcion: 'Chorizo parrillero',porcentaje: 8.6  },
      { productoId: 'p17', descripcion: 'Morcilla',          porcentaje: 5.2  },
    ],
    mermaHueso: 59.0,
  },
}

// ── Historial de ingresos de media res ───────────────────────────────────────

export const MOCK_INGRESOS_MEDIA = [
  { id: 'im-01', tipo: 'vacuno', sucursalId: 'suc-001', sucursalNombre: 'Central / Depósito', pesoReal: 144.0, pesoDesbaste: 138.5, fecha: '2025-06-12', estado: 'procesado', usuario: 'Daniela Ruiz' },
  { id: 'im-02', tipo: 'vacuno', sucursalId: 'suc-001', sucursalNombre: 'Central / Depósito', pesoReal: 130.0, pesoDesbaste: 124.8, fecha: '2025-06-11', estado: 'procesado', usuario: 'Daniela Ruiz' },
  { id: 'im-03', tipo: 'cerdo',  sucursalId: 'suc-001', sucursalNombre: 'Central / Depósito', pesoReal:  58.0, pesoDesbaste:  55.2, fecha: '2025-06-10', estado: 'procesado', usuario: 'Daniela Ruiz' },
  { id: 'im-04', tipo: 'vacuno', sucursalId: 'suc-002', sucursalNombre: 'Sucursal Norte',     pesoReal: 120.0, pesoDesbaste: 115.0, fecha: '2025-06-09', estado: 'procesado', usuario: 'Roberto Sánchez' },
]

// ── Ventas Internas entre sucursales ─────────────────────────────────────────

export const MOCK_VENTAS_INTERNAS = [
  {
    id: 'vi-01',
    origen:   { id: 'suc-001', nombre: 'Central / Depósito' },
    destino:  { id: 'suc-002', nombre: 'Sucursal Norte' },
    estado:   'pendiente',
    fecha:    '2025-06-13',
    usuario:  'Daniela Ruiz',
    items: [
      { productoId: 'p01', descripcion: 'Asado de tira',    kg: 18.4, precioPublico: 3200, precioInterno: 2880 },
      { productoId: 'p02', descripcion: 'Bife de chorizo',  kg:  6.2, precioPublico: 5800, precioInterno: 5220 },
    ],
    totalPublico:  91720,
    totalInterno:  82548,
    descuento:     10,
  },
  {
    id: 'vi-02',
    origen:   { id: 'suc-001', nombre: 'Central / Depósito' },
    destino:  { id: 'suc-003', nombre: 'Sucursal Sur' },
    estado:   'pendiente',
    fecha:    '2025-06-13',
    usuario:  'Daniela Ruiz',
    items: [
      { productoId: 'p03', descripcion: 'Milanesa de nalga', kg: 12.0, precioPublico: 4200, precioInterno: 3780 },
      { productoId: 'p07', descripcion: 'Costilla',          kg: 22.5, precioPublico: 2400, precioInterno: 2160 },
    ],
    totalPublico:  104400,
    totalInterno:   93960,
    descuento:      10,
  },
  {
    id: 'vi-03',
    origen:   { id: 'suc-001', nombre: 'Central / Depósito' },
    destino:  { id: 'suc-004', nombre: 'Yuto' },
    estado:   'confirmada',
    fecha:    '2025-06-12',
    usuario:  'Daniela Ruiz',
    items: [
      { productoId: 'p04', descripcion: 'Tapa de asado', kg: 30.0, precioPublico: 2800, precioInterno: 2520 },
    ],
    totalPublico:   84000,
    totalInterno:   75600,
    descuento:      10,
  },
  {
    id: 'vi-04',
    origen:   { id: 'suc-002', nombre: 'Sucursal Norte' },
    destino:  { id: 'suc-001', nombre: 'Central / Depósito' },
    estado:   'confirmada',
    fecha:    '2025-06-11',
    usuario:  'Carla Medina',
    items: [
      { productoId: 'p16', descripcion: 'Chorizo parrillero', kg: 8.0, precioPublico: 3000, precioInterno: 2700 },
    ],
    totalPublico:   24000,
    totalInterno:   21600,
    descuento:      10,
  },
]

// ── Cierre de caja (datos del día actual) ─────────────────────────────────────

export const MOCK_CIERRE_HOY = {
  sucursalId:   'suc-001',
  fecha:        '2025-06-13',
  estado:       'abierto',
  ventasBruto:  125480,
  ventasPorMedio: [
    { medio: 'efectivo',          label: 'Efectivo',           monto: 42300 },
    { medio: 'tarjeta_debito',    label: 'Débito',             monto: 28600 },
    { medio: 'tarjeta_credito',   label: 'Crédito',            monto: 18900 },
    { medio: 'qr',                label: 'QR',                 monto: 15400 },
    { medio: 'transferencia',     label: 'Transferencia',      monto: 12800 },
    { medio: 'billetera_virtual', label: 'Billetera Virtual',  monto:  7480 },
    { medio: 'cuenta_corriente',  label: 'Cta. Corriente',     monto:     0 },
  ],
  gastos: [
    { id: 'g-01', concepto: 'Bolsas y papel',   monto: 2400, usuario: 'Daniela Ruiz' },
    { id: 'g-02', concepto: 'Limpieza local',   monto: 3500, usuario: 'Daniela Ruiz' },
  ],
}

// ── Clientes cuentas corrientes ──────────────────────────────────────────────

export const MOCK_CLIENTES = [
  { id: 'cli-01', nombre: 'Juan García',       documento: '28.456.789',  telefono: '388-4455667', saldoCuentaCorriente: 12500 },
  { id: 'cli-02', nombre: 'María López',       documento: '31.234.567',  telefono: '388-5566778', saldoCuentaCorriente: 0 },
  { id: 'cli-03', nombre: 'Parador El Norte',  documento: '30-71234567-4', telefono: '388-6677889', saldoCuentaCorriente: 48200 },
  { id: 'cli-04', nombre: 'Parador El Río',    documento: '30-65432198-1', telefono: '388-7788990', saldoCuentaCorriente: 3800 },
]

// ── Stats del dashboard ───────────────────────────────────────────────────────

export const MOCK_STATS = {
  ventasHoy:                 125480,
  ticketsHoy:                47,
  ticketPromedio:            2670,
  alertasStock:              2,
  ventasInternasPendientes:  2,
  productosProvisionales:    1,
  rankingHoy: [
    { descripcion: 'Asado de tira',      familia: 'Vacuno',    totalFacturado: 28400 },
    { descripcion: 'Bife de chorizo',    familia: 'Vacuno',    totalFacturado: 23200 },
    { descripcion: 'Chorizo parrillero', familia: 'Embutidos', totalFacturado: 18600 },
    { descripcion: 'Milanesa de nalga',  familia: 'Vacuno',    totalFacturado: 16800 },
    { descripcion: 'Pollo entero',       familia: 'Pollo',     totalFacturado: 12600 },
  ],
  ventasPorSucursal: [
    { nombre: 'Central / Depósito', total: 72400 },
    { nombre: 'Sucursal Norte',     total: 34080 },
    { nombre: 'Sucursal Sur',       total: 19000 },
  ],
}

// ── Reportes de rentabilidad ─────────────────────────────────────────────────

export const MOCK_REPORTES = {
  periodos: ['Hoy', 'Esta semana', 'Este mes'],
  porSucursal: [
    { nombre: 'Central / Depósito', ventasPublico: 72400, ventasInternas: 251720, costoInterno: 226548, rentabilidad: 97572 },
    { nombre: 'Sucursal Norte',     ventasPublico: 34080, ventasInternas:      0, costoInterno:  82548, rentabilidad: -48468 },
    { nombre: 'Sucursal Sur',       ventasPublico: 19000, ventasInternas:      0, costoInterno:  93960, rentabilidad: -74960 },
    { nombre: 'Yuto',              ventasPublico: 24600, ventasInternas:      0, costoInterno:  75600, rentabilidad: -51000 },
  ],
}
