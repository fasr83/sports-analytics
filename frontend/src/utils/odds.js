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

export const LEAGUE_GROUPS = {
  Europa:        { label: 'Europa',          icon: '🌍' },
  Internacional: { label: 'Internacional',   icon: '🏆' },
  América:       { label: 'América',         icon: '🌎' },
  Mundial:       { label: 'Clasificatorias', icon: '🌐' },
  Otros:         { label: 'Otros',           icon: '🌏' },
}

export const LEAGUES = [
  // Europa
  { code: 'PL',   name: 'Premier League',    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'Europa' },
  { code: 'PD',   name: 'La Liga',           flag: '🇪🇸', group: 'Europa' },
  { code: 'BL1',  name: 'Bundesliga',        flag: '🇩🇪', group: 'Europa' },
  { code: 'SA',   name: 'Serie A',           flag: '🇮🇹', group: 'Europa' },
  { code: 'FL1',  name: 'Ligue 1',           flag: '🇫🇷', group: 'Europa' },
  { code: 'ERL',  name: 'Eredivisie',        flag: '🇳🇱', group: 'Europa' },
  { code: 'PRL',  name: 'Liga Portugal',     flag: '🇵🇹', group: 'Europa' },
  { code: 'SUP',  name: 'Süper Lig',         flag: '🇹🇷', group: 'Europa' },
  // Internacional
  { code: 'CL',   name: 'Champions League',  flag: '🏆', group: 'Internacional' },
  { code: 'EL',   name: 'Europa League',     flag: '🇪🇺', group: 'Internacional' },
  { code: 'LIB',  name: 'Copa Libertadores', flag: '🌟', group: 'Internacional' },
  { code: 'SUD',  name: 'Copa Sudamericana', flag: '🌎', group: 'Internacional' },
  // América
  { code: 'CO1',  name: 'Liga BetPlay',      flag: '🇨🇴', group: 'América' },
  { code: 'MLS',  name: 'MLS',               flag: '🇺🇸', group: 'América' },
  { code: 'LMX',  name: 'Liga MX',           flag: '🇲🇽', group: 'América' },
  { code: 'BRA',  name: 'Brasileirao',       flag: '🇧🇷', group: 'América' },
  { code: 'ARG',  name: 'Argentine Primera', flag: '🇦🇷', group: 'América' },
  // Clasificatorias Mundial
  { code: 'WCQC', name: 'Clasif. CONMEBOL',  flag: '🌐', group: 'Mundial' },
  { code: 'WCQU', name: 'Clasif. UEFA',      flag: '🌐', group: 'Mundial' },
  // Otros
  { code: 'SPL',  name: 'Saudi Pro League',  flag: '🇸🇦', group: 'Otros' },
]
