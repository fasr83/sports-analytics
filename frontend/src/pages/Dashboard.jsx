import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { LEAGUES } from '../utils/odds'
import MatchCard from '../components/MatchCard'
import { Link } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

function StatCard({ label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
    gray: 'from-gray-800/60 to-transparent border-gray-700/40 text-gray-400',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color].split(' ').pop()}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [activeLeague, setActiveLeague] = useState('PL')
  const qc = useQueryClient()

  const { data: status } = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get('/setup/status').then(r => r.data),
    staleTime: 60000,
    refetchInterval: 15000,
  })

  const modelTrained = status?.leagues?.[activeLeague]?.model_trained ?? false
  const hasOddsKey = status?.has_odds_key ?? false
  const leagueStatus = status?.leagues?.[activeLeague]
  const trainedCount = status?.leagues ? Object.values(status.leagues).filter(l => l.model_trained).length : 0
  const totalLeagues = status?.leagues ? Object.keys(status.leagues).length : 5

  const { data: valueBetsData, isLoading: loadingBets, refetch } = useQuery({
    queryKey: ['value-bets', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/value-bets`).then(r => r.data),
    enabled: modelTrained && hasOddsKey,
    staleTime: 1000 * 60 * 5,
  })

  const { data: arbData, isLoading: loadingArb, refetch: refetchArb } = useQuery({
    queryKey: ['arbitrage', activeLeague],
    queryFn: () => api.get(`/analytics/${activeLeague}/arbitrage`).then(r => r.data),
    enabled: modelTrained && hasOddsKey,
    staleTime: 1000 * 60 * 5,
  })

  const { mutate: trainModel, isPending: isTraining, data: trainResult } = useMutation({
    mutationFn: () => api.get(`/analytics/${activeLeague}/train`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-status'] })
      refetch()
      refetchArb()
    },
  })

  const { mutate: initReal, isPending: isInitializing } = useMutation({
    mutationFn: () => api.post('/setup/init-real').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-status'] })
      setTimeout(() => { refetch(); refetchArb() }, 500)
    },
  })

  const valueBetEvents = valueBetsData?.events?.filter(e => e.has_value) ?? []
  const allEvents = valueBetsData?.events ?? []
  const arbOpps = arbData?.opportunities ?? []
  const anyUntrained = status?.leagues && Object.values(status.leagues).some(l => !l.model_trained)

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Modelo Poisson · Value Bets · Arbitraje entre casas de apuestas</p>
        </div>
        <div className="flex gap-2">
          {anyUntrained && (
            <button
              onClick={() => initReal()}
              disabled={isInitializing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30"
            >
              {isInitializing ? '⏳ Cargando...' : '🚀 Inicializar ligas'}
            </button>
          )}
          <button
            onClick={() => trainModel()}
            disabled={isTraining}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-medium transition-all border border-gray-700/60"
          >
            {isTraining ? '⏳ Entrenando...' : '🧠 Re-entrenar'}
          </button>
          <button
            onClick={() => { refetch(); refetchArb() }}
            disabled={!hasOddsKey}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 rounded-lg text-sm font-medium transition-all border border-gray-700/60"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Value Bets"
          value={valueBetEvents.length || '—'}
          sub={allEvents.length > 0 ? `de ${allEvents.length} partidos` : 'sin datos aún'}
          color="emerald"
        />
        <StatCard
          label="Arbitraje"
          value={arbOpps.length || '—'}
          sub="oportunidades activas"
          color="amber"
        />
        <StatCard
          label="Ligas activas"
          value={`${trainedCount}/${totalLeagues}`}
          sub="modelos entrenados"
          color="blue"
        />
        <StatCard
          label="Odds API"
          value={hasOddsKey ? 'Activa' : 'Sin clave'}
          sub={hasOddsKey ? 'cuotas en tiempo real' : 'configura ODDS_API_KEY'}
          color={hasOddsKey ? 'emerald' : 'gray'}
        />
      </div>

      {/* League status pills */}
      {status?.leagues && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(status.leagues).map(([code, info]) => (
            <div
              key={code}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-default ${
                info.model_trained
                  ? 'bg-emerald-950/40 border-emerald-500/25 text-emerald-400'
                  : 'bg-gray-900/60 border-gray-800 text-gray-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${info.model_trained ? 'bg-emerald-400' : 'bg-gray-700'}`} />
              {info.name}
              {info.model_source === 'api' && <span className="text-emerald-600 text-[10px]">★ API</span>}
            </div>
          ))}
        </div>
      )}

      {/* Train result notification */}
      {trainResult && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/25 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
          <span>✅</span>
          <span>Modelo re-entrenado · <strong>{trainResult.matches_used}</strong> partidos · <strong>{trainResult.teams}</strong> equipos · fuente: <strong>{trainResult.source}</strong></span>
        </div>
      )}

      {/* League tabs */}
      <div className="flex gap-1 border-b border-gray-800/60 pb-0">
        {LEAGUES.map((l) => {
          const ls = status?.leagues?.[l.code]
          return (
            <button
              key={l.code}
              onClick={() => setActiveLeague(l.code)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px flex items-center gap-1.5 ${
                activeLeague === l.code
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {l.flag} {l.name}
              {ls?.model_trained && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          )
        })}
      </div>

      {/* Main content */}
      {!modelTrained ? (
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-300 font-medium mb-1">Liga no inicializada</p>
          <p className="text-sm text-gray-600">
            Pulsa <strong className="text-white">Inicializar ligas</strong> para traer datos reales de la API.
          </p>
          {isInitializing && (
            <div className="mt-4 text-sm text-emerald-400 animate-pulse">Conectando con la API y entrenando modelos…</div>
          )}
        </div>
      ) : !hasOddsKey ? (
        <div className="bg-amber-950/20 border border-amber-500/25 rounded-xl p-6 text-sm text-amber-400">
          ⚠️ Modelo entrenado con <strong>{leagueStatus?.teams_in_model}</strong> equipos, pero no hay Odds API key. Las cuotas y value bets no están disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Value Bets */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="text-emerald-400">⚡</span> Value Bets Detectados
              </h2>
              {valueBetsData && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">{valueBetEvents.length} de {allEvents.length} partidos</span>
                  <Link
                    to={`/league/${activeLeague}`}
                    className="text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
                  >
                    Ver liga completa →
                  </Link>
                </div>
              )}
            </div>

            {loadingBets && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 animate-pulse h-24" />
                ))}
              </div>
            )}

            {!loadingBets && valueBetEvents.length === 0 && allEvents.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-8 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-gray-500 text-sm">Sin value bets detectados para {LEAGUES.find(l => l.code === activeLeague)?.name}</p>
                <p className="text-gray-700 text-xs mt-1">{allEvents.length} partidos analizados · edge mínimo requerido: 5%</p>
              </div>
            )}

            <div className="space-y-3">
              {valueBetEvents.map((event, i) => (
                <MatchCard key={i} match={event} leagueCode={activeLeague} showPrediction />
              ))}
            </div>

            {allEvents.filter(e => !e.has_value).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-700 hover:text-gray-500 cursor-pointer py-2 select-none">
                  Ver {allEvents.filter(e => !e.has_value).length} partidos sin value bet
                </summary>
                <div className="space-y-2 mt-2">
                  {allEvents.filter(e => !e.has_value).map((event, i) => (
                    <MatchCard key={i} match={event} leagueCode={activeLeague} showPrediction />
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Arbitrage */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="text-amber-400">🔀</span> Arbitraje
            </h2>

            {loadingArb && (
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 animate-pulse h-20" />
            )}

            {!loadingArb && arbOpps.length === 0 && (
              <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-6 text-center">
                <div className="text-2xl mb-2">⚖️</div>
                <p className="text-gray-600 text-sm">Sin oportunidades activas</p>
              </div>
            )}

            <div className="space-y-3">
              {arbOpps.map((arb, i) => (
                <div key={i} className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-2 font-medium">
                    {arb.home_team} <span className="text-gray-700">vs</span> {arb.away_team}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-amber-400 font-bold text-2xl">+{arb.profit_pct}%</span>
                    <span className="text-xs text-gray-600">garantizado</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-3">Suma implícita {(arb.implied_sum * 100).toFixed(1)}%</div>
                  <div className="space-y-1 text-xs border-t border-gray-800/60 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">1 · {arb.best_home?.bookmaker}</span>
                      <span className="text-white font-semibold">{arb.best_home?.odds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">X · {arb.best_draw?.bookmaker}</span>
                      <span className="text-white font-semibold">{arb.best_draw?.odds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">2 · {arb.best_away?.bookmaker}</span>
                      <span className="text-white font-semibold">{arb.best_away?.odds}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
