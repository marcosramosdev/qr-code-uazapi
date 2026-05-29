import { Hono } from "hono";

// GET /api/health — verifica se o servidor está rodando
const health = new Hono().get("/health", (c) => {
  return c.json({ success: true, message: "Servidor rodando" });
});

export default health;
