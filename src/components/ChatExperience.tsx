import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'

type IconName =
  | 'arrow'
  | 'attachment'
  | 'document'
  | 'sparkle'
  | 'sun'
  | 'x'

interface ChatMessage {
  id: number
  content: string
  role: 'assistant' | 'user'
  sources?: string[]
}

interface DocumentUploadResponse {
  context: string
  filename: string
  status: 'processed'
  truncated: boolean
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:8000' : '')
const chatEndpoint = `${apiBaseUrl}/api/chat`
const documentsEndpoint = `${apiBaseUrl}/api/documents`

function isChatResponse(
  data: unknown,
): data is { 'assistant message': string; sources?: string[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'assistant message' in data &&
    typeof data['assistant message'] === 'string' &&
    (!('sources' in data) ||
      (Array.isArray(data.sources) &&
        data.sources.every((source) => typeof source === 'string')))
  )
}

function isDocumentUploadResponse(data: unknown): data is DocumentUploadResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    data.status === 'processed' &&
    'filename' in data &&
    typeof data.filename === 'string' &&
    'context' in data &&
    typeof data.context === 'string' &&
    'truncated' in data &&
    typeof data.truncated === 'boolean'
  )
}

async function getApiError(response: Response, fallbackMessage: string) {
  try {
    const data: unknown = await response.json()

    if (
      typeof data === 'object' &&
      data !== null &&
      'detail' in data &&
      typeof data.detail === 'string'
    ) {
      return data.detail
    }
  } catch {
    return fallbackMessage
  }

  return fallbackMessage
}

function formatInlineMessage(content: string): ReactNode {
  return content.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>
    }

    return segment
  })
}

