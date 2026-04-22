import { Link, NavLink } from 'react-router-dom'

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="34" height="34" rx="9" fill="url(#logoGrad)"/>
      <rect x="4" y="23" width="4" height="7" rx="1" fill="white" fillOpacity="0.35"/>
      <rect x="10" y="18" width="4" height="12" rx="1" fill="white" fillOpacity="0.55"/>
      <rect x="16" y="13" width="4" height="17" rx="1" fill="white" fillOpacity="0.75"/>
      <rect x="22" y="7" width="5" height="23" rx="1" fill="white"/>
      <polyline points="6,24 12,19 18,14 24.5,8.5" stroke="white" strokeWidth="1.5" fill="none" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981"/>
          <stop offset="100%" stopColor="#059669"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Navbar() {
  return (
    <nav className="bg-[#060b15] border-b border-gray-800/50 sticky top-0 z-50">
      <div className="px-4 flex items-center gap-4 h-14">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <Logo />
          <div className="flex flex-col leading-none">
            <span className="text-white font-bold text-base tracking-tight">MetricCapital</span>
            <span className="text-emerald-500 text-[10px] font-medium tracking-widest uppercase">Analytics</span>
          </div>
        </Link>

        <div className="w-px h-6 bg-gray-800 shrink-0" />

        <div className="flex gap-1">
          <NavLink to="/" end className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-sm transition-all ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-gray-500 hover:text-white hover:bg-white/5'}`
          }>Dashboard</NavLink>
        </div>

        <div className="flex-1" />

        <div className="shrink-0 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
    </nav>
  )
}
