import { Link } from 'react-router-dom'

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-neutral-400" aria-label="Life OS home">
      <img src="/logos/lifeos-logo-light.png" alt="Life OS" className="h-10 w-auto dark:hidden" />
      <img src="/logos/lifeos-logo-dark.png" alt="Life OS" className="hidden h-10 w-auto dark:block" />
    </Link>
  )
}
