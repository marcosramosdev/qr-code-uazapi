import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import connect from "./routes/connect";
import status from "./routes/status";
import health from "./routes/health";
import crm from "./routes/crm";
import clients from "./routes/clients";

// Sub-app com todas as rotas da API (base path /api)
const api = new Hono()
  .route("/", connect)
  .route("/", status)
  .route("/", health)
  .route("/crm", crm)
  .route("/clients", clients);

export const app = new Hono()

  .use(logger())
  .use(cors())

  .use("*", serveStatic({ root: "./static" }))

  .route("/api", api)

  // SPA fallback — serve index.html para rotas não encontradas
  .get("*", async (c, next) => {
    return serveStatic({ root: "./static", path: "index.html" })(c, next);
  });

export default app;
