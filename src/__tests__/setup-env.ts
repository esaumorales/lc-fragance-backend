// src/config/env.ts valida al importarse, asi que sin estas variables las
// pruebas fallan en cualquier maquina sin .env, como pasa en CI.
//
// Se asignan antes que dotenv, que no pisa lo que ya existe: asi las pruebas
// corren con valores fijos y nunca apuntan a la base de datos real.
const valoresDePrueba: Record<string, string> = {
  DATABASE_URL: "postgresql://prueba:prueba@localhost:5432/prueba",
  JWT_ACCESS_SECRET: "secreto-de-prueba-para-el-access-token",
  JWT_REFRESH_SECRET: "secreto-de-prueba-para-el-refresh-token",
  CLIENT_URL: "http://localhost:3000",
};

for (const [clave, valor] of Object.entries(valoresDePrueba)) {
  process.env[clave] = valor;
}
