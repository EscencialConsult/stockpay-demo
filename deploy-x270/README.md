# Deploy de StockPay Web Demo en x270-server

Convierte la app de escritorio StockPay (Electron + React + Express + sql.js) en una demo
web pública, para que un vendedor la muestre desde el navegador sin instalar el programa.
El backend (`server/`) ya era agnóstico de Electron — `createServer()` solo necesita rutas de
disco y un secreto JWT — así que corre igual en un contenedor Docker común.

## Qué se sacó / adaptó de la versión de escritorio

- `src/bridge.ts`: el "modo navegador" (que ya existía, para desarrollo sin Electron) ahora
  apunta siempre a `/api` relativo en vez de `http://127.0.0.1:8001` — así Netlify puede
  proxearlo al backend real sin tocar el resto del código.
- `vite.config.ts`: agregado un proxy de `/api` a `localhost:8001` solo para desarrollo local
  de esta demo (`npm run dev:web`).
- `server/standalone.js` (nuevo): levanta `createServer()` fuera de Electron, con las rutas de
  datos fijas en `/data` (para Docker) y puerto desde `PORT`.
- Nada del núcleo de negocio (Caja, Catálogo, Clientes, Cierre de caja, Equipo) se tocó — es
  exactamente el mismo código que corre en la app instalada.

## Advertencia importante: instancia única y compartida

Esta demo es **una sola base de datos SQLite compartida por todos los que entren a la web** —
no es multi-tenant como Carnicería. Si un vendedor la muestra y un prospecto borra productos o
cambia precios, el próximo que entre ve esos cambios. Por eso se agregó `reset-demo.sh`
(borra todo y vuelve a cargar el catálogo de ejemplo), pensado para correr por cron cada
varias horas. Si hace falta que cada demo sea 100% aislada por sesión, es un cambio de
arquitectura más grande (una base por sesión) — avisar si se necesita antes de vender así.

## Pasos de deploy

1. **Clonar el repo en el servidor:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~ && git clone https://github.com/EscencialConsult/stockpay-web-demo.git"
   ```

2. **Crear el `.env`** en la raíz del clon (`~/stockpay-web-demo/.env`, nunca en el repo):
   ```
   JWT_SECRET=<un secreto random largo>
   ```

3. **Levantar el contenedor:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~/stockpay-web-demo && docker compose up -d --build"
   ```

4. **Publicar el puerto 8084 a internet — resuelto con Tailscale Funnel, sin Cloudflare**
   (Facundo confirmó 2026-09-14: nada de túneles de Cloudflare nuevos, solo Tailscale).
   Los 3 puertos públicos del nodo (443, 8443, 10000) ya estaban usados por Core-Talent,
   Kaplan-front y `stockpay-backend`, así que se agregó una ruta por PATH dentro del puerto
   10000 ya público, sin pisar el mapping raíz existente:
   ```bash
   tailscale funnel --bg --https=10000 --set-path=/stockpay-web http://127.0.0.1:8084
   tailscale funnel status   # confirmar que "/" (stockpay-backend) sigue intacto
   ```
   Confirmado funcionando 2026-09-14: `https://x270-server.taild45448.ts.net:10000/` sigue
   yendo a `stockpay-backend` y `https://x270-server.taild45448.ts.net:10000/stockpay-web/`
   va a este backend. Si algún día se necesita reconstruir este mapping (reinicio del
   servicio de Tailscale, etc.), correr el mismo comando de arriba.

5. **`netlify.toml`** ya tiene el redirect `/api/*` apuntando a
   `https://x270-server.taild45448.ts.net:10000/stockpay-web/api/:splat` — no hace falta
   tocarlo salvo que cambie el path o el puerto.

6. **Auto-deploy con cron:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "chmod +x ~/stockpay-web-demo/deploy-x270/deploy.sh && (crontab -l; echo '* * * * * /home/escencial/stockpay-web-demo/deploy-x270/deploy.sh') | crontab -"
   ```

7. **Reset periódico de la demo compartida** (ver advertencia arriba) — cada 4 horas, por ejemplo:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "chmod +x ~/stockpay-web-demo/deploy-x270/reset-demo.sh && (crontab -l; echo '0 */4 * * * /home/escencial/stockpay-web-demo/deploy-x270/reset-demo.sh') | crontab -"
   ```

8. **Verificar:**
   ```bash
   curl -s http://127.0.0.1:8084/api/health   # desde el propio servidor
   ```
   Debería devolver `{"status":"ok"}`. Login demo: usuario `admin`, contraseña `admin`.

## Documentar

Agregar `stockpay-web-backend` a la tabla "Qué corre en el servidor" y el puerto `8084` a la
tabla de puertos ocupados en la skill `servidor-local`.
