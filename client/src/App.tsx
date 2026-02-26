import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import Admin from './components/Admin'
import QRPage from './components/QRPage'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/admin" replace />} />
				<Route path="/admin" element={<Admin />} />
				<Route path="/qr" element={<QRPage />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
