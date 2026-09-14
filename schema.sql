-- ─────────────────────────────────────────────────────────────────────────────
-- Sistema de Gestión Multisucursal para Carnicerías
-- Schema PostgreSQL — listo para ejecutar con psql o copiar en Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ─── Tipos enumerados ────────────────────────────────────────────────────────

CREATE TYPE rol_usuario AS ENUM (
  'administrador',
  'subadministrador',
  'socio',
  'cajero'
);

CREATE TYPE unidad_medida AS ENUM ('KG', 'UN');

CREATE TYPE tipo_movimiento AS ENUM (
  'ingreso_compra',          -- llegada de mercadería de proveedor
  'ingreso_despiece',        -- cortes generados por despiece de media res
  'venta_publica',           -- venta en caja al público
  'venta_interna_salida',    -- salida por venta entre sucursales
  'venta_interna_entrada',   -- entrada recibida de otra sucursal
  'ajuste_inventario',       -- corrección tras conciliación
  'merma_transito_interno',  -- diferencia no explicada en tránsito
  'devolucion'               -- devolución de cliente
);

CREATE TYPE medio_pago AS ENUM (
  'efectivo',
  'tarjeta_debito',
  'tarjeta_credito',
  'qr',
  'transferencia',
  'billetera_virtual',
  'cuenta_corriente'
);

CREATE TYPE estado_venta_interna AS ENUM (
  'pendiente',
  'confirmada',
  'rechazada'
);

CREATE TYPE tipo_movimiento_cc AS ENUM (
  'debito',   -- cliente lleva mercadería
  'credito'   -- cliente paga saldo
);

CREATE TYPE estado_alerta AS ENUM (
  'activa',
  'resuelta',
  'ignorada'
);

-- ─── Infraestructura ─────────────────────────────────────────────────────────

