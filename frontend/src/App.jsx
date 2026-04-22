import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import LeaguePage from './pages/LeaguePage'
import MatchPage from './pages/MatchPage'

export default function App() {
  return (
    <div className="min-h-screen bg-[#080d18]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/league/:code" element={<LeaguePage />} />
          <Route path="/match/:league/:matchId" element={<MatchPage />} />
        </Routes>
      </main>
    </div>
  )
}
