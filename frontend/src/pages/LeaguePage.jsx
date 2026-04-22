import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStandings, useMatches, useTrainModel, useValueBets, useUpcomingPredictions } from '../hooks/useApi'
import StandingsTable from '../components/StandingsTable'
import MatchCard from '../components/MatchCard'
import { LEAGUES } from '../utils/odds'

export default function LeaguePage() {
  const { code } = useParams()
  const [tab, setTab] = useState('standings')
  const league = LEAGUES.find(l => l.code === code)

  const { data: standingsData, isLoading: loadingStandings } = useStandings(code)
  const { data: matchesData, isLoading: loadingMatches } = useMatches(code, 'SCHEDULED')
  const { data: finishedData } = useMatches(code, 'FINISHED')
  const { data: valueBetsData } = useValueBets(code)
  const { data: upcomingPredictions } = useUpcomingPredictions(code)
  const trainMutation = useTrainModel(code)

  const tabs = [
    { id: 'standings', label: '📊 Clasificación' },
    { id: 'upcoming', label: '📅 Próximos' },
    { id: 'results', label: '✅ Resultados' },
    { id: 'value', label: '⚡ Value Bets' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {league?.flag} {league?.name}
          </h1>
          <p className="text-gray-500 text-sm">Temporada 2024/25</p>
        </div>
        <button
          onClick={() => trainMutation.mutate()}
          disabled={trainMutation.isPending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {trainMutation.isPending ? 'Entrenando...' : '🧠 Entrenar Modelo'}
        </button>
      </div>

      {trainMutation.data && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-sm text-green-400">
          Modelo entrenado con {trainMutation.data.matches_used} partidos · {trainMutation.data.teams} equipos
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'standings' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          {loadingStandings ? (
            <p className="text-gray-500">Cargando clasificación...</p>
          ) : (
            <StandingsTable standings={standingsData?.standings} />
          )}
          <div className="mt-3 flex gap-4 text-xs text-gray-600">
            <span><span className="inline-block w-2 h-4 bg-blue-500 mr-1"></span>Champions</span>
            <span><span className="inline-block w-2 h-4 bg-orange-500 mr-1"></span>Europa</span>
            <span><span className="inline-block w-2 h-4 bg-red-500 mr-1"></span>Descenso</span>
          </div>
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="space-y-3">
          {loadingMatches && <p className="text-gray-500">Cargando partidos...</p>}
          {upcomingPredictions?.fixtures?.slice(0, 20).map((m, i) => (
            <MatchCard key={i} match={m} leagueCode={code} showPrediction />
          ))}
          {!upcomingPredictions && matchesData?.matches?.slice(0, 20).map((m, i) => (
            <MatchCard key={i} match={m} leagueCode={code} />
          ))}
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-3">
          {finishedData?.matches?.slice(-20).reverse().map((m, i) => (
            <MatchCard key={i} match={m} leagueCode={code} />
          ))}
        </div>
      )}

      {tab === 'value' && (
        <div>
          {!valueBetsData && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center text-gray-500">
              Entrena el modelo primero para ver value bets.
            </div>
          )}
          <div className="space-y-3">
            {valueBetsData?.events?.map((event, i) => (
              <MatchCard key={i} match={event} leagueCode={code} showPrediction />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
