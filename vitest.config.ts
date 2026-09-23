import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Deja las variables listas antes de cargar cualquier modulo bajo prueba.
    setupFiles: ["./src/__tests__/setup-env.ts"],
  },
});
