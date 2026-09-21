import { useState, type ReactNode } from 'react'
import { ArchivedChatsPanel } from './ArchivedChatsPanel'

type IconName =
  | 'archive'
  | 'chevron'
  | 'leaf'
  | 'menu'
  | 'message'
  | 'plus'
  | 'settings'
  | 'sparkle'
  | 'user'
  | 'x'

interface AppShellProps {
  children: ReactNode
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    archive: (
      <>
        <path d="M3 7.5h18" />
        <path d="M5 7.5v11.25A2.25 2.25 0 0 0 7.25 21h9.5A2.25 2.25 0 0 0 19 18.75V7.5" />
        <path d="M4.5 3h15v4.5h-15z" />
        <path d="M9 12h6" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    leaf: (
      <>
        <path d="M20.5 3.5C11 3 4 7.5 4 15.75 4 18.6 6.3 21 9.25 21c8.25 0 11.25-9.5 11.25-17.5Z" />
        <path d="M3.5 21c3-5.25 7.25-8.5 13-10" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    message: (
      <>
        <path d="M20.5 11.5a8.5 8.5 0 0 1-9.25 8.47L5 21l1.25-5.1A8.5 8.5 0 1 1 20.5 11.5Z" />
        <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.68 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03h-.08v-3h.08A1.7 1.7 0 0 0 7.02 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.08h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" />
        <path d="m19 16 .75 2.25L22 19l-2.25.75L19 22l-.75-2.25L16 19l2.25-.75L19 16Z" />
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

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)

  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="min-h-svh bg-[var(--color-canvas)] p-0 text-[var(--color-ink)] lg:p-4">
      <div className="relative mx-auto flex min-h-svh max-w-[1600px] overflow-hidden bg-[var(--color-surface)] lg:min-h-[calc(100svh-2rem)] lg:rounded-[var(--radius-xl)] lg:shadow-[var(--shadow-card)]">
        <aside
          aria-label="Primary navigation"
          className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-transform duration-300 lg:relative lg:w-64 lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0 shadow-[var(--shadow-float)]' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-2">
            <a className="flex items-center gap-3 text-[var(--color-forest)]" href="/">
              <span className="grid size-10 place-items-center rounded-2xl bg-[var(--color-forest)] text-[var(--color-sprout)]">
                <Icon name="leaf" />
              </span>
              <span>
                <span className="block font-[family-name:var(--font-display)] text-xl font-bold leading-5">
                  Garden Mind
                </span>
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-moss)]">
                  AI horticulturist
                </span>
              </span>
            </a>
            <button
              aria-label="Close navigation"
              className="rounded-lg p-2 text-[var(--color-ink-muted)] lg:hidden"
              onClick={closeSidebar}
              type="button"
            >
              <Icon name="x" />
            </button>
          </div>

          <button
            className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-forest)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f3e30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)]"
            type="button"
          >
            <Icon name="plus" />
            New conversation
          </button>

          <nav className="mt-8 space-y-1">
            <a
              className="flex items-center gap-3 rounded-xl bg-[var(--color-sprout)] px-3 py-3 text-sm font-semibold text-[var(--color-forest)]"
              href="#chat"
              onClick={closeSidebar}
            >
              <Icon name="message" />
              Garden chat
            </a>
            <button
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
              onClick={() => {
                closeSidebar()
                setIsArchiveOpen(true)
              }}
              type="button"
            >
              <Icon name="archive" />
              Archived chats
            </button>
          </nav>

          <div className="mt-auto border-t border-[var(--color-border)] pt-4">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
              type="button"
            >
              <Icon name="settings" />
              Preferences
            </button>
            <button
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--color-surface-muted)]"
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-gold)] font-[family-name:var(--font-display)] font-bold text-[var(--color-forest)]">
                JM
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                  Your garden
                </span>
                <span className="block truncate text-xs text-[var(--color-ink-muted)]">
                  Sign in to save chats
                </span>
              </span>
              <Icon name="chevron" />
            </button>
          </div>
        </aside>

        {isSidebarOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-20 bg-[rgb(33_52_43/35%)] lg:hidden"
            onClick={closeSidebar}
            type="button"
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[73px] items-center justify-between border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8">
            <button
              aria-label="Open navigation"
              className="rounded-lg p-2 text-[var(--color-forest)] lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
            >
              <Icon name="menu" />
            </button>
            <div className="hidden items-center gap-2 text-sm text-[var(--color-ink-muted)] sm:flex">
              <Icon name="sparkle" />
              <span>Grounded guidance for your outdoor space</span>
            </div>
            <button
              className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-forest)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]"
              type="button"
            >
              <Icon name="user" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          </header>
          {children}
        </main>
        <ArchivedChatsPanel
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
        />
      </div>
    </div>
  )
}
