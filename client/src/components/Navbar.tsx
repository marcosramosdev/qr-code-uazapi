import { NavLink } from "react-router";

const LINKS = [
  { to: "/", label: "Painel", end: true },
  { to: "/admin", label: "WhatsApp QR", end: false },
  { to: "/crm", label: "CRM Notion", end: false },
  { to: "/clientes", label: "Clientes", end: false },
];

function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-blue-600 border-b border-blue-500/40 shadow-lg shadow-blue-900/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-1 sm:gap-2 justify-center">
        {/* Brand */}
        <NavLink
          to="/"
          className="flex items-center gap-2 mr-3 sm:mr-6 shrink-0"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 text-white">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <title>Effect</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </span>
          <span className="text-white font-semibold text-sm hidden sm:inline">
            Integrações
          </span>
        </NavLink>

        {/* Links */}
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "text-blue-100 hover:text-white hover:bg-blue-500/60"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
