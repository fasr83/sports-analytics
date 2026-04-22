import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { LEAGUES, LEAGUE_GROUPS } from '../utils/odds'
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
    <div className="flex items-center gap-5 px-4 py-1.5 bg-[#030610] border-b border-gray-800/50 text-[10px] overflow-x-auto shrink-0">
      <span className="text-gray-400 font-black uppercase tracking-widest shrink-0">🌐 Hora</span>
      {WORLD_CLOCKS.map(c => (
        <div key={c.tz} className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm">{c.flag}</span>
          <span className="text-gray-400 font-medium">{c.city}</span>
          <span className="text-white font-mono font-black">{fmt(c.tz)}</span>
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
function MatchRow({ m, leagueCode, bkData }) {
  const [open, setOpen] = useState(false)
  const date = m.date ? format(parseISO(m.date), 'd MMM HH:mm', { locale: es }) : '?'
  const col = m.date ? new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }).format(new Date(m.date)) : null
  const p = m.model_prediction ?? m.prediction
  const ts = m.top_scores
  const hasResult = m.home_goals != null
  const chs = TV_CHANNELS[leagueCode] ?? []

  const bestScore = ts?.[0]
  const maxProb = p ? Math.max(p.prob_home, p.prob_draw, p.prob_away) : 0
  const pick = p ? (p.prob_home === maxProb ? '1' : p.prob_away === maxProb ? '2' : 'X') : null
  const pickBg = { '1': 'bg-emerald-600', 'X': 'bg-gray-600', '2': 'bg-blue-600' }

  // Bookmaker odds from value-bets data
  const bks = bkData?.bookmakers ?? []

  return (
    <div className={`border-b border-gray-800/40 transition-colors ${m.has_value ? 'border-l-[3px] border-l-emerald-400' : 'border-l-[3px] border-l-transparent'} ${open ? 'bg-[#0c1425]' : 'hover:bg-white/[0.025]'}`}>
      <button className="w-full text-left px-4 py-3" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          {/* Date col */}
          <div className="w-20 shrink-0">
            <p className="text-[10px] text-gray-400 font-medium">{date}</p>
            {col && <p className="text-[9px] text-yellow-500/80 font-medium">🇨🇴 {col}</p>}
          </div>
          {/* Teams */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm text-white text-right flex-1 truncate font-semibold">{m.home_team}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${hasResult ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>
              {hasResult ? `${m.home_goals}–${m.away_goals}` : 'VS'}
            </span>
            <span className="text-sm text-white text-left flex-1 truncate font-semibold">{m.away_team}</span>
          </div>
          {/* Probs */}
          {p && (
            <div className="flex gap-1 shrink-0">
              <span className="text-xs text-emerald-400 w-9 text-center font-bold">{(p.prob_home * 100).toFixed(0)}%</span>
              <span className="text-xs text-gray-500 w-9 text-center">{(p.prob_draw * 100).toFixed(0)}%</span>
              <span className="text-xs text-blue-400 w-9 text-center font-bold">{(p.prob_away * 100).toFixed(0)}%</span>
            </div>
          )}
          {/* Pick badge */}
          {pick && <span className={`text-[10px] font-black w-6 h-6 rounded flex items-center justify-center text-white shrink-0 ${pickBg[pick]}`}>{pick}</span>}
          {m.has_value && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500 text-black rounded shrink-0">VALUE</span>}
          <span className="text-gray-600 text-[10px] shrink-0 ml-1">{open ? '▲' : '▼'}</span>
        </div>
        {/* Prob bar */}
        {p && (
          <div className="mt-2 flex h-1.5 rounded-full overflow-hidden ml-20 gap-0.5">
            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${p.prob_home * 100}%` }} />
            <div className="bg-gray-600" style={{ width: `${p.prob_draw * 100}%` }} />
            <div className="bg-blue-500 rounded-r-full ml-auto" style={{ width: `${p.prob_away * 100}%` }} />
          </div>
        )}
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mx-4 mb-3 rounded-xl border border-gray-700/50 bg-[#070c1a] overflow-hidden">
          <div className={`grid divide-x divide-gray-800/40 ${bks.length ? 'grid-cols-3' : 'grid-cols-2'}`}>

            {/* Pronóstico */}
            <div className="p-3">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Pronóstico IA</p>
              {p ? (
                <>
                  <div className="flex gap-1.5 mb-2">
                    {[['1', p.prob_home, 'bg-emerald-900/60 ring-emerald-700 text-emerald-300'], ['X', p.prob_draw, 'bg-gray-800/60 ring-gray-600 text-gray-300'], ['2', p.prob_away, 'bg-blue-900/60 ring-blue-700 text-blue-300']].map(([l, v, cls]) => (
                      <div key={l} className={`flex-1 text-center py-2 rounded-lg ring-1 ${cls} ${l === pick ? 'ring-2 brightness-125' : ''}`}>
                        <p className="text-sm font-black">{l}</p>
                        <p className="text-[10px] font-bold font-mono">{(v * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 text-center">Confianza <span className="text-white font-bold">{(maxProb * 100).toFixed(0)}%</span></p>
                </>
              ) : <p className="text-[11px] text-gray-600">Sin modelo</p>}

              {/* Score prediction */}
              {ts?.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-800/40">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Marcadores probables</p>
                  {ts.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold w-8 ${i === 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{s.home_goals}–{s.away_goals}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-600/80 rounded-full" style={{ width: `${(s.probability * 100).toFixed(0)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono w-9 text-right">{(s.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cuotas de casas */}
            {bks.length > 0 && (
              <div className="p-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Cuotas en vivo</p>
                <div className="flex text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1 px-1">
                  <span className="flex-1">Casa</span><span className="w-9 text-center">1</span><span className="w-9 text-center">X</span><span className="w-9 text-center">2</span>
                </div>
                <div className="space-y-1">
                  {bks.slice(0, 8).map((bk, i) => {
                    const best1 = p && bk.is_value_home
                    const bestX = p && bk.is_value_draw
                    const best2 = p && bk.is_value_away
                    return (
                      <div key={i} className="flex items-center text-xs bg-gray-900/40 rounded px-1.5 py-1">
                        <span className="flex-1 text-gray-400 truncate text-[10px]">{bk.bookmaker}</span>
                        <span className={`w-9 text-center font-mono font-bold ${best1 ? 'text-emerald-400' : 'text-gray-300'}`}>{bk.odds_home?.toFixed(2) ?? '-'}</span>
                        <span className={`w-9 text-center font-mono font-bold ${bestX ? 'text-yellow-400' : 'text-gray-300'}`}>{bk.odds_draw?.toFixed(2) ?? '-'}</span>
                        <span className={`w-9 text-center font-mono font-bold ${best2 ? 'text-blue-400' : 'text-gray-300'}`}>{bk.odds_away?.toFixed(2) ?? '-'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TV + info */}
            <div className="p-3">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">TV y más info</p>
              {chs.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  {chs.map(ch => (
                    <div key={ch} className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-2 py-1.5">
                      <span className="text-sm">📺</span>
                      <span className="text-xs text-gray-200 font-medium">{ch}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-600 mb-3">Sin info de TV</p>
              )}
              {bestScore && (
                <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold">Pred. IA más probable</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{bestScore.home_goals}–{bestScore.away_goals}</p>
                  <p className="text-[10px] text-emerald-700">{(bestScore.probability * 100).toFixed(1)}% probabilidad</p>
                </div>
              )}
            </div>

          </div>
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
function StatDuel({ label, vA, vB, nameA, nameB, higherIsBetter = true, format: fmt = v => v, proOnly = false }) {
  const numA = parseFloat(vA) || 0
  const numB = parseFloat(vB) || 0
  const total = numA + numB || 1
  const pctA = (numA / total) * 100
  const pctB = (numB / total) * 100
  const winsA = higherIsBetter ? numA > numB : numA < numB
  const winsB = higherIsBetter ? numB > numA : numB < numA
  return (
    <div className={`py-2.5 px-4 border-b border-gray-800/20 ${proOnly ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-sm font-bold w-16 text-right tabular-nums ${winsA ? 'text-emerald-400' : 'text-gray-400'}`}>{fmt(vA)}</span>
        <div className="flex flex-1 h-1.5 rounded-full overflow-hidden bg-gray-800 gap-px">
          <div className="bg-emerald-500 rounded-l-full h-full" style={{ width: `${pctA}%` }} />
          <div className="bg-blue-500 rounded-r-full h-full ml-auto" style={{ width: `${pctB}%` }} />
        </div>
        <span className={`text-sm font-bold w-16 text-left tabular-nums ${winsB ? 'text-blue-400' : 'text-gray-400'}`}>{fmt(vB)}</span>
      </div>
      <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest">
        {label}{proOnly && <span className="ml-1 text-amber-600">· Pro</span>}
      </p>
    </div>
  )
}

function FormStrip({ form = '' }) {
  const results = form.split('').slice(-6)
  const cfg = { W: 'bg-emerald-600', D: 'bg-gray-600', L: 'bg-red-600' }
  return (
    <div className="flex gap-0.5">
      {results.map((r, i) => (
        <span key={i} className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white ${cfg[r] ?? 'bg-gray-800'}`}>{r}</span>
      ))}
    </div>
  )
}

function getVeredicto(dA, dB) {
  if (!dA || !dB) return null
  const score = (d) => {
    let s = 0
    s += d.points * 1.5
    s += (d.goals_for / Math.max(d.played, 1)) * 10      // attack
    s -= (d.goals_against / Math.max(d.played, 1)) * 8   // defense
    s += (d.won / Math.max(d.played, 1)) * 15            // win rate
    s += d.goal_diff * 0.5
    return s
  }
  const sA = score(dA), sB = score(dB)
  const diff = Math.abs(sA - sB)
  const winner = sA > sB ? dA : dB
  const loser  = sA > sB ? dB : dA
  let strength = diff > 20 ? 'clara ventaja' : diff > 8 ? 'ligera ventaja' : 'muy igualado'

  const atkA = (dA.goals_for  / Math.max(dA.played, 1)).toFixed(2)
  const defA = (dA.goals_against / Math.max(dA.played, 1)).toFixed(2)
  const atkB = (dB.goals_for  / Math.max(dB.played, 1)).toFixed(2)
  const defB = (dB.goals_against / Math.max(dB.played, 1)).toFixed(2)

  const lines = []
  if (dA.points !== dB.points) lines.push(`${winner.team} lleva ${winner.points} pts vs ${loser.points} de ${loser.team}.`)
  if (parseFloat(atkA) > parseFloat(atkB)) lines.push(`${dA.team} es más goleador (${atkA} goles/partido vs ${atkB}).`)
  else if (parseFloat(atkB) > parseFloat(atkA)) lines.push(`${dB.team} es más goleador (${atkB} goles/partido vs ${atkA}).`)
  if (parseFloat(defA) < parseFloat(defB)) lines.push(`${dA.team} tiene mejor defensa (${defA} gc/partido).`)
  else if (parseFloat(defB) < parseFloat(defA)) lines.push(`${dB.team} tiene mejor defensa (${defB} gc/partido).`)

  return { winner, loser, strength, lines, sA, sB }
}

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
  const verdict = getVeredicto(dA, dB)

  if (standings.length < 2) return <div className="p-8 text-center text-gray-600">Inicializa las ligas para comparar equipos.</div>

  const pct = (v, t) => t > 0 ? `${((v / t) * 100).toFixed(0)}%` : '0%'
  const per = (v, p) => p > 0 ? (v / p).toFixed(2) : '0'
  const selectCls = "bg-gray-900/80 border border-gray-700/60 text-white text-sm rounded-xl px-3 py-2.5 flex-1 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"

  const barData = [
    { stat: 'Pts',  [a]: dA?.points,       [b]: dB?.points },
    { stat: 'GF',   [a]: dA?.goals_for,    [b]: dB?.goals_for },
    { stat: 'GC',   [a]: dA?.goals_against,[b]: dB?.goals_against },
    { stat: 'DG',   [a]: dA?.goal_diff,    [b]: dB?.goal_diff },
    { stat: 'PG',   [a]: dA?.won,          [b]: dB?.won },
    { stat: 'PE',   [a]: dA?.draw,         [b]: dB?.draw },
    { stat: 'PP',   [a]: dA?.lost,         [b]: dB?.lost },
  ]

  const radarData = [
    { stat: 'Puntos',    [a]: dA?.points ?? 0,       [b]: dB?.points ?? 0 },
    { stat: 'Ataque',    [a]: dA?.goals_for ?? 0,    [b]: dB?.goals_for ?? 0 },
    { stat: 'Defensa',   [a]: Math.max(0, 100 - (dA?.goals_against ?? 50)), [b]: Math.max(0, 100 - (dB?.goals_against ?? 50)) },
    { stat: 'Victorias', [a]: dA?.won ?? 0,          [b]: dB?.won ?? 0 },
    { stat: 'Local',     [a]: dA?.home_won ?? 0,     [b]: dB?.home_won ?? 0 },
    { stat: 'Visitante', [a]: dA?.away_won ?? 0,     [b]: dB?.away_won ?? 0 },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Selectors */}
      <div className="flex items-center gap-3">
        <select value={a} onChange={e => setA(e.target.value)} className={selectCls}>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 font-bold text-sm">vs</div>
        <select value={b} onChange={e => setB(e.target.value)} className={selectCls}>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {dA && dB && (
        <>
          {/* Team headers */}
          <div className="grid grid-cols-2 gap-3">
            {[[dA, '#10b981', 'border-emerald-800/40 bg-emerald-950/20'], [dB, '#3b82f6', 'border-blue-800/40 bg-blue-950/20']].map(([d, color, cls], idx) => (
              <div key={idx} className={`rounded-xl border p-4 ${cls}`}>
                <div className="flex items-center gap-3 mb-3">
                  {d.crest && <img src={d.crest} alt="" className="w-10 h-10 object-contain" />}
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">{d.team}</p>
                    <p className="text-[10px] text-gray-600">Posición #{d.position}</p>
                  </div>
                </div>
                {d.form && <div className="mb-3"><FormStrip form={d.form} /></div>}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[['PJ', d.played, 'text-gray-300'], ['G', d.won, 'text-emerald-400'], ['E', d.draw, 'text-gray-400'],
                    ['P', d.lost, 'text-red-400'], ['GF', d.goals_for, 'text-white'], ['Pts', d.points, 'text-white font-bold']
                  ].map(([l, v, c]) => (
                    <div key={l} className="bg-black/20 rounded-lg py-1.5">
                      <p className={`text-sm font-bold ${c}`}>{v}</p>
                      <p className="text-[9px] text-gray-700">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* STAT DUEL — FlashScore style */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-2 bg-gray-900/60 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
              <span className="text-emerald-600 truncate">{dA.team}</span>
              <span className="text-center">Estadística</span>
              <span className="text-blue-600 text-right truncate">{dB.team}</span>
            </div>
            <StatDuel label="Puntos" vA={dA.points} vB={dB.points} nameA={a} nameB={b} />
            <StatDuel label="Goles marcados" vA={dA.goals_for} vB={dB.goals_for} nameA={a} nameB={b} />
            <StatDuel label="Goles recibidos" vA={dA.goals_against} vB={dB.goals_against} nameA={a} nameB={b} higherIsBetter={false} />
            <StatDuel label="Diferencia de goles" vA={dA.goal_diff} vB={dB.goal_diff} nameA={a} nameB={b} />
            <StatDuel label="Victorias" vA={dA.won} vB={dB.won} nameA={a} nameB={b} />
            <StatDuel label="Empates" vA={dA.draw} vB={dB.draw} nameA={a} nameB={b} />
            <StatDuel label="Derrotas" vA={dA.lost} vB={dB.lost} nameA={a} nameB={b} higherIsBetter={false} />
            <StatDuel label="Goles/partido" vA={per(dA.goals_for, dA.played)} vB={per(dB.goals_for, dB.played)} nameA={a} nameB={b} />
            <StatDuel label="Recibidos/partido" vA={per(dA.goals_against, dA.played)} vB={per(dB.goals_against, dB.played)} nameA={a} nameB={b} higherIsBetter={false} />
            <StatDuel label="% Victorias" vA={pct(dA.won, dA.played)} vB={pct(dB.won, dB.played)} nameA={a} nameB={b} />
          </div>

          {/* Local vs Visitante */}
          {(dA.home_played > 0 || dA.away_played > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {[[dA, 'emerald'], [dB, 'blue']].map(([d, color], idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-xl border border-gray-800/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {d.crest && <img src={d.crest} alt="" className="w-5 h-5 object-contain" />}
                    <p className={`text-xs font-bold ${color === 'emerald' ? 'text-emerald-400' : 'text-blue-400'}`}>{d.team}</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1 border-b border-gray-800/40">
                      <span className="text-gray-600 text-[10px] uppercase font-bold">Local</span>
                      <span className="text-gray-600 text-[10px] uppercase font-bold">Visitante</span>
                    </div>
                    {[
                      ['Partidos', d.home_played, d.away_played],
                      ['Victorias', d.home_won,   d.away_won],
                      ['Goles +',  d.home_gf,    d.away_gf],
                      ['Goles -',  d.home_ga,    d.away_ga],
                    ].map(([l, hv, av]) => (
                      <div key={l} className="flex justify-between">
                        <span className={`font-bold ${hv > av ? 'text-emerald-400' : hv < av ? 'text-red-400' : 'text-gray-400'}`}>{hv}</span>
                        <span className="text-gray-600">{l}</span>
                        <span className={`font-bold ${av > hv ? 'text-emerald-400' : av < hv ? 'text-red-400' : 'text-gray-400'}`}>{av}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats pending API Pro */}
          <div className="bg-gray-900/50 rounded-xl border border-amber-800/20 overflow-hidden">
            <div className="px-4 py-2 bg-amber-950/20 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500">Estadísticas avanzadas</span>
              <span className="text-[10px] text-amber-700 bg-amber-900/30 px-2 py-0.5 rounded">Requiere API-Football Pro $49/mes</span>
            </div>
            <div className="divide-y divide-gray-800/20 opacity-40 pointer-events-none">
              <StatDuel label="Tiros a puerta" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Tiros de esquina" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Tarjetas amarillas" vA="—" vB="—" nameA={a} nameB={b} higherIsBetter={false} />
              <StatDuel label="Tarjetas rojas" vA="—" vB="—" nameA={a} nameB={b} higherIsBetter={false} />
              <StatDuel label="Posesión promedio %" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Goles 1er tiempo" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Goles 2do tiempo" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Goles de cabeza" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Goles de tiro libre" vA="—" vB="—" nameA={a} nameB={b} />
              <StatDuel label="Penaltis anotados" vA="—" vB="—" nameA={a} nameB={b} />
            </div>
          </div>

          {/* Bar + Radar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 p-4">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-600 font-bold mb-4">Comparación general</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="stat" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
                  <Bar dataKey={a} fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey={b} fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900/50 rounded-xl border border-gray-800/40 p-4">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-600 font-bold mb-4">Perfil del equipo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1f2937" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name={a} dataKey={a} stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name={b} dataKey={b} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VEREDICTO */}
          {verdict && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏆</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Veredicto del análisis</h3>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {verdict.winner.crest && <img src={verdict.winner.crest} alt="" className="w-10 h-10 object-contain" />}
                <div>
                  <p className="text-xl font-black text-emerald-400">{verdict.winner.team}</p>
                  <p className="text-xs text-gray-500">{verdict.strength} sobre {verdict.loser.team}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-black text-white">{verdict.sA.toFixed(0)} <span className="text-gray-600 text-sm">vs</span> {verdict.sB.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-600">Score analítico</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {verdict.lines.map((line, i) => (
                  <p key={i} className="text-xs text-gray-400 flex gap-2"><span className="text-emerald-600 shrink-0">›</span>{line}</p>
                ))}
              </div>
              <p className="text-[10px] text-gray-700 mt-3 border-t border-gray-800/40 pt-3">
                * Análisis basado en estadísticas de temporada. Activa API-Football Pro para incluir tiros, corners, tarjetas y minutos de gol.
              </p>
            </div>
          )}
        </>
      )}
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

/* ─── Fichajes panel ─── */
const TRANSFER_KEYWORDS = ['fichaj', 'transfer', 'contrat', 'firma', 'renov', ' llega', ' sale ', 'vende', 'traspas', 'cedid', 'incorpor', ' ficha', 'rescind', 'mercado', 'refuerzo', 'signing', 'signed', 'deal', 'move', 'joins', 'leaves']

function FichajesPanel({ news, loading }) {
  const transfers = news.filter(n => {
    const text = (n.title + ' ' + n.description).toLowerCase()
    return TRANSFER_KEYWORDS.some(kw => text.includes(kw))
  })

  if (loading) return <div className="p-8 text-center text-gray-600 animate-pulse">Cargando fichajes...</div>
  if (!transfers.length) return (
    <div className="p-12 text-center">
      <p className="text-3xl mb-2">🔄</p>
      <p className="text-gray-600 text-sm">Sin noticias de fichajes recientes</p>
      <p className="text-gray-700 text-[11px] mt-1">Las noticias de transferencias aparecerán aquí</p>
    </div>
  )
  return (
    <div className="divide-y divide-gray-800/30">
      {/* Header stat */}
      <div className="px-4 py-2 bg-blue-950/20 flex items-center gap-2">
        <span className="text-lg">🔄</span>
        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{transfers.length} movimientos</span>
      </div>
      {transfers.map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
          className="flex gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-900/30 border border-blue-800/30 flex items-center justify-center">
            <span className="text-base">🔄</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-snug font-medium">{item.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-blue-500 uppercase">{item.source?.slice(0, 8)}</span>
              {item.pub_date && <span className="text-[10px] text-gray-700">{item.pub_date.slice(0, 16)}</span>}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

/* ─── Picks IA panel ─── */
const PICK_COLOR = { '1': { bg: 'bg-emerald-900/40', ring: 'ring-emerald-700', text: 'text-emerald-400', label: 'Local' }, 'X': { bg: 'bg-gray-800/40', ring: 'ring-gray-600', text: 'text-gray-300', label: 'Empate' }, '2': { bg: 'bg-blue-900/40', ring: 'ring-blue-700', text: 'text-blue-400', label: 'Visitante' } }

function PicksPanel({ picks, loading }) {
  const [filter, setFilter] = useState('all')
  if (loading) return <div className="p-8 text-center text-gray-600 animate-pulse">Analizando partidos...</div>
  if (!picks.length) return (
    <div className="p-12 text-center">
      <p className="text-3xl mb-2">🎯</p>
      <p className="text-gray-600 text-sm">Inicializa las ligas para ver picks</p>
    </div>
  )

  const filtered = filter === 'all' ? picks : picks.filter(p => p.pick === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/40 bg-gray-900/30 shrink-0">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mr-1">Filtrar:</span>
        {[['all', 'Todos', 'text-white'], ['1', 'Local', 'text-emerald-400'], ['X', 'Empate', 'text-gray-300'], ['2', 'Visitante', 'text-blue-400']].map(([v, l, c]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${filter === v ? 'bg-white/10' : 'hover:bg-white/5'} ${c}`}>
            {l}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-gray-700">{filtered.length} picks</span>
      </div>

      {/* Picks list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-800/30">
        {filtered.map((pick, i) => {
          const cfg = PICK_COLOR[pick.pick]
          const lg = LEAGUES.find(l => l.code === pick.league_code)
          const colTime = pick.date ? new Intl.DateTimeFormat('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }).format(new Date(pick.date)) : null
          return (
            <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
              {/* League + date */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{lg?.flag ?? '⚽'}</span>
                <span className="text-[10px] text-gray-600 font-medium">{pick.league_name}</span>
                {colTime && <span className="text-[10px] text-gray-700 ml-auto">🇨🇴 {colTime}</span>}
              </div>
              {/* Teams */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs text-white font-semibold flex-1 text-right truncate">{pick.home_team}</span>
                <span className="text-[10px] text-gray-600 shrink-0">vs</span>
                <span className="text-xs text-white font-semibold flex-1 truncate">{pick.away_team}</span>
              </div>
              {/* Pick badge + confidence */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ring-1 ${cfg.bg} ${cfg.ring}`}>
                  <span className={`text-base font-black ${cfg.text}`}>{pick.pick}</span>
                  <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</span>
                </div>
                <div className="flex-1">
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                    <div className="bg-emerald-500/70" style={{ width: `${pick.prob_home * 100}%` }} />
                    <div className="bg-gray-600" style={{ width: `${pick.prob_draw * 100}%` }} />
                    <div className="bg-blue-500/70" style={{ width: `${pick.prob_away * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-700 mt-0.5">
                    <span>{(pick.prob_home * 100).toFixed(0)}%</span>
                    <span>{(pick.prob_draw * 100).toFixed(0)}%</span>
                    <span>{(pick.prob_away * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-black ${cfg.text}`}>{(pick.confidence * 100).toFixed(0)}%</p>
                  <p className="text-[9px] text-gray-700">confianza</p>
                </div>
              </div>
              {/* Predicted score */}
              {pick.top_score && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[9px] text-gray-700 uppercase tracking-widest">Marcador IA</span>
                  <span className="text-xs font-bold text-gray-400">{pick.top_score.home_goals}–{pick.top_score.away_goals}</span>
                  <span className="text-[9px] text-gray-700">({(pick.top_score.probability * 100).toFixed(1)}%)</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── World Cup 2026 Widget ─── */
const WC_FAVORITES = [
  { flag: '🇧🇷', name: 'Brasil',    pct: 18 },
  { flag: '🇫🇷', name: 'Francia',   pct: 16 },
  { flag: '🇦🇷', name: 'Argentina', pct: 15 },
  { flag: '🇪🇸', name: 'España',    pct: 14 },
  { flag: '🇩🇪', name: 'Alemania',  pct: 12 },
  { flag: '🇬🇧', name: 'Inglaterra',pct: 10 },
  { flag: '🇵🇹', name: 'Portugal',  pct: 9  },
  { flag: '🇳🇱', name: 'Holanda',   pct: 6  },
]

function WorldCupWidget({ now }) {
  const diff = WC2026 - now
  const d = Math.max(0, Math.floor(diff / 86400000))
  const h = Math.max(0, Math.floor((diff % 86400000) / 3600000))
  const m = Math.max(0, Math.floor((diff % 3600000) / 60000))
  const s = Math.max(0, Math.floor((diff % 60000) / 1000))

  const [voted, setVoted] = useState(() => {
    try { return localStorage.getItem('wc2026_voted') || null } catch { return null }
  })
  const [votes, setVotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wc2026_votes') || 'null') || { MX: 34, TBD: 66 } }
    catch { return { MX: 34, TBD: 66 } }
  })

  const castVote = (team) => {
    if (voted) return
    const newV = { ...votes, [team]: (votes[team] || 0) + 1 }
    setVotes(newV)
    setVoted(team)
    try {
      localStorage.setItem('wc2026_votes', JSON.stringify(newV))
      localStorage.setItem('wc2026_voted', team)
    } catch {}
  }

  const totalV = Object.values(votes).reduce((a, b) => a + b, 0) || 1
  const mxPct  = Math.round((votes.MX  / totalV) * 100)
  const tbdPct = 100 - mxPct

  // Local time of opening match
  const wcLocalTime = new Intl.DateTimeFormat('es', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City',
  }).format(WC2026)

  return (
    <div className="shrink-0 border-b border-yellow-900/30 bg-gradient-to-b from-[#0a1628] to-[#060b15]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="text-xl">⚽</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-white uppercase tracking-wide leading-tight">Mundial de Fútbol 2026</p>
          <p className="text-[9px] text-yellow-600">🇺🇸 USA · 🇨🇦 Canadá · 🇲🇽 México</p>
        </div>
      </div>

      {/* Countdown */}
      <div className="grid grid-cols-4 gap-1 px-3 pb-3">
        {[['días', d], ['horas', h], ['min', m], ['seg', s]].map(([l, v]) => (
          <div key={l} className="bg-black/50 rounded-lg py-2 text-center border border-yellow-900/20">
            <p className="text-base font-black text-yellow-400 font-mono tabular-nums leading-none">{String(v).padStart(2,'0')}</p>
            <p className="text-[8px] text-gray-700 uppercase mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Opening match */}
      <div className="mx-3 mb-3 bg-black/30 rounded-xl border border-yellow-900/20 p-3">
        <p className="text-[9px] text-yellow-700 uppercase tracking-widest font-bold mb-2 text-center">Partido inaugural</p>
        <div className="flex items-center justify-between gap-1 mb-2">
          <button onClick={() => castVote('MX')}
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-all ${voted === 'MX' ? 'bg-emerald-900/40 ring-1 ring-emerald-500' : 'hover:bg-white/5'} ${voted && voted !== 'MX' ? 'opacity-50' : ''}`}>
            <span className="text-3xl">🇲🇽</span>
            <span className="text-[10px] text-gray-400 font-medium">México</span>
            {voted && <span className="text-[10px] text-emerald-400 font-bold">{mxPct}%</span>}
          </button>

          <div className="text-center shrink-0">
            <p className="text-[10px] font-black text-gray-500">VS</p>
            <p className="text-[9px] text-gray-700 mt-1">11 JUN</p>
            <p className="text-[9px] text-gray-700">{wcLocalTime} MX</p>
          </div>

          <button onClick={() => castVote('TBD')}
            className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-all ${voted === 'TBD' ? 'bg-blue-900/40 ring-1 ring-blue-500' : 'hover:bg-white/5'} ${voted && voted !== 'TBD' ? 'opacity-50' : ''}`}>
            <span className="text-3xl">🏳️</span>
            <span className="text-[10px] text-gray-500 font-medium">Por definir</span>
            {voted && <span className="text-[10px] text-blue-400 font-bold">{tbdPct}%</span>}
          </button>
        </div>

        {/* Vote bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${voted ? mxPct : 50}%` }} />
          <div className="bg-blue-500 transition-all duration-500" style={{ width: `${voted ? tbdPct : 50}%` }} />
        </div>
        {!voted && <p className="text-[9px] text-gray-700 text-center mt-1">Toca para votar</p>}

        <p className="text-[9px] text-gray-700 text-center mt-2">📍 Estadio Azteca · Ciudad de México</p>
      </div>

      {/* Favorites to win */}
      <div className="px-3 pb-3">
        <p className="text-[9px] text-yellow-700 uppercase tracking-widest font-bold mb-2">Favoritos para ganar</p>
        <div className="space-y-1">
          {WC_FAVORITES.map(f => (
            <div key={f.name} className="flex items-center gap-2">
              <span className="text-sm w-5 shrink-0">{f.flag}</span>
              <span className="text-[10px] text-gray-500 w-16 truncate">{f.name}</span>
              <div className="flex-1 bg-gray-800/60 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full" style={{ width: `${f.pct * 5}%` }} />
              </div>
              <span className="text-[10px] text-yellow-500 font-mono w-7 text-right">{f.pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-gray-700 mt-2 text-center">Probabilidades basadas en ranking FIFA</p>
      </div>
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
  const { data: picksData, isLoading: loadingPicks } = useQuery({
    queryKey: ['top-picks'],
    queryFn: () => api.get('/analytics/top-picks').then(r => r.data),
    staleTime: 300000, refetchInterval: 300000,
  })

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
  const picks      = picksData?.picks ?? []
  const activeLg   = LEAGUES.find(l => l.code === activeLeague)

  const TABS = [
    { id: 'matches',   label: '📅 Partidos' },
    { id: 'picks',     label: '🎯 Picks IA' },
    { id: 'standings', label: '📊 Clasificación' },
    { id: 'compare',   label: '🆚 Comparar' },
    { id: 'fichajes',  label: '🔄 Fichajes' },
    { id: 'youtube',   label: '📺 Canales' },
    { id: 'news',      label: '📰 Noticias' },
  ]

  // Map value-bet events by team pair for odds lookup in match rows
  const vbByMatch = {}
  for (const e of allEvents) {
    vbByMatch[`${e.home_team}|${e.away_team}`] = e
  }

  const GROUP_COLORS = {
    Europa:        'text-sky-400 border-sky-900/40 bg-sky-950/20',
    Internacional: 'text-violet-400 border-violet-900/40 bg-violet-950/20',
    América:       'text-emerald-400 border-emerald-900/40 bg-emerald-950/20',
    Mundial:       'text-yellow-400 border-yellow-900/40 bg-yellow-950/20',
    Otros:         'text-orange-400 border-orange-900/40 bg-orange-950/20',
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#06090f]">

      {/* ── Top status bar ── */}
      <div className="flex items-center gap-3 px-4 py-1.5 bg-[#040710] border-b border-gray-800/60 text-[11px] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <Dot on />
          <span className="text-emerald-300 font-mono font-bold">{now.toUTCString().slice(17, 25)} UTC</span>
        </div>
        {[
          ['Ligas', `${trainedCnt}/${LEAGUES.length}`, 'text-white'],
          ['Value bets', valueBets.length, valueBets.length > 0 ? 'text-emerald-300' : 'text-gray-600'],
          ['Arbitraje', arbs.length, arbs.length > 0 ? 'text-amber-300' : 'text-gray-600'],
          ['Picks IA', picks.length, picks.length > 0 ? 'text-violet-300' : 'text-gray-600'],
        ].map(([label, val, cls]) => (
          <div key={label} className="flex items-center gap-1.5 shrink-0">
            <div className="w-px h-4 bg-gray-800" />
            <span className="text-gray-500">{label}</span>
            <span className={`font-black ${cls}`}>{val}</span>
          </div>
        ))}
        {wc && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-px h-4 bg-gray-800" />
            <span>⚽</span>
            <span className="text-gray-500">Mundial 2026</span>
            <span className="font-mono font-black text-yellow-300">
              {wc.d}d {String(wc.h).padStart(2,'0')}:{String(wc.m).padStart(2,'0')}:{String(wc.s).padStart(2,'0')}
            </span>
          </div>
        )}
        <div className="flex-1" />
        {anyUntrained && (
          <button onClick={() => initReal()} disabled={initing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-black transition-colors shadow-emerald-900/40 shadow-lg shrink-0">
            {initing ? '⏳ Inicializando…' : '🚀 Inicializar ligas'}
          </button>
        )}
      </div>

      {/* ── World clock ── */}
      <WorldClockBar now={now} />

      {/* ── Main 3-column ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT sidebar */}
        <div className="w-52 bg-[#040710] border-r border-gray-800/60 flex flex-col shrink-0">
          <div className="px-3 py-2 text-[10px] text-gray-200 uppercase tracking-widest font-black border-b border-gray-800/60 flex items-center gap-1.5 bg-emerald-950/20">
            <span className="text-emerald-400">◆</span> Ligas
          </div>
          <div className="flex-1 overflow-y-auto">
            {Object.entries(LEAGUE_GROUPS).map(([groupKey, groupMeta]) => {
              const groupLeagues = LEAGUES.filter(l => l.group === groupKey)
              if (!groupLeagues.length) return null
              const gcls = GROUP_COLORS[groupKey] ?? 'text-gray-400 border-gray-800/20 bg-black/10'
              return (
                <div key={groupKey}>
                  <div className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-black border-b flex items-center gap-1.5 ${gcls}`}>
                    <span>{groupMeta.icon}</span>{groupMeta.label}
                  </div>
                  {groupLeagues.map(l => {
                    const ls = status?.leagues?.[l.code]
                    const active = activeLeague === l.code
                    return (
                      <button key={l.code} onClick={() => { setActiveLeague(l.code); setTab('matches') }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-gray-800/20 transition-all ${active ? 'bg-emerald-950/40 border-l-[3px] border-l-emerald-400' : 'border-l-[3px] border-l-transparent hover:bg-white/[0.04] hover:border-l-gray-700'}`}>
                        <span className="text-sm shrink-0">{l.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs truncate font-semibold ${active ? 'text-white' : 'text-gray-200'}`}>{l.name}</p>
                          {ls && <p className="text-[10px] text-gray-500">{ls.teams_in_model} equipos</p>}
                        </div>
                        <Dot on={ls?.model_trained} />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Mini stats */}
          <div className="border-t border-gray-800/50 p-3 shrink-0 bg-black/30 space-y-1.5">
            <p className="text-[10px] text-gray-300 uppercase tracking-widest font-black mb-2">Resumen</p>
            {[
              ['Value bets', valueBets.length, 'text-emerald-300 bg-emerald-950/50 border-emerald-800/40'],
              ['Arbitraje',  arbs.length,       'text-amber-300 bg-amber-950/50 border-amber-800/40'],
              ['Partidos',   fixtures.length,   'text-white bg-gray-800/50 border-gray-700/40'],
              ['Noticias',   news.length,       'text-sky-300 bg-sky-950/50 border-sky-800/40'],
            ].map(([l, v, cls]) => (
              <div key={l} className="flex justify-between items-center">
                <span className="text-gray-300 text-[11px]">{l}</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded border ${cls}`}>{v}</span>
              </div>
            ))}
            <Link to={`/league/${activeLeague}`}
              className="block w-full text-center text-[10px] text-emerald-400 hover:text-emerald-300 mt-2 font-bold transition-colors">
              Ver {activeLg?.name} →
            </Link>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800/60 bg-[#040710] shrink-0 overflow-x-auto">
            <div className="px-3 py-2 shrink-0 flex items-center gap-2 border-r border-gray-800/40">
              <span className="text-xl leading-none">{activeLg?.flag}</span>
              <span className="text-sm text-white font-bold">{activeLg?.name}</span>
            </div>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                    : 'border-transparent text-gray-400 hover:text-gray-100 hover:bg-white/[0.03]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* Partidos */}
            {tab === 'matches' && (
              <div>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800/40 bg-black/20">
                  <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Próximos partidos</span>
                  {!trained && <span className="text-[10px] text-amber-400 font-medium">— sin modelo</span>}
                  <div className="flex-1" />
                  <div className="flex gap-2 text-[10px] font-black mr-6">
                    <span className="text-emerald-400 w-9 text-center">1</span>
                    <span className="text-gray-400 w-9 text-center">X</span>
                    <span className="text-blue-400 w-9 text-center">2</span>
                  </div>
                </div>
                {fixtures.length === 0
                  ? <div className="p-12 text-center text-gray-400 text-sm">{initing ? '⏳ Cargando datos…' : 'Sin partidos. Inicializa las ligas.'}</div>
                  : fixtures.map((m, i) => {
                      const bkData = vbByMatch[`${m.home_team}|${m.away_team}`]
                      return <MatchRow key={i} m={m} leagueCode={activeLeague} bkData={bkData} />
                    })
                }
                {allEvents.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-emerald-950/20 border-t border-emerald-800/30 text-[10px] text-emerald-300 uppercase tracking-widest font-black">
                      ⚡ Value bets detectados — {valueBets.length}/{allEvents.length} con ventaja
                    </div>
                    {allEvents.map((m, i) => <MatchRow key={i} m={m} leagueCode={activeLeague} bkData={m} />)}
                  </>
                )}
              </div>
            )}

            {/* Clasificación */}
            {tab === 'standings' && (
              standings.length === 0
                ? <div className="p-12 text-center text-gray-400 text-sm">Sin clasificación. Inicializa las ligas.</div>
                : <StandingsTab standings={standings} leagueName={activeLg?.name} />
            )}

            {/* Comparar */}
            {tab === 'compare' && <CompareTab standings={standings} />}

            {/* Picks IA */}
            {tab === 'picks' && <PicksPanel picks={picks} loading={loadingPicks} />}

            {/* Fichajes */}
            {tab === 'fichajes' && <FichajesPanel news={news} loading={loadingNews} />}

            {/* YouTube */}
            {tab === 'youtube' && <YouTubePanel videos={videos} loading={loadingYT} />}

            {/* Noticias */}
            {tab === 'news' && <NewsPanel news={news} loading={loadingNews} />}

          </div>
        </div>

        {/* RIGHT panel */}
        <div className="w-64 bg-[#040710] border-l border-gray-800/60 flex flex-col shrink-0 overflow-y-auto">
          {/* World Cup Widget */}
          <WorldCupWidget now={now} />

          {/* Value bets */}
          <div className="px-3 py-2 border-b border-emerald-900/30 flex items-center justify-between shrink-0 bg-emerald-950/20">
            <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-black">⚡ Value Bets</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded ${valueBets.length > 0 ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}>{valueBets.length}</span>
          </div>
          <div className="overflow-y-auto max-h-48">
            {!hasOdds && <div className="p-4 text-[11px] text-gray-500 text-center">Sin Odds API key configurada</div>}
            {hasOdds && !trained && <div className="p-4 text-[11px] text-gray-500 text-center">Inicializa las ligas primero</div>}
            {loadingBets && <div className="p-4 text-[11px] text-gray-500 animate-pulse text-center">Analizando cuotas…</div>}
            {valueBets.map((e, i) => <VBCard key={i} event={e} leagueCode={activeLeague} />)}
            {valueBets.length === 0 && !loadingBets && trained && hasOdds && (
              <div className="p-4 text-[11px] text-gray-500 text-center">Sin value bets activos ahora</div>
            )}
          </div>

          {/* Arbitrage */}
          <div className="px-3 py-2 border-t border-b border-amber-900/30 flex items-center justify-between bg-amber-950/20 shrink-0">
            <span className="text-[10px] text-amber-300 uppercase tracking-widest font-black">🔀 Arbitraje</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded ${arbs.length > 0 ? 'bg-amber-600 text-white' : 'text-gray-600'}`}>{arbs.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {arbs.length === 0
              ? <div className="p-4 text-[11px] text-gray-500 text-center">Sin oportunidades ahora</div>
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
