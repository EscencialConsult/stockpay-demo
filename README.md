# StockPay DEMO

Versión demo del sistema de gestión para carnicerías (multisucursal, POS, inventario,
cuentas corrientes) — clonada de `one-sistema-carnicerias` para mostrarse como producto
propio, separada del repo de la app real.

- `carniceria-app/` — frontend (Vite + React + Tailwind), se despliega en Netlify.
- `carniceria-api/` — backend (Express + Prisma + Postgres), se despliega en Docker en
  el servidor de Escencial (x270-server).
- `deploy-x270/` — guía y script de deploy del backend en el servidor.
- `docker-compose.yml` — contenedores del backend + Postgres para la demo.
