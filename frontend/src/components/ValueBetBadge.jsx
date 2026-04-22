export default function ValueBetBadge({ value, size = 'sm' }) {
  if (!value || value < 0.05) return null
  const isHigh = value >= 0.15
  const cls = isHigh
    ? 'bg-green-500 text-white animate-pulse'
    : 'bg-yellow-500 text-black'
  const label = isHigh ? `⚡ VALOR ALTO +${(value * 100).toFixed(0)}%` : `✓ VALOR +${(value * 100).toFixed(0)}%`
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  )
}
