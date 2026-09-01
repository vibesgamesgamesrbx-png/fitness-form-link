import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    // This application contains runtime-only routes such as the payment
    // confirmation page and authenticated admin area. Let the server render
    // routes on demand instead of crawling/prerendering them during build.
    prerender: {
      enabled: false,
    },
  },
});
