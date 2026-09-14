# Deploy de la demo StockPay en x270-server

Backend (Express + Prisma) y Postgres corren en el servidor de Escencial. El frontend
(Netlify) le pega a este backend a través de un proxy de Netlify, para que no haga falta
CORS ni tocar el código del frontend.

## OK para el deploy

`stockpay-db` + `stockpay-backend` quedan autorizados como deploy propio de Facundo desde el
**2026-09-14** (OK dado por Facundo directamente, sin necesidad del de Santiago — ver la
skill `servidor-local`, tabla de excepciones). La regla de oro del servidor sigue aplicando
100% a todo lo demás (n8n, su Postgres, `medexis_sync`, `waha`, la config del sistema).

## Pasos de deploy

1. **Clonar el repo (público) en el servidor:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~ && git clone https://github.com/EscencialConsult/stockpay-demo.git"
   ```

2. **Crear el `.env`** en la raíz del clon (`~/stockpay-demo/.env`, nunca en el repo):
   ```
   DB_PASSWORD=<una password random larga>
   JWT_SECRET=<otro secreto random largo, no reusar el de otro proyecto>
   ```

3. **Levantar los contenedores:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~/stockpay-demo && docker compose up -d --build"
   ```

4. **Correr el seed de datos demo** (el `CMD` del Dockerfile ya corre `prisma migrate deploy`
   al arrancar; el seed con los usuarios de prueba se corre una sola vez a mano):
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~/stockpay-demo && docker compose exec stockpay-backend node prisma/seed.js"
   ```
   Los usuarios demo quedan definidos en `carniceria-api/prisma/seed.js` (roles: admin,
   subadmin, socio, cajero).

5. **Publicar el puerto 8083 a internet con Tailscale Funnel:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "tailscale funnel --bg --https=10000 8083"
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 "tailscale funnel status"
   ```
   El flag `--https=10000` va siempre explícito — sin él se pisa el mapping de otro proyecto
   en el puerto 443 por defecto (ya pasó una vez con Core-Talent).

   El link público queda: `https://x270-server.taild45448.ts.net:10000`

6. **`netlify.toml`** ya tiene el redirect `/api/*` apuntando a esa URL — solo confirmar que
   coincide una vez que el Funnel esté arriba.

7. **Auto-deploy con cron** — cada push a `main` se refleja solo en el backend:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "chmod +x ~/stockpay-demo/deploy-x270/deploy.sh && (crontab -l; echo '* * * * * /home/escencial/stockpay-demo/deploy-x270/deploy.sh') | crontab -"
   ```
   (`git reset --hard` en cada deploy — nunca editar código directo en el clon del servidor.)

8. **Verificar:**
   ```bash
   curl -s https://x270-server.taild45448.ts.net:10000/health
   ```
   Debería devolver `{"ok":true}`.

## Documentar

Después de levantarlo, agregar `stockpay-db` / `stockpay-backend` a la tabla "Qué corre en el
servidor" y el puerto `8083` (+ funnel `10000`) a la tabla de puertos ocupados en la skill
`servidor-local`, igual que se hizo con Core-Talent, COMRURAL y Kaplan-front.

## Por qué esta arquitectura y no otra

- **Netlify sigue haciendo lo que ya hacía** (build del frontend, sin tocar código ni
  diseño) — el proxy `/api/*` es la única línea nueva en `netlify.toml`.
- **Sin CORS**: el navegador solo ve un origen (el de Netlify); Netlify reenvía `/api/*`
  al servidor por detrás. El frontend sigue llamando a `/api/...` relativo, tal cual está hoy.
- **Postgres sin puerto publicado al host**, igual que el patrón ya usado para n8n — nadie
  en la LAN puede pegarle directo a la base.
- **Cron en vez de webhook/GitHub Actions**: GitHub no puede entrar a la LAN de la oficina
  sin abrir puertos, y un runner de Actions necesita instalarse como servicio (sudo). Mismo
  criterio que ya se usó en COMRURAL.
- **Nombres `stockpay-*` en vez de `carniceria-*`**: este repo es la demo comercial
  (StockPay), separada del repo real de la app — si algún día ese proyecto también se
  despliega en la X270, no colisiona con esto.
