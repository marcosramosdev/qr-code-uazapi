import { Hono } from "hono";

type ConnectRequest = {
  token: string;
  subdomain: string;
};

type ConnectResponse = {
  success: boolean;
  qrCode?: string;
  base64?: string;
  status?: string;
  message?: string;
};

// POST /api/connect — solicita QR code à uazapi
const connect = new Hono().post("/connect", async (c) => {
  const body = await c.req.json<ConnectRequest>();
  const { token, subdomain } = body;

  if (!token || !subdomain) {
    return c.json<ConnectResponse>(
      { success: false, message: "token e subdomain são obrigatórios" },
      400,
    );
  }

  const url = `https://${subdomain}/instance/connect`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
    const data: any = await response.json();

    if (!response.ok) {
      return c.json<ConnectResponse>(
        {
          success: false,
          message: data?.message ?? `Erro na uazapi: ${response.status}`,
        },
        400,
      );
    }

    const qr: string | undefined =
      data?.instance?.qrcode ?? data?.qrCode ?? data?.base64 ?? data?.code;

    if (!qr) {
      return c.json<ConnectResponse>(
        {
          success: false,
          message: `QR Code não disponível. Status: ${data?.instance?.status ?? data?.response ?? "desconhecido"}`,
        },
        400,
      );
    }

    return c.json<ConnectResponse>({
      success: true,
      base64: qr,
      status: data?.instance?.status ?? data?.response,
      message: data?.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return c.json<ConnectResponse>(
      {
        success: false,
        message: `Falha ao conectar com a uazapi: ${message}`,
      },
      502,
    );
  }
});

export default connect;
