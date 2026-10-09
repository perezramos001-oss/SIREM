# SIREM

Sistema de remisiones y cartera de Talabartería San Fermín.
Frontend en React + Vite y backend en Express + MySQL.

## Variables de entorno (`.env`)

| Variable      | Descripción                                                        |
| ------------- | ------------------------------------------------------------------ |
| `DB_HOST`     | Host de MySQL                                                      |
| `DB_USER`     | Usuario de MySQL                                                   |
| `DB_PASSWORD` | Contraseña de MySQL                                                |
| `DB_NAME`     | Base de datos                                                      |
| `JWT_SECRET`  | Clave para firmar las sesiones. Usa un texto largo y aleatorio.    |
| `PORT`        | Puerto del servidor (por defecto 3001)                             |

Si falta `JWT_SECRET` el servidor genera una clave temporal y todas las
sesiones se cierran cada vez que se reinicia.

## Desarrollo

```bash
npm install
npm start      # backend en http://localhost:3001
npm run dev    # frontend con Vite (redirige /api al backend)
```

## Producción

```bash
npm run build  # genera dist/
npm start      # Express sirve dist/ y la API en /api
```

## Autenticación y auditoría

- `POST /api/login` devuelve un token que el frontend envía en el
  encabezado `Authorization: Bearer <token>` (ver `src/utils/api.js`).
- Todas las demás rutas de `/api` exigen el token; el usuario se toma del
  token, nunca del cuerpo de la petición.
- Cada inicio de sesión y cada operación que crea o modifica datos queda
  registrada en la tabla `auditoria` con el usuario que la hizo.

## Índice de números de remisión

Al arrancar, el servidor crea el índice `UNIQUE` sobre
`remisiones.numero_remision` si no existe. Si ya hay números repetidos,
no lo crea y los muestra en el log para corregirlos.
