import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { LEAGUES } from '../utils/odds'
import { useNews } from '../hooks/useNews'
import { useYouTube } from '../hooks/useYouTube'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

const WC2026 = new Date('2026-06-11T20:00:00Z')

const WORLD_CLOCKS = [
  { flag: '🇨🇴', city: 'Bogotá',   tz: 'America/Bogota' },
  { flag: '🇬🇧', city: 'Londres',  tz: 'Europe/London' },
  { flag: '🇪🇸', city: 'Madrid',   tz: 'Europe/Madrid' },
  { flag: '🇩🇪', city: 'Berlín',   tz: 'Europe/Berlin' },
  { flag: '🇺🇸', city: 'New York', tz: 'America/New_York' },
  { flag: '🇲🇽', city: 'México',   tz: 'America/Mexico_City' },
]

const TV_CHANNELS = {
  PL:  ['ESPN', 'Star+', 'Sky Sports'],
  PD:  ['ESPN', 'Star+', 'DAZN'],
  BL1: ['ESPN', 'Star+', 'DAZN'],
  SA:  ['ESPN', 'Star+', 'Sky Sport IT'],
  FL1: ['ESPN', 'Star+', 'beIN Sports'],
  CL:  ['ESPN', 'Star+', 'Movistar+'],
  EL:  ['ESPN', 'Star+'],
  CO1: ['Win Sports', 'Win Sports+', 'RCN'],
}

function useClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return t
}

function useWCCountdown(now) {
  const diff = WC2026 - now
  if (diff <= 0) return null
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}

/* ─── Small reusable atoms ─── */
function Dot({ on }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-400 animate-pulse' : 'bg-gray-700'}`} />
}

function Tag({ children, color = 'gray' }) {
  const cls = { gray: 'bg-gray-800 text-gray-500', green: 'bg-emerald-900/50 text-emerald-400', amber: 'bg-amber-900/40 text-amber-400' }
  return <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${cls[color]}`}>{children}</span>
}

/* ─── World clock ─── */
function WorldClockBar({ now }) {
  const fmt = tz => new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz }).format(now)
  return (
    <div className="flex items-center gap-6 px-4 py-1 bg-[#050a12] border-b border-gray-800/30 text-[10px] overflow-x-auto shrink-0">
      <span className="text-gray-700 font-bold uppercase tracking-widest shrink-0">Hora mundial</span>
      {WORLD_CLOCKS.map(c => (
        <div key={c.tz} className="flex items-center gap-1 shrink-0">
          <span>{c.flag}</span>
          <span className="text-gray-600">{c.city}</span>
          <span className="text-white font-mono font-bold">{fmt(c.tz)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── News ticker ─── */
function Ticker({ news }) {
  const items = news.map(n => n.title).filter(Boolean)
  if (!items.length) return null
  const doubled = [...items, ...items]
  return (
    <div className="bg-[#050a12] border-t border-gray-800/30 h-8 flex items-center overflow-hidden shrink-0">
      <div className="shrink-0 bg-emerald-700 text-white text-[10px] font-bold px-3 h-full flex items-center tracking-widest uppercase">EN VIVO</div>
      <div className="overflow-hidden flex-1">
        <div className="flex gap-10 whitespace-nowrap animate-ticker">
          {doubled.map((t, i) => (
            <span key={i} className="text-[11px] text-gray-500 shrink-0"><span className="text-emerald-600 mr-2">◆</span>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Match row ─── */
function MatchRow({ m, leagueCode }) {
  const date = m.date ? format(parseISO(m.date), 'd MMM HH:mm', { locale: es }) : '?'
  const col = m.date ? new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }).format(new Date(m.date)) : null
  const p = m.model_prediction
  const hasResult = m.home_goals != null
  const chs = TV_CHANNELS[leagueCode] ?? []
  return (
    <div className={`group border-b border-gray-800/30 px-4 py-3 hover:bg-white/[0.02] transition-colors ${m.has_value ? 'border-l-2 border-l-emerald-500' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0">
          <p className="text-[10px] text-gray-600">{date}</p>
          {col && <p className="text-[9px] text-amber-600/80">🇨🇴 {col}</p>}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-gray-200 text-right flex-1 truncate font-medium">{m.home_team}</span>
          <span className="text-xs font-bold text-gray-500 w-12 text-center shrink-0">
            {hasResult ? `${m.home_goals} – ${m.away_goals}` : 'vs'}
          </span>
          <span className="text-sm text-gray-200 text-left flex-1 truncate font-medium">{m.away_team}</span>
        </div>
        {p && (
          <div className="flex gap-0.5 shrink-0">
            <span className="text-[11px] text-emerald-400 w-9 text-center font-mono">{(p.prob_home * 100).toFixed(0)}%</span>
            <span className="text-[11px] text-gray-600 w-9 text-center font-mono">{(p.prob_draw * 100).toFixed(0)}%</span>
            <span className="text-[11px] text-blue-400 w-9 text-center font-mono">{(p.prob_away * 100).toFixed(0)}%</span>
          </div>
        )}
        {m.has_value && <Tag color="green">VALUE</Tag>}
      </div>
      {p && (
        <div className="mt-1.5 flex h-1 rounded-full overflow-hidden ml-24">
          <div className="bg-emerald-500/70" style={{ width: `${p.prob_home * 100}%` }} />
          <div className="bg-gray-700" style={{ width: `${p.prob_draw * 100}%` }} />
          <div className="bg-blue-500/70" style={{ width: `${p.prob_away * 100}%` }} />
        </div>
      )}
      {chs.length > 0 && (
        <div className="mt-1 ml-24 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {chs.map(ch => <Tag key={ch}>📺 {ch}</Tag>)}
        </div>
      )}
    </div>
  )
}

