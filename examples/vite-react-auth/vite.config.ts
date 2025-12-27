import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vite";

function headersApi(): PluginOption {
  return {
    name: "headers-api",
    configureServer(server) {
      server.middlewares.use("/api/headers", (req, res) => {
        const headerName = "x-test-header";
        const value = req.headers[headerName] ?? null;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ [headerName]: value }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), headersApi()],
});

