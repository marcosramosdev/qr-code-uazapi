import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router'

type ConnectResponse = {
	success: boolean
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

type Phase = 'loading' | 'qr' | 'scanning' | 'connected' | 'error'

const QR_LIFETIME_S = 120
const STATUS_POLL_MS = 3_000

// ── ícones inline ────────────────────────────────────────────────────────────

function IconWhatsApp({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<title>WhatsApp</title>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
		</svg>
	)
}

function Spinner({ className }: { className?: string }) {
	return (
		<div
			className={`rounded-full border-4 border-slate-600 border-t-green-500 animate-spin ${className ?? 'w-10 h-10'}`}
		/>
	)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(s: number) {
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── componente principal ─────────────────────────────────────────────────────

function QRPage() {
	const [params] = useSearchParams()
	const token = params.get('token') ?? ''
	const subdomain = params.get('subdomain') ?? ''

	const [phase, setPhase] = useState<Phase>('loading')
	const [qrBase64, setQrBase64] = useState<string | null>(null)
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const [countdown, setCountdown] = useState(QR_LIFETIME_S)
	const [expired, setExpired] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const stopAll = useCallback(() => {
		if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)
		if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
		if (qrTimerRef.current) clearTimeout(qrTimerRef.current)
	}, [])

	useEffect(() => () => stopAll(), [stopAll])

	const startCountdown = useCallback(() => {
		if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
		if (qrTimerRef.current) clearTimeout(qrTimerRef.current)

		setCountdown(QR_LIFETIME_S)
		setExpired(false)

		countdownIntervalRef.current = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(countdownIntervalRef.current!)
					return 0
				}
				return prev - 1
			})
		}, 1_000)

		qrTimerRef.current = setTimeout(() => {
			setExpired(true)
		}, QR_LIFETIME_S * 1_000)
	}, [])

	const startStatusPolling = useCallback(() => {
		if (statusIntervalRef.current) clearInterval(statusIntervalRef.current)

		statusIntervalRef.current = setInterval(async () => {
			try {
				const qs = new URLSearchParams({ token, subdomain })
				const res = await fetch(`/api/status?${qs}`)
				const data: StatusResponse = await res.json()

				if (data.success && data.status === 'open') {
					stopAll()
					setPhase('connected')
				} else if (data.success && data.status === 'connecting') {
					// celular leu o QR, aguardando handshake
					setPhase((prev) => (prev === 'qr' ? 'scanning' : prev))
				}
			} catch {
				// ignora falhas de rede no polling
			}
		}, STATUS_POLL_MS)
	}, [token, subdomain, stopAll])

	const fetchQR = useCallback(async () => {
		if (!token || !subdomain) {
			setErrorMsg('Link inválido: token ou subdomínio ausente.')
			setPhase('error')
			return
		}

		try {
			const res = await fetch('/api/connect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, subdomain }),
			})
			const data: ConnectResponse = await res.json()

			if (!data.success || !data.base64) {
				stopAll()
				setErrorMsg(data.message ?? 'Não foi possível obter o QR Code.')
				setPhase('error')
				return
			}

			const src = data.base64.startsWith('data:')
				? data.base64
				: `data:image/png;base64,${data.base64}`

			setQrBase64(src)
			setPhase('qr')
			startCountdown()
		} catch {
			stopAll()
			setErrorMsg('Erro de rede ao comunicar com o servidor. Verifique sua conexão e tente novamente.')
			setPhase('error')
		}
	}, [token, subdomain, stopAll, startCountdown])

	// biome-ignore lint/correctness/useExhaustiveDependencies: intencional, só na montagem
	useEffect(() => {
		async function init() {
			// Verifica se já está conectado antes de tentar gerar o QR
			try {
				const qs = new URLSearchParams({ token, subdomain })
				const res = await fetch(`/api/status?${qs}`)
				const data: StatusResponse = await res.json()

				if (data.success && data.status === 'open') {
					setPhase('connected')
					return
				}
			} catch {
				// se falhar, segue para tentar gerar o QR normalmente
			}

			fetchQR()
			startStatusPolling()
		}

		init()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const handleRefresh = useCallback(async () => {
		setRefreshing(true)
		setExpired(false)
		setPhase('qr')
		await fetchQR()
		setRefreshing(false)
	}, [fetchQR])

	const handleRetry = useCallback(() => {
		setErrorMsg(null)
		setPhase('loading')
		fetchQR()
		startStatusPolling()
	}, [fetchQR, startStatusPolling])

	// ── link inválido ──────────────────────────────────────────────────────

	if (!token || !subdomain) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-4 text-center">
					<div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
						<svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<title>Link inválido</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
						</svg>
					</div>
					<div>
						<p className="text-white font-semibold">Link inválido</p>
						<p className="text-slate-400 text-sm mt-1">
							Este link não contém os dados necessários para gerar o QR Code.
							Solicite um novo link ao responsável.
						</p>
					</div>
				</div>
			</div>
		)
	}

	// ── layout base ────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
			<div className="w-full max-w-sm flex flex-col items-center">

				{/* Header — oculto na tela de conectado e erro */}
				{phase !== 'connected' && phase !== 'error' && (
					<div className="text-center mb-8">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
							<IconWhatsApp className="w-8 h-8 text-green-400" />
						</div>
						<h1 className="text-2xl font-bold text-white">Conectar WhatsApp</h1>
						<p className="text-slate-400 text-sm mt-1">
							{phase === 'scanning'
								? 'QR Code lido — finalizando conexão...'
								: 'Escaneie o QR Code com seu celular'}
						</p>
					</div>
				)}

				{/* Card */}
				<div className="w-full bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

					{/* ── LOADING inicial ───────────────────────────────────── */}
					{phase === 'loading' && (
						<div className="flex flex-col items-center justify-center py-14 gap-5">
							<Spinner className="w-12 h-12" />
							<div className="text-center">
								<p className="text-slate-300 text-sm font-medium">Gerando QR Code...</p>
								<p className="text-slate-500 text-xs mt-1">Conectando à uazapi</p>
							</div>
						</div>
					)}

					{/* ── QR CODE ───────────────────────────────────────────── */}
					{(phase === 'qr' || phase === 'scanning') && (
						<div className="flex flex-col items-center gap-5">

							{/* Imagem do QR */}
							<div className="relative">
								{/* blur quando expirado ou renovando */}
								<div className={`bg-white p-3 rounded-2xl shadow-lg transition-all duration-300 ${expired || refreshing ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
									{qrBase64 ? (
										<img
											src={qrBase64}
											alt="QR Code WhatsApp"
											className="w-56 h-56 object-contain"
											draggable={false}
										/>
									) : (
										<div className="w-56 h-56 bg-slate-100 rounded-xl animate-pulse" />
									)}
								</div>

								{/* Overlay: renovando */}
								{refreshing && (
									<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
										<Spinner className="w-10 h-10" />
										<p className="text-slate-300 text-xs font-medium">Renovando...</p>
									</div>
								)}

								{/* Overlay: expirado */}
								{expired && !refreshing && (
									<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl">
										<div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl px-5 py-4 flex flex-col items-center gap-3">
											<svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<title>Expirado</title>
												<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											<p className="text-white text-sm font-semibold">QR Code expirado</p>
											<button
												type="button"
												onClick={handleRefresh}
												className="bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors flex items-center gap-2"
											>
												<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
													<title>Renovar</title>
													<path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
												</svg>
												Gerar novo QR Code
											</button>
										</div>
									</div>
								)}

								{/* Overlay: celular leu, aguardando handshake */}
								{phase === 'scanning' && !expired && !refreshing && (
									<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl">
										<div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl px-5 py-4 flex flex-col items-center gap-3">
											<Spinner className="w-8 h-8" />
											<p className="text-white text-sm font-semibold">Conectando...</p>
											<p className="text-slate-400 text-xs text-center">
												QR Code lido. Aguarde enquanto<br />sua conta é vinculada.
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Countdown — só quando ativo */}
							{!expired && !refreshing && phase !== 'scanning' && (
								<div className="flex items-center gap-2 text-xs">
									<svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<title>Tempo restante</title>
										<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span className="text-slate-500">
										Expira em{' '}
										<span className={`font-mono font-semibold tabular-nums ${countdown <= 30 ? 'text-yellow-400' : 'text-slate-400'}`}>
											{formatCountdown(countdown)}
										</span>
									</span>
								</div>
							)}

							{/* Instruções — só quando aguardando leitura */}
							{!expired && !refreshing && phase === 'qr' && (
								<>
									<div className="w-full border-t border-slate-700/50" />
									<div className="text-center">
										<p className="text-slate-300 text-sm font-medium mb-2">Como escanear:</p>
										<ol className="text-slate-500 text-xs space-y-1 text-left list-none">
											<li className="flex items-start gap-2">
												<span className="text-green-400 font-bold shrink-0">1.</span>
												Abra o <span className="text-slate-400 font-medium">&nbsp;WhatsApp&nbsp;</span> no celular
											</li>
											<li className="flex items-start gap-2">
												<span className="text-green-400 font-bold shrink-0">2.</span>
												Vá em <span className="text-slate-400 font-medium">&nbsp;Configurações → Aparelhos conectados</span>
											</li>
											<li className="flex items-start gap-2">
												<span className="text-green-400 font-bold shrink-0">3.</span>
												Toque em <span className="text-slate-400 font-medium">&nbsp;Conectar aparelho</span> e aponte para o QR
											</li>
										</ol>
									</div>

									<button
										type="button"
										onClick={handleRefresh}
										disabled={refreshing}
										className="text-slate-600 hover:text-slate-400 text-xs underline underline-offset-2 transition-colors disabled:opacity-40"
									>
										Renovar agora
									</button>
								</>
							)}
						</div>
					)}

					{/* ── CONECTADO ─────────────────────────────────────────── */}
					{phase === 'connected' && (
						<div className="flex flex-col items-center gap-5 py-8">
							{/* ícone animado */}
							<div className="relative">
								<div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
									<svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
										<title>Conectado</title>
										<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-slate-800 animate-ping opacity-60" />
								<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-slate-800" />
							</div>

							<div className="text-center">
								<p className="text-white font-bold text-xl">WhatsApp conectado!</p>
								<p className="text-slate-400 text-sm mt-2 leading-relaxed">
									Sua conta foi vinculada com sucesso.<br />
									Você já pode fechar esta página.
								</p>
							</div>

							<IconWhatsApp className="w-6 h-6 text-green-500/40 mt-2" />
						</div>
					)}

					{/* ── ERRO ──────────────────────────────────────────────── */}
					{phase === 'error' && (
						<div className="flex flex-col items-center gap-5 py-8">
							<div className="w-18 h-18 w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
								<svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
									<title>Erro</title>
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
								</svg>
							</div>

							<div className="text-center">
								<p className="text-white font-semibold text-base">Não foi possível gerar o QR Code</p>
								<p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
									{errorMsg}
								</p>
							</div>

							<button
								type="button"
								onClick={handleRetry}
								className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-100 text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
							>
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
									<title>Tentar novamente</title>
									<path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Tentar novamente
							</button>
						</div>
					)}
				</div>

				{/* Rodapé */}
				{phase !== 'connected' && (
					<p className="text-center text-slate-700 text-xs mt-5">
						{phase === 'error'
							? 'Verifique se o token e o subdomínio estão corretos.'
							: 'Não feche esta página até concluir a conexão.'}
					</p>
				)}
			</div>
		</div>
	)
}

export default QRPage
