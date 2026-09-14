# Deploy de la demo Carnicería en x270-server

Backend (Express + Prisma) y Postgres corren en el servidor de Escencial. El frontend
(Netlify, ya configurado) le pega a este backend a través de un proxy de Netlify, para que
no haga falta CORS ni tocar el código del frontend.

## ⛔ Antes de tocar el servidor: falta el OK de Santiago

Este proyecto (`carniceria-db` + `carniceria-backend`) **no está** en la lista de deploys
propios ya autorizados en la X270 (Core-Talent, COMRURAL, Kaplan-front). Levantar contenedores
Docker nuevos ahí requiere su OK explícito antes de correr un solo comando en el servidor.

**Mensaje sugerido para mandarle a Santiago:**

> Santiago, ¿me das OK para levantar 2 contenedores Docker nuevos en la X270 para una demo?
> Uno es un Postgres (`postgres:16-alpine`, sin puerto publicado al host, igual que el de
> n8n) y el otro es un backend Node/Express propio (imagen que build yo desde mi repo). Uso
> el puerto 8083 para el backend (libre según la tabla de puertos) y publico el acceso
> externo con Tailscale Funnel en el puerto 10000 (443 y 8443 ya están tomados por
> Core-Talent y Kaplan). No toco nada de lo tuyo (n8n, su Postgres, waha).

## Una vez que dé el OK

1. **Elegir secretos y guardarlos en un `.env` en el servidor** (nunca en el repo):
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 "mkdir -p ~/carniceria"
   ```
   Clonar el repo (público) directo por HTTPS:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~ && git clone https://github.com/EscencialConsult/one-sistema-carnicerias.git carniceria"
   ```
   Crear el `.env` en la raíz del clon (`~/carniceria/.env`) con:
   ```
   DB_PASSWORD=<una password random larga>
   JWT_SECRET=<otro secreto random largo, no reusar el de otro proyecto>
   ```

2. **Levantar los contenedores:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~/carniceria && docker compose up -d --build"
   ```

3. **Correr migraciones + seed de datos demo** (el `CMD` del Dockerfile ya corre
   `prisma migrate deploy` al arrancar; el seed con los usuarios de prueba se corre una sola
   vez a mano):
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "cd ~/carniceria && docker compose exec carniceria-backend node prisma/seed.js"
   ```
   Usuarios demo que quedan creados (ver `carniceria-api/prisma/seed.js`):
   admin@test.com, subadmin@test.com, socio@test.com, cajero@test.com — todos con
   password `Admin1234!`.

4. **Publicar el puerto 8083 a internet con Tailscale Funnel** (una sola vez, si todavía no
   se hizo `sudo tailscale set --operator=escencial` en este servidor, pedirlo también):
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "tailscale funnel --bg --https=10000 8083"
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 "tailscale funnel status"
   ```
   ⚠️ El flag `--https=10000` va siempre explícito — sin él se pisa el mapping de otro
   proyecto en el puerto 443 por defecto (ya pasó una vez con Core-Talent).

   El link público queda:
   ```
   https://x270-server.taild45448.ts.net:10000
   ```

5. **Actualizar `netlify.toml`** (raíz del repo) reemplazando la URL de ejemplo del redirect
   `/api/*` por la real de arriba — ya está el redirect armado en este commit, solo falta
   confirmar que el dominio coincide una vez que el Funnel esté arriba.

6. **Auto-deploy con cron** — cada push a `main` se refleja solo en el backend:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes escencial@192.168.87.150 \
     "chmod +x ~/carniceria/deploy-x270/deploy.sh && (crontab -l; echo '* * * * * /home/escencial/carniceria/deploy-x270/deploy.sh') | crontab -"
   ```
   (`git reset --hard` en cada deploy — nunca editar código directo en el clon del servidor.)

7. **Verificar:**
   ```bash
   curl -s https://x270-server.taild45448.ts.net:10000/health
   ```
   Debería devolver `{"ok":true}`.

## Documentar

Después de levantarlo, agregar `carniceria-db` / `carniceria-backend` a la tabla "Qué corre
en el servidor" y el puerto `8083` (+ funnel `10000`) a la tabla de puertos ocupados en la
skill `servidor-local` (`C:\Users\PERSONAL\.claude\skills\servidor-local\SKILL.md`), igual
que se hizo con Core-Talent, COMRURAL y Kaplan-front.

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
