import { createHash } from "crypto";

// Los refresh tokens ya son JWT de alta entropía; un hash rápido alcanza
// para no guardarlos en texto plano y poder buscarlos/revocarlos por hash.
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