CREATE TABLE sucursal (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usuario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  rol             rol_usuario NOT NULL,
  sucursal_id     UUID REFERENCES sucursal(id) ON DELETE SET NULL,  -- NULL = accede a todas
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Maestro de artículos ────────────────────────────────────────────────────

CREATE TABLE producto (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plu             TEXT NOT NULL UNIQUE,           -- código corto para balanza
  descripcion     TEXT NOT NULL,
  familia         TEXT NOT NULL,                  -- Vacuno, Cerdo, Pollo, Achuras, Embutidos…
  categoria       TEXT,
  precio          NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidad_medida   unidad_medida NOT NULL DEFAULT 'KG',
  codigo_ean      TEXT UNIQUE,                    -- EAN-13 de fábrica, solo para UN
  provisional     BOOLEAN NOT NULL DEFAULT FALSE, -- creado vía PIN de urgencia, pendiente de aprobación
  sucursal_origen_id UUID REFERENCES sucursal(id) ON DELETE SET NULL, -- sucursal que hizo el alta provisional
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_producto_updated_at
  BEFORE UPDATE ON producto
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Tabla de rendimiento por despiece ───────────────────────────────────────

-- Un perfil describe qué porcentaje de una media res se convierte en cada corte
CREATE TABLE tipo_media (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL UNIQUE,   -- 'Media res vacuna', 'Media res porcina'
  activo  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE yield_profile (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_media_id   UUID NOT NULL REFERENCES tipo_media(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  porcentaje      NUMERIC(6,3) NOT NULL,   -- porcentaje del peso al desbaste que se convierte en este corte
  orden           INT NOT NULL DEFAULT 0,
  UNIQUE (tipo_media_id, producto_id)
);

-- ─── Ingresos de stock ───────────────────────────────────────────────────────

-- Ingreso de media res: genera movimientos de despiece automáticamente
CREATE TABLE ingreso_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id     UUID NOT NULL REFERENCES sucursal(id),
  tipo_media_id   UUID NOT NULL REFERENCES tipo_media(id),
  peso_real_kg    NUMERIC(10,3) NOT NULL,
  peso_desbaste_kg NUMERIC(10,3) NOT NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_id      UUID NOT NULL REFERENCES usuario(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Stock y movimientos ─────────────────────────────────────────────────────

-- Registro de cada entrada/salida de stock. El stock actual es SUM(cantidad) por (sucursal, producto).
-- cantidad positiva = entrada, negativa = salida
CREATE TABLE movimiento_stock (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id     UUID NOT NULL REFERENCES sucursal(id),
  producto_id     UUID NOT NULL REFERENCES producto(id),
  tipo            tipo_movimiento NOT NULL,
  cantidad        NUMERIC(12,3) NOT NULL,          -- positivo = entrada, negativo = salida
  referencia_id   TEXT,                            -- ID del documento de origen (venta, ingreso_media…)
  referencia_tipo TEXT,                            -- 'venta', 'venta_interna', 'ingreso_media', 'snapshot'
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_sucursal_producto ON movimiento_stock (sucursal_id, producto_id);
CREATE INDEX idx_mov_created_at        ON movimiento_stock (created_at DESC);

-- ─── Inventario (Snapshot + Conciliación) ────────────────────────────────────

-- Fotografía del stock teórico al momento de iniciar el conteo físico
CREATE TABLE inventario_snapshot (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   UUID NOT NULL REFERENCES sucursal(id),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  conciliado    BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_id    UUID NOT NULL REFERENCES usuario(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cada ítem del snapshot con stock teórico y conteo físico
CREATE TABLE item_snapshot (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id         UUID NOT NULL REFERENCES inventario_snapshot(id) ON DELETE CASCADE,
  producto_id         UUID NOT NULL REFERENCES producto(id),
  stock_teorico_kg    NUMERIC(12,3) NOT NULL,
  stock_fisico_kg     NUMERIC(12,3),     -- NULL hasta que se ingresa el conteo físico
  diferencia_kg       NUMERIC(12,3)      -- calculada al conciliar: fisico - teorico
);

-- ─── Punto de Venta — Ventas al Público ──────────────────────────────────────

CREATE TABLE venta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id     UUID NOT NULL REFERENCES sucursal(id),
  cliente_id      UUID REFERENCES cliente(id) ON DELETE SET NULL,  -- solo si es cuenta corriente
  total_importe   NUMERIC(12,2) NOT NULL,
  vuelto          NUMERIC(12,2) NOT NULL DEFAULT 0,
  usuario_id      UUID NOT NULL REFERENCES usuario(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE venta_item (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id        UUID NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES producto(id),
  cantidad        NUMERIC(12,3) NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL
);

CREATE TABLE venta_pago (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id    UUID NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  medio_pago  medio_pago NOT NULL,
  monto       NUMERIC(12,2) NOT NULL
);

-- ─── Cuentas Corrientes ───────────────────────────────────────────────────────

CREATE TABLE cliente (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                    TEXT NOT NULL,
  documento                 TEXT,
  telefono                  TEXT,
  saldo_cuenta_corriente    NUMERIC(12,2) NOT NULL DEFAULT 0,
  activo                    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movimiento_cuenta_corriente (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  tipo            tipo_movimiento_cc NOT NULL,
  monto           NUMERIC(12,2) NOT NULL,
  saldo_anterior  NUMERIC(12,2) NOT NULL,
  saldo_resultante NUMERIC(12,2) NOT NULL,
  descripcion     TEXT,
  venta_id        UUID REFERENCES venta(id) ON DELETE SET NULL,
  usuario_id      UUID NOT NULL REFERENCES usuario(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Cierre de Caja ──────────────────────────────────────────────────────────

CREATE TABLE gasto_caja (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   UUID NOT NULL REFERENCES sucursal(id),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto      TEXT NOT NULL,
  monto         NUMERIC(12,2) NOT NULL,
  usuario_id    UUID NOT NULL REFERENCES usuario(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cierre_caja_historial (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id         UUID NOT NULL REFERENCES sucursal(id),
  fecha               DATE NOT NULL,
  total_ventas        NUMERIC(12,2) NOT NULL,
  total_gastos        NUMERIC(12,2) NOT NULL DEFAULT 0,
  neto                NUMERIC(12,2) NOT NULL,
  efectivo_sistema    NUMERIC(12,2) NOT NULL,   -- efectivo según ventas registradas
  efectivo_declarado  NUMERIC(12,2),            -- conteo físico del cajero
  diferencia          NUMERIC(12,2),            -- declarado - sistema
  usuario_cierre_id   UUID NOT NULL REFERENCES usuario(id),
  cerrado_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sucursal_id, fecha)
);

CREATE TABLE cierre_detalle_pago (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id           UUID NOT NULL REFERENCES cierre_caja_historial(id) ON DELETE CASCADE,
  medio_pago          medio_pago NOT NULL,
  monto_sistema       NUMERIC(12,2) NOT NULL,
  monto_declarado     NUMERIC(12,2)
);

-- ─── Ventas Internas (movimientos entre sucursales) ──────────────────────────

CREATE TABLE venta_interna (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_origen_id  UUID NOT NULL REFERENCES sucursal(id),
  sucursal_destino_id UUID NOT NULL REFERENCES sucursal(id),
  estado            estado_venta_interna NOT NULL DEFAULT 'pendiente',
  porcentaje_descuento NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  total_precio_publico  NUMERIC(12,2) NOT NULL,
  total_precio_interno  NUMERIC(12,2) NOT NULL,
  usuario_origen_id  UUID NOT NULL REFERENCES usuario(id),
  usuario_destino_id UUID REFERENCES usuario(id),   -- quién confirmó/rechazó
  confirmado_at     TIMESTAMPTZ,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE venta_interna_detalle (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_interna_id  UUID NOT NULL REFERENCES venta_interna(id) ON DELETE CASCADE,
  producto_id       UUID NOT NULL REFERENCES producto(id),
  cantidad_kg       NUMERIC(12,3) NOT NULL,
  precio_publico    NUMERIC(12,2) NOT NULL,
  precio_interno    NUMERIC(12,2) NOT NULL,
  subtotal_interno  NUMERIC(12,2) NOT NULL
);

-- ─── Alertas del sistema ─────────────────────────────────────────────────────

CREATE TABLE alerta_sistema (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id     UUID REFERENCES sucursal(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES producto(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,    -- 'stock_negativo_prolongado', 'codigo_duplicado', etc.
  mensaje         TEXT NOT NULL,
  estado          estado_alerta NOT NULL DEFAULT 'activa',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelta_at     TIMESTAMPTZ
);

-- ─── PIN de alta remota de urgencia ──────────────────────────────────────────

CREATE TABLE pin_emergencia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash        TEXT NOT NULL UNIQUE,    -- SHA-256(pin + JWT_SECRET)
  sucursal_id     UUID NOT NULL REFERENCES sucursal(id),
  usado           BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ NOT NULL,    -- 30 minutos desde creación
  created_by      UUID NOT NULL REFERENCES usuario(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Vistas útiles ───────────────────────────────────────────────────────────

-- Stock actual por sucursal y producto (suma de todos los movimientos)
CREATE OR REPLACE VIEW v_stock_actual AS
SELECT
  s.id           AS sucursal_id,
  s.nombre       AS sucursal_nombre,
  p.id           AS producto_id,
  p.plu,
  p.descripcion,
  p.familia,
  p.precio,
  p.unidad_medida,
  COALESCE(SUM(m.cantidad), 0) AS stock_actual
FROM sucursal s
CROSS JOIN producto p
LEFT JOIN movimiento_stock m
  ON m.sucursal_id = s.id AND m.producto_id = p.id
WHERE p.activo = TRUE AND s.activa = TRUE
GROUP BY s.id, s.nombre, p.id, p.plu, p.descripcion, p.familia, p.precio, p.unidad_medida;

-- Saldo actual por cliente
CREATE OR REPLACE VIEW v_saldo_clientes AS
SELECT
  c.id,
  c.nombre,
  c.documento,
  c.telefono,
  c.saldo_cuenta_corriente,
  COUNT(m.id) AS total_movimientos
FROM cliente c
LEFT JOIN movimiento_cuenta_corriente m ON m.cliente_id = c.id
WHERE c.activo = TRUE
GROUP BY c.id, c.nombre, c.documento, c.telefono, c.saldo_cuenta_corriente;

-- Rentabilidad por sucursal: ventas al público + margen de ventas internas
CREATE OR REPLACE VIEW v_rentabilidad_sucursal AS
SELECT
  s.id            AS sucursal_id,
  s.nombre,
  COALESCE(vp.total_ventas_publico,  0) AS ventas_publico,
  COALESCE(vi_sal.total_int_salida,  0) AS ingresos_ventas_internas,
  COALESCE(vi_ent.total_int_entrada, 0) AS costo_ventas_internas,
  COALESCE(vp.total_ventas_publico,  0)
    + COALESCE(vi_sal.total_int_salida, 0)
    - COALESCE(vi_ent.total_int_entrada, 0) AS rentabilidad_neta
FROM sucursal s
LEFT JOIN (
  SELECT sucursal_id, SUM(total_importe) AS total_ventas_publico
  FROM venta GROUP BY sucursal_id
) vp ON vp.sucursal_id = s.id
LEFT JOIN (
  SELECT sucursal_origen_id AS sucursal_id, SUM(total_precio_interno) AS total_int_salida
  FROM venta_interna WHERE estado = 'confirmada'
  GROUP BY sucursal_origen_id
) vi_sal ON vi_sal.sucursal_id = s.id
LEFT JOIN (
  SELECT sucursal_destino_id AS sucursal_id, SUM(total_precio_interno) AS total_int_entrada
  FROM venta_interna WHERE estado = 'confirmada'
  GROUP BY sucursal_destino_id
) vi_ent ON vi_ent.sucursal_id = s.id
WHERE s.activa = TRUE;

-- ─── Índices de performance ───────────────────────────────────────────────────

CREATE INDEX idx_venta_sucursal_fecha     ON venta (sucursal_id, created_at DESC);
CREATE INDEX idx_venta_interna_estado     ON venta_interna (estado, sucursal_destino_id);
CREATE INDEX idx_mov_cc_cliente           ON movimiento_cuenta_corriente (cliente_id, created_at DESC);
CREATE INDEX idx_alerta_activa            ON alerta_sistema (estado) WHERE estado = 'activa';
CREATE INDEX idx_producto_plu             ON producto (plu);
CREATE INDEX idx_producto_ean             ON producto (codigo_ean) WHERE codigo_ean IS NOT NULL;
CREATE INDEX idx_pin_hash                 ON pin_emergencia (pin_hash) WHERE usado = FALSE;

-- ─── Datos iniciales ─────────────────────────────────────────────────────────

INSERT INTO tipo_media (id, nombre) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Media res vacuna'),
  ('00000000-0000-0000-0000-000000000002', 'Media res porcina');

-- Fin del schema
-- Para ejecutar: psql -U <usuario> -d <base> -f schema.sql
