import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'garden-mind-theme'
const darkQuery = '(prefers-color-scheme: dark)'

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(preference: ThemePreference) {
  const isDark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia(darkQuery).matches)
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') {
      return
    }

    const query = window.matchMedia(darkQuery)
    const handleChange = () => applyTheme('system')
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [preference])

  const updatePreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, next)
      }
    } catch {
      // Storage can be unavailable; the preference still applies this session.
    }
    setPreference(next)
  }, [])

  return { preference, setPreference: updatePreference }
}
