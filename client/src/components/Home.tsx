import { useNavigate } from 'react-router'

function Home() {
	const navigate = useNavigate()

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
			<div className="w-full max-w-2xl">
				{/* Header */}
				<div className="text-center mb-10">
					<h1 className="text-3xl font-bold text-white">Painel de Integrações</h1>
					<p className="text-slate-400 text-sm mt-2">
						Escolha uma ferramenta para começar
					</p>
				</div>

				{/* Cards grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					{/* Card WhatsApp QR */}
					<button
						type="button"
						onClick={() => navigate('/admin')}
						className="group bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-left transition-all hover:bg-slate-800/70 hover:border-green-500/30 cursor-pointer"
					>
						<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4 group-hover:bg-green-500/15 transition-colors">
							<svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
								<title>WhatsApp QR</title>
								<path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-white mb-1">WhatsApp QR</h2>
						<p className="text-slate-400 text-sm leading-relaxed">
							Gerar link de QR Code para conectar WhatsApp de um cliente.
						</p>
					</button>

					{/* Card CRM Notion */}
					<button
						type="button"
						onClick={() => navigate('/crm')}
						className="group bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-left transition-all hover:bg-slate-800/70 hover:border-blue-500/30 cursor-pointer"
					>
						<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4 group-hover:bg-blue-500/15 transition-colors">
							<svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
								<title>CRM Notion</title>
								<path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-white mb-1">CRM Notion</h2>
						<p className="text-slate-400 text-sm leading-relaxed">
							Provisionar stack CRM com integração Notion para novo cliente.
						</p>
					</button>
				</div>
			</div>
		</div>
	)
}

export default Home
