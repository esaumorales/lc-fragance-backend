// Quita la barra final y unifica mayusculas: "https://X.app/" y "https://x.app"
// son el mismo origen, pero comparados como texto no coinciden.
function normalizar(origen: string): string {
  return origen.trim().replace(/\/+$/, "").toLowerCase();
}

// Separa la lista de CLIENT_URL, que admite varios origenes por coma.
export function parsearOrigenes(valor: string): string[] {
  return valor
    .split(",")
    .map(normalizar)
    .filter((origen) => origen.length > 0);
}

export function esOrigenPermitido(origen: string | undefined, permitidos: string[]): boolean {
  // Sin cabecera Origin no hay navegador que proteger: curl, health checks
  // y las apps moviles no mandan ninguna.
  if (!origen) {
    return true;
  }
  return permitidos.includes(normalizar(origen));
}

type Callback = (error: Error | null, permitido?: boolean) => void;

// El comprobador que comparten Express y Socket.IO.
export function comprobadorDeOrigen(permitidos: string[]) {
  return (origen: string | undefined, callback: Callback): void => {
    if (esOrigenPermitido(origen, permitidos)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origen no permitido por CORS: ${origen}`));
  };
}
