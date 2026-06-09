import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function familyCareRoutePlugin() {
  return {
    name: "apex-family-care-local-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = (req.url || "").split("?")[0];
        if (pathname === "/family-care" || pathname === "/family-care/") {
          req.url = "/family-care.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [familyCareRoutePlugin(), react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        familyCare: "family-care.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("mapbox-gl")) return "mapbox-gl";
            if (id.includes("react") || id.includes("react-dom")) return "react-vendor";
            if (id.includes("pdfkit")) return "pdf-vendor";
            return "vendor";
          }

          const normalizedId = id.replace(/\\/g, "/");
          const isLazyRouteModule =
            normalizedId.endsWith("/src/calculator-route-components.jsx")
            || normalizedId.endsWith("/src/calculator-utils.js")
            || normalizedId.endsWith("/src/support-route-components.jsx")
            || normalizedId.endsWith("/src/support-utils.js")
            || normalizedId.endsWith("/src/material-prep-route-components.jsx")
            || normalizedId.endsWith("/src/material-prep-utils.js")
            || normalizedId.endsWith("/src/rate-book-route-components.jsx")
            || normalizedId.endsWith("/src/communications-route-components.jsx")
            || normalizedId.endsWith("/src/employees-page-components.jsx")
            || normalizedId.endsWith("/src/change-orders-page-components.jsx")
            || normalizedId.endsWith("/src/delivery-tickets-page-components.jsx")
            || normalizedId.endsWith("/src/tool-checklist-page-components.jsx")
            || normalizedId.endsWith("/src/imported-job-drafts-page-components.jsx")
            || normalizedId.endsWith("/src/time-page-components.jsx")
            || normalizedId.endsWith("/src/time-route-components.jsx")
            || normalizedId.endsWith("/src/design-system-page-components.jsx")
            || normalizedId.endsWith("/src/public-estimate-request-page-components.jsx")
            || normalizedId.endsWith("/src/public-website-page-components.jsx")
            || normalizedId.endsWith("/src/generic-page-components.jsx")
            || normalizedId.endsWith("/src/access-restricted-page-components.jsx")
            || normalizedId.endsWith("/src/invite-activation-screen-components.jsx")
            || normalizedId.endsWith("/src/password-reset-screen-components.jsx")
            || normalizedId.endsWith("/src/login-screen-components.jsx")
            || normalizedId.endsWith("/src/schedule-page-components.jsx")
            || normalizedId.endsWith("/src/safety-page-components.jsx")
            || normalizedId.endsWith("/src/field-workspace-leader-page-components.jsx");

          if (
            (normalizedId.includes("/src/") || normalizedId.includes("/shared/"))
            && !isLazyRouteModule
            && !normalizedId.endsWith("/src/App.jsx")
            && !normalizedId.endsWith("/src/main.jsx")
          ) {
            return "app-domain";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
