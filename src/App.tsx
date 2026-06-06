import { useEffect, useState } from 'react'
import {
  copy,
  supportedLanguages,
  type DocPanel,
  type Language,
  type SiteCopy,
} from './content'

const languageStorageKey = 'vdoc-site-language'

function isLanguage(value: string | null): value is Language {
  return supportedLanguages.includes(value as Language)
}

function getInitialLanguage(): Language {
  const storedLanguage = window.localStorage.getItem(languageStorageKey)

  if (isLanguage(storedLanguage)) {
    return storedLanguage
  }

  const browserLanguage = window.navigator.language.toLowerCase()
  return browserLanguage.startsWith('zh') ? 'zh-CN' : 'en'
}

function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const siteCopy = copy[language]

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language)
    document.documentElement.lang = siteCopy.htmlLang
    document.title = siteCopy.meta.title

    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    if (description) {
      description.content = siteCopy.meta.description
    }
  }, [language, siteCopy])

  return (
    <div className="bg-canvas text-paper selection:bg-ember selection:text-canvas min-h-screen overflow-hidden">
      <a className="skip-link" href="#main-content">
        {siteCopy.accessibility.skipToMain}
      </a>
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader
        language={language}
        onLanguageChange={setLanguage}
        siteCopy={siteCopy}
      />
      <main id="main-content">
        <Hero siteCopy={siteCopy} />
        <Concepts siteCopy={siteCopy} />
        <Workflows siteCopy={siteCopy} />
        <Docs siteCopy={siteCopy} />
        <ApiOverview siteCopy={siteCopy} />
        <AgentPortal siteCopy={siteCopy} />
      </main>
      <SiteFooter siteCopy={siteCopy} />
    </div>
  )
}

