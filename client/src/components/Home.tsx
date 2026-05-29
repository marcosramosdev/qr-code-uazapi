import { useNavigate } from "react-router";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">
            Painel de Integrações
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Escolha uma ferramenta para começar
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card WhatsApp QR */}
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="group bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-left transition-all hover:bg-slate-800/70 hover:border-green-500/30 cursor-pointer"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4 group-hover:bg-green-500/15 transition-colors">
              <svg
                className="w-7 h-7 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <title>WhatsApp QR</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              WhatsApp QR
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gerar link de QR Code para conectar WhatsApp de um cliente.
            </p>
          </button>

          {/* Card CRM Notion */}
          <button
            type="button"
            onClick={() => navigate("/crm")}
            className="group bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-left transition-all hover:bg-slate-800/70 hover:border-blue-500/30 cursor-pointer"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4 group-hover:bg-blue-500/15 transition-colors">
              <svg
                className="w-7 h-7 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <title>CRM Notion</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              CRM Notion
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Provisionar stack CRM com integração Notion para novo cliente.
            </p>
          </button>

          {/* Card Clientes */}
          <button
            type="button"
            onClick={() => navigate("/clientes")}
            className="group bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-left transition-all hover:bg-slate-800/70 hover:border-purple-500/30 cursor-pointer"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4 group-hover:bg-purple-500/15 transition-colors">
              <svg
                className="w-7 h-7 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <title>Clientes</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Clientes</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ver status de WhatsApp, CRM e fluxo de cada cliente.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
