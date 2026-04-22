export default function StandingsTable({ standings = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-2 w-8">#</th>
            <th className="text-left py-2 px-2">Equipo</th>
            <th className="text-center py-2 px-2">PJ</th>
            <th className="text-center py-2 px-2">G</th>
            <th className="text-center py-2 px-2">E</th>
            <th className="text-center py-2 px-2">P</th>
            <th className="text-center py-2 px-2">GF</th>
            <th className="text-center py-2 px-2">GC</th>
            <th className="text-center py-2 px-2">DG</th>
            <th className="text-center py-2 px-2 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                i < 4 ? 'border-l-2 border-l-blue-500' :
                i < 6 ? 'border-l-2 border-l-orange-500' :
                standings.length - i <= 3 ? 'border-l-2 border-l-red-500' : ''
              }`}
            >
              <td className="py-2 px-2 text-gray-500">{row.position}</td>
              <td className="py-2 px-2 flex items-center gap-2">
                {row.crest && <img src={row.crest} alt="" className="w-5 h-5 object-contain" />}
                <span>{row.team}</span>
              </td>
              <td className="text-center py-2 px-2 text-gray-400">{row.played}</td>
              <td className="text-center py-2 px-2 text-green-400">{row.won}</td>
              <td className="text-center py-2 px-2 text-gray-400">{row.draw}</td>
              <td className="text-center py-2 px-2 text-red-400">{row.lost}</td>
              <td className="text-center py-2 px-2">{row.goals_for}</td>
              <td className="text-center py-2 px-2">{row.goals_against}</td>
              <td className={`text-center py-2 px-2 ${row.goal_diff > 0 ? 'text-green-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
              </td>
              <td className="text-center py-2 px-2 font-bold text-white">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
