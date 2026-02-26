import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

type ConnectRequest = {
	token: string
	subdomain: string
}

type ConnectResponse = {
	success: boolean
	qrCode?: string
	base64?: string
	status?: string
	message?: string
}

type InstanceStatus = 'open' | 'connecting' | 'close' | 'qr' | 'unknown'

type StatusResponse = {
	success: boolean
	status: InstanceStatus
	message?: string
}

export const app = new Hono()

	.use(logger())
	.use(cors())

	.use('*', serveStatic({ root: './static' }))

	// POST /api/connect — solicita QR code à uazapi
	.post('/api/connect', async (c) => {
		const body = await c.req.json<ConnectRequest>()
		const { token, subdomain } = body

		if (!token || !subdomain) {
			return c.json<ConnectResponse>(
				{ success: false, message: 'token e subdomain são obrigatórios' },
				400,
			)
		}

		const url = `https://${subdomain}/instance/connect`

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					token: token,
				},
			})

			// biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
			const data: any = await response.json()

			if (!response.ok) {
				return c.json<ConnectResponse>(
					{
						success: false,
						message: data?.message ?? `Erro na uazapi: ${response.status}`,
					},
					400,
				)
			}

			const qr: string | undefined =
				data?.instance?.qrcode ?? data?.qrCode ?? data?.base64 ?? data?.code

			if (!qr) {
				return c.json<ConnectResponse>(
					{
						success: false,
						message: `QR Code não disponível. Status: ${data?.instance?.status ?? data?.response ?? 'desconhecido'}`,
					},
					400,
				)
			}

			return c.json<ConnectResponse>({
				success: true,
				base64: qr,
				status: data?.instance?.status ?? data?.response,
				message: data?.message,
			})
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erro desconhecido'
			return c.json<ConnectResponse>(
				{
					success: false,
					message: `Falha ao conectar com a uazapi: ${message}`,
				},
				502,
			)
		}
	})

	// GET /api/status — verifica status da instância na uazapi
	.get('/api/status', async (c) => {
		const token = c.req.query('token')
		const subdomain = c.req.query('subdomain')

		if (!token || !subdomain) {
			return c.json<StatusResponse>(
				{
					success: false,
					status: 'unknown',
					message: 'token e subdomain são obrigatórios',
				},
				400,
			)
		}

		const url = `https://${subdomain}/instance/connectionState`

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: { token: token },
			})

			// biome-ignore lint/suspicious/noExplicitAny: resposta externa sem tipo definido
			const data: any = await response.json()

			if (!response.ok) {
				return c.json<StatusResponse>(
					{
						success: false,
						status: 'unknown',
						message: data?.message ?? `Erro na uazapi: ${response.status}`,
					},
					400,
				)
			}

			const rawState: string = (
				data?.instance?.status ??
				data?.state ??
				data?.response ??
				data?.status ??
				data?.connectionState ??
				'unknown'
			).toLowerCase()

			const stateMap: Record<string, InstanceStatus> = {
				open: 'open',
				connected: 'open',
				connecting: 'connecting',
				close: 'close',
				closed: 'close',
				disconnected: 'close',
				qr: 'qr',
			}
			const status: InstanceStatus = stateMap[rawState] ?? 'unknown'

			return c.json<StatusResponse>({
				success: true,
				status,
				message: data?.message,
			})
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erro desconhecido'
			return c.json<StatusResponse>(
				{
					success: false,
					status: 'unknown',
					message: `Falha ao verificar status: ${message}`,
				},
				502,
			)
		}
	})
	.get('/api/health', (c) => {
		return c.json({ success: true, message: 'Servidor rodando' })
	})
	// SPA fallback — serve index.html para rotas não encontradas
	.get('*', async (c, next) => {
		return serveStatic({ root: './static', path: 'index.html' })(c, next)
	})

export default app

// Inicia o servidor HTTP quando executado diretamente
const port = Number(process.env.PORT) || 8080

Bun.serve({
	fetch: app.fetch,
	port,
	hostname: '0.0.0.0',
})
