import { useState } from 'react'
import { useNavigate } from 'react-router'

function Admin() {
	const navigate = useNavigate()
	const [token, setToken] = useState('')
	const [subdomain, setSubdomain] = useState('')
	const [copied, setCopied] = useState(false)

	const generatedUrl =
		token && subdomain
			? `${window.location.origin}/qr?token=${encodeURIComponent(token)}&subdomain=${encodeURIComponent(subdomain)}`
			: null

	function handleGoToQR(e: React.FormEvent) {
		e.preventDefault()
		if (!token || !subdomain) return
		navigate(`/qr?token=${encodeURIComponent(token)}&subdomain=${encodeURIComponent(subdomain)}`)
	}

	async function handleCopy() {
		if (!generatedUrl) return
		await navigator.clipboard.writeText(generatedUrl)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
						<svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
							<title>Admin</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-white">Gerar Link do Cliente</h1>
					<p className="text-slate-400 text-sm mt-1">
						Preencha os dados e compartilhe o link gerado
					</p>
				</div>

				{/* Card */}
				<div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
					<form onSubmit={handleGoToQR} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="subdomain">
								Subdomínio uazapi
							</label>
							<input
								id="subdomain"
								type="text"
								value={subdomain}
								onChange={(e) => setSubdomain(e.target.value)}
								placeholder="meu-servidor.uazapi.com"
								required
								className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="token">
								Token da Instância
							</label>
							<input
								id="token"
								type="password"
								value={token}
								onChange={(e) => setToken(e.target.value)}
								placeholder="••••••••••••••••"
								required
								className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition"
							/>
						</div>

						{/* URL gerada preview */}
						{generatedUrl && (
							<div className="mt-1">
								<p className="text-xs text-slate-500 mb-1.5">Link que será compartilhado:</p>
								<div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2">
									<p className="text-xs text-slate-400 truncate flex-1 font-mono">{generatedUrl}</p>
									<button
										type="button"
										onClick={handleCopy}
										className="shrink-0 text-slate-400 hover:text-green-400 transition-colors"
										title="Copiar link"
									>
										{copied ? (
											<svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
												<title>Copiado</title>
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										) : (
											<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<title>Copiar</title>
												<path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
											</svg>
										)}
									</button>
								</div>
							</div>
						)}

						<div className="flex gap-3 pt-1">
							<button
								type="button"
								onClick={handleCopy}
								disabled={!generatedUrl}
								className="flex-1 border border-slate-600 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-semibold py-3 rounded-xl transition-colors text-sm"
							>
								{copied ? 'Copiado!' : 'Copiar link'}
							</button>
							<button
								type="submit"
								disabled={!token || !subdomain}
								className="flex-1 bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
							>
								Abrir QR Code
							</button>
						</div>
					</form>
				</div>

				<p className="text-center text-slate-600 text-xs mt-6">
					O link gerado pode ser enviado diretamente ao cliente via WhatsApp ou e-mail.
				</p>
			</div>
		</div>
	)
}

export default Admin
