import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface PlantsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type Location = 'indoor' | 'outdoor'
type SunExposure = 'full_sun' | 'partial_sun' | 'bright_indirect' | 'low_light'

interface Plant {
  id: string
  nickname: string
  species: string | null
  location: Location
  sun_exposure: SunExposure
  planted_on: string | null
  notes: string | null
}

const SUN_LABELS: Record<SunExposure, string> = {
  full_sun: 'Full sun',
  partial_sun: 'Partial sun',
  bright_indirect: 'Bright indirect light',
  low_light: 'Low light',
}

const inputClass =
  'h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] glass px-3 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-moss)]'

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-forest)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-forest)] transition hover:bg-[var(--color-forest-hover)] disabled:cursor-not-allowed disabled:opacity-50'

function Icon({ name }: { name: 'leaf' | 'trash' | 'x' }) {
  const paths: Record<'leaf' | 'trash' | 'x', ReactNode> = {
    leaf: (
      <>
        <path d="M20.5 3.5C11 3 4 7.5 4 15.75 4 18.6 6.3 21 9.25 21c8.25 0 11.25-9.5 11.25-17.5Z" />
        <path d="M3.5 21c3-5.25 7.25-8.5 13-10" />
      </>
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}

export function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    const error =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)
    setMessage(error)
    setIsSubmitting(false)
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-[var(--radius-md)] bg-[var(--color-sprout)] p-4 text-sm text-[var(--color-forest)]">
        Sign in to save your plants and get care reminders.
      </div>
      <input
        autoComplete="email"
        className={inputClass}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        type="email"
        value={email}
      />
      <input
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        className={inputClass}
        minLength={8}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password (8+ characters)"
        required
        type="password"
        value={password}
      />
      {message && (
        <p className="text-xs leading-5 text-[var(--color-ink-muted)]" role="status">
          {message}
        </p>
      )}
      <button className={`${primaryButtonClass} w-full`} disabled={isSubmitting} type="submit">
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        className="w-full text-xs font-semibold text-[var(--color-forest)] underline decoration-[var(--color-gold)] decoration-2 underline-offset-4"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setMessage(null)
        }}
        type="button"
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </form>
  )
}

function PlantCollection({ userId }: { userId: string }) {
  const [plants, setPlants] = useState<Plant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [nickname, setNickname] = useState('')
  const [species, setSpecies] = useState('')
  const [location, setLocation] = useState<Location>('indoor')
  const [sunExposure, setSunExposure] = useState<SunExposure>('bright_indirect')
  const [plantedOn, setPlantedOn] = useState('')
  const [notes, setNotes] = useState('')

  const loadPlants = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('plants')
      .select('id, nickname, species, location, sun_exposure, planted_on, notes')
      .order('created_at', { ascending: false })
    if (loadError) {
      setError(loadError.message)
      return
    }
    setPlants(data as Plant[])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlants()
  }, [loadPlants, userId])

  const addPlant = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('plants').insert({
      nickname: nickname.trim(),
      species: species.trim() || null,
      location,
      sun_exposure: sunExposure,
      planted_on: plantedOn || null,
      notes: notes.trim() || null,
    })
    setIsSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setNickname('')
    setSpecies('')
    setPlantedOn('')
    setNotes('')
    await loadPlants()
  }

  const removePlant = async (id: string) => {
    const { error: deleteError } = await supabase.from('plants').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setPlants((current) => current.filter((plant) => plant.id !== id))
  }

  return (
    <>
      <form
        className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
        onSubmit={addPlant}
      >
        <h3 className="text-sm font-bold text-[var(--color-forest)]">Add a plant</h3>
        <input
          className={inputClass}
          maxLength={80}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Nickname (e.g. Kitchen basil)"
          required
          value={nickname}
        />
        <input
          className={inputClass}
          maxLength={120}
          onChange={(event) => setSpecies(event.target.value)}
          placeholder="Species (e.g. Ocimum basilicum)"
          value={species}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            aria-label="Location"
            className={inputClass}
            onChange={(event) => setLocation(event.target.value as Location)}
            value={location}
          >
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
          <select
            aria-label="Sun exposure"
            className={inputClass}
            onChange={(event) => setSunExposure(event.target.value as SunExposure)}
            value={sunExposure}
          >
            {Object.entries(SUN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <input
          aria-label="Date planted"
          className={inputClass}
          onChange={(event) => setPlantedOn(event.target.value)}
          type="date"
          value={plantedOn}
        />
        <textarea
          className={`${inputClass} h-20 resize-none py-2`}
          maxLength={1000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes (pot size, soil, where it sits…)"
          value={notes}
        />
        <button className={primaryButtonClass} disabled={isSaving || !nickname.trim()} type="submit">
          Add plant
        </button>
      </form>

      {error && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--color-forest)]">My plants</h3>
        <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--color-ink-muted)]">
          {plants.length} {plants.length === 1 ? 'plant' : 'plants'}
        </span>
      </div>

      {plants.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] glass px-4 py-5 text-center text-xs leading-5 text-[var(--color-ink-muted)]">
          No plants yet. Add your first one above.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {plants.map((plant) => (
            <li
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] glass p-3"
              key={plant.id}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-sprout)] text-[var(--color-moss)]">
                <Icon name="leaf" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--color-forest)]">
                  {plant.nickname}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-muted)]">
                  {[plant.species, plant.location === 'indoor' ? 'Indoor' : 'Outdoor', SUN_LABELS[plant.sun_exposure]]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <button
                aria-label={`Remove ${plant.nickname}`}
                className="rounded-[var(--radius-md)] p-2 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-red-700"
                onClick={() => removePlant(plant.id)}
                type="button"
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function PlantsPanel({ isOpen, onClose }: PlantsPanelProps) {
  const { session, isLoading } = useAuth()

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-garden-fade-in bg-[rgb(20_40_30/40%)] backdrop-blur-sm motion-reduce:animate-none"
      />
      <aside
        aria-label="My plants"
        aria-modal="true"
        className="relative flex max-h-[85svh] w-full max-w-lg animate-garden-fade-in flex-col overflow-hidden rounded-[var(--radius-md)] glass-strong motion-reduce:animate-none"
        role="dialog"
      >
        <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-moss)]">
              Your garden
            </p>
            <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-forest)]">
              My plants
            </h2>
          </div>
          <button
            aria-label="Close my plants"
            className="rounded-[var(--radius-md)] p-2 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {!isSupabaseConfigured ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Supabase isn&apos;t configured. Set VITE_SUPABASE_URL and
              VITE_SUPABASE_PUBLISHABLE_KEY.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
          ) : session ? (
            <PlantCollection userId={session.user.id} />
          ) : (
            <AuthForm />
          )}
        </div>

        {session && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3 sm:px-6">
            <span className="block truncate text-xs text-[var(--color-ink-muted)]">
              {session.user.email}
            </span>
          </div>
        )}
      </aside>
    </div>
  )
}
