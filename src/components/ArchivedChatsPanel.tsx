import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/AuthContext'
import { deleteChat, listChats, type SavedChat } from '../lib/chats'

interface ArchivedChatsPanelProps {
  isOpen: boolean
  onChatDeleted: (chatId: string) => void
  onClose: () => void
  onOpenChat: (chatId: string) => void
  onSignIn: () => void
}

type IconName = 'arrow' | 'clock' | 'message' | 'search' | 'user' | 'x'

function formatDate(value: string) {
  const date = new Date(value)
  const days = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(value).setHours(0, 0, 0, 0)) /
      86_400_000,
  )

  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3.25 2" />
      </>
    ),
    message: (
      <>
        <path d="M20.5 11.5a8.5 8.5 0 0 1-9.25 8.47L5 21l1.25-5.1A8.5 8.5 0 1 1 20.5 11.5Z" />
        <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
      </>
    ),
    search: (
      <>
        <circle cx="10.75" cy="10.75" r="5.75" />
        <path d="m15 15 4 4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
      </>
    ),
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

export function ArchivedChatsPanel({
  isOpen,
  onChatDeleted,
  onClose,
  onOpenChat,
  onSignIn,
}: ArchivedChatsPanelProps) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [chats, setChats] = useState<SavedChat[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<SavedChat | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen || !userId) {
      return
    }

    let cancelled = false
    listChats()
      .then((items) => {
        if (!cancelled) {
          setChats(items)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load chats.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, userId])

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteChat(pendingDelete.id)
      setChats((current) => current.filter((chat) => chat.id !== pendingDelete.id))
      onChatDeleted(pendingDelete.id)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete chat.')
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  const isLoading = Boolean(userId) && !loaded
  const visibleChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

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
        aria-label="Archived chats"
        aria-modal="true"
        className="relative flex max-h-[85svh] w-full max-w-lg animate-garden-fade-in flex-col overflow-hidden rounded-[var(--radius-md)] glass-strong motion-reduce:animate-none"
        role="dialog"
      >
        <header className="flex h-[73px] items-center justify-between border-b border-[var(--color-border)] px-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-moss)]">
              Your conversations
            </p>
            <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-forest)]">
              Archived chats
            </h2>
          </div>
          <button
            aria-label="Close archived chats"
            className="rounded-[var(--radius-md)] p-2 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" />
          </button>
        </header>

        <div className="border-b border-[var(--color-border)] p-5 sm:p-6">
          <label
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] glass px-3 text-[var(--color-ink-muted)] focus-within:border-[var(--color-moss)]"
            htmlFor="search-chats"
          >
            <Icon name="search" />
            <input
              className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
              id="search-chats"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your chats"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            <Icon name="clock" />
            Recent
          </div>
          {error && (
            <p className="px-2 pb-2 text-xs text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
          {!session ? (
            <p className="px-2 text-sm text-[var(--color-ink-muted)]">
              Sign in to see your saved chats.
            </p>
          ) : isLoading ? (
            <p className="px-2 text-sm text-[var(--color-ink-muted)]">Loading…</p>
          ) : visibleChats.length === 0 ? (
            <p className="px-2 text-sm text-[var(--color-ink-muted)]">
              {chats.length === 0
                ? 'No saved chats yet. Start a conversation and it will appear here.'
                : 'No chats match your search.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleChats.map((chat) => (
                <li className="group relative" key={chat.id}>
                  <button
                    className="flex w-full items-center gap-3 rounded-[var(--radius-md)] p-3 pr-12 text-left transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)]"
                    onClick={() => onOpenChat(chat.id)}
                    type="button"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-sprout)] text-[var(--color-moss)]">
                      <Icon name="message" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-forest)]">
                      {chat.title}
                    </span>
                    <span className="text-[0.68rem] font-medium text-[var(--color-ink-faint)]">
                      {formatDate(chat.updated_at)}
                    </span>
                  </button>
                  <button
                    aria-label={`Delete chat ${chat.title}`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-md)] p-1.5 text-[var(--color-ink-faint)] opacity-0 transition hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => setPendingDelete(chat)}
                    type="button"
                  >
                    <Icon name="x" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pendingDelete && (
          <div
            className="absolute inset-0 z-10 grid place-items-center bg-[rgb(20_40_30/40%)] p-4 backdrop-blur-sm"
            onClick={() => !isDeleting && setPendingDelete(null)}
          >
            <div
              aria-describedby="delete-chat-description"
              aria-labelledby="delete-chat-title"
              aria-modal="true"
              className="w-full max-w-sm animate-garden-fade-in rounded-[var(--radius-md)] border border-[var(--glass-edge)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-float)] motion-reduce:animate-none"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !isDeleting) {
                  event.stopPropagation()
                  setPendingDelete(null)
                }
              }}
              role="alertdialog"
            >
              <h3
                className="text-base font-semibold text-[var(--color-forest)]"
                id="delete-chat-title"
              >
                Delete this chat?
              </h3>
              <p
                className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]"
                id="delete-chat-description"
              >
                &ldquo;{pendingDelete.title}&rdquo; and all of its messages will
                be permanently deleted. This can&apos;t be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  autoFocus
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)]"
                  disabled={isDeleting}
                  onClick={() => setPendingDelete(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-[var(--radius-md)] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-[var(--color-on-danger)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger)] disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={() => void confirmDelete()}
                  type="button"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!session && (
          <div className="m-4 rounded-[var(--radius-md)] border border-[var(--color-border)] glass p-4 sm:m-5">
            <div className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[image:var(--avatar-bg)] text-[var(--avatar-fg)]">
                <Icon name="user" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-forest)]">
                  Keep every garden idea
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">
                  Sign in to save chats securely and access them on any device.
                </p>
                <button
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-forest)] underline decoration-[var(--color-gold)] decoration-2 underline-offset-4"
                  onClick={onSignIn}
                  type="button"
                >
                  Sign in
                  <Icon name="arrow" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
