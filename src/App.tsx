import { AppShell } from './components/AppShell'

function App() {
  return (
    <AppShell>
      <section className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-moss)]">
            Your garden companion
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] text-[var(--color-forest)] sm:text-6xl">
            Let&apos;s grow something good.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-7 text-[var(--color-ink-muted)]">
            Ask about planting plans, upload your local gardening notes, or
            start a voice conversation while you&apos;re outside.
          </p>
        </div>
      </section>
    </AppShell>
  )
}

export default App
