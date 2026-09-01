import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
      failOnError: true,
      // These routes depend on runtime state/query parameters and must be rendered on demand.
      filter: ({ path }: { path: string }) =>
        path !== "/admin" && path !== "/pagamento-confirmado",
    },
  },
});
