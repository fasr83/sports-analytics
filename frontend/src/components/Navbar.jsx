import { Link, NavLink } from 'react-router-dom'
import { LEAGUES } from '../utils/odds'

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link to="/" className="text-green-400 font-bold text-lg tracking-tight">
          ⚽ BetAnalytics
        </Link>
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {LEAGUES.map((l) => (
            <NavLink
              key={l.code}
              to={`/league/${l.code}`}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {l.flag} {l.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
