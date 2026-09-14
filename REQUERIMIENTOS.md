# Sistema de Gestión Multisucursal para Carnicerías
## Documento de Funcionalidades — Junio 2026

**Escencial Consultora** — San Salvador de Jujuy, Argentina

El presente documento detalla las funcionalidades requeridas para el sistema de gestión integral de la cadena de carnicerías, conforme al relevamiento realizado con el cliente. En palabras del propio cliente, el sistema comprende tres pilares: **stock**, **cierre de caja** y **cuenta corriente**, implementados sobre una plataforma web multiusuario con vistas diferenciadas por rol, accesible desde cualquier ubicación.

---

## 1. Stock con despiece por rendimiento

- Ingreso de medias reses (vacuno y cerdo) por peso real al momento del desbaste (ejemplo: media res de 144 kg de peso real, 138,5 kg al desbaste).
- Conversión automática del ingreso en stock teórico de cortes mediante tabla de rendimientos parametrizable (porcentaje por corte, provista por el cliente). Referencia: el ingreso de diez medias reses debe generar el desglose total por corte (58 kg de lomo, 27 kg de costilla, etcétera).
- Descuento automático del stock teórico con cada venta registrada.
- Tolerancia de diferencia esperada en el control físico de 5 a 10 kg por corte, contemplando la merma por pérdida de humedad. Diferencias mayores indican faltante.
- Pollo: ingreso y egreso por kilo entero, sin conversión por despiece.
- Productos por unidad: gaseosas, carbón, huevos, calditos, condimentos e insumos de carnicería (cuchillos, delantales, ropa, repuestos), achuras, embutidos y elaborados.
- Ajuste de inventario periódico (cada 10 a 15 días) con reporte de diferencias entre stock teórico y físico, por corte y por sucursal.

---

## 2. Stock negativo controlado

- Permiso de venta con stock negativo para cubrir el desfasaje entre el retiro físico de mercadería y su carga administrativa (caso típico: retiro de media res el sábado por la tarde o por la noche, venta el domingo y carga administrativa el lunes).
- Recomposición automática del stock al registrarse el ingreso posterior desde la oficina.
- Alerta automática cuando un producto permanece en stock negativo durante más de cinco días, como indicador de error de carga.

---

## 3. Movimientos entre sucursales como ventas internas

- Todo movimiento de mercadería entre sucursales se registra como venta interna, nunca como transferencia ni pedido. Los pedidos se realizan por teléfono, fuera del sistema: lo que se registra es lo que sale, no lo que se solicita.
- La sucursal compradora se configura como cliente con un 10% de descuento sobre el precio de venta (porcentaje parametrizable). Ese margen constituye la ganancia de la sucursal que despieza y envía la mercadería.
- Flujo del circuito: la sucursal de origen pesa, emite el ticket y registra la salida; la venta queda en estado pendiente; la sucursal de destino controla kilos y cortes y confirma la recepción; con la confirmación se cierra el círculo, descontando el stock de origen y acreditándolo en destino.
- El mismo circuito aplica a los envíos desde casa central o depósito hacia las sucursales (medias reses, cajas de mercadería), con aceptación obligatoria por kilos recibidos (ejemplo: llega una media res de 236 kg y el cajero acepta 236 kg).
- La confirmación de recepción opera como deslinde de responsabilidad: lo aceptado sin control queda a cargo del receptor.
- Trazabilidad completa del circuito: quién envía, qué envía, en qué cantidad, quién recibe y qué acepta.

---

## 4. Punto de venta y caja

