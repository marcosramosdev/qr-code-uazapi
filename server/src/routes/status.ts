import { Hono } from "hono";

type InstanceStatus = "open" | "connecting" | "close" | "qr" | "unknown";

type StatusResponse = {
  success: boolean;
  status: InstanceStatus;
  message?: string;
};

// GET /api/status — verifica status da instância na uazapi
const status = new Hono().get("/status", async (c) => {
  const token = c.req.query("token");
  const subdomain = c.req.query("subdomain");

  if (!token || !subdomain) {
    return c.json<StatusResponse>(
      {
        success: false,
        status: "unknown",
        message: "token e subdomain são obrigatórios",
      },
      400,
    );
  }

  const url = `https://${subdomain}/instance/connectionState`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { token: token },
    });

    // biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
    const data: any = await response.json();

    if (!response.ok) {
      return c.json<StatusResponse>(
        {
          success: false,
          status: "unknown",
          message: data?.message ?? `Erro na uazapi: ${response.status}`,
        },
        400,
      );
    }

    const rawState: string = (
      data?.instance?.status ??
      data?.state ??
      data?.response ??
      data?.status ??
      data?.connectionState ??
      "unknown"
    ).toLowerCase();

    const stateMap: Record<string, InstanceStatus> = {
      open: "open",
      connected: "open",
      connecting: "connecting",
      close: "close",
      closed: "close",
      disconnected: "close",
      qr: "qr",
    };
    const status: InstanceStatus = stateMap[rawState] ?? "unknown";

    return c.json<StatusResponse>({
      success: true,
      status,
      message: data?.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return c.json<StatusResponse>(
      {
        success: false,
        status: "unknown",
        message: `Falha ao verificar status: ${message}`,
      },
      502,
    );
  }
});

export default status;
