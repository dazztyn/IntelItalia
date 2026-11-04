import logo from '../assets/INTELITALIA_LOGO_WH.png'

interface Props {
  className?: string
}
export function Logo({ className = '' }: Props) {
  const mascara = `url(${logo})`

  return (
    <span
      role="img"
      aria-label="IntelItalia"
      className={`block h-8 w-40 transition-colors duration-300 ${className}`}
      style={{
        maskImage: mascara,
        WebkitMaskImage: mascara,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'left center',
        WebkitMaskPosition: 'left center',
      }}
    />
  )
}