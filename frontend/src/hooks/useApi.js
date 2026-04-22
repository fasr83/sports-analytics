import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

// En dev usa el proxy de Vite (/api → localhost:8000)
// En producción usa la URL del backend en Railway via VITE_API_URL
const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'

const api = axios.create({ baseURL: BASE })

export const useLeagues = () =>
  useQuery({ queryKey: ['leagues'], queryFn: () => api.get('/leagues').then(r => r.data) })

export const useStandings = (leagueCode) =>
  useQuery({
    queryKey: ['standings', leagueCode],
    queryFn: () => api.get(`/leagues/${leagueCode}/standings`).then(r => r.data),
    enabled: !!leagueCode,
  })

export const useMatches = (leagueCode, status = 'SCHEDULED') =>
  useQuery({
    queryKey: ['matches', leagueCode, status],
    queryFn: () => api.get(`/leagues/${leagueCode}/matches?status=${status}`).then(r => r.data),
    enabled: !!leagueCode,
  })

export const useValueBets = (leagueCode) =>
  useQuery({
    queryKey: ['value-bets', leagueCode],
    queryFn: () => api.get(`/analytics/${leagueCode}/value-bets`).then(r => r.data),
    enabled: !!leagueCode,
  })

export const useArbitrage = (leagueCode) =>
  useQuery({
    queryKey: ['arbitrage', leagueCode],
    queryFn: () => api.get(`/analytics/${leagueCode}/arbitrage`).then(r => r.data),
    enabled: !!leagueCode,
  })

export const useTrainModel = (leagueCode) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.get(`/analytics/${leagueCode}/train`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['value-bets', leagueCode] })
    },
  })
}

export const useMatchOdds = (leagueCode, matchId) =>
  useQuery({
    queryKey: ['match-odds', leagueCode, matchId],
    queryFn: () => api.get(`/matches/${leagueCode}/${matchId}/odds`).then(r => r.data),
    enabled: !!leagueCode && !!matchId,
  })

export const useSetupStatus = () =>
  useQuery({ queryKey: ['setup-status'], queryFn: () => api.get('/setup/status').then(r => r.data), staleTime: 30000 })

export const useInitDemo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/setup/init-demo').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-status'] })
      qc.invalidateQueries({ queryKey: ['standings'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}

export const useUpcomingPredictions = (leagueCode) =>
  useQuery({
    queryKey: ['upcoming-predictions', leagueCode],
    queryFn: () => api.get(`/analytics/${leagueCode}/upcoming-predictions`).then(r => r.data),
    enabled: !!leagueCode,
  })
