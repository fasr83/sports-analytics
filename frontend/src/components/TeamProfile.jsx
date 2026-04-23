import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

/* ── Static maps ─────────────────────────────────────────────────────────── */
const RESULT_CLS = { W: 'bg-emerald-600', D: 'bg-gray-600', L: 'bg-red-600' }

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
const POS_LABEL = {
  Goalkeeper: 'Porteros', Defender: 'Defensas',
  Midfielder: 'Centrocampistas', Attacker: 'Delanteros',
}
const POS_COLOR = {
  Goalkeeper: 'text-yellow-300 bg-yellow-950/30 border-yellow-800/40',
  Defender:   'text-blue-300   bg-blue-950/30   border-blue-800/40',
  Midfielder: 'text-emerald-300 bg-emerald-950/30 border-emerald-800/40',
  Attacker:   'text-red-300    bg-red-950/30    border-red-800/40',
}
const POS_BADGE = {
  Goalkeeper: 'bg-yellow-900/70 text-yellow-300',
  Defender:   'bg-blue-900/70   text-blue-300',
  Midfielder: 'bg-emerald-900/70 text-emerald-300',
  Attacker:   'bg-red-900/70    text-red-300',
}

const NAT_FLAG = {
  'Argentina':'🇦🇷','Brazil':'🇧🇷','France':'🇫🇷','Spain':'🇪🇸','Germany':'🇩🇪',
  'Italy':'🇮🇹','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Portugal':'🇵🇹','Netherlands':'🇳🇱','Belgium':'🇧🇪',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴','Mexico':'🇲🇽','USA':'🇺🇸',
  'Senegal':'🇸🇳','Morocco':'🇲🇦','Nigeria':'🇳🇬','Ghana':'🇬🇭','Egypt':'🇪🇬',
  'Ivory Coast':'🇨🇮','Japan':'🇯🇵','South Korea':'🇰🇷','Australia':'🇦🇺',
  'Switzerland':'🇨🇭','Denmark':'🇩🇰','Sweden':'🇸🇪','Norway':'🇳🇴','Austria':'🇦🇹',
  'Poland':'🇵🇱','Serbia':'🇷🇸','Turkey':'🇹🇷','Greece':'🇬🇷','Ukraine':'🇺🇦',
  'Romania':'🇷🇴','Czech Republic':'🇨🇿','Slovakia':'🇸🇰','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','Ireland':'🇮🇪','Chile':'🇨🇱','Ecuador':'🇪🇨','Peru':'🇵🇪',
  'Venezuela':'🇻🇪','Paraguay':'🇵🇾','Bolivia':'🇧🇴','Saudi Arabia':'🇸🇦',
  'Tunisia':'🇹🇳','Algeria':'🇩🇿','Cameroon':'🇨🇲','Costa Rica':'🇨🇷','Canada':'🇨🇦',
  'Iceland':'🇮🇸','Finland':'🇫🇮','Israel':'🇮🇱','Albania':'🇦🇱','Bosnia':'🇧🇦',
  'Slovenia':'🇸🇮','Bulgaria':'🇧🇬','Hungary':'🇭🇺','Russia':'🇷🇺',
  'Congo DR':'🇨🇩','Mali':'🇲🇱','Gabon':'🇬🇦','Guinea':'🇬🇳','Zambia':'🇿🇲',
  'Ghana':'🇬🇭','Burkina Faso':'🇧🇫','Kenya':'🇰🇪','Tanzania':'🇹🇿',
}

