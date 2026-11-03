const enlaces = [
  { texto: 'Política de privacidad', href: '#' },
  { texto: 'Términos de uso', href: '#' },
  { texto: 'Derechos sobre tus datos', href: '#' },
  { texto: 'Cookies y almacenamiento', href: '#' },
  { texto: 'Soporte', href: '#' },
]

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-100 px-6 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <div className="flex flex-col items-center gap-2 text-center">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          {enlaces.map((enlace) => (
            <a key={enlace.texto} href={enlace.href} className="hover:underline">
              {enlace.texto}
            </a>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} Escuela República de Italia</p>
      </div>
    </footer>
  )
}