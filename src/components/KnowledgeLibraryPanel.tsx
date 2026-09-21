import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'

interface KnowledgeLibraryPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface UploadedDocument {
  id: number
  name: string
  size: string
}

type IconName = 'check' | 'document' | 'leaf' | 'upload' | 'x'

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    check: <path d="m5 12 4.5 4.5L19 7" />,
    document: (
      <>
        <path d="M6.5 3h7l4 4v14h-11z" />
        <path d="M13.5 3v4h4M9 12h6M9 16h4" />
      </>
    ),
    leaf: (
      <>
        <path d="M20.5 3.5C11 3 4 7.5 4 15.75 4 18.6 6.3 21 9.25 21c8.25 0 11.25-9.5 11.25-17.5Z" />
        <path d="M3.5 21c3-5.25 7.25-8.5 13-10" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function KnowledgeLibraryPanel({
  isOpen,
  onClose,
}: KnowledgeLibraryPanelProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) {
    return null
  }

  const addDocuments = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])

    setDocuments((currentDocuments) => [
      ...currentDocuments,
      ...selectedFiles.map((file) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: formatFileSize(file.size),
      })),
    ])
    event.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close knowledge library"
        className="absolute inset-0 bg-[rgb(33_52_43/35%)]"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Knowledge library"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[var(--color-surface)] shadow-[-18px_0_48px_rgb(35_57_44/16%)]"
      >
        <header className="flex h-[73px] items-center justify-between border-b border-[var(--color-border)] px-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-moss)]">
              Garden knowledge
            </p>
            <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-forest)]">
              Your library
            </h2>
          </div>
          <button
            aria-label="Close knowledge library"
            className="rounded-lg p-2 text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-forest)]"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-[var(--color-sage)] bg-[var(--color-surface-muted)] p-5 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[var(--color-sprout)] text-[var(--color-forest)]">
              <Icon name="upload" />
            </span>
            <h3 className="mt-3 text-sm font-bold text-[var(--color-forest)]">
              Add gardening references
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--color-ink-muted)]">
              Upload PDFs, documents, and text files that Garden Mind can use
              as supporting context.
            </p>
            <input
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              multiple
              onChange={addDocuments}
              ref={inputRef}
              type="file"
            />
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-forest)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f3e30]"
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <Icon name="upload" />
              Choose files
            </button>
            <p className="mt-3 text-[0.68rem] text-[var(--color-ink-faint)]">
              PDF, DOCX, TXT, or MD
            </p>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-forest)]">
                Uploaded references
              </h3>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--color-ink-muted)]">
                {documents.length} {documents.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white px-4 py-5 text-center">
                <span className="mx-auto grid size-9 place-items-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-moss)]">
                  <Icon name="leaf" />
                </span>
                <p className="mt-3 text-sm font-semibold text-[var(--color-forest)]">
                  Your library is ready
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">
                  Add local guides, research, or plant-care notes to ground
                  future conversations.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {documents.map((document) => (
                  <li
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3"
                    key={document.id}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-sprout)] text-[var(--color-moss)]">
                      <Icon name="document" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--color-forest)]">
                        {document.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                        {document.size} · queued for processing
                      </span>
                    </span>
                    <span
                      aria-label="Queued for backend processing"
                      className="grid size-6 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-forest)]"
                    >
                      <Icon name="check" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4 sm:px-6">
          <p className="text-xs leading-5 text-[var(--color-ink-muted)]">
            <strong className="font-semibold text-[var(--color-forest)]">
              Setup note:
            </strong>{' '}
            uploaded files are local UI state until the FastAPI document pipeline
            is connected.
          </p>
        </div>
      </aside>
    </div>
  )
}
