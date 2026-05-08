interface BadgeProps {
  label: string
  color?: string
  bg?: string
}

export default function Badge({ label, color = '#94A3B8', bg }: BadgeProps) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ color, background: bg || `${color}18`, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  )
}
