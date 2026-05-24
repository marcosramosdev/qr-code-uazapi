import { BrowserRouter, Routes, Route } from 'react-router'
import Admin from './components/Admin'
import QRPage from './components/QRPage'
import Home from './components/Home'
import CrmProvision from './components/CrmProvision'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/admin" element={<Admin />} />
				<Route path="/qr" element={<QRPage />} />
				<Route path="/crm" element={<CrmProvision />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
