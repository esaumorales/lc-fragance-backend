# Despliegue en AWS

La pila entera corre en una sola EC2: Postgres, el backend y Caddy delante
sacando el certificado TLS. El frontend no esta aca, va en Vercel.

```
Internet --> Caddy (443) --> backend (4001) --> postgres (5432, red interna)
```

Postgres no publica puertos: solo el backend lo alcanza por la red de Docker.
El 22 tampoco esta abierto salvo para la IP del administrador, y el workflow
lo abre para si mismo solo mientras dura el despliegue.

## Lo que ya existe

Creado con AWS CLI en la cuenta 516633645680, region us-east-1.

| Recurso | Identificador |
| --- | --- |
| Instancia | `i-07e22ed4734011dab` (t3.micro, Ubuntu 24.04) |
| IP elastica | `13.216.172.225` |
| Grupo de seguridad | `sg-0dbd60e73b5098397` |
| Par de claves | `lc-fragance` (privada en `~/.ssh/lc-fragance.pem`) |
| Usuario IAM del CI | `lc-fragance-ci` |
| Dominio de la API | `13-216-172-225.sslip.io` |

Reglas de entrada:

| Puerto | Origen | Para que |
| --- | --- | --- |
| 22 | la IP del administrador | SSH |
| 22 | la IP del runner, temporal | despliegue |
| 80 | 0.0.0.0/0 | el reto HTTP de Let's Encrypt |
| 443 | 0.0.0.0/0 | la API |

## Lo que cuesta

La cuenta esta en la capa gratuita nueva, la de creditos, no en la de 750 h/mes
por doce meses: **100 USD de credito que vencen el 23 de marzo de 2027**.

| Concepto | Precio | Al mes |
| --- | --- | --- |
| t3.micro | 0.0104 USD/h | 7.59 |
| Disco gp3 20 GB | 0.08 USD/GB-mes | 1.60 |
| IPv4 publica | 0.005 USD/h | 3.65 |
| Trafico de salida | 0 hasta 100 GB/mes | 0 |
| **Total** | | **12.84** |

Los creditos cubren el periodo completo hasta que venzan. La IPv4 se cobra
desde 2024 aunque la instancia sea de capa gratuita, y cuesta igual sea
elastica o automatica; conviene la elastica porque no cambia al reiniciar.

## Secretos que espera el workflow

En el repositorio, Settings, Secrets and variables, Actions:

| Secreto | Valor |
| --- | --- |
| `SSH_HOST` | `13.216.172.225` |
| `SSH_USER` | `ubuntu` |
| `SSH_KEY` | el contenido de `~/.ssh/lc-fragance.pem`, con las lineas BEGIN y END |
| `AWS_ACCESS_KEY_ID` | del usuario `lc-fragance-ci` |
| `AWS_SECRET_ACCESS_KEY` | idem |

No hace falta token de GHCR: para bajar la imagen alcanza el `GITHUB_TOKEN` de
la propia ejecucion, que vence al terminar.

## Como despliega

Un push a `production` dispara CI. Si pasa, Deploy compila la imagen en los
runners de GitHub (no en la EC2, que no tiene RAM para eso), la publica en
GHCR, abre el 22 para la IP del runner, entra por SSH, hace `pull` y `up -d`, y
cierra el puerto. El paso de cierre corre con `if: always()`, asi que tambien
se ejecuta si el despliegue falla.

Las migraciones de Prisma corren solas al arrancar el contenedor, esta en el
`CMD` de la imagen.

`test` y `esau` solo corren CI.

## Primer arranque

El admin inicial se crea una sola vez, con la clave que esta en el `.env` del
servidor:

```bash
cd ~/lc-fragance-backend/deploy
docker compose -f docker-compose.prod.yml exec backend node dist/seed.js
```

Comprobacion: `curl https://13-216-172-225.sslip.io/api/health` responde 200.

## Frontend en Vercel

Import del repositorio del frontend, rama `production`, y una variable:

```
NEXT_PUBLIC_API_URL = https://13-216-172-225.sslip.io
```

Cuando Vercel de el dominio definitivo hay que ponerlo en `CLIENT_URL` del
`.env` del servidor y reiniciar el backend: de ahi sale la lista blanca de CORS
y sin eso el navegador bloquea las llamadas.

## Cuando haya dominio propio

sslip.io resuelve cualquier nombre de la forma `13-216-172-225.sslip.io` a esa
IP, sin configurar DNS, y Let's Encrypt le emite certificado real. Sirve para
arrancar sin pagar. Para pasar a un dominio propio:

1. Registro A: `api.tudominio.com` a `13.216.172.225`.
2. En el `.env` del servidor, cambiar `API_DOMAIN`.
3. `docker compose -f docker-compose.prod.yml up -d caddy`.

Caddy saca el certificado nuevo solo. No hay que tocar nada mas.

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
| Caddy no saca certificado | el puerto 80 esta cerrado, o el dominio no resuelve a esta IP |
| El backend reinicia en bucle | mirar `logs backend`; casi siempre falta una variable en `.env` |
| 502 desde Caddy | el backend no arranco; `ps` muestra el contenedor caido |
| CORS bloqueado en el navegador | `CLIENT_URL` no coincide exactamente con el dominio de Vercel |
| El despliegue no entra por SSH | cambio la IP del administrador, o el paso de apertura fallo |
| Se queda sin memoria al compilar | no compiles en la EC2, la imagen viene hecha de CI |

## Si cambia tu IP

La regla de SSH apunta a una IP fija. Si tu conexion cambia:

```bash
aws ec2 revoke-security-group-ingress --group-id sg-0dbd60e73b5098397 \
  --protocol tcp --port 22 --cidr LA_VIEJA/32
aws ec2 authorize-security-group-ingress --group-id sg-0dbd60e73b5098397 \
  --protocol tcp --port 22 --cidr $(curl -s https://checkip.amazonaws.com)/32
```

## Apagar todo

Para dejar de pagar hay que liberar tambien la IP elastica: una IP asignada y
sin instancia se cobra igual.

```bash
aws ec2 terminate-instances --instance-ids i-07e22ed4734011dab
aws ec2 release-address --allocation-id ALLOCATION_ID
```
