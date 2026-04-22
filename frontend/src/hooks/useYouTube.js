import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api'
const api = axios.create({ baseURL: BASE })

export const useYouTube = () =>
  useQuery({
    queryKey: ['youtube-videos'],
    queryFn: () => api.get('/youtube/videos').then(r => r.data),
    staleTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 15,
  })
