import { GoogleLogin } from '@react-oauth/google'

interface Props {
  onToken: (idToken: string) => void
  onError: () => void
}

export function BotonGoogle({ onToken, onError }: Props) {
  return (
    <GoogleLogin
      onSuccess={({ credential }) => (credential ? onToken(credential) : onError())}
      onError={onError}
      theme="outline"
      shape="pill"
      text="signin_with"
    />
  )
}