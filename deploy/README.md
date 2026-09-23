# Despliegue en AWS

La pila entera corre en una sola EC2: Postgres, el backend y Caddy delante
sacando el certificado TLS. El frontend no esta aca, va en Vercel.

```
Internet --> Caddy (443) --> backend (4001) --> postgres (5432, red interna)
```

Postgres no publica puertos: solo el backend lo alcanza por la red de Docker.
Eso evita el ataque mas comun a una base de datos expuesta.

## Lo que cuesta

| Concepto | Ano 1 | Despues |
| --- | --- | --- |
| EC2 t3.micro | 0 (750 h/mes de capa gratuita) | ~7.50 |
| Disco EBS 20 GB gp3 | 0 (30 GB gratis) | ~1.60 |
| IPv4 publica | ~3.60 | ~3.60 |
| Trafico de salida | 0 hasta 100 GB/mes | igual |
| **Total al mes** | **~4 USD** | **~13 USD** |

La IPv4 publica se cobra desde 2024 aunque la instancia sea gratuita: son
0.005 USD/hora y es el unico gasto real del primer ano.

Vercel Hobby cubre el frontend en 0 mientras el proyecto no sea comercial.

## 1. Crear la instancia

Consola de AWS, EC2, Launch instance:

- **AMI**: Ubuntu Server 24.04 LTS (64-bit x86)
- **Tipo**: t3.micro (marcado "Free tier eligible")
- **Key pair**: crear una nueva, tipo ED25519, formato `.pem`. Se descarga una
  sola vez; si se pierde no hay forma de recuperarla.
- **Disco**: 20 GB gp3
- **Security group**: solo estos tres de entrada

  | Puerto | Origen | Para que |
  | --- | --- | --- |
  | 22 | tu IP, no 0.0.0.0/0 | SSH |
  | 80 | 0.0.0.0/0 | el reto HTTP de Let's Encrypt |
  | 443 | 0.0.0.0/0 | la API |

Al terminar, en Elastic IPs: Allocate y asociala a la instancia. Sin eso la IP
cambia en cada reinicio y el DNS queda apuntando a la nada.

## 2. Preparar el servidor

```bash
chmod 400 lc-fragance.pem
ssh -i lc-fragance.pem ubuntu@TU_IP
```

Ya dentro:

```bash
sudo apt update && sudo apt upgrade -y

# Docker desde el repositorio oficial; el de Ubuntu viene viejo.
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# 2 GB de swap: la t3.micro tiene 1 GB de RAM y Postgres mas Node no entran.
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Parches de seguridad solos, sin reinicios sorpresa.
sudo apt install -y unattended-upgrades

exit
```

Hay que salir y volver a entrar para que el grupo `docker` tome efecto.

## 3. DNS

En el panel del dominio, un registro A:

| Nombre | Tipo | Valor |
| --- | --- | --- |
| api | A | la Elastic IP |

Caddy solo saca el certificado cuando el dominio ya resuelve, asi que conviene
esperar a que `dig api.tudominio.com` devuelva la IP antes de arrancar.

## 4. Subir la configuracion

Desde tu maquina:

```bash
ssh -i lc-fragance.pem ubuntu@TU_IP "mkdir -p ~/lc-fragance-backend"
scp -i lc-fragance.pem -r deploy ubuntu@TU_IP:~/lc-fragance-backend/
```

Solo va la carpeta `deploy`. El codigo no: llega como imagen de Docker desde
GHCR, ya compilada.

En el servidor:

```bash
cd ~/lc-fragance-backend/deploy
cp .env.example .env
nano .env
```

Los secretos se generan, no se inventan:

```bash
openssl rand -hex 32   # uno para JWT_ACCESS_SECRET
openssl rand -hex 32   # otro distinto para JWT_REFRESH_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
```

`BACKEND_IMAGE` lleva tu usuario de GitHub en minuscula:
`ghcr.io/esaumorales/lc-fragance-backend:latest`.

Despues:

```bash
chmod 600 .env
```

## 5. Secretos en GitHub

Settings, Secrets and variables, Actions, en el repositorio del backend:

| Secreto | Valor |
| --- | --- |
| `SSH_HOST` | la Elastic IP |
| `SSH_USER` | `ubuntu` |
| `SSH_KEY` | el contenido completo del `.pem`, incluidas las lineas BEGIN y END |
| `GHCR_TOKEN` | un Personal Access Token classic con permiso `read:packages` |

El token hace falta porque el servidor tiene que bajar la imagen de GHCR, y el
`GITHUB_TOKEN` del workflow no existe fuera de la ejecucion.

## 6. Primer arranque

```bash
cd ~/lc-fragance-backend/deploy
docker login ghcr.io -u TU_USUARIO
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

Las migraciones de Prisma corren solas al arrancar el contenedor, esta en el
`CMD` de la imagen. Para crear el admin inicial, una sola vez:

```bash
docker compose -f docker-compose.prod.yml exec backend node dist/seed.js
```

Comprobacion: `curl https://api.tudominio.com/api/health` responde 200.

## 7. Frontend en Vercel

Import del repositorio del frontend, rama `production`, y una variable:

```
NEXT_PUBLIC_API_URL = https://api.tudominio.com
```

Cuando Vercel de el dominio definitivo, hay que ponerlo en `CLIENT_URL` del
`.env` del servidor y reiniciar el backend: de ahi sale la lista blanca de CORS
y sin eso el navegador bloquea las llamadas.

## 8. De ahi en adelante

Un push a `production` dispara CI; si pasa, Deploy compila la imagen en los
runners de GitHub (no en la EC2, que no tiene RAM para eso), la publica en GHCR
y entra por SSH a hacer `pull` y `up -d`. Nada manual.

`test` y `esau` solo corren CI.

## Respaldos

Un volcado diario comprimido, catorce dias de historia:

```bash
mkdir -p ~/respaldos
cat > ~/respaldar.sh <<'EOF'
#!/bin/bash
set -e
cd ~/lc-fragance-backend/deploy
source .env
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > ~/respaldos/$(date +%F).sql.gz
find ~/respaldos -name '*.sql.gz' -mtime +14 -delete
EOF
chmod +x ~/respaldar.sh
(crontab -l 2>/dev/null; echo "0 4 * * * ~/respaldar.sh") | crontab -
```

Queda en el mismo disco, que protege de un error de datos pero no de perder la
instancia. Para eso, un bucket S3 con regla de ciclo de vida a Glacier cuesta
centavos; vale la pena cuando haya pedidos de verdad.

## Si algo falla

| Sintoma | Causa habitual |
| --- | --- |
| Caddy no saca certificado | el DNS todavia no propago, o el puerto 80 esta cerrado |
| El backend reinicia en bucle | mirar `logs backend`; casi siempre falta una variable en `.env` |
| 502 desde Caddy | el backend no arranco; `ps` muestra el contenedor caido |
| CORS bloqueado en el navegador | `CLIENT_URL` no coincide exactamente con el dominio de Vercel |
| Se queda sin memoria al compilar | no compiles en la EC2, la imagen viene hecha de CI |