/* ─── Standings with bar chart ─── */
function StandingsTab({ standings, leagueName }) {
  const top10 = standings.slice(0, 10)
  const maxPts = top10[0]?.points || 1

  const chartData = top10.map(r => ({
    name: r.team.length > 12 ? r.team.slice(0, 12) + '…' : r.team,
    Puntos: r.points,
    GF: r.goals_for,
    GC: r.goals_against,
  }))

  return (
    <div className="p-4 space-y-6">
      {/* Visual bar chart */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 p-4">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4">Puntos — Top 10</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="Puntos" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Horizontal inline bars */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-800/40 text-[10px] text-gray-600 uppercase tracking-widest font-bold">Clasificación</div>
        {standings.map((row, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2 border-b border-gray-800/20 hover:bg-white/[0.02] transition-colors ${
            i < 4 ? 'border-l-2 border-l-blue-500' :
            i < 6 ? 'border-l-2 border-l-yellow-500' :
            standings.length - i <= 3 ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-transparent'
          }`}>
            <span className="text-gray-600 text-xs w-4 shrink-0">{row.position}</span>
            {row.crest && <img src={row.crest} alt="" className="w-5 h-5 object-contain shrink-0" />}
            <span className="text-sm text-gray-200 flex-1 truncate">{row.team}</span>
            <div className="flex-1 mx-2 max-w-24">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${(row.points / maxPts) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-3 text-xs text-right shrink-0">
              <span className="text-gray-600 w-6">{row.played}</span>
              <span className="text-emerald-400 w-6">{row.won}</span>
              <span className="text-gray-600 w-6">{row.draw}</span>
              <span className="text-red-400 w-6">{row.lost}</span>
              <span className="text-white font-bold w-6">{row.points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Team comparison ─── */
function CompareTab({ standings }) {
  const teams = standings.map(s => s.team)
  const [a, setA] = useState(teams[0] ?? '')
  const [b, setB] = useState(teams[1] ?? '')

  useEffect(() => {
    if (teams.length > 0 && !teams.includes(a)) setA(teams[0])
    if (teams.length > 1 && !teams.includes(b)) setB(teams[1])
  }, [standings])

  const dA = standings.find(s => s.team === a)
  const dB = standings.find(s => s.team === b)

  if (standings.length < 2) {
    return <div className="p-8 text-center text-gray-600">Inicializa las ligas para comparar equipos.</div>
  }

  const barData = [
    { stat: 'Puntos',  [a]: dA?.points,         [b]: dB?.points },
    { stat: 'Ganados', [a]: dA?.won,             [b]: dB?.won },
    { stat: 'Empates', [a]: dA?.draw,            [b]: dB?.draw },
    { stat: 'Perdidos',[a]: dA?.lost,            [b]: dB?.lost },
    { stat: 'GF',      [a]: dA?.goals_for,       [b]: dB?.goals_for },
    { stat: 'GC',      [a]: dA?.goals_against,   [b]: dB?.goals_against },
    { stat: 'DG',      [a]: dA?.goal_diff,       [b]: dB?.goal_diff },
  ]

  const radarData = [
    { stat: 'Puntos',  [a]: dA?.points,       [b]: dB?.points,       max: Math.max(dA?.points ?? 0, dB?.points ?? 0, 1) },
    { stat: 'Ataque',  [a]: dA?.goals_for,    [b]: dB?.goals_for,    max: Math.max(dA?.goals_for ?? 0, dB?.goals_for ?? 0, 1) },
    { stat: 'Defensa', [a]: 100 - ((dA?.goals_against ?? 50)), [b]: 100 - ((dB?.goals_against ?? 50)) },
    { stat: 'Victorias',[a]: dA?.won,         [b]: dB?.won,          max: Math.max(dA?.won ?? 0, dB?.won ?? 0, 1) },
    { stat: 'Jugados', [a]: dA?.played,       [b]: dB?.played,       max: Math.max(dA?.played ?? 0, dB?.played ?? 0, 1) },
  ]

  const selectCls = "bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 flex-1 focus:outline-none focus:border-emerald-500"

  return (
    <div className="p-4 space-y-4">
      {/* Team selectors */}
      <div className="flex items-center gap-3">
        <select value={a} onChange={e => setA(e.target.value)} className={selectCls}>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-gray-600 font-bold text-lg shrink-0">vs</span>
        <select value={b} onChange={e => setB(e.target.value)} className={selectCls}>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Score cards */}
      {dA && dB && (
        <div className="grid grid-cols-2 gap-3">
          {[{d: dA, color: 'emerald'}, {d: dB, color: 'blue'}].map(({d, color}, idx) => (
            <div key={idx} className={`rounded-xl border p-4 ${color === 'emerald' ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-blue-800/40 bg-blue-950/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                {d.crest && <img src={d.crest} alt="" className="w-8 h-8 object-contain" />}
                <p className="font-bold text-white text-sm truncate">{d.team}</p>
                <span className={`ml-auto text-xs font-bold ${color === 'emerald' ? 'text-emerald-400' : 'text-blue-400'}`}>#{d.position}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['PJ', d.played], ['G', d.won, 'text-emerald-400'], ['E', d.draw], ['P', d.lost, 'text-red-400'], ['GF', d.goals_for], ['Pts', d.points, 'text-white font-bold']].map(([l, v, cls='text-gray-300']) => (
                  <div key={l} className="bg-black/20 rounded-lg py-2">
                    <p className={`text-base font-bold ${cls}`}>{v}</p>
                    <p className="text-[10px] text-gray-600">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart comparison */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 p-4">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4">Comparación estadística</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="stat" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Bar dataKey={a} fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar dataKey={b} fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar chart */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 p-4">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-4">Perfil del equipo</h3>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#1f2937" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar name={a} dataKey={a} stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
            <Radar name={b} dataKey={b} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ─── YouTube panel ─── */
function YouTubePanel({ videos, loading }) {
  const [playing, setPlaying] = useState(null)
  const COLORS = { GolCaracol: 'text-yellow-400', 'Win Sports': 'text-blue-400', MARCA: 'text-red-400', AS: 'text-orange-400', 'ESPN Deportes': 'text-red-500', FIFA: 'text-blue-300', UEFA: 'text-indigo-400', 'Premier League': 'text-purple-400', LaLiga: 'text-orange-300', Bundesliga: 'text-red-300' }
  if (loading) return <div className="p-8 text-center text-gray-600 animate-pulse">Cargando canales...</div>
  if (!videos.length) return <div className="p-8 text-center text-gray-600">Sin videos disponibles</div>
  return (
    <div className="h-full overflow-y-auto">
      {playing && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
            <iframe src={playing} className="w-full h-full rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          <button onClick={() => setPlaying(null)} className="absolute top-4 right-6 text-white text-3xl font-bold hover:text-gray-300">✕</button>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-0">
        {videos.map((v, i) => (
          <button key={i} onClick={() => setPlaying(v.embed)} className="flex flex-col border-b border-r border-gray-800/30 hover:bg-white/[0.03] transition-colors text-left group overflow-hidden">
            <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl ml-1">▶</span>
                </div>
              </div>
            </div>
            <div className="p-3">
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${COLORS[v.channel] ?? 'text-gray-500'}`}>{v.channel}</p>
              <p className="text-xs text-gray-300 line-clamp-2 leading-snug">{v.title}</p>
              {v.published && <p className="text-[10px] text-gray-700 mt-1">{v.published.slice(0, 10)}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── News panel ─── */
function NewsPanel({ news, loading }) {
  if (loading) return <div className="p-8 text-center text-gray-600 animate-pulse">Cargando noticias...</div>
  return (
    <div className="divide-y divide-gray-800/30">
      {news.map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
          <div className="shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">{item.source?.slice(0, 3)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-snug">{item.title}</p>
            {item.pub_date && <p className="text-[10px] text-gray-700 mt-0.5">{item.pub_date.slice(0, 16)}</p>}
          </div>
        </a>
      ))}
    </div>
  )
}

/* ─── Value bet card ─── */
function VBCard({ event, leagueCode }) {
  const p = event.model_prediction
  const edge = event.value_bets?.reduce((m, v) => Math.max(m, v.edge_pct ?? 0), 0) ?? 0
  const lg = LEAGUES.find(l => l.code === leagueCode)
  return (
    <div className="border-b border-gray-800/30 px-3 py-3 hover:bg-emerald-950/10 transition-colors border-l-2 border-l-emerald-500">
      <div className="flex items-center justify-between mb-1">
        <Tag color="green">+{edge.toFixed(1)}% EDGE</Tag>
        <span className="text-[9px] text-gray-700">{lg?.flag} {lg?.name}</span>
      </div>
      <p className="text-xs text-gray-200 truncate font-medium">{event.home_team} vs {event.away_team}</p>
      {p && (
        <div className="flex gap-3 mt-1 text-[10px]">
          <span className="text-emerald-400">{(p.prob_home * 100).toFixed(0)}%</span>
          <span className="text-gray-600">{(p.prob_draw * 100).toFixed(0)}%</span>
          <span className="text-blue-400">{(p.prob_away * 100).toFixed(0)}%</span>
        </div>
      )}
      {event.value_bets?.[0] && (
        <p className="text-[10px] text-gray-600 mt-1 truncate">{event.value_bets[0].bookmaker} · {event.value_bets[0].outcome} · @{event.value_bets[0].odds}</p>
      )}
    </div>
  )
}

/* ─── Arbitrage card ─── */
function ArbCard({ arb }) {
  return (
    <div className="border-b border-gray-800/30 px-3 py-3 hover:bg-amber-950/10 transition-colors border-l-2 border-l-amber-500">
      <div className="flex items-center justify-between mb-1">
        <span className="text-amber-400 font-bold">+{arb.profit_pct}%</span>
        <Tag color="amber">garantizado</Tag>
      </div>
      <p className="text-xs text-gray-300 truncate">{arb.home_team} vs {arb.away_team}</p>
      <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-600">
        <div className="flex justify-between"><span>1 · {arb.best_home?.bookmaker}</span><span className="text-white font-mono">{arb.best_home?.odds}</span></div>
        <div className="flex justify-between"><span>X · {arb.best_draw?.bookmaker}</span><span className="text-white font-mono">{arb.best_draw?.odds}</span></div>
        <div className="flex justify-between"><span>2 · {arb.best_away?.bookmaker}</span><span className="text-white font-mono">{arb.best_away?.odds}</span></div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════ MAIN DASHBOARD ══════════════════════════════════════ */
export default function Dashboard() {
  const [activeLeague, setActiveLeague] = useState('PL')
  const [tab, setTab] = useState('matches')
  const qc = useQueryClient()
  const now = useClock()
  const wc  = useWCCountdown(now)

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get('/setup/status').then(r => r.data),
    staleTime: 30000, refetchInterval: 30000,
  })

  const trained    = status?.leagues?.[activeLeague]?.model_trained ?? false
  const hasOdds    = status?.has_odds_key ?? false
  const trainedCnt = Object.values(status?.leagues ?? {}).filter(l => l.model_trained).length
  const anyUntrained = Object.values(status?.leagues ?? {}).some(l => !l.model_trained)

  const { data: vbData,  isLoading: loadingBets } = useQuery({ queryKey: ['value-bets', activeLeague], queryFn: () => api.get(`/analytics/${activeLeague}/value-bets`).then(r => r.data), enabled: trained && hasOdds, staleTime: 300000 })
  const { data: arbData } = useQuery({ queryKey: ['arbitrage', activeLeague], queryFn: () => api.get(`/analytics/${activeLeague}/arbitrage`).then(r => r.data), enabled: trained && hasOdds, staleTime: 300000 })
  const { data: matchesData } = useQuery({ queryKey: ['matches', activeLeague], queryFn: () => api.get(`/leagues/${activeLeague}/matches?status=SCHEDULED`).then(r => r.data), enabled: !!activeLeague, staleTime: 300000 })
  const { data: standingsData } = useQuery({ queryKey: ['standings', activeLeague], queryFn: () => api.get(`/leagues/${activeLeague}/standings`).then(r => r.data), enabled: !!activeLeague, staleTime: 1800000 })
  const { data: predData } = useQuery({ queryKey: ['upcoming-predictions', activeLeague], queryFn: () => api.get(`/analytics/${activeLeague}/upcoming-predictions`).then(r => r.data), enabled: trained, staleTime: 600000 })
  const { data: newsData, isLoading: loadingNews } = useNews()
  const { data: ytData,   isLoading: loadingYT }   = useYouTube()

  const { mutate: initReal, isPending: initing } = useMutation({
    mutationFn: () => api.post('/setup/init-real').then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(); refetchStatus() },
  })

  const valueBets  = vbData?.events?.filter(e => e.has_value) ?? []
  const allEvents  = vbData?.events ?? []
  const arbs       = arbData?.opportunities ?? []
  const fixtures   = predData?.fixtures ?? matchesData?.matches ?? []
  const standings  = standingsData?.standings ?? []
  const news       = newsData?.news ?? []
  const videos     = ytData?.videos ?? []
  const activeLg   = LEAGUES.find(l => l.code === activeLeague)

  const TABS = [
    { id: 'matches',   label: '📅 Partidos' },
    { id: 'standings', label: '📊 Clasificación' },
    { id: 'compare',   label: '🆚 Comparar' },
    { id: 'youtube',   label: '📺 Canales' },
    { id: 'news',      label: '📰 Noticias' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#080d18]">

      {/* ── Top status bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#060b15] border-b border-gray-800/50 text-[11px] shrink-0">
        <div className="flex items-center gap-1.5">
          <Dot on />
          <span className="text-emerald-400 font-mono font-bold">{now.toUTCString().slice(17, 25)} UTC</span>
        </div>
        <span className="text-gray-700">|</span>
        <span className="text-gray-500">Ligas <span className="text-white font-bold">{trainedCnt}/{LEAGUES.length}</span></span>
        <span className="text-gray-700">|</span>
        <span className="text-gray-500">Value bets <span className="text-emerald-400 font-bold">{valueBets.length}</span></span>
        <span className="text-gray-700">|</span>
        <span className="text-gray-500">Arbitraje <span className="text-amber-400 font-bold">{arbs.length}</span></span>
        {wc && (
          <>
            <span className="text-gray-700">|</span>
            <div className="flex items-center gap-1.5">
              <span>⚽</span>
              <span className="text-gray-500">Mundial 2026</span>
              <span className="font-mono font-bold text-yellow-400">{wc.d}d {String(wc.h).padStart(2,'0')}h {String(wc.m).padStart(2,'0')}m {String(wc.s).padStart(2,'0')}s</span>
            </div>
          </>
        )}
        <div className="flex-1" />
        {anyUntrained && (
          <button onClick={() => initReal()} disabled={initing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition-colors">
            {initing ? '⏳ Inicializando…' : '🚀 Inicializar ligas'}
          </button>
        )}
      </div>

      {/* ── World clock ── */}
      <WorldClockBar now={now} />

      {/* ── Main 3-column ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT sidebar */}
        <div className="w-48 bg-[#060b15] border-r border-gray-800/50 flex flex-col shrink-0">
          <div className="px-3 py-2 text-[10px] text-gray-700 uppercase tracking-widest font-bold border-b border-gray-800/40">Ligas</div>
          <div className="flex-1 overflow-y-auto">
            {LEAGUES.map(l => {
              const ls = status?.leagues?.[l.code]
              const active = activeLeague === l.code
              return (
                <button key={l.code} onClick={() => { setActiveLeague(l.code); setTab('matches') }}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 text-left border-b border-gray-800/20 transition-colors ${active ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500' : 'hover:bg-white/[0.03]'}`}>
                  <span className="text-base shrink-0">{l.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${active ? 'text-white font-semibold' : 'text-gray-400'}`}>{l.name}</p>
                    {ls && <p className="text-[10px] text-gray-700">{ls.teams_in_model} equipos</p>}
                  </div>
                  <Dot on={ls?.model_trained} />
                </button>
              )
            })}
          </div>

          {/* Mini stats */}
          <div className="border-t border-gray-800/40 p-3 space-y-2 shrink-0">
            <p className="text-[10px] text-gray-700 uppercase tracking-widest font-bold">Resumen</p>
            {[['Value bets', valueBets.length, 'text-emerald-400'], ['Arbitraje', arbs.length, 'text-amber-400'], ['Partidos', fixtures.length, 'text-white'], ['Noticias', news.length, 'text-blue-400']].map(([l, v, cls]) => (
              <div key={l} className="flex justify-between text-[11px]">
                <span className="text-gray-600">{l}</span>
                <span className={`font-bold ${cls}`}>{v}</span>
              </div>
            ))}
            <Link to={`/league/${activeLeague}`} className="block w-full text-center text-[10px] text-emerald-700 hover:text-emerald-400 mt-2 transition-colors">Ver {activeLg?.name} →</Link>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800/50 bg-[#060b15]/60 shrink-0">
            <div className="px-4 py-2.5 text-xs text-gray-500 font-medium shrink-0 flex items-center gap-1.5">
              <span>{activeLg?.flag}</span><span>{activeLg?.name}</span>
            </div>
            <div className="w-px bg-gray-800/50 my-1.5" />
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-600 hover:text-gray-300'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* Partidos */}
            {tab === 'matches' && (
              <div>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800/30 bg-gray-900/20">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">Próximos partidos</span>
                  {!trained && <span className="text-[10px] text-amber-600">— modelo no inicializado</span>}
                  <div className="flex-1" />
                  <div className="flex gap-3 text-[10px] text-gray-700">
                    <span className="text-emerald-700">1</span><span>X</span><span className="text-blue-700">2</span>
                  </div>
                </div>
                {fixtures.length === 0
                  ? <div className="p-12 text-center text-gray-600">{initing ? '⏳ Cargando datos…' : 'Sin partidos. Inicializa las ligas.'}</div>
                  : fixtures.map((m, i) => <MatchRow key={i} m={m} leagueCode={activeLeague} />)
                }
                {allEvents.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-emerald-950/10 border-t border-emerald-800/20 text-[10px] text-emerald-600 uppercase tracking-widest font-bold">⚡ Value bets — {valueBets.length}/{allEvents.length}</div>
                    {allEvents.map((m, i) => <MatchRow key={i} m={m} leagueCode={activeLeague} />)}
                  </>
                )}
              </div>
            )}

            {/* Clasificación */}
            {tab === 'standings' && (
              standings.length === 0
                ? <div className="p-12 text-center text-gray-600">Sin clasificación. Inicializa las ligas.</div>
                : <StandingsTab standings={standings} leagueName={activeLg?.name} />
            )}

            {/* Comparar */}
            {tab === 'compare' && <CompareTab standings={standings} />}

            {/* YouTube */}
            {tab === 'youtube' && <YouTubePanel videos={videos} loading={loadingYT} />}

            {/* Noticias */}
            {tab === 'news' && <NewsPanel news={news} loading={loadingNews} />}

          </div>
        </div>

        {/* RIGHT panel */}
        <div className="w-64 bg-[#060b15] border-l border-gray-800/50 flex flex-col shrink-0">
          {/* Value bets */}
          <div className="px-3 py-2.5 border-b border-gray-800/40 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">⚡ Value Bets</span>
            <span className="text-[10px] text-gray-700">{valueBets.length}</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '50%' }}>
            {!hasOdds && <div className="p-4 text-[11px] text-gray-700 text-center">Sin Odds API key</div>}
            {hasOdds && !trained && <div className="p-4 text-[11px] text-gray-700 text-center">Inicializa las ligas</div>}
            {loadingBets && <div className="p-4 text-[11px] text-gray-700 animate-pulse text-center">Analizando…</div>}
            {valueBets.map((e, i) => <VBCard key={i} event={e} leagueCode={activeLeague} />)}
            {valueBets.length === 0 && !loadingBets && trained && hasOdds && (
              <div className="p-4 text-[11px] text-gray-700 text-center">Sin value bets activos</div>
            )}
          </div>

          {/* Arbitrage */}
          <div className="px-3 py-2.5 border-t border-b border-amber-800/20 flex items-center justify-between bg-amber-950/10 shrink-0">
            <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">🔀 Arbitraje</span>
            <span className="text-[10px] text-gray-700">{arbs.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {arbs.length === 0
              ? <div className="p-4 text-[11px] text-gray-700 text-center">Sin oportunidades</div>
              : arbs.map((a, i) => <ArbCard key={i} arb={a} />)
            }
          </div>
        </div>
      </div>

      {/* ── Ticker ── */}
      <Ticker news={news} />
    </div>
  )
}
