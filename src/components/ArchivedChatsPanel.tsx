import type { ReactNode } from 'react'

interface ArchivedChatsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type IconName = 'arrow' | 'clock' | 'message' | 'search' | 'user' | 'x'

const archivedChats = [
  {
    date: 'Today',
    preview: 'A low-water front garden for afternoon sun',
    title: 'Drought-tolerant border',
  },
  {
    date: 'Yesterday',
    preview: 'Comparing your local native-plant research',
    title: 'Pollinator garden notes',
  },
  {
    date: 'Sep 17',
    preview: 'Ideas for a shaded path and woodland edge',
    title: 'Backyard shade plan',
  },
]

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
  onClose,
}: ArchivedChatsPanelProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close archived chats"
        className="absolute inset-0 bg-[rgb(33_52_43/35%)]"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Archived chats"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[var(--color-surface)] shadow-[-18px_0_48px_rgb(35_57_44/16%)]"
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
            className="rounded-lg p-2 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" />
          </button>
        </header>

        <div className="border-b border-[var(--color-border)] p-5 sm:p-6">
          <label
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 text-[var(--color-ink-muted)] focus-within:border-[var(--color-moss)]"
            htmlFor="search-chats"
          >
            <Icon name="search" />
            <input
              className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
              id="search-chats"
              placeholder="Search your chats"
              type="search"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            <Icon name="clock" />
            Recent
          </div>
          <div className="space-y-1">
            {archivedChats.map((chat) => (
              <button
                className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)]"
                key={chat.title}
                type="button"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-sprout)] text-[var(--color-moss)]">
                  <Icon name="message" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--color-forest)]">
                    {chat.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--color-ink-muted)]">
                    {chat.preview}
                  </span>
                </span>
                <span className="pt-1 text-[0.68rem] font-medium text-[var(--color-ink-faint)]">
                  {chat.date}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="m-4 rounded-2xl bg-[var(--color-sprout)] p-4 sm:m-5">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-forest)] text-[var(--color-sprout)]">
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
                type="button"
              >
                Sign in when ready
                <Icon name="arrow" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
