import { useSetupStatus, useInitDemo } from '../hooks/useApi'

export default function SetupBanner() {
  const { data: status } = useSetupStatus()
  const { mutate: initDemo, isPending, data: result } = useInitDemo()

  const allReady = status?.leagues && Object.values(status.leagues).every(l => l.initialized)
  if (allReady) return null

  return (
    <div className="bg-blue-900/40 border border-blue-500/40 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-blue-300 mb-1">Inicializacion requerida</h3>
          <p className="text-sm text-gray-400">
            Carga los datos de las 5 ligas con estadisticas reales para activar el analisis completo.
            {!status?.has_real_keys && <span className="text-yellow-400 ml-1">(Modo demo — sin API keys)</span>}
          </p>
        </div>
        <button
          onClick={() => initDemo()}
          disabled={isPending}
          className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
        >
          {isPending ? 'Cargando datos...' : 'Inicializar Ligas'}
        </button>
      </div>
      {result && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Object.entries(result.results).map(([code, r]) => (
            <div key={code} className="bg-blue-900/40 rounded p-2 text-center text-xs">
              <div className="font-bold text-white">{code}</div>
              <div className="text-green-400">{r.matches_used} partidos</div>
              <div className="text-gray-400">{r.teams} equipos</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
