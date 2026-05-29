import { BrowserRouter, Routes, Route } from 'react-router'
import Admin from './components/Admin'
import QRPage from './components/QRPage'
import Home from './components/Home'
import CrmProvision from './components/CrmProvision'
import Clients from './components/Clients'
import Layout from './components/Layout'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Páginas internas (equipe) — com navbar */}
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
					<Route path="/admin" element={<Admin />} />
					<Route path="/crm" element={<CrmProvision />} />
					<Route path="/clientes" element={<Clients />} />
				</Route>

				{/* Página pública do cliente — sem navbar */}
				<Route path="/qr" element={<QRPage />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
