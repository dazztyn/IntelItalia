interface Props {
  visible: boolean
  alClic: () => void
  className?: string
}

export function CapaDifusa({ visible, alClic, className = '' }: Props) {
  return (
    <div
      aria-hidden="true"
      onClick={alClic}
      className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      } ${className}`}
    />
  )
}