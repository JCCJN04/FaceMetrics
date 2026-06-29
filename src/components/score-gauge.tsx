'use client'

type Props = {
  score: number
  label: string
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreGauge({ score, label, maxScore = 10, size = 'md' }: Props) {
  const percentage = (score / maxScore) * 100
  const radius = size === 'sm' ? 30 : size === 'md' ? 45 : 60
  const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const svgSize = (radius + strokeWidth) * 2

  const getColor = (pct: number) => {
    if (pct >= 80) return '#22c55e'
    if (pct >= 60) return '#84cc16'
    if (pct >= 40) return '#eab308'
    if (pct >= 20) return '#f97316'
    return '#ef4444'
  }

  const color = getColor(percentage)
  const fontSize = size === 'sm' ? 14 : size === 'md' ? 20 : 28

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize} className="transform -rotate-90">
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/20"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text
          x={radius + strokeWidth}
          y={radius + strokeWidth}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={fontSize}
          fontWeight="bold"
          transform={`rotate(90, ${radius + strokeWidth}, ${radius + strokeWidth})`}
        >
          {score.toFixed(1)}
        </text>
      </svg>
      <span className={`font-medium text-center ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
        {label}
      </span>
    </div>
  )
}
