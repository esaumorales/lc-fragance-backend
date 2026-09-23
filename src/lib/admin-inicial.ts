const EMAIL_POR_DEFECTO = "admin@lcfragance.com";
const CLAVE_DE_DESARROLLO = "LcFraganceAdmin123";

export type AdminInicial = {
  email: string;
  password: string;
  // Si la clave es la de desarrollo se puede mostrar; la real nunca se imprime.
  esDeDesarrollo: boolean;
};

// Decide con qué credenciales crea el seed el primer admin. En producción no se
// acepta la clave por defecto: está en el repositorio y seria publica.
export function resolverAdminInicial(env: NodeJS.ProcessEnv): AdminInicial {
  const email = env.ADMIN_EMAIL?.trim() || EMAIL_POR_DEFECTO;
  const claveDelEntorno = env.ADMIN_PASSWORD?.trim();

  if (!claveDelEntorno && env.NODE_ENV === "production") {
    throw new Error("Falta ADMIN_PASSWORD: en producción no se usa la clave por defecto");
  }

  return {
    email,
    password: claveDelEntorno || CLAVE_DE_DESARROLLO,
    esDeDesarrollo: !claveDelEntorno,
  };
}