function SiteHeader({
  language,
  onLanguageChange,
  siteCopy,
}: {
  language: Language
  onLanguageChange: (language: Language) => void
  siteCopy: SiteCopy
}) {
  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-40 border-b backdrop-blur-xl">
      <nav
        aria-label={siteCopy.accessibility.primaryNav}
        className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between lg:px-8"
      >
        <a className="flex w-fit items-center gap-3" href="#portal">
          <span className="border-line bg-panel text-ember shadow-glow grid size-11 place-items-center rounded-2xl border text-lg font-black">
            V
          </span>
          <span>
            <span className="font-display text-paper block text-xl font-black tracking-tight">
              Vdoc
            </span>
            <span className="text-muted block text-xs font-semibold tracking-widest uppercase">
              {siteCopy.header.tagline}
            </span>
          </span>
        </a>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="text-muted flex flex-wrap items-center gap-2 text-sm">
            {siteCopy.navItems.map((item) => (
              <a className="nav-link" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <LanguageSwitcher
            language={language}
            onLanguageChange={onLanguageChange}
            siteCopy={siteCopy}
          />
        </div>
      </nav>
    </header>
  )
}

function LanguageSwitcher({
  language,
  onLanguageChange,
  siteCopy,
}: {
  language: Language
  onLanguageChange: (language: Language) => void
  siteCopy: SiteCopy
}) {
  return (
    <div
      aria-label={siteCopy.accessibility.languageSwitcher}
      className="language-switcher"
      role="group"
    >
      {supportedLanguages.map((availableLanguage) => {
        const optionCopy = copy[availableLanguage]
        const selected = availableLanguage === language

        return (
          <button
            aria-label={`${siteCopy.accessibility.languageOption} ${optionCopy.languageName}`}
            aria-pressed={selected}
            className="language-button"
            data-active={selected ? 'true' : 'false'}
            key={availableLanguage}
            onClick={() => onLanguageChange(availableLanguage)}
            type="button"
          >
            <span>{optionCopy.shortLanguageName}</span>
            <strong>{optionCopy.languageName}</strong>
          </button>
        )
      })}
    </div>
  )
}

function Hero({ siteCopy }: { siteCopy: SiteCopy }) {
  const { hero } = siteCopy

  return (
    <section
      id="portal"
      className="relative mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-20 md:pt-24 lg:grid-cols-2 lg:px-8"
    >
      <div className="relative z-10 flex flex-col justify-center">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1 className="font-display text-paper mt-6 max-w-4xl text-5xl leading-none font-black tracking-tight md:text-7xl">
          {hero.title}
        </h1>
        <p className="text-soft mt-7 max-w-2xl text-lg leading-8 md:text-xl">
          {hero.body}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a className="button-primary" href="#docs">
            {hero.ctas.docs}
          </a>
          <a className="button-secondary" href="/api/v1/open/docs/openapi.yaml">
            {hero.ctas.api}
          </a>
          <a className="button-tertiary" href="#mcp-tools">
            {hero.ctas.mcp}
          </a>
        </div>
        <dl className="mt-12 grid gap-4 sm:grid-cols-3">
          {hero.metrics.map((metric) => (
            <Metric
              label={metric.label}
              value={metric.value}
              key={metric.label}
            />
          ))}
        </dl>
      </div>
      <div
        className="relative min-h-[34rem] lg:min-h-[42rem]"
        aria-hidden="true"
      >
        <div className="orbit-map">
          <span className="orbit-node orbit-node-one">
            {hero.orbit.nodes[0]}
          </span>
          <span className="orbit-node orbit-node-two">
            {hero.orbit.nodes[1]}
          </span>
          <span className="orbit-node orbit-node-three">
            {hero.orbit.nodes[2]}
          </span>
          <span className="orbit-node orbit-node-four">
            {hero.orbit.nodes[3]}
          </span>
          <div className="diff-card diff-card-one">
            <span>{hero.orbit.semanticDiff}</span>
            <strong>{hero.orbit.fieldRemoved}</strong>
            <em>{hero.orbit.breaking}</em>
          </div>
          <div className="diff-card diff-card-two">
            <span>{hero.orbit.stableMarkdown}</span>
            <strong>AGENTS.md</strong>
            <em>{hero.orbit.reviewed}</em>
          </div>
          <div className="center-ledger">
            <span>{hero.orbit.documentVersion}</span>
            <strong>{hero.orbit.immutable}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function Concepts({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <section id="concepts" className="section-shell">
      <SectionHeader
        eyebrow={siteCopy.concepts.eyebrow}
        title={siteCopy.concepts.title}
        body={siteCopy.concepts.body}
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {siteCopy.concepts.cards.map((card) => (
          <article className="feature-card" key={card.title}>
            <p className="card-meta">{card.meta}</p>
            <h3 className="font-display text-paper mt-4 text-2xl font-black">
              {card.title}
            </h3>
            <p className="text-soft mt-4 leading-7">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Workflows({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <section id="workflows" className="section-shell">
      <SectionHeader
        eyebrow={siteCopy.workflows.eyebrow}
        title={siteCopy.workflows.title}
        body={siteCopy.workflows.body}
      />
      <ol className="timeline mt-12">
        {siteCopy.workflows.steps.map((step, index) => (
          <li className="timeline-item" key={step.label}>
            <span className="timeline-index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="font-display text-paper text-2xl font-black">
                {step.label}
              </h3>
              <p className="text-soft mt-3 leading-7">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Docs({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <section id="docs" className="section-shell">
      <SectionHeader
        eyebrow={siteCopy.docs.eyebrow}
        title={siteCopy.docs.title}
        body={siteCopy.docs.body}
      />
      <div className="mt-12 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="docs-nav" aria-label={siteCopy.accessibility.docsNav}>
          {siteCopy.docs.panels.map((panel) => (
            <a className="docs-nav-link" href={`#${panel.id}`} key={panel.id}>
              <span>{panel.eyebrow}</span>
              {panel.title}
            </a>
          ))}
        </aside>
        <div className="grid gap-5">
          {siteCopy.docs.panels.map((panel) => (
            <DocPanelCard panel={panel} key={panel.id} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ApiOverview({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <section id="api" className="section-shell">
      <SectionHeader
        eyebrow={siteCopy.api.eyebrow}
        title={siteCopy.api.title}
        body={siteCopy.api.body}
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {siteCopy.api.surfaces.map((surface) => (
          <article className="surface-card" key={surface.title}>
            <code>{surface.meta}</code>
            <h3 className="font-display text-paper mt-4 text-2xl font-black">
              {surface.title}
            </h3>
            <p className="text-soft mt-4 leading-7">{surface.body}</p>
          </article>
        ))}
      </div>
      <div className="border-line bg-panel shadow-panel mt-8 rounded-[var(--radius-panel)] border p-6">
        <h3 className="font-display text-paper text-2xl font-black">
          {siteCopy.api.routeCategoriesTitle}
        </h3>
        <p className="text-soft mt-3 leading-7">
          {siteCopy.api.routeCategoriesBody}
        </p>
      </div>
    </section>
  )
}

function AgentPortal({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <section id="agents" className="section-shell pb-24">
      <div className="agent-grid">
        <div>
          <p className="eyebrow">{siteCopy.agents.eyebrow}</p>
          <h2 className="font-display text-paper mt-5 text-4xl leading-tight font-black md:text-6xl">
            {siteCopy.agents.title}
          </h2>
          <p className="text-soft mt-6 text-lg leading-8">
            {siteCopy.agents.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a className="button-primary" href="#mcp-tools">
              {siteCopy.agents.ctas.mcp}
            </a>
            <a className="button-secondary" href="#skill-workflows">
              {siteCopy.agents.ctas.skill}
            </a>
          </div>
        </div>
        <div
          className="tool-cloud"
          aria-label={siteCopy.accessibility.toolCloud}
        >
          {siteCopy.agents.tools.map((tool) => (
            <code key={tool}>{tool}</code>
          ))}
        </div>
      </div>
    </section>
  )
}

function DocPanelCard({ panel }: { panel: DocPanel }) {
  return (
    <article className="doc-panel" id={panel.id}>
      <div>
        <p className="card-meta">{panel.eyebrow}</p>
        <h3 className="font-display text-paper mt-3 text-3xl font-black">
          {panel.title}
        </h3>
        <p className="text-soft mt-4 leading-7">{panel.summary}</p>
        <ul className="text-soft mt-5 grid gap-3">
          {panel.bullets.map((bullet) => (
            <li className="flex gap-3" key={bullet}>
              <span className="bg-ember mt-2 size-2 shrink-0 rounded-full" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
      {panel.code ? (
        <pre className="code-block" aria-label={`${panel.title} example`}>
          <code>{panel.code}</code>
        </pre>
      ) : null}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-panel/70 shadow-panel rounded-3xl border p-5">
      <dt className="text-muted text-xs font-bold tracking-widest uppercase">
        {label}
      </dt>
      <dd className="font-display text-paper mt-2 text-3xl font-black">
        {value}
      </dd>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div className="max-w-4xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display text-paper mt-5 text-4xl leading-tight font-black md:text-6xl">
        {title}
      </h2>
      <p className="text-soft mt-5 text-lg leading-8">{body}</p>
    </div>
  )
}

function SiteFooter({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <footer className="border-line bg-panel/50 border-t px-6 py-10 lg:px-8">
      <div className="text-muted mx-auto flex max-w-7xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
        <p>{siteCopy.footer.body}</p>
        <div className="flex flex-wrap gap-3">
          <a className="footer-link" href="#docs">
            {siteCopy.footer.docs}
          </a>
          <a className="footer-link" href="/api/v1/open/docs/openapi.yaml">
            {siteCopy.footer.openapi}
          </a>
          <a className="footer-link" href="#quick-start">
            {siteCopy.footer.quickStart}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default App
