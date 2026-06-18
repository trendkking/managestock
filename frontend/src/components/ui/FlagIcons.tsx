import { cn } from '@/utils'

const flagBox =
  'inline-block shrink-0 overflow-hidden rounded-[5px] shadow-sm ring-1 ring-black/10'

/** 태극기 — Windows에서도 이모지 대신 항상 동일하게 표시 */
export function KrFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 27 18"
      className={cn(flagBox, 'aspect-[3/2] bg-white', className)}
      role="img"
      aria-label="국내 주식"
    >
      <rect width="27" height="18" fill="#fff" />
      {/* 태극 */}
      <circle cx="13.5" cy="9" r="4.2" fill="#c60c30" />
      <path
        fill="#003478"
        d="M13.5 4.8a4.2 4.2 0 0 1 0 8.4 2.1 2.1 0 0 0 0-4.2 2.1 2.1 0 0 1 0-4.2z"
      />
      <circle cx="13.5" cy="7.05" r="1.05" fill="#c60c30" />
      <circle cx="13.5" cy="10.95" r="1.05" fill="#003478" />
      {/* 괘 (단순화) */}
      <g stroke="#000" strokeWidth="0.55" strokeLinecap="round">
        <path d="M3.2 3.2h2.4M3.2 4.4h2.4M3.2 5.6h2.4" />
        <path d="M21.4 3.2h2.4M21.4 4.4h1.2M21.4 5.6h2.4" />
        <path d="M3.2 12.4h1.2M4.4 12.4h1.2M5.6 12.4h1.2" />
        <path d="M21.4 12.4h2.4M21.4 13.6h2.4M21.4 14.8h2.4" />
      </g>
    </svg>
  )
}

/** 성조기 — 소형에서도 줄무늬·별이 보이도록 단순화 */
export function UsFlagIcon({ className }: { className?: string }) {
  const stripes = Array.from({ length: 13 }, (_, i) => (
    <rect
      key={i}
      y={(i * 18) / 13}
      width="27"
      height={18 / 13}
      fill={i % 2 === 0 ? '#b22234' : '#fff'}
    />
  ))
  const stars = [
    [3.2, 2.4],
    [5.4, 2.4],
    [7.6, 2.4],
    [4.3, 4.1],
    [6.5, 4.1],
    [3.2, 5.8],
    [5.4, 5.8],
    [7.6, 5.8],
    [4.3, 7.5],
    [6.5, 7.5],
  ]
  return (
    <svg
      viewBox="0 0 27 18"
      className={cn(flagBox, 'aspect-[3/2]', className)}
      role="img"
      aria-label="미국 주식"
    >
      {stripes}
      <rect width="10.8" height="9.9" fill="#3c3b6e" />
      {stars.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="0.55" fill="#fff" />
      ))}
    </svg>
  )
}
