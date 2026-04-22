import { formatOdds, valueColor, valueBadge, overroundColor } from '../utils/odds'

export default function OddsTable({ bookmakers = [], homeTeam, awayTeam }) {
  if (!bookmakers.length) return <p className="text-gray-500 text-sm">Sin cuotas disponibles.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-3">Casa</th>
            <th className="text-center py-2 px-3">1 (Local)</th>
            <th className="text-center py-2 px-3">X (Empate)</th>
            <th className="text-center py-2 px-3">2 (Visit.)</th>
            <th className="text-center py-2 px-3">Margen</th>
          </tr>
        </thead>
        <tbody>
          {bookmakers.map((bk, i) => {
            const vh = valueBadge(bk.value_home)
            const vd = valueBadge(bk.value_draw)
            const va = valueBadge(bk.value_away)
            return (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-3 font-medium text-gray-300">{bk.bookmaker}</td>
                <td className="text-center py-2 px-3">
                  <span className={valueColor(bk.value_home)}>{formatOdds(bk.odds_home)}</span>
                  {vh && <span className={`ml-1 text-xs px-1 rounded ${vh.cls}`}>{vh.label}</span>}
                  {bk.value_home !== undefined && (
                    <div className="text-xs text-gray-600">{bk.value_home > 0 ? '+' : ''}{(bk.value_home * 100).toFixed(1)}%</div>
                  )}
                </td>
                <td className="text-center py-2 px-3">
                  <span className={valueColor(bk.value_draw)}>{formatOdds(bk.odds_draw)}</span>
                  {vd && <span className={`ml-1 text-xs px-1 rounded ${vd.cls}`}>{vd.label}</span>}
                  {bk.value_draw !== undefined && (
                    <div className="text-xs text-gray-600">{bk.value_draw > 0 ? '+' : ''}{(bk.value_draw * 100).toFixed(1)}%</div>
                  )}
                </td>
                <td className="text-center py-2 px-3">
                  <span className={valueColor(bk.value_away)}>{formatOdds(bk.odds_away)}</span>
                  {va && <span className={`ml-1 text-xs px-1 rounded ${va.cls}`}>{va.label}</span>}
                  {bk.value_away !== undefined && (
                    <div className="text-xs text-gray-600">{bk.value_away > 0 ? '+' : ''}{(bk.value_away * 100).toFixed(1)}%</div>
                  )}
                </td>
                <td className={`text-center py-2 px-3 font-mono ${overroundColor(bk.overround)}`}>
                  {bk.overround ? `${((bk.overround - 1) * 100).toFixed(1)}%` : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
