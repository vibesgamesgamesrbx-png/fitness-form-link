import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  base: "/fitness-form-link/",
  plugins: [react(), tsconfigPaths(), TanStackRouterVite()],
});
