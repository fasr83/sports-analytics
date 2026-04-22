export const impliedProbability = (odds) => (odds > 1 ? (1 / odds) * 100 : 0)

export const formatOdds = (odds) => (odds ? odds.toFixed(2) : '-')

export const valueColor = (value) => {
  if (value >= 0.15) return 'text-green-400 font-bold'
  if (value >= 0.05) return 'text-yellow-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-400'
}

export const valueBadge = (value) => {
  if (value >= 0.15) return { label: 'ALTO VALOR', cls: 'bg-green-500 text-white' }
  if (value >= 0.05) return { label: 'VALOR', cls: 'bg-yellow-500 text-black' }
  return null
}

export const overroundColor = (overround) => {
  if (overround < 1.04) return 'text-green-400'
  if (overround < 1.07) return 'text-yellow-400'
  return 'text-red-400'
}

export const LEAGUES = [
  { code: 'PL',  name: 'Premier League',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'PD',  name: 'La Liga',          flag: '🇪🇸' },
  { code: 'BL1', name: 'Bundesliga',       flag: '🇩🇪' },
  { code: 'SA',  name: 'Serie A',          flag: '🇮🇹' },
  { code: 'FL1', name: 'Ligue 1',          flag: '🇫🇷' },
  { code: 'CL',  name: 'Champions League', flag: '🏆' },
  { code: 'EL',  name: 'Europa League',    flag: '🇪🇺' },
  { code: 'CO1', name: 'Liga BetPlay',     flag: '🇨🇴' },
]