function formatAssistantMessage(content: string): ReactNode {
  const blocks: ReactNode[] = []
  const paragraphLines: string[] = []
  const listItems: string[] = []
  let listType: 'ordered' | 'unordered' | null = null
  let listStart = 1

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    blocks.push(
      <p className="whitespace-pre-wrap" key={`paragraph-${blocks.length}`}>
        {formatInlineMessage(paragraphLines.join('\n'))}
      </p>,
    )
    paragraphLines.length = 0
  }

  const flushList = () => {
    if (listType === null) {
      return
    }

    const items = listItems.map((item, index) => (
      <li key={`${index}-${item}`}>{formatInlineMessage(item)}</li>
    ))

    blocks.push(
      listType === 'unordered' ? (
        <ul className="list-disc space-y-1 pl-5" key={`list-${blocks.length}`}>
          {items}
        </ul>
      ) : (
        <ol
          className="list-decimal space-y-1 pl-5"
          key={`list-${blocks.length}`}
          start={listStart}
        >
          {items}
        </ol>
      ),
    )
    listItems.length = 0
    listType = null
    listStart = 1
  }

  for (const line of content.split('\n')) {
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/)
    const orderedMatch = line.match(/^\s*(\d+)[.)]\s+(.+)$/)

    if (unorderedMatch || orderedMatch) {
      flushParagraph()

      const nextListType = unorderedMatch ? 'unordered' : 'ordered'
      if (listType !== null && listType !== nextListType) {
        flushList()
      }

      if (listType === null) {
        listType = nextListType
        listStart = orderedMatch ? Number.parseInt(orderedMatch[1], 10) : 1
      }

      listItems.push(unorderedMatch ? unorderedMatch[1] : orderedMatch![2])
      continue
    }

    flushList()

    if (line.trim()) {
      paragraphLines.push(line)
    } else {
      flushParagraph()
    }
  }

  flushParagraph()
  flushList()

  return blocks
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
  const [attachment, setAttachment] = useState<File | null>(null)
  const [documentContext, setDocumentContext] = useState<string | null>(null)
  const [documentWasTruncated, setDocumentWasTruncated] = useState(false)
  const [conversation, setConversation] = useState<ChatMessage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const attachmentInput = useRef<HTMLInputElement>(null)
  const conversationMessages = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const messagePane = conversationMessages.current

    if (messagePane) {
      messagePane.scrollTo({ top: messagePane.scrollHeight, behavior: 'smooth' })
    }
  }, [conversation, isSending])

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setAttachment(file)
    setDocumentContext(null)
    setDocumentWasTruncated(false)
    setErrorMessage(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(documentsEndpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            'Garden Mind could not process that document. Please try another file.',
          ),
        )
      }

      const data: unknown = await response.json()

      if (!isDocumentUploadResponse(data)) {
        throw new Error('Garden Mind returned an unexpected document response.')
      }

      setDocumentContext(data.context)
      setDocumentWasTruncated(data.truncated)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Garden Mind could not process that document. Please try another file.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  function removeAttachment() {
    if (isUploading) {
      return
    }

    setAttachment(null)
    setDocumentContext(null)
    setDocumentWasTruncated(false)
    setErrorMessage(null)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = message.trim()

    if (
      !content ||
      isSending ||
      isUploading ||
      (attachment !== null && !documentContext)
    ) {
      return
    }

    setConversation((currentConversation) => [
      ...currentConversation,
      { id: Date.now(), content, role: 'user' },
    ])
    setMessage('')
    setErrorMessage(null)
    setIsSending(true)

    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: conversation,
          document_context: documentContext,
          document_filename: attachment?.name,
        }),
      })

      if (!response.ok) {
        throw new Error('Garden Mind could not answer right now. Please try again.')
      }

      const data: unknown = await response.json()

      if (!isChatResponse(data)) {
        throw new Error('Garden Mind returned an unexpected response. Please try again.')
      }

      setConversation((currentConversation) => [
        ...currentConversation,
        {
          id: Date.now(),
          content: data['assistant message'],
          role: 'assistant',
          sources: data.sources,
        },
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Garden Mind could not answer right now. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section
      aria-label="Garden Mind conversation"
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      id="chat"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
        <div
          aria-label="Conversation messages"
          className="min-h-0 flex-1 overflow-y-auto pr-2"
          ref={conversationMessages}
        >
          {conversation.length === 0 ? (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center pt-3 text-center sm:pt-14">
              <div className="relative mb-7 grid size-20 place-items-center rounded-full border border-[var(--color-sage)] bg-[var(--color-sprout)] text-[var(--color-forest)]">
                <span className="grid size-12 place-items-center rounded-full bg-[var(--color-forest)] text-[var(--color-sprout)]">
                  <Icon name="sparkle" />
                </span>
                <span
                  aria-hidden="true"
                  className="absolute -right-1 top-1 size-4 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-moss)] animate-garden-pulse motion-reduce:animate-none"
                />
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

              <div className="mt-9 hidden w-full gap-3 text-left sm:grid sm:grid-cols-3">
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
            <div aria-busy={isSending} className="mx-auto max-w-3xl space-y-6 pb-6">
              {conversation.map((chatMessage) => (
                <div
                  className={`flex gap-0 sm:gap-3 ${
                    chatMessage.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  key={chatMessage.id}
                >
                  {chatMessage.role === 'assistant' && (
                    <span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-forest)] text-[var(--color-sprout)] sm:grid">
                      <Icon name="sparkle" />
                    </span>
                  )}
                  {chatMessage.role === 'assistant' ? (
                    <div className="w-full max-w-full space-y-3 rounded-2xl rounded-bl-sm border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-ink)] sm:w-auto sm:max-w-[85%]">
                      {formatAssistantMessage(chatMessage.content)}
                      {chatMessage.sources && chatMessage.sources.length > 0 && (
                        <p className="border-t border-[var(--color-border)] pt-2 text-xs leading-5 text-[var(--color-ink-muted)]">
                          Sources: {chatMessage.sources.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[var(--color-forest)] px-4 py-3 text-sm leading-6 text-white">
                      {chatMessage.content}
                    </p>
                  )}
                </div>
              ))}
              {isSending && (
                <div aria-label="Garden Mind is typing" className="flex gap-0 sm:gap-3" role="status">
                    <span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-forest)] text-[var(--color-sprout)] sm:grid">
                      <Icon name="sparkle" />
                    </span>
                    <div
                      aria-hidden="true"
                      className="flex h-12 items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--color-border)] bg-white px-4"
                    >
                      {[0, 1, 2].map((dot) => (
                        <span
                          className="size-1.5 rounded-full bg-[var(--color-moss)] animate-garden-typing-dot motion-reduce:animate-none"
                          key={dot}
                          style={{ animationDelay: `${dot * 160}ms` }}
                        />
                      ))}
                    </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 shrink-0 bg-[linear-gradient(to_bottom,transparent,rgba(251,252,247,0.96)_20%)] pb-2 pt-8">
          <form
            className="rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-white p-2 shadow-[var(--shadow-float)]"
            onSubmit={sendMessage}
          >
            {attachment && (
              <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
                <Icon name="document" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{attachment.name}</span>
                  <span className="block text-xs">
                    {isUploading
                      ? 'Preparing document...'
                      : documentContext
                        ? documentWasTruncated
                          ? 'The first part is ready for this chat only.'
                          : 'Ready for this chat only.'
                        : 'Document upload failed.'}
                  </span>
                </span>
                <button
                  aria-label={`Remove ${attachment.name}`}
                  className="rounded-md p-1 text-[var(--color-ink-muted)] hover:bg-white hover:text-[var(--color-forest)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isUploading}
                  onClick={removeAttachment}
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
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder="Ask anything about your garden..."
                rows={1}
                value={message}
              />
            </label>
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <div className="flex items-center gap-1">
                <input
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                  disabled={isUploading || attachment !== null}
                  onChange={(event) => void uploadAttachment(event)}
                  ref={attachmentInput}
                  type="file"
                />
                <button
                  aria-label="Attach a document"
                  className="rounded-xl p-2.5 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isUploading || attachment !== null}
                  onClick={() => attachmentInput.current?.click()}
                  type="button"
                >
                  <Icon name="attachment" />
                </button>
              </div>
              <button
                aria-label="Send message"
                className="grid size-10 place-items-center rounded-xl bg-[var(--color-forest)] text-white transition hover:bg-[#1f3e30] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  isSending ||
                  isUploading ||
                  !message.trim() ||
                  (attachment !== null && !documentContext)
                }
                type="submit"
              >
                <Icon name="arrow" />
              </button>
            </div>
          </form>
          {errorMessage && (
            <p className="mt-3 text-center text-xs text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <p className="mt-3 text-center text-xs text-[var(--color-ink-faint)]">
            Garden Mind can make mistakes. Verify plant safety and local growing
            guidance.
          </p>
        </div>
      </div>
    </section>
  )
}
