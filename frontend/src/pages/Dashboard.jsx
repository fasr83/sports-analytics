import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { LEAGUES } from '../utils/odds'
import { useNews } from '../hooks/useNews'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  return time
}

function LiveDot({ active = true }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
}

function NewsTickerBar({ news = [] }) {
  const items = news.map(n => n.title).filter(Boolean)
  if (!items.length) return null
  const repeated = [...items, ...items]
  return (
    <div className="bg-gray-950 border-t border-gray-800/60 overflow-hidden h-8 flex items-center">
      <div className="shrink-0 bg-emerald-600 text-white text-[10px] font-bold px-3 h-full flex items-center tracking-widest uppercase">
        NOTICIAS
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div className="flex gap-12 whitespace-nowrap animate-[ticker_60s_linear_infinite]">
          {repeated.map((t, i) => (
            <span key={i} className="text-xs text-gray-400 shrink-0">
              <span className="text-emerald-500 mr-2">●</span>{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MatchRow({ match, leagueCode }) {
  const date = match.date ? format(parseISO(match.date), "d MMM HH:mm", { locale: es }) : '?'
  const prob = match.model_prediction
  const hasResult = match.home_goals != null
  return (
    <div className={`border-b border-gray-800/40 px-3 py-2.5 hover:bg-gray-800/30 transition-colors ${match.has_value ? 'border-l-2 border-l-emerald-500' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-600 w-16 shrink-0">{date}</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-200 text-right flex-1 truncate">{match.home_team}</span>
          <span className="text-xs font-bold tabular-nums shrink-0 text-gray-400 w-10 text-center">
            {hasResult ? `${match.home_goals}-${match.away_goals}` : 'vs'}
          </span>
          <span className="text-xs text-gray-200 text-left flex-1 truncate">{match.away_team}</span>
        </div>
        {prob && (
          <div className="flex gap-1 shrink-0">
            <span className="text-[10px] text-emerald-400 w-8 text-center">{(prob.prob_home*100).toFixed(0)}%</span>
            <span className="text-[10px] text-gray-500 w-8 text-center">{(prob.prob_draw*100).toFixed(0)}%</span>
            <span className="text-[10px] text-blue-400 w-8 text-center">{(prob.prob_away*100).toFixed(0)}%</span>
          </div>
        )}
        {match.has_value && <span className="text-[9px] text-emerald-400 font-bold shrink-0">VALUE</span>}
      </div>
      {prob && (
        <div className="mt-1 flex h-0.5 rounded-full overflow-hidden ml-16">
          <div className="bg-emerald-500" style={{ width: `${prob.prob_home*100}%` }} />
          <div className="bg-gray-600" style={{ width: `${prob.prob_draw*100}%` }} />
          <div className="bg-blue-500" style={{ width: `${prob.prob_away*100}%` }} />
        </div>
      )}
    </div>
  )
}

function NewsPanel({ news = [], loading }) {
  return (
    <div className="space-y-0 overflow-y-auto h-full">
      {loading && <div className="p-4 text-xs text-gray-600 animate-pulse">Cargando noticias...</div>}
      {news.map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
          className="block border-b border-gray-800/40 px-3 py-2.5 hover:bg-gray-800/30 transition-colors group">
          <div className="flex items-start gap-2">
            <span className="text-[9px] text-emerald-600 font-bold uppercase shrink-0 mt-0.5 w-14 truncate">{item.source}</span>
            <p className="text-xs text-gray-300 group-hover:text-white transition-colors leading-snug line-clamp-2">{item.title}</p>
          </div>
          {item.pub_date && (
            <p className="text-[10px] text-gray-700 mt-0.5 ml-16 truncate">{item.pub_date.slice(0, 22)}</p>
          )}
        </a>
      ))}
    </div>
  )
}

function ValueBetCard({ event, leagueCode }) {
  const prob = event.model_prediction
  const topEdge = event.value_bets?.reduce((max, vb) => Math.max(max, vb.edge_pct ?? 0), 0) ?? 0
  return (
    <div className="border-b border-gray-800/40 px-3 py-3 hover:bg-emerald-950/20 transition-colors border-l-2 border-l-emerald-500">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-emerald-400 font-bold">+{topEdge.toFixed(1)}% EDGE</span>
        <span className="text-[9px] text-gray-600">{LEAGUES.find(l => l.code === leagueCode)?.flag} {LEAGUES.find(l => l.code === leagueCode)?.name}</span>
      </div>
      <p className="text-xs text-gray-200 truncate">{event.home_team} vs {event.away_team}</p>
      {prob && (
        <div className="flex gap-3 mt-1.5 text-[10px]">
          <span className="text-emerald-400">{(prob.prob_home*100).toFixed(0)}% L</span>
          <span className="text-gray-500">{(prob.prob_draw*100).toFixed(0)}% E</span>
          <span className="text-blue-400">{(prob.prob_away*100).toFixed(0)}% V</span>
        </div>
      )}
      {event.value_bets?.slice(0,1).map((vb, i) => (
        <p key={i} className="text-[10px] text-gray-500 mt-1">{vb.bookmaker} · {vb.outcome} · @{vb.odds}</p>
      ))}
    </div>
  )
}

function ArbCard({ arb }) {
  return (
    <div className="border-b border-amber-500/20 px-3 py-3 hover:bg-amber-950/20 transition-colors border-l-2 border-l-amber-400">
      <div className="flex items-center justify-between mb-1">
        <span className="text-amber-400 font-bold text-sm">+{arb.profit_pct}%</span>
        <span className="text-[9px] text-gray-600">garantizado</span>
      </div>
      <p className="text-xs text-gray-300 truncate">{arb.home_team} vs {arb.away_team}</p>
      <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-600">
        <div className="flex justify-between"><span>1 · {arb.best_home?.bookmaker}</span><span className="text-white">{arb.best_home?.odds}</span></div>
        <div className="flex justify-between"><span>X · {arb.best_draw?.bookmaker}</span><span className="text-white">{arb.best_draw?.odds}</span></div>
        <div className="flex justify-between"><span>2 · {arb.best_away?.bookmaker}</span><span className="text-white">{arb.best_away?.odds}</span></div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeLeague, setActiveLeague] = useState('PL')
  const [centerTab, setCenterTab] = useState('matches')
  const qc = useQueryClient()
  const clock = useClock()

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get('/setup/status').then(r => r.data),
    staleTime: 30000,
    refetchInterval: 30000,
  })

  const modelTrained = status?.leagues?.[activeLeague]?.model_trained ?? false
  const hasOddsKey = status?.has_odds_key ?? false
  const trainedCount = status?.leagues ? Object.values(status.leagues).filter(l => l.model_trained).length : 0
  const anyUntrained = status?.leagues && Object.values(status.leagues).some(l => !l.model_trained)

  const { data: valueBetsData, isLoading: loadingBets } = useQuery({
    queryKey: ['value-bets', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/value-bets`).then(r => r.data),
    enabled: modelTrained && hasOddsKey,
    staleTime: 1000 * 60 * 5,
  })

  const { data: arbData } = useQuery({
    queryKey: ['arbitrage', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/arbitrage`).then(r => r.data),
    enabled: modelTrained && hasOddsKey,
    staleTime: 1000 * 60 * 5,
  })

  const { data: matchesData } = useQuery({
    queryKey: ['matches', activeLeague, 'SCHEDULED'],
    queryFn: () => api.get(`/leagues/${activeLeague}/matches?status=SCHEDULED`).then(r => r.data),
    enabled: !!activeLeague,
    staleTime: 1000 * 60 * 5,
  })

  const { data: standingsData } = useQuery({
    queryKey: ['standings', activeLeague],
    queryFn: () => api.get(`/leagues/${activeLeague}/standings`).then(r => r.data),
    enabled: !!activeLeague,
    staleTime: 1000 * 60 * 30,
  })

  const { data: upcomingPred } = useQuery({
    queryKey: ['upcoming-predictions', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/upcoming-predictions`).then(r => r.data),
    enabled: modelTrained,
    staleTime: 1000 * 60 * 10,
  })

  const { data: newsData, isLoading: loadingNews } = useNews()

  const { mutate: initReal, isPending: isInitializing } = useMutation({
    mutationFn: () => api.post('/setup/init-real').then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(); refetchStatus() },
  })

  const valueBets = valueBetsData?.events?.filter(e => e.has_value) ?? []
  const allEvents = valueBetsData?.events ?? []
  const arbs = arbData?.opportunities ?? []
  const fixtures = upcomingPred?.fixtures ?? matchesData?.matches ?? []
  const standings = standingsData?.standings ?? []
  const news = newsData?.news ?? []

  const centerTabs = [
    { id: 'matches', label: '📅 Partidos' },
    { id: 'standings', label: '📊 Clasificación' },
    { id: 'news', label: '📰 Noticias' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#080d18]">

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-950 border-b border-gray-800/60 text-[11px] shrink-0">
        <div className="flex items-center gap-1.5">
          <LiveDot active={true} />
          <span className="text-emerald-400 font-mono font-bold">{clock.toUTCString().slice(17, 25)} UTC</span>
        </div>
        <div className="h-3 w-px bg-gray-800" />
        <span className="text-gray-500">Ligas activas: <span className="text-white font-bold">{trainedCount}/{LEAGUES.length}</span></span>
        <div className="h-3 w-px bg-gray-800" />
        <span className="text-gray-500">Value bets: <span className="text-emerald-400 font-bold">{valueBets.length}</span></span>
        <div className="h-3 w-px bg-gray-800" />
        <span className="text-gray-500">Arbitraje: <span className="text-amber-400 font-bold">{arbs.length}</span></span>
        <div className="h-3 w-px bg-gray-800" />
        <span className={`${hasOddsKey ? 'text-blue-400' : 'text-gray-600'}`}>
          Odds API: {hasOddsKey ? '✓ activa' : '✗ sin clave'}
        </span>
        <div className="flex-1" />
        {anyUntrained && (
          <button onClick={() => initReal()} disabled={isInitializing}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded text-[11px] font-semibold transition-colors">
            {isInitializing ? '⏳ Inicializando...' : '🚀 Inicializar ligas'}
          </button>
        )}
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: League selector */}
        <div className="w-48 bg-gray-950 border-r border-gray-800/60 flex flex-col shrink-0">
          <div className="px-3 py-2 text-[10px] text-gray-600 uppercase tracking-widest font-bold border-b border-gray-800/60">
            Ligas
          </div>
          <div className="flex-1 overflow-y-auto">
            {LEAGUES.map(l => {
              const ls = status?.leagues?.[l.code]
              const isActive = activeLeague === l.code
              return (
                <button key={l.code} onClick={() => setActiveLeague(l.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-gray-800/30 ${
                    isActive ? 'bg-emerald-950/40 border-l-2 border-l-emerald-500' : 'hover:bg-gray-800/30'
                  }`}>
                  <span className="text-base shrink-0">{l.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>{l.name}</p>
                    {ls && (
                      <p className="text-[10px] text-gray-700">{ls.teams_in_model} equipos</p>
                    )}
                  </div>
                  <LiveDot active={ls?.model_trained} />
                </button>
              )
            })}
          </div>

          {/* Bottom mini stats */}
          <div className="border-t border-gray-800/60 p-3 space-y-2">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Resumen</div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600">Value bets</span>
              <span className="text-emerald-400 font-bold">{valueBets.length}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600">Arbitraje</span>
              <span className="text-amber-400 font-bold">{arbs.length}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600">Partidos</span>
              <span className="text-white font-bold">{fixtures.length}</span>
            </div>
            <Link to={`/league/${activeLeague}`}
              className="block w-full text-center text-[10px] text-emerald-600 hover:text-emerald-400 mt-2 transition-colors">
              Ver liga completa →
            </Link>
          </div>
        </div>

        {/* CENTER: main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Center tabs */}
          <div className="flex border-b border-gray-800/60 bg-gray-950/50 shrink-0">
            {centerTabs.map(t => (
              <button key={t.id} onClick={() => setCenterTab(t.id)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                  centerTab === t.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Matches tab */}
            {centerTab === 'matches' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/40 bg-gray-900/30">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                    {LEAGUES.find(l => l.code === activeLeague)?.flag} Próximos partidos · {LEAGUES.find(l => l.code === activeLeague)?.name}
                  </span>
                  {!modelTrained && (
                    <span className="text-[10px] text-amber-500">— modelo no inicializado</span>
                  )}
                </div>
                {/* Header */}
                <div className="flex items-center px-3 py-1 text-[10px] text-gray-700 border-b border-gray-800/30">
                  <span className="w-16">Fecha</span>
                  <span className="flex-1 text-right">Local</span>
                  <span className="w-10 text-center">-</span>
                  <span className="flex-1 text-left">Visitante</span>
                  <span className="w-8 text-center text-emerald-700">1</span>
                  <span className="w-8 text-center text-gray-700">X</span>
                  <span className="w-8 text-center text-blue-700">2</span>
                  <span className="w-10" />
                </div>
                {fixtures.length === 0 && (
                  <div className="p-8 text-center text-gray-600 text-sm">
                    {isInitializing ? '⏳ Cargando datos de la API...' : 'Sin partidos disponibles. Inicializa las ligas.'}
                  </div>
                )}
                {fixtures.map((m, i) => (
                  <MatchRow key={i} match={m} leagueCode={activeLeague} />
                ))}

                {/* Value bets section */}
                {allEvents.length > 0 && (
                  <>
                    <div className="px-3 py-2 border-t border-gray-800/60 bg-emerald-950/10 text-[10px] text-emerald-600 uppercase tracking-widest font-bold">
                      ⚡ Value bets detectados ({valueBets.length}/{allEvents.length} partidos)
                    </div>
                    {allEvents.map((m, i) => (
                      <MatchRow key={i} match={m} leagueCode={activeLeague} />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Standings tab */}
            {centerTab === 'standings' && (
              <div>
                <div className="px-3 py-2 border-b border-gray-800/40 bg-gray-900/30 text-[10px] text-gray-600 uppercase tracking-widest">
                  {LEAGUES.find(l => l.code === activeLeague)?.flag} Clasificación · {LEAGUES.find(l => l.code === activeLeague)?.name}
                </div>
                {standings.length === 0 ? (
                  <div className="p-8 text-center text-gray-600 text-sm">Sin datos de clasificación. Inicializa las ligas.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-600 border-b border-gray-800/60 bg-gray-900/30">
                        <th className="text-left py-2 px-2 w-8">#</th>
                        <th className="text-left py-2 px-2">Equipo</th>
                        <th className="text-center py-2 px-1">PJ</th>
                        <th className="text-center py-2 px-1 text-emerald-700">G</th>
                        <th className="text-center py-2 px-1">E</th>
                        <th className="text-center py-2 px-1 text-red-700">P</th>
                        <th className="text-center py-2 px-1">GF</th>
                        <th className="text-center py-2 px-1">GC</th>
                        <th className="text-center py-2 px-1">DG</th>
                        <th className="text-center py-2 px-2 text-white font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, i) => (
                        <tr key={i} className={`border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors ${
                          i < 4 ? 'border-l-2 border-l-blue-500' :
                          i < 6 ? 'border-l-2 border-l-amber-500' :
                          standings.length - i <= 3 ? 'border-l-2 border-l-red-500' : ''
                        }`}>
                          <td className="py-2 px-2 text-gray-600">{row.position}</td>
                          <td className="py-2 px-2 flex items-center gap-2">
                            {row.crest && <img src={row.crest} alt="" className="w-4 h-4 object-contain" />}
                            <span className="text-gray-200">{row.team}</span>
                          </td>
                          <td className="text-center py-2 px-1 text-gray-500">{row.played}</td>
                          <td className="text-center py-2 px-1 text-emerald-400">{row.won}</td>
                          <td className="text-center py-2 px-1 text-gray-500">{row.draw}</td>
                          <td className="text-center py-2 px-1 text-red-400">{row.lost}</td>
                          <td className="text-center py-2 px-1 text-gray-400">{row.goals_for}</td>
                          <td className="text-center py-2 px-1 text-gray-400">{row.goals_against}</td>
                          <td className={`text-center py-2 px-1 ${row.goal_diff > 0 ? 'text-emerald-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                          </td>
                          <td className="text-center py-2 px-2 font-bold text-white">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* News tab */}
            {centerTab === 'news' && (
              <NewsPanel news={news} loading={loadingNews} />
            )}
          </div>
        </div>

        {/* RIGHT: Value bets + Arbitrage */}
        <div className="w-72 bg-gray-950 border-l border-gray-800/60 flex flex-col shrink-0 overflow-hidden">
          {/* Value bets */}
          <div className="shrink-0 px-3 py-2 border-b border-gray-800/60 flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">⚡ Value Bets</span>
            <span className="text-[10px] text-gray-600">{valueBets.length} detectados</span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '50%' }}>
            {!hasOddsKey && (
              <div className="p-4 text-[11px] text-gray-600 text-center">Sin Odds API key configurada</div>
            )}
            {hasOddsKey && !modelTrained && (
              <div className="p-4 text-[11px] text-gray-600 text-center">Inicializa las ligas primero</div>
            )}
            {loadingBets && (
              <div className="p-4 text-[11px] text-gray-600 animate-pulse text-center">Analizando cuotas...</div>
            )}
            {valueBets.length === 0 && !loadingBets && modelTrained && hasOddsKey && (
              <div className="p-4 text-[11px] text-gray-600 text-center">Sin value bets activos en {LEAGUES.find(l=>l.code===activeLeague)?.name}</div>
            )}
            {valueBets.map((event, i) => (
              <ValueBetCard key={i} event={event} leagueCode={activeLeague} />
            ))}
          </div>

          {/* Arbitrage */}
          <div className="shrink-0 px-3 py-2 border-t border-b border-amber-500/20 flex items-center justify-between bg-amber-950/10">
            <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">🔀 Arbitraje</span>
            <span className="text-[10px] text-gray-600">{arbs.length} oportunidades</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {arbs.length === 0 && (
              <div className="p-4 text-[11px] text-gray-600 text-center">Sin oportunidades activas</div>
            )}
            {arbs.map((arb, i) => (
              <ArbCard key={i} arb={arb} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom news ticker */}
      <NewsTickerBar news={news} />
    </div>
  )
}
