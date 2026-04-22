export default function PoissonHeatmap({ matrix, homeTeam, awayTeam, maxGoals = 6 }) {
  if (!matrix) return null
  const max = Math.max(...matrix.flat())

  return (
    <div>
      <div className="text-xs text-gray-500 mb-2 text-center">Probabilidad por marcador (%)</div>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse mx-auto">
          <thead>
            <tr>
              <th className="p-1 text-gray-600">↓Local / Visit.→</th>
              {Array.from({ length: maxGoals + 1 }, (_, j) => (
                <th key={j} className="p-1 text-gray-500 w-12">{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxGoals + 1 }, (_, i) => (
              <tr key={i}>
                <td className="p-1 text-gray-500 font-medium">{i}</td>
                {Array.from({ length: maxGoals + 1 }, (_, j) => {
                  const val = matrix[i]?.[j] ?? 0
                  const intensity = max > 0 ? val / max : 0
                  const pct = (val * 100).toFixed(1)
                  return (
                    <td
                      key={j}
                      className="p-1 text-center w-12 h-10 rounded"
                      style={{
                        backgroundColor: `rgba(34, 197, 94, ${intensity * 0.8})`,
                        color: intensity > 0.5 ? 'white' : '#9ca3af',
                      }}
                      title={`${i}-${j}: ${pct}%`}
                    >
                      {pct}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-center text-xs text-gray-600 mt-1">
        {awayTeam} →
      </div>
    </div>
  )
}
