import { useRef, useState, type FormEvent, type ReactNode } from 'react'

type IconName =
  | 'arrow'
  | 'attachment'
  | 'document'
  | 'mic'
  | 'pause'
  | 'sparkle'
  | 'sun'
  | 'x'

interface Message {
  id: number
  content: string
  sender: 'assistant' | 'user'
}

const suggestions = [
  {
    icon: 'sun' as const,
    label: 'Plan a sunny border',
    prompt: 'Help me plan a sunny border with low-maintenance plants.',
  },
  {
    icon: 'sparkle' as const,
    label: 'Find native plants',
    prompt: 'What native plants would suit a pollinator-friendly garden?',
  },
  {
    icon: 'document' as const,
    label: 'Ask about a document',
    prompt: 'How can I use the research I uploaded in my garden plan?',
  },
]

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    attachment: (
      <path d="m20.2 11.1-7.65 7.65a5.1 5.1 0 0 1-7.21-7.21l8.07-8.07a3.4 3.4 0 1 1 4.81 4.81l-8.07 8.07a1.7 1.7 0 0 1-2.4-2.4l7.25-7.25" />
    ),
    document: (
      <>
        <path d="M6.5 3h7l4 4v14h-11z" />
        <path d="M13.5 3v4h4M9 12h6M9 16h4" />
      </>
    ),
    mic: (
      <>
        <rect height="11" rx="3" width="6" x="9" y="3" />
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" />
      </>
    ),
    pause: <path d="M9 5v14M15 5v14" />,
    sparkle: (
      <>
        <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" />
        <path d="m19 16 .75 2.25L22 19l-2.25.75L19 22l-.75-2.25L16 19l2.25-.75L19 16Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
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

export function ChatExperience() {
  const [message, setMessage] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const attachmentInput = useRef<HTMLInputElement>(null)

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = message.trim()
    if (!content) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), content, sender: 'user' },
      {
        id: Date.now() + 1,
        content:
          'Your Garden Mind conversation is ready. Connect the FastAPI chat endpoint to begin receiving grounded gardening guidance here.',
        sender: 'assistant',
      },
    ])
    setMessage('')
  }

  return (
    <section
      aria-label="Garden Mind conversation"
      className="flex min-h-0 flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      id="chat"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        <div className="flex-1">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-5 text-center sm:pt-14">
              <div className="relative mb-7 grid size-20 place-items-center rounded-full border border-[var(--color-sage)] bg-[var(--color-sprout)] text-[var(--color-forest)]">
                <span className="grid size-12 place-items-center rounded-full bg-[var(--color-forest)] text-[var(--color-sprout)]">
                  <Icon name="sparkle" />
                </span>
                <span className="absolute -right-1 top-1 size-4 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-gold)]" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
                Garden Mind
              </p>
              <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-4xl leading-[1.02] text-[var(--color-forest)] sm:text-5xl">
                What would you like to grow?
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--color-ink-muted)]">
                Your thoughtful gardening companion for planting plans, local
                research, and the questions that come up outside.
              </p>

              <div className="mt-9 grid w-full gap-3 text-left sm:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <button
                    className="group rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-sage)] hover:shadow-[var(--shadow-float)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-forest)]"
                    key={suggestion.label}
                    onClick={() => setMessage(suggestion.prompt)}
                    type="button"
                  >
                    <span className="mb-6 grid size-9 place-items-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-moss)] transition group-hover:bg-[var(--color-sprout)] group-hover:text-[var(--color-forest)]">
                      <Icon name={suggestion.icon} />
                    </span>
                    <span className="block text-sm font-semibold text-[var(--color-forest)]">
                      {suggestion.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--color-ink-muted)]">
                      Start with a focused question
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 pb-6">
              {messages.map((chatMessage) => (
                <div
                  className={`flex gap-3 ${
                    chatMessage.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  key={chatMessage.id}
                >
                  {chatMessage.sender === 'assistant' && (
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-forest)] text-[var(--color-sprout)]">
                      <Icon name="sparkle" />
                    </span>
                  )}
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      chatMessage.sender === 'user'
                        ? 'rounded-br-sm bg-[var(--color-forest)] text-white'
                        : 'rounded-bl-sm border border-[var(--color-border)] bg-white text-[var(--color-ink)]'
                    }`}
                  >
                    {chatMessage.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 mt-8 bg-[linear-gradient(to_bottom,transparent,rgba(251,252,247,0.96)_20%)] pb-2 pt-8">
          <form
            className="rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-white p-2 shadow-[var(--shadow-float)]"
            onSubmit={sendMessage}
          >
            {attachment && (
              <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
                <Icon name="document" />
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <button
                  aria-label={`Remove ${attachment.name}`}
                  className="rounded-md p-1 text-[var(--color-ink-muted)] hover:bg-white hover:text-[var(--color-forest)]"
                  onClick={() => setAttachment(null)}
                  type="button"
                >
                  <Icon name="x" />
                </button>
              </div>
            )}
            <label className="block px-3 pt-2" htmlFor="garden-question">
              <span className="sr-only">Your gardening question</span>
              <textarea
                className="block max-h-36 min-h-14 w-full resize-none border-0 bg-transparent py-2 text-[15px] leading-6 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
                id="garden-question"
                onChange={(event) => setMessage(event.target.value)}
                placeholder={
                  isVoiceMode
                    ? 'Voice mode is on. Tap the microphone to begin.'
                    : 'Ask anything about your garden...'
                }
                rows={1}
                value={message}
              />
            </label>
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <div className="flex items-center gap-1">
                <input
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                  ref={attachmentInput}
                  type="file"
                />
                <button
                  aria-label="Attach a document"
                  className="rounded-xl p-2.5 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
                  onClick={() => attachmentInput.current?.click()}
                  type="button"
                >
                  <Icon name="attachment" />
                </button>
                <button
                  aria-pressed={isVoiceMode}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isVoiceMode
                      ? 'bg-[var(--color-sprout)] text-[var(--color-forest)]'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]'
                  }`}
                  onClick={() => setIsVoiceMode((isActive) => !isActive)}
                  type="button"
                >
                  <Icon name={isVoiceMode ? 'pause' : 'mic'} />
                  <span className="hidden sm:inline">
                    {isVoiceMode ? 'Voice on' : 'Voice'}
                  </span>
                </button>
              </div>
              <button
                aria-label="Send message"
                className="grid size-10 place-items-center rounded-xl bg-[var(--color-forest)] text-white transition hover:bg-[#1f3e30] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!message.trim()}
                type="submit"
              >
                <Icon name="arrow" />
              </button>
            </div>
          </form>
          <p className="mt-3 text-center text-xs text-[var(--color-ink-faint)]">
            Garden Mind can make mistakes. Verify plant safety and local growing
            guidance.
          </p>
        </div>
      </div>
    </section>
  )
}