/* ── Rating bar ─────────────────────────────────────────────────────────── */
function RatingBar({ pct }) {
  if (!pct) return <span className="text-[10px] text-gray-700 font-mono">—</span>
  const color = pct >= 75 ? 'from-emerald-600 to-emerald-400' : pct >= 60 ? 'from-yellow-600 to-yellow-400' : 'from-red-700 to-red-500'
  const textColor = pct >= 75 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-black font-mono w-6 text-right ${textColor}`}>{pct}</span>
    </div>
  )
}

const NA = <span className="text-gray-700">—</span>
const val = (v, suffix = '') => (v != null && v !== '') ? `${v}${suffix}` : '—'
const num = (v) => (v != null) ? v : <span className="text-gray-600">0</span>

/* ── Player card (collapsed + expanded) ─────────────────────────────────── */
function PlayerCard({ p, expanded, onToggle }) {
  const flag  = NAT_FLAG[p.nationality] ?? '🌍'
  const badge = POS_BADGE[p.position]   ?? 'bg-gray-800 text-gray-400'
  const hasStats = p.apps != null || p.goals != null

  return (
    <div className="border-b border-gray-800/30 hover:bg-white/[0.015] transition-colors">

      {/* ── Collapsed row ── */}
      <button onClick={onToggle} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left">

        {/* Photo */}
        {p.photo
          ? <img src={p.photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 bg-gray-800 border border-gray-700/40" loading="lazy" />
          : <div className="w-9 h-9 rounded-full bg-gray-800 shrink-0 flex items-center justify-center text-gray-600 text-[11px] font-bold border border-gray-700/30">{p.number ?? '?'}</div>
        }

        {/* Dorsal */}
        <span className="text-[10px] text-gray-600 font-mono w-5 text-center shrink-0">{p.number ?? '—'}</span>

        {/* Name + nationality + age */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-semibold truncate leading-tight">{p.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs leading-none">{flag}</span>
            <span className="text-[9px] text-gray-500 truncate">{p.nationality ?? '—'}</span>
            {p.age && <span className="text-[9px] text-gray-700">· {p.age}a</span>}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-2 shrink-0 text-center">
          {[
            ['PJ', p.apps,    'text-white'],
            ['G',  p.goals,   p.goals > 0  ? 'text-emerald-400' : 'text-gray-500'],
            ['A',  p.assists, p.assists > 0 ? 'text-blue-400'    : 'text-gray-500'],
          ].map(([lbl, v, cls]) => (
            <div key={lbl} className="flex flex-col items-center min-w-[28px]">
              <span className={`text-xs font-black ${cls}`}>{v ?? '—'}</span>
              <span className="text-[8px] text-gray-700 uppercase">{lbl}</span>
            </div>
          ))}
          <div className="w-16 hidden sm:block">
            <RatingBar pct={p.rating_pct} />
          </div>
        </div>

        {/* Position badge */}
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1 ${badge}`}>
          {p.position === 'Goalkeeper' ? 'POR' : p.position === 'Defender' ? 'DEF' : p.position === 'Midfielder' ? 'MED' : p.position === 'Attacker' ? 'DEL' : '—'}
        </span>

        <span className="text-gray-700 text-[9px] ml-1.5">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="mx-4 mb-3 rounded-xl border border-gray-800/40 bg-[#060c1a] overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-800/40">

            {/* LEFT — personal info */}
            <div className="p-3.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-3">Información</p>

              {/* Photo large */}
              {p.photo && (
                <div className="flex items-center gap-3 mb-3">
                  <img src={p.photo} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-800 border border-gray-700/40" />
                  <div>
                    <p className="text-sm text-white font-bold leading-tight">{p.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{flag} {p.nationality ?? '—'}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {[
                  ['Nombre completo', [p.firstname, p.lastname].filter(Boolean).join(' ') || p.name],
                  ['Nacionalidad',    p.nationality ? `${flag} ${p.nationality}` : '—'],
                  ['Edad',           p.age ? `${p.age} años` : '—'],
                  ['Altura',         p.height ?? '—'],
                  ['Peso',           p.weight ?? '—'],
                  ['Posición',       p.position ?? '—'],
                  ['Dorsal',         p.number != null ? `#${p.number}` : '—'],
                  ['Valor mercado',  '— (Transfermarkt)'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-[9px] text-gray-600 w-24 shrink-0 leading-tight">{label}</span>
                    <span className={`text-[10px] font-medium leading-tight ${value === '—' || value === '— (Transfermarkt)' ? 'text-gray-700' : 'text-gray-200'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — season stats */}
            <div className="p-3.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-3">Temporada — Stats</p>

              {/* Level bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Nivel actual</span>
                  <span className={`text-sm font-black ${!p.rating_pct ? 'text-gray-700' : p.rating_pct >= 75 ? 'text-emerald-400' : p.rating_pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {p.rating_pct ? `${p.rating_pct}%` : 'Sin datos'}
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  {p.rating_pct ? (
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${p.rating_pct >= 75 ? 'from-emerald-600 to-emerald-400' : p.rating_pct >= 60 ? 'from-yellow-600 to-yellow-400' : 'from-red-700 to-red-500'}`}
                      style={{ width: `${p.rating_pct}%` }}
                    />
                  ) : (
                    <div className="h-full w-0 bg-gray-700 rounded-full" />
                  )}
                </div>
                {p.rating && (
                  <p className="text-[9px] text-gray-700 mt-1 text-right">Calificación: {p.rating}/10</p>
                )}
              </div>

              {/* Stats grid */}
              {hasStats ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Partidos',    value: p.apps,       color: 'text-white' },
                    { label: 'Minutos',     value: p.minutes,    color: 'text-gray-200' },
                    { label: 'Goles',       value: p.goals,      color: p.goals  > 0 ? 'text-emerald-400' : 'text-gray-400' },
                    { label: 'Asistencias', value: p.assists,    color: p.assists > 0 ? 'text-blue-400'    : 'text-gray-400' },
                    { label: 'Disparos',    value: p.shots,      color: 'text-gray-300' },
                    { label: 'Pases clave', value: p.key_passes, color: 'text-violet-400' },
                    { label: 'Tackles',     value: p.tackles,    color: 'text-yellow-400' },
                    { label: 'Amarillas',   value: p.yellow,     color: p.yellow > 0 ? 'text-yellow-400' : 'text-gray-600' },
                    { label: 'Rojas',       value: p.red,        color: p.red    > 0 ? 'text-red-400'    : 'text-gray-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-black/40 rounded-xl py-2.5 px-1.5 text-center">
                      <p className={`text-sm font-black ${color}`}>{value ?? '—'}</p>
                      <p className="text-[8px] text-gray-700 leading-tight mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-[11px] text-gray-600">Sin stats disponibles</p>
                  <p className="text-[10px] text-gray-700 mt-1">El jugador puede no haber disputado<br/>partidos en esta temporada</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main modal ─────────────────────────────────────────────────────────── */
export default function TeamProfile({ teamId, teamName, teamCrest, onClose }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [tab, setTab] = useState('squad')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['team', teamId],
    queryFn:  () => api.get(`/teams/${teamId}`).then(r => r.data),
    staleTime: 3600000,
    enabled:   !!teamId,
  })

  const togglePlayer = (id) =>
    setExpandedPlayer(prev => prev === id ? null : id)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center pt-4 pb-4 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#07101f] border border-gray-700/50 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-[#04070f] to-[#07101f] border-b border-gray-800/50 shrink-0">
          {(data?.info?.logo || teamCrest) && (
            <img src={data?.info?.logo || teamCrest} alt="" className="w-14 h-14 object-contain" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-xl leading-tight">{data?.info?.name || teamName}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {data?.info?.country && <span className="text-[11px] text-gray-400">🌍 {data.info.country}</span>}
              {data?.info?.founded && <span className="text-[11px] text-gray-600">Est. {data.info.founded}</span>}
              {data?.venue?.name   && <span className="text-[11px] text-emerald-400">🏟 {data.venue.name}</span>}
              {data?.venue?.city   && <span className="text-[11px] text-gray-600">📍 {data.venue.city}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-lg font-bold"
          >✕</button>
        </div>

        {/* ── Stadium stats bar ── */}
        {data && !data.demo && (
          <div className="grid grid-cols-3 divide-x divide-gray-800/50 border-b border-gray-800/40 shrink-0 bg-black/20">
            {[
              ['🏟', 'Estadio',   data.venue?.name     || '—'],
              ['🏙️', 'Ciudad',    data.venue?.city     || '—'],
              ['👥', 'Cap.',      data.venue?.capacity ? data.venue.capacity.toLocaleString() : '—'],
            ].map(([icon, label, v]) => (
              <div key={label} className="px-3 py-2.5 text-center">
                <p className="text-xs text-gray-200 font-semibold truncate">{icon} {v}</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab bar ── */}
        {data && !data.demo && (
          <div className="flex border-b border-gray-800/50 bg-[#040a14] shrink-0">
            {[
              { id: 'squad',     label: `👤 Plantilla (${data.squad?.length ?? 0})` },
              { id: 'recent',    label: `📅 Partidos (${data.recent?.length ?? 0})` },
              { id: 'transfers', label: `🔄 Fichajes (${data.transfers?.length ?? 0})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                    : 'border-transparent text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {isLoading && (
            <div className="p-12 text-center text-gray-500 animate-pulse">Cargando perfil…</div>
          )}

          {isError && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">⚠️</p>
              <p className="text-gray-500 text-sm">No se pudo cargar el perfil</p>
            </div>
          )}

          {data?.demo && (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🔑</p>
              <p className="text-gray-300 font-semibold">Perfil disponible con API key</p>
              <p className="text-gray-600 text-xs mt-2 max-w-xs mx-auto">
                Configura API_FOOTBALL_KEY para ver estadio, plantilla completa con stats y fichajes en tiempo real
              </p>
            </div>
          )}

          {/* Squad tab */}
          {data && !data.demo && tab === 'squad' && (
            <div>
              {/* Column headers */}
              <div className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-800/40 bg-black/30 text-[9px] text-gray-600 uppercase tracking-widest font-bold shrink-0">
                <div className="w-9 shrink-0" />
                <div className="w-5 shrink-0" />
                <div className="flex-1">Jugador · Nac. · Edad</div>
                <div className="flex gap-2 shrink-0">
                  <span className="w-7 text-center">PJ</span>
                  <span className="w-5 text-center">G</span>
                  <span className="w-5 text-center">A</span>
                  <span className="w-16 text-center hidden sm:block">Nivel</span>
                </div>
                <span className="w-10 text-center shrink-0">Pos</span>
                <span className="w-4" />
              </div>

              {data.squad.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-600 text-center">Sin datos de plantilla para esta temporada</p>
              ) : POS_ORDER.map(pos => {
                const players = data.squad.filter(p => p.position === pos)
                if (!players.length) return null
                return (
                  <div key={pos}>
                    <div className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-b border-t ${POS_COLOR[pos]}`}>
                      {POS_LABEL[pos]} — {players.length}
                    </div>
                    {players.map(p => (
                      <PlayerCard
                        key={p.id ?? p.name}
                        p={p}
                        expanded={expandedPlayer === (p.id ?? p.name)}
                        onToggle={() => togglePlayer(p.id ?? p.name)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* Recent matches tab */}
          {data && !data.demo && tab === 'recent' && (
            <div>
              {data.recent.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-600 text-center">Sin partidos recientes disponibles</p>
              ) : data.recent.map((m, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/20 hover:bg-white/[0.02]">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white min-w-[22px] text-center ${RESULT_CLS[m.result] ?? 'bg-gray-700'}`}>
                    {m.result}
                  </span>
                  <span className="text-[10px] text-gray-600 w-4 shrink-0 font-bold">{m.home_away}</span>
                  {m.opponent_logo && <img src={m.opponent_logo} alt="" className="w-6 h-6 object-contain shrink-0" />}
                  <span className="text-sm text-gray-200 flex-1 truncate">{m.opponent}</span>
                  <span className="text-sm font-black font-mono text-white shrink-0">{m.score}</span>
                  {m.competition && <span className="text-[10px] text-gray-600 shrink-0 hidden sm:block truncate max-w-[120px]">{m.competition}</span>}
                  {m.date && <span className="text-[10px] text-gray-700 shrink-0">{m.date.slice(0,10)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Transfers tab */}
          {data && !data.demo && tab === 'transfers' && (
            <div>
              {data.transfers.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-600 text-center">Sin fichajes registrados</p>
              ) : data.transfers.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-800/20 hover:bg-white/[0.02]">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                    t.type === 'Free'   ? 'bg-blue-900/70 text-blue-300' :
                    t.type === 'Loan'   ? 'bg-amber-900/70 text-amber-300' :
                    'bg-emerald-900/70 text-emerald-300'
                  }`}>{t.type || '—'}</span>
                  <span className="text-xs text-gray-200 flex-1 truncate font-medium">{t.player}</span>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                    <span className="text-gray-600 truncate max-w-[80px]">{t.team_out ?? '—'}</span>
                    <span className="text-gray-700">→</span>
                    <span className="text-gray-300 truncate max-w-[80px]">{t.team_in ?? '—'}</span>
                  </div>
                  {t.date && <span className="text-[10px] text-gray-700 shrink-0">{t.date.slice(0,7)}</span>}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
