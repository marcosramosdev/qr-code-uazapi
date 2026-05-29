import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

type InstanceStatus = 'open' | 'connecting' | 'close' | 'qr' | 'unknown'

type ClientSummary = {
	id: string
	nome: string
	notionLink: string | null
	whatsappStatus: InstanceStatus
	qrLink: string | null
	workflowActive: boolean | null
}

type ClientsResponse = {
	success: boolean
	clients: ClientSummary[]
	error?: string
}

const WHATSAPP_STATUS: Record<
	InstanceStatus,
	{ label: string; dot: string; text: string }
> = {
	open: { label: 'Conectado', dot: 'bg-green-400', text: 'text-green-400' },
	connecting: { label: 'Conectando', dot: 'bg-yellow-400', text: 'text-yellow-400' },
	qr: { label: 'Aguardando QR', dot: 'bg-yellow-400', text: 'text-yellow-400' },
	close: { label: 'Desconectado', dot: 'bg-red-400', text: 'text-red-400' },
	unknown: { label: 'Desconhecido', dot: 'bg-slate-500', text: 'text-slate-400' },
}

function Clients() {
	const navigate = useNavigate()
	const [clients, setClients] = useState<ClientSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selected, setSelected] = useState<ClientSummary | null>(null)
	const [query, setQuery] = useState('')

	useEffect(() => {
		async function load() {
			setLoading(true)
			setError(null)
			try {
				const res = await fetch('/api/clients')
				const data: ClientsResponse = await res.json()
				if (!data.success) {
					setError(data.error ?? 'Não foi possível carregar os clientes.')
					return
				}
				setClients(data.clients)
			} catch {
				setError('Erro de rede ao comunicar com o servidor.')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [])

	const filtered = clients.filter((c) =>
		c.nome.toLowerCase().includes(query.trim().toLowerCase()),
	)

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-8">
			<div className="w-full max-w-3xl mx-auto">
				{/* Header */}
				<div className="flex items-center gap-3 mb-8">
					<button
						type="button"
						onClick={() => navigate('/')}
						className="shrink-0 w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition"
						title="Voltar"
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<title>Voltar</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<div>
						<h1 className="text-2xl font-bold text-white">Clientes</h1>
						<p className="text-slate-400 text-sm">
							Status de conexão, CRM e fluxo de cada cliente
						</p>
					</div>
				</div>

				{/* Search */}
				{!loading && !error && clients.length > 0 && (
					<div className="mb-5">
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar por nome..."
							className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition"
						/>
					</div>
				)}

				{/* Loading */}
				{loading && (
					<div className="flex flex-col items-center justify-center py-20 gap-4">
						<div className="w-10 h-10 rounded-full border-4 border-slate-600 border-t-green-500 animate-spin" />
						<p className="text-slate-400 text-sm">Carregando clientes...</p>
					</div>
				)}

				{/* Error */}
				{!loading && error && (
					<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center">
						<p className="text-red-400 font-semibold text-sm">{error}</p>
					</div>
				)}

				{/* Empty */}
				{!loading && !error && filtered.length === 0 && (
					<div className="text-center py-20">
						<p className="text-slate-400">
							{clients.length === 0
								? 'Nenhum cliente cadastrado ainda.'
								: 'Nenhum cliente encontrado para a busca.'}
						</p>
					</div>
				)}

				{/* List */}
				{!loading && !error && filtered.length > 0 && (
					<div className="space-y-2.5">
						{filtered.map((client) => {
							const st = WHATSAPP_STATUS[client.whatsappStatus]
							return (
								<button
									key={client.id}
									type="button"
									onClick={() => setSelected(client)}
									className="w-full group bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl px-5 py-4 flex items-center justify-between gap-4 text-left transition-all hover:bg-slate-800/70 hover:border-slate-600 cursor-pointer"
								>
									<span className="text-white font-medium truncate">{client.nome}</span>
									<span className="flex items-center gap-2 shrink-0">
										<span className={`w-2 h-2 rounded-full ${st.dot}`} />
										<span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
										<svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<title>Abrir</title>
											<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
										</svg>
									</span>
								</button>
							)
						})}
					</div>
				)}
			</div>

			{/* Modal */}
			{selected && (
				<ClientModal client={selected} onClose={() => setSelected(null)} />
			)}
		</div>
	)
}

function ClientModal({
	client,
	onClose,
}: {
	client: ClientSummary
	onClose: () => void
}) {
	const st = WHATSAPP_STATUS[client.whatsappStatus]

	const workflowLabel =
		client.workflowActive === null
			? { label: 'Não encontrado', dot: 'bg-slate-500', text: 'text-slate-400' }
			: client.workflowActive
				? { label: 'Ativo', dot: 'bg-green-400', text: 'text-green-400' }
				: { label: 'Inativo', dot: 'bg-red-400', text: 'text-red-400' }

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			onClick={onClose}
			onKeyDown={(e) => e.key === 'Escape' && onClose()}
			role="presentation"
		>
			<div
				className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-4 mb-5">
					<h2 className="text-lg font-bold text-white">{client.nome}</h2>
					<button
						type="button"
						onClick={onClose}
						className="shrink-0 text-slate-400 hover:text-white transition"
						title="Fechar"
					>
						<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<title>Fechar</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="space-y-4">
					{/* WhatsApp status */}
					<div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3">
						<span className="text-sm text-slate-400">Conexão WhatsApp</span>
						<span className="flex items-center gap-2">
							<span className={`w-2 h-2 rounded-full ${st.dot}`} />
							<span className={`text-sm font-medium ${st.text}`}>{st.label}</span>
						</span>
					</div>

					{/* n8n flow status */}
					<div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3">
						<span className="text-sm text-slate-400">Fluxo n8n</span>
						<span className="flex items-center gap-2">
							<span className={`w-2 h-2 rounded-full ${workflowLabel.dot}`} />
							<span className={`text-sm font-medium ${workflowLabel.text}`}>
								{workflowLabel.label}
							</span>
						</span>
					</div>

					{/* Actions */}
					<div className="flex flex-col gap-2.5 pt-1">
						{client.qrLink ? (
							<a
								href={client.qrLink}
								className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
							>
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<title>Conectar</title>
									<path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
								</svg>
								Conectar WhatsApp
							</a>
						) : (
							<div className="w-full bg-slate-700/40 text-slate-500 font-semibold py-3 rounded-xl text-sm text-center cursor-not-allowed">
								Instância WhatsApp não encontrada
							</div>
						)}

						{client.notionLink ? (
							<a
								href={client.notionLink}
								target="_blank"
								rel="noopener noreferrer"
								className="w-full border border-slate-600 hover:border-slate-500 text-slate-200 font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
							>
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
									<title>Notion</title>
									<path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
								</svg>
								Abrir CRM Notion
							</a>
						) : (
							<div className="w-full border border-slate-700/50 text-slate-500 font-semibold py-3 rounded-xl text-sm text-center cursor-not-allowed">
								CRM Notion não cadastrado
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default Clients
