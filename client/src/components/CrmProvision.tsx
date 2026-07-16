import { useState } from 'react'

type CrmProvisionStep = 'validation' | 'supabase_insert' | 'uazapi_instance' | 'uazapi_webhook' | 'n8n_workflow_create' | 'n8n_workflow_activate'

type CrmProvisionResponse = {
	success: boolean
	qrLink?: string
	contaId?: string
	failedStep?: CrmProvisionStep
	completed?: CrmProvisionStep[]
	error?: string
}

const ALL_STEPS: CrmProvisionStep[] = [
	'validation',
	'supabase_insert',
	'uazapi_instance',
	'uazapi_webhook',
	'n8n_workflow_create',
	'n8n_workflow_activate',
]

function isNotionLink(link: string): boolean {
	return link.includes('notion.so') || link.includes('notion.com')
}

const STEP_LABELS: Record<CrmProvisionStep, string> = {
	validation: 'Validação',
	supabase_insert: 'Criar conta no banco',
	uazapi_instance: 'Criar instância WhatsApp',
	uazapi_webhook: 'Configurar webhook',
	n8n_workflow_create: 'Criar workflow CRM',
	n8n_workflow_activate: 'Ativar workflow',
}

function CrmProvision() {
	const [nome, setNome] = useState('')
	const [linkNotion, setLinkNotion] = useState('')
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState<CrmProvisionResponse | null>(null)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!nome.trim() || !linkNotion.trim() || !isNotionLink(linkNotion)) return

		setLoading(true)
		setResult(null)

		try {
			const res = await fetch('/api/crm/provision', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nome: nome.trim(), linkNotion: linkNotion.trim() }),
			})
			const data: CrmProvisionResponse = await res.json()
			setResult(data)
		} catch {
			setResult({
				success: false,
				failedStep: 'validation',
				error: 'Erro de rede ao comunicar com o servidor. Verifique sua conexão e tente novamente.',
			})
		} finally {
			setLoading(false)
		}
	}

	function stepStatus(
		step: CrmProvisionStep,
	): 'pending' | 'completed' | 'failed' {
		if (!result) return 'pending'
		if (result.completed?.includes(step)) return 'completed'
		if (result.success) return 'completed'
		if (result.failedStep === step) return 'failed'
		return 'pending'
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
						<svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
							<title>CRM Notion</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-white">Provisionar CRM</h1>
					<p className="text-slate-400 text-sm mt-1">
						Configure a integração Notion para o cliente
					</p>
				</div>

				{/* Card */}
				<div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="nome">
								Nome do Cliente
							</label>
							<input
								id="nome"
								type="text"
								value={nome}
								onChange={(e) => setNome(e.target.value)}
								placeholder="Ex: Sara Pantaleão"
								required
								className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="linkNotion">
								Link da Página Notion
							</label>
							<input
								id="linkNotion"
								type="url"
								value={linkNotion}
								onChange={(e) => setLinkNotion(e.target.value)}
								placeholder="https://notion.com/..."
								required
								className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
							/>
							{linkNotion && !isNotionLink(linkNotion) && (
								<p className="text-red-400 text-xs mt-1.5">
									O link deve ser uma URL do Notion
								</p>
							)}
						</div>

						<button
							type="submit"
							disabled={loading || !nome.trim() || !linkNotion.trim() || !isNotionLink(linkNotion)}
							className="w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
						>
							{loading && (
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							)}
							{loading ? 'Provisionando...' : 'Provisionar CRM'}
						</button>
					</form>

					{/* Step progress and result */}
					{result && (
						<div className="mt-6 border-t border-slate-700/50 pt-6 space-y-4">
							{/* Step progress list */}
							<div className="space-y-2">
								{ALL_STEPS.map((step) => {
									const status = stepStatus(step)
									return (
										<div key={step} className="flex items-center gap-2.5 text-sm">
											{status === 'completed' && (
												<svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
													<title>Concluído</title>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											)}
											{status === 'failed' && (
												<svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
													<title>Falha</title>
													<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
												</svg>
											)}
											{status === 'pending' && (
												<span className="w-4 h-4 shrink-0 flex items-center justify-center">
													<span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
												</span>
											)}
											<span
												className={
													status === 'failed'
														? 'text-red-400'
														: status === 'completed'
															? 'text-slate-300'
															: 'text-slate-500'
												}
											>
												{STEP_LABELS[step]}
											</span>
										</div>
									)
								})}
							</div>

							{/* Success box */}
							{result.success && (
								<div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center">
									<div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
										<svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
											<title>Sucesso</title>
											<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<p className="text-white font-semibold mb-1">Provisionamento concluído!</p>
									<p className="text-slate-400 text-sm mb-4">
										Clique abaixo para conectar o WhatsApp do cliente.
									</p>
									<a
										href={result.qrLink}
										className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
									>
										<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<title>Abrir QR</title>
											<path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
										</svg>
										Abrir QR Code
									</a>
								</div>
							)}

							{/* Error box */}
							{!result.success && (
								<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
									<div className="flex items-center gap-2 mb-2">
										<svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<title>Erro</title>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
										</svg>
										<p className="text-red-400 font-semibold text-sm">
											Falha no passo: {result.failedStep ? STEP_LABELS[result.failedStep] : 'desconhecido'}
										</p>
									</div>
									<p className="text-slate-400 text-sm">{result.error}</p>
								</div>
							)}
						</div>
					)}
				</div>

				<p className="text-center text-slate-600 text-xs mt-6">
					Todos os dados são processados pelo servidor. Nenhum segredo é exposto ao navegador.
				</p>
			</div>
		</div>
	)
}

export default CrmProvision