- Registro de ventas mediante el escaneo del ticket con código de barras emitido por la balanza (incluye peso, precio y total) y de productos con código EAN de fábrica, bajo el modelo operativo de supermercado: la cajera pasa cada bolsa por el lector.
- Sin integración directa con las balanzas: el dato ingresa exclusivamente por el escaneo del ticket en caja.
- Corrección automática del límite de importe del código de barras de balanza (tope de 9.999): el sistema interpreta el dígito faltante.
- Carga manual de venta para productos sin código de barras (huevo suelto, caldito).
- Medios de pago: efectivo, tarjeta de crédito, tarjeta de débito, QR, transferencia, billetera virtual y cuenta corriente.
- Emisión de ticket de control no fiscal. La facturación se gestiona por circuito separado, a cargo del contador.
- Registro diario de gastos y salidas de caja por sucursal.
- Cierre de caja diario por sucursal: contraste entre lo vendido registrado y lo ingresado por cada medio de pago, con verificación de coincidencia de totales.

---

## 5. Cuentas corrientes

- Alta y gestión de clientes con cuenta corriente (actualmente seis a siete clientes, principalmente paradores).
- Registro de cada retiro con emisión de ticket por comandera con el detalle completo: quién retira, qué retira, importe y saldo.
- Firma de conformidad del cliente sobre el comprobante, en reemplazo de la planilla diaria de papel.
- Saldo actualizado e histórico de movimientos por cliente.

---

## 6. Maestro de artículos y codificación

- Maestro de productos centralizado: alta, baja y modificación exclusivamente desde la oficina (administrador o subadministrador). Las sucursales no pueden agregar artículos.
- Mecanismo de alta remota de urgencia mediante código especial de autorización, para incorporar productos desde sucursales distantes (ejemplo: Yuto, a 60 km), incluso desde un teléfono celular.
- Alta de productos mediante lectura del código de barras con el lector, con asociación a artículo, familia y categoría.
- Validación de códigos duplicados y reglas de control con reporte de inconsistencias.
- Vinculación entre el código PLU de la balanza, el código de barras y el producto del sistema (ejemplo: código 1 corresponde a filet en la balanza y en el sistema).
- Soporte para la estandarización de códigos PLU: un código único por corte, idéntico en todas las sucursales. Actualmente los códigos difieren entre balanzas y existen familias de cortes que comparten un mismo código por tener igual precio (costilla, vacío, tapa, tira), las cuales deben separarse.
- Carga inicial estimada: 50 a 60 cortes de carne más los productos por unidad.

---

## 7. Carga centralizada de ingresos

- Todos los ingresos de stock (medias reses, gaseosas, carbón y mercadería general) son cargados por la oficina, aun cuando la mercadería llegue directamente a cada sucursal, de modo que el control no dependa de los vendedores.
- El subadministrador concentra los controles de stock: entradas, salidas y ventas.

---

## 8. Usuarios, roles y permisos

- Sistema 100% web, multiusuario, con vistas diferenciadas por rol, accesible desde cualquier ubicación y compatible con el hardware existente (PC de escritorio, comanderas y lectores de código de barras).
- **Administrador** (el titular): control total sobre maestro de artículos, precios, ingresos, usuarios y reportes.
- **Subadministrador** (administrativo de oficina): carga de ingresos, stock y movimientos centrales.
- **Socio** con perfil de solo lectura: visualización de la totalidad de movimientos y reportes, sin permiso de modificación alguno.
- **Vendedor / cajero**: únicamente vender, cobrar, indicar el medio de pago, registrar operaciones de cuenta corriente y confirmar la recepción de mercadería. Sin acceso a ninguna otra función del sistema.

---

## 9. Reportes y control de gestión

- Rentabilidad real por sucursal, depurada de las ventas internas, evitando que una sucursal registre como propia mercadería vendida por otra.
- Histórico completo de movimientos: ingresos, ventas, ventas internas y ajustes.
- Reporte de diferencias de inventario (stock teórico contra físico) por corte y por sucursal, con el objetivo declarado de detectar y minimizar el faltante de mercadería.
- Ranking de ventas por producto, corte y sucursal.
- Cierres de caja por sucursal y por período.
- Estados y saldos de cuentas corrientes.
- Alertas del sistema: stock negativo prolongado y códigos duplicados.
