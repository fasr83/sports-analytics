import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

export const useNews = () =>
  useQuery({
    queryKey: ['news'],
    queryFn: () => api.get('/news').then(r => r.data),
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 10,
  })
