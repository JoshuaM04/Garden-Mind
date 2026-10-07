import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

const triggerClass =
  'flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] glass px-3 text-left text-sm text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-moss)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)]'

const popoverClass =
  'absolute left-0 z-20 animate-garden-fade-in rounded-[var(--radius-md)] border border-[var(--glass-edge)] bg-[var(--color-surface)] shadow-[var(--shadow-float)] motion-reduce:animate-none'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-4 shrink-0 text-[var(--color-ink-muted)] transition-transform ${
        open ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Keep Escape from also closing the surrounding modal.
        event.stopPropagation()
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  return { open, setOpen, ref }
}

interface GlassSelectProps<T extends string> {
  label: string
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  value: T
}

export function GlassSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: GlassSelectProps<T>) {
  const { open, setOpen, ref } = usePopover()
  const selected = options.find((option) => option.value === value)

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = options.findIndex((option) => option.value === value)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1
      const option = options[Math.min(options.length - 1, Math.max(0, next))]
      onChange(option.value)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className={triggerClass}
        onClick={() => setOpen(!open)}
        onKeyDown={onKeyDown}
        type="button"
      >
        <span className="truncate">{selected?.label}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul
          aria-label={label}
          className={`${popoverClass} top-full mt-2 w-full min-w-44 p-1.5`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li
                aria-selected={isSelected}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm transition ${
                  isSelected
                    ? 'bg-[var(--color-sprout)] font-semibold text-[var(--color-forest)]'
                    : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]'
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                role="option"
              >
                {option.label}
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    className="size-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

function parseIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

interface GlassDatePickerProps {
  label: string
  max?: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

export function GlassDatePicker({
  label,
  max,
  onChange,
  placeholder = 'Select a date',
  value,
}: GlassDatePickerProps) {
  const { open, setOpen, ref } = usePopover()
  const today = new Date()
  const [view, setView] = useState(() => {
    const base = value ? parseIso(value) : today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const shiftMonth = (delta: number) =>
    setView(new Date(view.getFullYear(), view.getMonth() + delta, 1))

  const navButton =
    'grid size-7 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)] focus-visible:outline-2 focus-visible:outline-[var(--color-forest)]'

  const arrow = (path: ReactNode) => (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {path}
    </svg>
  )

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className={triggerClass}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span
          className={`truncate ${value ? '' : 'text-[var(--color-ink-faint)]'}`}
        >
          {value
            ? parseIso(value).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : placeholder}
        </span>
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 text-[var(--color-ink-muted)]"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M4 6.5h16v14H4zM4 10.5h16M8 3.5v4M16 3.5v4" />
        </svg>
      </button>
      {open && (
        <div
          aria-label={label}
          ref={(node) => node?.scrollIntoView({ block: 'nearest' })}
          className={`${popoverClass} top-full mt-2 w-60 max-w-[calc(100vw-3rem)] p-2`}
          role="dialog"
        >
          <div className="mb-1 flex items-center justify-between">
            <button
              aria-label="Previous month"
              className={navButton}
              onClick={() => shiftMonth(-1)}
              type="button"
            >
              {arrow(<path d="m15 6-6 6 6 6" />)}
            </button>
            <span className="text-sm font-semibold text-[var(--color-forest)]">
              {view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              aria-label="Next month"
              className={navButton}
              onClick={() => shiftMonth(1)}
              type="button"
            >
              {arrow(<path d="m9 6 6 6-6 6" />)}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((day) => (
              <span
                className="py-0.5 text-[0.65rem] font-semibold uppercase text-[var(--color-ink-faint)]"
                key={day}
              >
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (day === null) {
                return <span key={`blank-${index}`} />
              }
              const iso = toIso(new Date(view.getFullYear(), view.getMonth(), day))
              const isSelected = iso === value
              const isToday = iso === toIso(today)
              const disabled = Boolean(max) && iso > (max as string)
              return (
                <button
                  aria-label={parseIso(iso).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  aria-pressed={isSelected}
                  className={`grid size-8 place-items-center rounded-[var(--radius-md)] text-xs transition focus-visible:outline-2 focus-visible:outline-[var(--color-forest)] disabled:cursor-not-allowed disabled:opacity-35 ${
                    isSelected
                      ? 'bg-[var(--color-forest)] font-semibold text-[var(--color-on-forest)]'
                      : isToday
                        ? 'border border-[var(--color-moss)] text-[var(--color-forest)] hover:bg-[var(--color-surface-muted)]'
                        : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]'
                  }`}
                  disabled={disabled}
                  key={iso}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  type="button"
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-1 text-xs font-semibold">
            <button
              className="rounded-[var(--radius-md)] px-2 py-1 text-[var(--color-ink-muted)] hover:text-[var(--color-forest)]"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              type="button"
            >
              Clear
            </button>
            <button
              className="rounded-[var(--radius-md)] px-2 py-1 text-[var(--color-forest)] underline decoration-[var(--color-gold)] decoration-2 underline-offset-4"
              onClick={() => {
                const now = new Date()
                if (!max || toIso(now) <= max) {
                  onChange(toIso(now))
                  setView(new Date(now.getFullYear(), now.getMonth(), 1))
                  setOpen(false)
                }
              }}
              type="button"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
