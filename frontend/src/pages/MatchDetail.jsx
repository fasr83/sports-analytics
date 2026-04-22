import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

function StatBar({ label, home, away, homeColor = 'bg-emerald-500', awayColor = 'bg-blue-500' }) {
  const total = (home || 0) + (away || 0) || 1
  const homePct = ((home || 0) / total) * 100
  const awayPct = ((away || 0) / total) * 100
  return (
    <div className="py-2 px-4">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span className="font-bold text-white">{home ?? '-'}</span>
        <span className="text-gray-600 text-[10px] uppercase tracking-widest">{label}</span>
        <span className="font-bold text-white">{away ?? '-'}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
        <div className={`${homeColor} rounded-l-full`} style={{ width: `${homePct}%` }} />
        <div className={`${awayColor} rounded-r-full ml-auto`} style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  )
}

function FormBadge({ result }) {
  const cfg = { W: 'bg-emerald-600 text-white', D: 'bg-gray-600 text-white', L: 'bg-red-600 text-white' }
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${cfg[result] ?? 'bg-gray-800 text-gray-500'}`}>
      {result}
    </span>
  )
}

export default function MatchDetail() {
  const { leagueCode, matchId } = useParams()

  const { data: predData } = useQuery({
    queryKey: ['upcoming-predictions', leagueCode],
    queryFn: () => api.get(`/analytics/${leagueCode}/upcoming-predictions`).then(r => r.data),
    enabled: !!leagueCode,
  })

  const match = predData?.fixtures?.find(f => String(f.id) === String(matchId))
    ?? predData?.fixtures?.[0]

  if (!match) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Partido no encontrado o datos no cargados.</p>
          <Link to="/" className="text-emerald-400 hover:underline">← Volver al Dashboard</Link>
        </div>
      </div>
    )
  }

  const prob = match.model_prediction
  const vb = match.value_bets ?? []
  const homeForm = match.home_form ?? []
  const awayForm = match.away_form ?? []
  const h2h = match.head_to_head ?? []
  const stats = match.statistics ?? null

  return (
    <div className="min-h-screen bg-[#080d18] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
          <Link to="/" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to={`/league/${leagueCode}`} className="hover:text-emerald-400 transition-colors">{leagueCode}</Link>
          <span>/</span>
          <span className="text-gray-400">Detalle del partido</span>
        </div>

        {/* Match header */}
        <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 p-6 mb-4">
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-3 flex-1">
              {match.home_crest && <img src={match.home_crest} alt="" className="w-16 h-16 object-contain" />}
              <p className="text-xl font-bold text-center">{match.home_team}</p>
              {homeForm.length > 0 && (
                <div className="flex gap-1">
                  {homeForm.slice(-5).map((r, i) => <FormBadge key={i} result={r} />)}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              {match.home_goals != null ? (
                <div className="text-5xl font-black tabular-nums">
                  {match.home_goals} – {match.away_goals}
                </div>
              ) : (
                <div className="text-3xl font-black text-gray-500">VS</div>
              )}
              {match.date && (
                <p className="text-xs text-gray-500">{new Date(match.date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              )}
              {match.venue && <p className="text-[11px] text-gray-700">📍 {match.venue}</p>}
            </div>

            <div className="flex flex-col items-center gap-3 flex-1">
              {match.away_crest && <img src={match.away_crest} alt="" className="w-16 h-16 object-contain" />}
              <p className="text-xl font-bold text-center">{match.away_team}</p>
              {awayForm.length > 0 && (
                <div className="flex gap-1">
                  {awayForm.slice(-5).map((r, i) => <FormBadge key={i} result={r} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Predictions */}
          {prob && (
            <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 p-4">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4">Predicción del modelo</h3>
              <div className="flex justify-around mb-4">
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-400">{(prob.prob_home * 100).toFixed(0)}%</p>
                  <p className="text-xs text-gray-600 mt-1">Victoria local</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-400">{(prob.prob_draw * 100).toFixed(0)}%</p>
                  <p className="text-xs text-gray-600 mt-1">Empate</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-blue-400">{(prob.prob_away * 100).toFixed(0)}%</p>
                  <p className="text-xs text-gray-600 mt-1">Victoria visitante</p>
                </div>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500" style={{ width: `${prob.prob_home * 100}%` }} />
                <div className="bg-gray-600" style={{ width: `${prob.prob_draw * 100}%` }} />
                <div className="bg-blue-500" style={{ width: `${prob.prob_away * 100}%` }} />
              </div>
              {prob.expected_home_goals != null && (
                <p className="text-xs text-gray-600 text-center mt-3">
                  Goles esperados: <span className="text-white font-bold">{prob.expected_home_goals?.toFixed(1)}</span> – <span className="text-white font-bold">{prob.expected_away_goals?.toFixed(1)}</span>
                </p>
              )}
            </div>
          )}

          {/* Value bets */}
          <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 p-4">
            <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4">⚡ Value Bets</h3>
            {vb.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Sin value bets detectados</p>
            ) : (
              <div className="space-y-3">
                {vb.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/30">
                    <div>
                      <p className="text-xs font-bold text-emerald-400">+{b.edge_pct?.toFixed(1)}% EDGE</p>
                      <p className="text-[11px] text-gray-400">{b.outcome} · {b.bookmaker}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">@{b.odds}</p>
                      <p className="text-[10px] text-gray-600">cuota</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Match statistics (available with API-Football Pro) */}
          <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Estadísticas del partido</h3>
              {!stats && <span className="text-[10px] text-amber-600 bg-amber-950/30 px-2 py-0.5 rounded">Requiere API-Football Pro</span>}
            </div>
            {stats ? (
              <div className="divide-y divide-gray-800/40">
                <StatBar label="Posesión %" home={stats.possession_home} away={stats.possession_away} />
                <StatBar label="Tiros totales" home={stats.shots_total_home} away={stats.shots_total_away} />
                <StatBar label="Tiros a puerta" home={stats.shots_on_goal_home} away={stats.shots_on_goal_away} homeColor="bg-emerald-400" awayColor="bg-blue-400" />
                <StatBar label="Corners" home={stats.corners_home} away={stats.corners_away} />
                <StatBar label="Faltas" home={stats.fouls_home} away={stats.fouls_away} homeColor="bg-amber-500" awayColor="bg-amber-500" />
                <StatBar label="Tarjetas amarillas" home={stats.yellow_cards_home} away={stats.yellow_cards_away} homeColor="bg-yellow-400" awayColor="bg-yellow-400" />
              </div>
            ) : (
              <div className="divide-y divide-gray-800/40 opacity-30 pointer-events-none">
                <StatBar label="Posesión %" home={58} away={42} />
                <StatBar label="Tiros totales" home={14} away={8} />
                <StatBar label="Tiros a puerta" home={6} away={3} homeColor="bg-emerald-400" awayColor="bg-blue-400" />
                <StatBar label="Corners" home={7} away={3} />
                <StatBar label="Faltas" home={10} away={13} homeColor="bg-amber-500" awayColor="bg-amber-500" />
              </div>
            )}
          </div>

          {/* H2H */}
          <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Head to Head</h3>
              {!h2h.length && <span className="text-[10px] text-amber-600 bg-amber-950/30 px-2 py-0.5 rounded">Requiere API-Football Pro</span>}
            </div>
            {h2h.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-700 text-sm">Los últimos enfrentamientos aparecerán aquí.</p>
                <p className="text-gray-800 text-xs mt-1">Disponible con API-Football Pro ($49/mes)</p>
              </div>
            ) : (
              <div className="space-y-2">
                {h2h.map((m, i) => (
                  <div key={i} className="flex items-center gap-4 text-xs border-b border-gray-800/30 py-2">
                    <span className="text-gray-600 w-20 shrink-0">{m.date?.slice(0, 10)}</span>
                    <span className="flex-1 text-right text-gray-300">{m.home_team}</span>
                    <span className="font-bold w-12 text-center">{m.home_goals} – {m.away_goals}</span>
                    <span className="flex-1 text-left text-gray-300">{m.away_team}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
