import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

const RESULT_CLS = {
  W: 'bg-emerald-600 text-white',
  D: 'bg-gray-600 text-white',
  L: 'bg-red-600 text-white',
}

const POS_COLOR = {
  Goalkeeper: 'text-yellow-400',
  Defender:   'text-blue-400',
  Midfielder: 'text-emerald-400',
  Attacker:   'text-red-400',
}

const POS_LABEL = {
  Goalkeeper: 'Porteros',
  Defender:   'Defensas',
  Midfielder: 'Centrocampistas',
  Attacker:   'Delanteros',
}

const TRANSFER_CLS = {
  Free:   'bg-blue-900/60 text-blue-300',
  Loan:   'bg-amber-900/60 text-amber-300',
  N: 'bg-gray-800 text-gray-400',
}

export default function TeamProfile({ teamId, teamName, teamCrest, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['team', teamId],
    queryFn:  () => api.get(`/teams/${teamId}`).then(r => r.data),
    staleTime: 3600000,
    enabled:   !!teamId,
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-4 pb-4 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#07101f] border border-gray-700/50 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-[#04070f] to-[#07101f] border-b border-gray-800/50 shrink-0">
          {(data?.info?.logo || teamCrest) && (
            <img
              src={data?.info?.logo || teamCrest}
              alt=""
              className="w-14 h-14 object-contain"
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-xl leading-tight">
              {data?.info?.name || teamName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {data?.info?.country && (
                <span className="text-[11px] text-gray-400">🌍 {data.info.country}</span>
              )}
              {data?.info?.founded && (
                <span className="text-[11px] text-gray-600">Fundado: {data.info.founded}</span>
              )}
              {data?.venue?.name && (
                <span className="text-[11px] text-emerald-400">🏟 {data.venue.name}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="p-12 text-center text-gray-400 animate-pulse">
            Cargando perfil del equipo…
          </div>
        )}

        {/* ── Error ── */}
        {isError && !isLoading && (
          <div className="p-8 text-center">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-gray-500 text-sm">No se pudo cargar el perfil del equipo</p>
          </div>
        )}

        {/* ── Demo mode ── */}
        {data?.demo && (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🔑</p>
            <p className="text-gray-300 font-semibold">Perfil disponible con API key</p>
            <p className="text-gray-600 text-xs mt-2">
              Configura API_FOOTBALL_KEY para ver estadio, plantilla y fichajes en tiempo real
            </p>
          </div>
        )}

        {/* ── Full data ── */}
        {data && !data.demo && (
          <div className="flex-1 overflow-y-auto">

            {/* Stadium stats bar */}
            <div className="grid grid-cols-3 divide-x divide-gray-800/50 border-b border-gray-800/40 shrink-0">
              {[
                ['🏟', 'Estadio',   data.venue?.name     || '—'],
                ['🏙️', 'Ciudad',    data.venue?.city     || '—'],
                ['👥', 'Capacidad', data.venue?.capacity ? data.venue.capacity.toLocaleString() : '—'],
              ].map(([icon, label, val]) => (
                <div key={label} className="px-4 py-3 text-center">
                  <p className="text-sm text-gray-200 font-semibold">{icon} {val}</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-2 divide-x divide-gray-800/50">

              {/* LEFT: recent matches + transfers */}
              <div className="flex flex-col">
                {/* Recent matches */}
                <div className="px-4 py-2.5 border-b border-gray-800/40 bg-black/20">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                    Últimos partidos
                  </p>
                </div>

                {data.recent.length === 0 ? (
                  <p className="px-4 py-4 text-[11px] text-gray-600">Sin datos de partidos recientes</p>
                ) : data.recent.map((m, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-800/20 hover:bg-white/[0.02]">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded min-w-[20px] text-center ${RESULT_CLS[m.result] ?? 'bg-gray-700 text-white'}`}>
                      {m.result}
                    </span>
                    <span className="text-[9px] text-gray-600 w-4 shrink-0">{m.home_away}</span>
                    {m.opponent_logo && (
                      <img src={m.opponent_logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                    )}
                    <span className="text-xs text-gray-300 flex-1 truncate">{m.opponent}</span>
                    <span className="text-xs font-bold font-mono text-white shrink-0">{m.score}</span>
                    {m.date && (
                      <span className="text-[9px] text-gray-700 shrink-0">{m.date.slice(0, 10)}</span>
                    )}
                  </div>
                ))}

                {/* Transfers */}
                {data.transfers.length > 0 && (
                  <>
                    <div className="px-4 py-2.5 border-t border-b border-gray-800/40 bg-black/20 mt-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                        Fichajes recientes
                      </p>
                    </div>
                    {data.transfers.slice(0, 10).map((t, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-800/20 hover:bg-white/[0.02]">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${TRANSFER_CLS[t.type] ?? TRANSFER_CLS.N}`}>
                          {t.type || '—'}
                        </span>
                        <span className="text-xs text-gray-300 flex-1 truncate">{t.player}</span>
                        <span className="text-[9px] text-gray-600 shrink-0 truncate max-w-[80px]">{t.team_in ?? t.team_out ?? '—'}</span>
                        {t.date && (
                          <span className="text-[9px] text-gray-700 shrink-0">{t.date.slice(0, 7)}</span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* RIGHT: squad grouped by position */}
              <div className="flex flex-col">
                <div className="px-4 py-2.5 border-b border-gray-800/40 bg-black/20">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                    Plantilla ({data.squad.length} jugadores)
                  </p>
                </div>

                {data.squad.length === 0 ? (
                  <p className="px-4 py-4 text-[11px] text-gray-600">Sin datos de plantilla</p>
                ) : ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map(pos => {
                  const players = data.squad.filter(p => p.position === pos)
                  if (!players.length) return null
                  return (
                    <div key={pos}>
                      <div className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border-b border-gray-800/30 bg-black/30 ${POS_COLOR[pos]}`}>
                        {POS_LABEL[pos]}
                      </div>
                      {players.map((p, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-800/20 hover:bg-white/[0.02]">
                          {p.photo ? (
                            <img
                              src={p.photo}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover shrink-0 bg-gray-800"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-800 shrink-0 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                              {p.number ?? '?'}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-600 w-5 shrink-0 text-center font-mono">
                            {p.number ?? '—'}
                          </span>
                          <span className="text-xs text-gray-200 flex-1 truncate">{p.name}</span>
                          {p.age && (
                            <span className="text-[10px] text-gray-600 shrink-0">{p.age}a</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
