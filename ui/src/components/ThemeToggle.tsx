import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

function preferredTheme(): Theme {
  let saved: string | null = null
  try { saved = localStorage.getItem('archly-theme') } catch { /* Third-party frames may prohibit browser storage. */ }
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(preferredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try { localStorage.setItem('archly-theme', theme) } catch { /* Keep the selected theme in memory in restricted embeds. */ }
  }, [theme])

  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(nextTheme)}
      title={`Use ${nextTheme} theme`}
      aria-label={`Use ${nextTheme} theme`}
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  )
}
