import { useAuth } from '../lib/AuthContext'
import { useTheme, type ThemePreference } from '../lib/theme'
import { useRef, useState } from 'react'
import {
  AVATAR_MAX_BYTES,
  getAvatarUrl,
  resizeAvatar,
} from '../lib/profile'
import { Avatar } from './Avatar'
import { isSupabaseConfigured } from '../lib/supabase'
import { AuthForm } from './PlantsPanel'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const themeOptions: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Match your device' },
  { value: 'light', label: 'Light', hint: 'Bright and airy' },
  { value: 'dark', label: 'Dark', hint: 'Easy on the eyes' },
]

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { session, signOut, uploadAvatar, removeAvatar } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const { preference, setPreference } = useTheme()

  if (!isOpen) {
    return null
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return
    }
    setAvatarError(null)
    if (!file.type.startsWith('image/')) {
      setAvatarError('Choose an image file.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('Image must be under 8 MB.')
      return
    }
    setIsSaving(true)
    try {
      setAvatarError(await uploadAvatar(await resizeAvatar(file)))
    } catch {
      setAvatarError('Could not read that image. Try a different file.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setAvatarError(null)
    setIsSaving(true)
    setAvatarError(await removeAvatar())
    setIsSaving(false)
  }

  const user = session?.user
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-garden-fade-in bg-[rgb(20_40_30/40%)] backdrop-blur-sm motion-reduce:animate-none"
        onClick={onClose}
      />
      <aside
        aria-label="Profile and settings"
        aria-modal="true"
        className="relative flex max-h-[85svh] w-full max-w-lg animate-garden-fade-in flex-col overflow-hidden rounded-[var(--radius-md)] glass-strong motion-reduce:animate-none"
        role="dialog"
      >
        <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-moss)]">
              Account
            </p>
            <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-forest)]">
              Profile &amp; settings
            </h2>
          </div>
          <button
            aria-label="Close profile and settings"
            className="rounded-[var(--radius-md)] p-2 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
            onClick={onClose}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <section aria-labelledby="profile-heading">
            <h3
              className="text-sm font-semibold text-[var(--color-ink)]"
              id="profile-heading"
            >
              Profile
            </h3>
            {user ? (
              <>
                <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] glass p-4">
                  <Avatar
                    className="size-16 text-xl"
                    email={user.email}
                    imageUrl={getAvatarUrl(user)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {user.email}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {memberSince ? `Member since ${memberSince}` : 'Signed in'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="Upload profile picture"
                        className="sr-only"
                        onChange={(event) => {
                          void handleFile(event.target.files?.[0])
                          event.target.value = ''
                        }}
                        ref={fileInput}
                        type="file"
                      />
                      <button
                        className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-forest)] transition hover:bg-[var(--glass-bg-strong)] disabled:opacity-50"
                        disabled={isSaving}
                        onClick={() => fileInput.current?.click()}
                        type="button"
                      >
                        {isSaving
                          ? 'Saving…'
                          : getAvatarUrl(user)
                            ? 'Change picture'
                            : 'Upload picture'}
                      </button>
                      {getAvatarUrl(user) && (
                        <button
                          className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] transition hover:text-[var(--color-forest)] disabled:opacity-50"
                          disabled={isSaving}
                          onClick={() => void handleRemove()}
                          type="button"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {avatarError && (
                  <p className="mt-2 text-xs text-[var(--color-danger)]" role="alert">
                    {avatarError}
                  </p>
                )}
                <button
                  className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-forest)] transition hover:bg-[var(--color-surface-muted)]"
                  onClick={async () => {
                    await signOut()
                    onClose()
                  }}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-3">
                {isSupabaseConfigured ? (
                  <AuthForm />
                ) : (
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Supabase isn&apos;t configured. Set VITE_SUPABASE_URL and
                    VITE_SUPABASE_PUBLISHABLE_KEY.
                  </p>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="theme-heading">
            <h3
              className="text-sm font-semibold text-[var(--color-ink)]"
              id="theme-heading"
            >
              Theme
            </h3>
            <div
              aria-labelledby="theme-heading"
              className="mt-3 grid grid-cols-3 gap-2"
              role="radiogroup"
            >
              {themeOptions.map((option) => {
                const isSelected = preference === option.value
                return (
                  <button
                    aria-checked={isSelected}
                    className={`rounded-[var(--radius-md)] border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)] ${
                      isSelected
                        ? 'border-[var(--color-forest)] bg-[var(--color-sprout)]'
                        : 'border-[var(--color-border)] glass hover:border-[var(--color-border-strong)]'
                    }`}
                    key={option.value}
                    onClick={() => setPreference(option.value)}
                    role="radio"
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-[var(--color-ink)]">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                      {option.hint}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}
