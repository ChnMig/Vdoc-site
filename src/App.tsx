import { useEffect, useMemo, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import {
  copy,
  supportedLanguages,
  type DocPanel,
  type Feature,
  type Language,
  type SiteCopy,
} from './content'

const languageStorageKey = 'vdoc-site-language'
const githubUrl = 'https://github.com/ChnMig/Vdoc'

type Route =
  | { kind: 'home' }
  | { kind: 'concepts' }
  | { kind: 'workflows' }
  | { kind: 'docs'; docId?: string }
  | { kind: 'api' }
  | { kind: 'agents' }
  | { kind: 'not-found' }

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

function normalizePathname(pathname: string) {
  if (pathname === '/') {
    return pathname
  }

  return pathname.replace(/\/+$/, '') || '/'
}

function resolveRoute(pathname: string): Route {
  const normalizedPathname = normalizePathname(pathname)

  if (normalizedPathname === '/') {
    return { kind: 'home' }
  }

  if (normalizedPathname === '/concepts') {
    return { kind: 'concepts' }
  }

  if (normalizedPathname === '/workflows') {
    return { kind: 'workflows' }
  }

  if (normalizedPathname === '/docs') {
    return { kind: 'docs' }
  }

  if (normalizedPathname.startsWith('/docs/')) {
    return { kind: 'docs', docId: normalizedPathname.slice('/docs/'.length) }
  }

  if (normalizedPathname === '/api') {
    return { kind: 'api' }
  }

  if (normalizedPathname === '/agents') {
    return { kind: 'agents' }
  }

  return { kind: 'not-found' }
}

function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [pathname, setPathname] = useState(() =>
    normalizePathname(window.location.pathname),
  )
  const siteCopy = copy[language]
  const route = useMemo(() => resolveRoute(pathname), [pathname])

  useEffect(() => {
    const handlePopstate = () => {
      setPathname(normalizePathname(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [])

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

  function navigate(to: string) {
    const nextPathname = normalizePathname(to)

    if (nextPathname === pathname) {
      return
    }

    window.history.pushState({}, '', nextPathname)
    setPathname(nextPathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="bg-canvas text-ink selection:bg-stamp selection:text-paper min-h-screen overflow-hidden">
      <a className="skip-link" href="#main-content">
        {siteCopy.accessibility.skipToMain}
      </a>
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader
        language={language}
        onLanguageChange={setLanguage}
        onNavigate={navigate}
        pathname={pathname}
        siteCopy={siteCopy}
      />
      <main id="main-content">
        <RouteRenderer
          onNavigate={navigate}
          pathname={pathname}
          route={route}
          siteCopy={siteCopy}
        />
      </main>
      <SiteFooter onNavigate={navigate} siteCopy={siteCopy} />
    </div>
  )
}

function SiteHeader({
  language,
  onLanguageChange,
  onNavigate,
  pathname,
  siteCopy,
}: {
  language: Language
  onLanguageChange: (language: Language) => void
  onNavigate: (to: string) => void
  pathname: string
  siteCopy: SiteCopy
}) {
  return (
    <header className="border-line bg-paper/88 sticky top-0 z-40 border-b backdrop-blur-xl">
      <nav
        aria-label={siteCopy.accessibility.primaryNav}
        className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between lg:px-8"
      >
        <RouteLink className="brand-lockup" onNavigate={onNavigate} to="/">
          <span className="brand-mark">V</span>
          <span>
            <span className="font-display text-ink block text-xl font-black tracking-tight">
              Vdoc
            </span>
            <span className="text-muted block text-xs font-bold tracking-widest uppercase">
              {siteCopy.header.tagline}
            </span>
          </span>
        </RouteLink>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {siteCopy.navItems.map((item) => {
              const active = isActivePath(pathname, item.href)

              return (
                <RouteLink
                  aria-current={active ? 'page' : undefined}
                  className="nav-link"
                  data-active={active ? 'true' : 'false'}
                  key={item.href}
                  onNavigate={onNavigate}
                  to={item.href}
                >
                  {item.label}
                </RouteLink>
              )
            })}
            <a
              className="nav-link nav-link-github"
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              {siteCopy.github.label}
            </a>
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

function RouteRenderer({
  onNavigate,
  pathname,
  route,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  pathname: string
  route: Route
  siteCopy: SiteCopy
}) {
  if (route.kind === 'concepts') {
    return <Concepts siteCopy={siteCopy} />
  }

  if (route.kind === 'workflows') {
    return <Workflows siteCopy={siteCopy} />
  }

  if (route.kind === 'docs') {
    return route.docId ? (
      <DocArticle
        docId={route.docId}
        onNavigate={onNavigate}
        pathname={pathname}
        siteCopy={siteCopy}
      />
    ) : (
      <DocsLanding onNavigate={onNavigate} siteCopy={siteCopy} />
    )
  }

  if (route.kind === 'api') {
    return <ApiOverview siteCopy={siteCopy} />
  }

  if (route.kind === 'agents') {
    return <AgentPortal onNavigate={onNavigate} siteCopy={siteCopy} />
  }

  if (route.kind === 'not-found') {
    return <NotFound onNavigate={onNavigate} siteCopy={siteCopy} />
  }

  return <Home onNavigate={onNavigate} siteCopy={siteCopy} />
}

function Home({
  onNavigate,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  const routeCards = [
    { section: siteCopy.concepts, to: '/concepts' },
    { section: siteCopy.workflows, to: '/workflows' },
    { section: siteCopy.docs, to: '/docs' },
    { section: siteCopy.api, to: '/api' },
    { section: siteCopy.agents, to: '/agents' },
  ]

  return (
    <div className="page-shell">
      <section className="hero-plate">
        <div className="hero-copy">
          <p className="eyebrow">{siteCopy.hero.eyebrow}</p>
          <h1 className="font-display mt-6 max-w-4xl text-5xl leading-none font-black tracking-tight text-balance md:text-7xl">
            {siteCopy.hero.title}
          </h1>
          <p className="text-muted mt-7 max-w-2xl text-lg leading-8 md:text-xl">
            {siteCopy.hero.body}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <RouteLink
              className="button-primary"
              onNavigate={onNavigate}
              to="/docs"
            >
              {siteCopy.hero.ctas.docs}
            </RouteLink>
            <RouteLink
              className="button-secondary"
              onNavigate={onNavigate}
              to="/api"
            >
              {siteCopy.hero.ctas.api}
            </RouteLink>
            <a
              className="button-tertiary"
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              {siteCopy.hero.ctas.github}
            </a>
          </div>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            {siteCopy.hero.metrics.map((metric) => (
              <Metric
                label={metric.label}
                value={metric.value}
                key={metric.label}
              />
            ))}
          </dl>
        </div>
        <ArchivePreview siteCopy={siteCopy} />
      </section>
      <section className="paper-index" aria-labelledby="route-index-title">
        <div className="document-tabs" aria-hidden="true">
          {siteCopy.navItems.map((item) => (
            <span key={item.href}>{item.label}</span>
          ))}
        </div>
        <div className="page-title-row">
          <div>
            <p className="eyebrow">{siteCopy.docs.eyebrow}</p>
            <h2
              className="font-display mt-4 text-4xl leading-tight font-black md:text-6xl"
              id="route-index-title"
            >
              {siteCopy.docs.title}
            </h2>
          </div>
          <a
            className="stamp-link"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            {siteCopy.github.cta}
          </a>
        </div>
        <div className="route-card-grid">
          {routeCards.map(({ section, to }, index) => (
            <RouteCard
              body={section.body}
              eyebrow={section.eyebrow}
              key={section.title}
              number={index + 1}
              onNavigate={onNavigate}
              title={section.title}
              to={to}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function Concepts({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <DocumentPage
      body={siteCopy.concepts.body}
      eyebrow={siteCopy.concepts.eyebrow}
      title={siteCopy.concepts.title}
    >
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {siteCopy.concepts.cards.map((card) => (
          <FeatureCard feature={card} key={card.title} />
        ))}
      </div>
    </DocumentPage>
  )
}

function Workflows({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <DocumentPage
      body={siteCopy.workflows.body}
      eyebrow={siteCopy.workflows.eyebrow}
      title={siteCopy.workflows.title}
    >
      <ol className="timeline mt-12">
        {siteCopy.workflows.steps.map((step, index) => (
          <li className="timeline-item" key={step.label}>
            <span className="timeline-index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="font-display text-ink text-2xl font-black">
                {step.label}
              </h2>
              <p className="text-muted mt-3 leading-7">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </DocumentPage>
  )
}

function DocsLanding({
  onNavigate,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  return (
    <DocumentPage
      body={siteCopy.docs.body}
      eyebrow={siteCopy.docs.eyebrow}
      title={siteCopy.docs.title}
    >
      <div className="doc-list mt-12">
        {siteCopy.docs.panels.map((panel, index) => (
          <RouteLink
            className="doc-list-card"
            key={panel.id}
            onNavigate={onNavigate}
            to={`/docs/${panel.id}`}
          >
            <span className="doc-list-number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>
              <span className="card-meta">{panel.eyebrow}</span>
              <strong className="font-display mt-2 block text-2xl leading-tight font-black">
                {panel.title}
              </strong>
              <span className="text-muted mt-3 block leading-7">
                {panel.summary}
              </span>
            </span>
            <span className="doc-open-label">{siteCopy.docs.openDocLabel}</span>
          </RouteLink>
        ))}
      </div>
    </DocumentPage>
  )
}

function DocArticle({
  docId,
  onNavigate,
  pathname,
  siteCopy,
}: {
  docId: string
  onNavigate: (to: string) => void
  pathname: string
  siteCopy: SiteCopy
}) {
  const panel = siteCopy.docs.panels.find((docPanel) => docPanel.id === docId)

  if (!panel) {
    return <NotFound onNavigate={onNavigate} siteCopy={siteCopy} />
  }

  return (
    <DocumentPage
      aside={
        <DocsNav
          onNavigate={onNavigate}
          panels={siteCopy.docs.panels}
          pathname={pathname}
          siteCopy={siteCopy}
        />
      }
      body={panel.summary}
      eyebrow={panel.eyebrow}
      title={panel.title}
    >
      <RouteLink className="back-link" onNavigate={onNavigate} to="/docs">
        {siteCopy.docs.backToDocsLabel}
      </RouteLink>
      <DocPanelArticle panel={panel} />
    </DocumentPage>
  )
}

function ApiOverview({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <DocumentPage
      body={siteCopy.api.body}
      eyebrow={siteCopy.api.eyebrow}
      title={siteCopy.api.title}
    >
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {siteCopy.api.surfaces.map((surface) => (
          <FeatureCard feature={surface} key={surface.title} />
        ))}
      </div>
      <div className="route-categories mt-8">
        <h2 className="font-display text-ink text-2xl font-black">
          {siteCopy.api.routeCategoriesTitle}
        </h2>
        <p className="text-muted mt-3 leading-7">
          {siteCopy.api.routeCategoriesBody}
        </p>
        <a
          className="button-secondary mt-6"
          href="/api/v1/open/docs/openapi.yaml"
        >
          {siteCopy.footer.openapi}
        </a>
      </div>
    </DocumentPage>
  )
}

function AgentPortal({
  onNavigate,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  return (
    <DocumentPage
      body={siteCopy.agents.body}
      eyebrow={siteCopy.agents.eyebrow}
      title={siteCopy.agents.title}
    >
      <div className="agent-grid mt-12">
        <div>
          <p className="eyebrow">{siteCopy.docs.landingLabel}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <RouteLink
              className="button-primary"
              onNavigate={onNavigate}
              to="/docs/mcp-tools"
            >
              {siteCopy.agents.ctas.mcp}
            </RouteLink>
            <RouteLink
              className="button-secondary"
              onNavigate={onNavigate}
              to="/docs/skill-workflows"
            >
              {siteCopy.agents.ctas.skill}
            </RouteLink>
            <a
              className="button-tertiary"
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              {siteCopy.github.cta}
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
    </DocumentPage>
  )
}

function NotFound({
  onNavigate,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  return (
    <DocumentPage
      body={siteCopy.docs.body}
      eyebrow={siteCopy.docs.eyebrow}
      title={siteCopy.docs.title}
    >
      <div className="route-categories mt-10">
        <p className="text-muted leading-7">{siteCopy.docs.unknownDocLabel}</p>
        <RouteLink
          className="button-primary mt-6"
          onNavigate={onNavigate}
          to="/docs"
        >
          {siteCopy.docs.backToDocsLabel}
        </RouteLink>
      </div>
    </DocumentPage>
  )
}

function ArchivePreview({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <div className="archive-preview" aria-hidden="true">
      <div className="archive-sheet archive-sheet-back" />
      <div className="archive-sheet archive-sheet-mid" />
      <div className="archive-sheet archive-sheet-front">
        <div className="archive-stamp">{siteCopy.hero.archive.reviewed}</div>
        <p>{siteCopy.hero.archive.documentVersion}</p>
        <strong>{siteCopy.hero.archive.immutable}</strong>
        <div className="archive-rules">
          {siteCopy.hero.archive.nodes.map((node) => (
            <span key={node}>{node}</span>
          ))}
        </div>
        <div className="archive-note">
          <span>{siteCopy.hero.archive.semanticDiff}</span>
          <b>{siteCopy.hero.archive.fieldRemoved}</b>
          <em>{siteCopy.hero.archive.breaking}</em>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article className="feature-card">
      <p className="card-meta">{feature.meta}</p>
      <h2 className="font-display text-ink mt-4 text-2xl font-black">
        {feature.title}
      </h2>
      <p className="text-muted mt-4 leading-7">{feature.body}</p>
    </article>
  )
}

function DocPanelArticle({ panel }: { panel: DocPanel }) {
  return (
    <article className="doc-panel" id={panel.id}>
      <ul className="text-muted grid gap-3">
        {panel.bullets.map((bullet) => (
          <li className="flex gap-3" key={bullet}>
            <span className="bg-stamp mt-2 size-2 shrink-0 rounded-full" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {panel.code ? (
        <pre className="code-block" aria-label={`${panel.title} example`}>
          <code>{panel.code}</code>
        </pre>
      ) : null}
    </article>
  )
}

function DocsNav({
  onNavigate,
  panels,
  pathname,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  panels: DocPanel[]
  pathname: string
  siteCopy: SiteCopy
}) {
  return (
    <aside className="docs-nav" aria-label={siteCopy.accessibility.docsNav}>
      <RouteLink
        aria-current={pathname === '/docs' ? 'page' : undefined}
        className="docs-nav-link"
        data-active={pathname === '/docs' ? 'true' : 'false'}
        onNavigate={onNavigate}
        to="/docs"
      >
        <span>{siteCopy.docs.landingLabel}</span>
        {siteCopy.docs.backToDocsLabel}
      </RouteLink>
      {panels.map((panel) => {
        const to = `/docs/${panel.id}`

        return (
          <RouteLink
            aria-current={pathname === to ? 'page' : undefined}
            className="docs-nav-link"
            data-active={pathname === to ? 'true' : 'false'}
            key={panel.id}
            onNavigate={onNavigate}
            to={to}
          >
            <span>{panel.eyebrow}</span>
            {panel.title}
          </RouteLink>
        )
      })}
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <dt className="text-muted text-xs font-bold tracking-widest uppercase">
        {label}
      </dt>
      <dd className="font-display text-ink mt-2 text-3xl font-black">
        {value}
      </dd>
    </div>
  )
}

function RouteCard({
  body,
  eyebrow,
  number,
  onNavigate,
  title,
  to,
}: {
  body: string
  eyebrow: string
  number: number
  onNavigate: (to: string) => void
  title: string
  to: string
}) {
  return (
    <RouteLink className="route-card" onNavigate={onNavigate} to={to}>
      <span className="route-card-number">
        {String(number).padStart(2, '0')}
      </span>
      <span className="card-meta">{eyebrow}</span>
      <strong className="font-display mt-3 block text-2xl leading-tight font-black">
        {title}
      </strong>
      <span className="text-muted mt-4 block leading-7">{body}</span>
    </RouteLink>
  )
}

function DocumentPage({
  aside,
  body,
  children,
  eyebrow,
  title,
}: {
  aside?: ReactNode
  body: string
  children: ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <section className="page-shell">
      <div className="folio-paper">
        <div className="page-title-row">
          <div className="max-w-4xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="font-display mt-5 text-4xl leading-tight font-black text-balance md:text-6xl">
              {title}
            </h1>
            <p className="text-muted mt-5 text-lg leading-8">{body}</p>
          </div>
        </div>
        <div className="paper-rule" />
        <div className={aside ? 'document-layout' : undefined}>
          {aside}
          <div>{children}</div>
        </div>
      </div>
    </section>
  )
}

function RouteLink({
  children,
  onNavigate,
  to,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  onNavigate: (to: string) => void
  to: string
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    onNavigate(to)
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function SiteFooter({
  onNavigate,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  return (
    <footer className="border-line bg-paper/75 border-t px-6 py-10 lg:px-8">
      <div className="text-muted mx-auto flex max-w-7xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
        <p>{siteCopy.footer.body}</p>
        <div className="flex flex-wrap gap-3">
          <RouteLink className="footer-link" onNavigate={onNavigate} to="/docs">
            {siteCopy.footer.docs}
          </RouteLink>
          <a className="footer-link" href="/api/v1/open/docs/openapi.yaml">
            {siteCopy.footer.openapi}
          </a>
          <RouteLink
            className="footer-link"
            onNavigate={onNavigate}
            to="/docs/quick-start"
          >
            {siteCopy.footer.quickStart}
          </RouteLink>
          <a
            className="footer-link"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            {siteCopy.footer.github}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default App
