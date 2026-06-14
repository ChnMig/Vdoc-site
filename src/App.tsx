import { useEffect, useMemo, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import {
  copy,
  supportedLanguages,
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
  | { kind: 'not-found' }

type DocsEntrypointCard = {
  body: string
  eyebrow: string
  title: string
  to: string
}

const docsEntrypointCards: Record<Language, DocsEntrypointCard[]> = {
  en: [
    {
      eyebrow: 'API reference',
      title: 'Backend API reference',
      body: 'Open the Docsify API reference for route groups, envelopes, and OpenAPI handoff details.',
      to: '/docs/index.html#/api-reference',
    },
    {
      eyebrow: 'MCP tools',
      title: 'MCP tool catalog',
      body: 'Find the installable MCP tools agents use to read reviewed Vdoc project facts.',
      to: '/docs/index.html#/mcp-tools',
    },
    {
      eyebrow: 'Skill workflows',
      title: 'Agent Skill workflows',
      body: 'Follow the Docsify Skill playbooks for resolving IDs, comparing versions, and avoiding contract guesses.',
      to: '/docs/index.html#/skill-workflows',
    },
  ],
  'zh-CN': [
    {
      eyebrow: 'API 参考',
      title: '后端 API 参考',
      body: '在 Docsify 中查看路由分组、响应信封和 OpenAPI 交接说明。',
      to: '/docs/index.html#/api-reference',
    },
    {
      eyebrow: 'MCP 工具',
      title: 'MCP 工具目录',
      body: '查看 Agent 读取 Vdoc 已审核项目事实时使用的可安装 MCP 工具。',
      to: '/docs/index.html#/mcp-tools',
    },
    {
      eyebrow: 'Skill 工作流',
      title: 'Agent Skill 工作流',
      body: '按 Docsify 中的 Skill 流程解析 ID、比较版本，避免编造契约事实。',
      to: '/docs/index.html#/skill-workflows',
    },
  ],
}

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
    <div className="bg-canvas text-ink selection:bg-stamp selection:text-paper min-h-screen overflow-x-hidden">
      <a className="skip-link" href="#main-content">
        {siteCopy.accessibility.skipToMain}
      </a>
      <SiteHeader
        language={language}
        onLanguageChange={setLanguage}
        onNavigate={navigate}
        pathname={pathname}
        siteCopy={siteCopy}
      />
      <main className="site-main" id="main-content">
        <RouteRenderer
          onNavigate={navigate}
          route={route}
          siteCopy={siteCopy}
        />
      </main>
      <SiteFooter siteCopy={siteCopy} />
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
    <header className="site-header border-line bg-paper/92 border-b shadow-sm backdrop-blur-xl">
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

              if (isDocsHref(item.href)) {
                return (
                  <a
                    aria-current={active ? 'page' : undefined}
                    className="nav-link"
                    data-active={active ? 'true' : 'false'}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </a>
                )
              }

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
  route,
  siteCopy,
}: {
  onNavigate: (to: string) => void
  route: Route
  siteCopy: SiteCopy
}) {
  if (route.kind === 'concepts') {
    return <Concepts siteCopy={siteCopy} />
  }

  if (route.kind === 'workflows') {
    return <Workflows siteCopy={siteCopy} />
  }

  if (route.kind === 'not-found') {
    return <NotFound siteCopy={siteCopy} />
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
    { section: siteCopy.docs, to: '/docs/index.html' },
    ...docsEntrypointCards[getContentLanguage(siteCopy)].map((card) => ({
      section: card,
      to: card.to,
    })),
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
            <a className="button-primary" href="/docs/index.html">
              {siteCopy.hero.ctas.docs}
            </a>
            <a
              className="button-secondary"
              href="/docs/index.html#/api-reference"
            >
              {siteCopy.hero.ctas.apiReference}
            </a>
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

function NotFound({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <DocumentPage
      body={siteCopy.docs.body}
      eyebrow={siteCopy.docs.eyebrow}
      title={siteCopy.docs.title}
    >
      <div className="route-categories mt-10">
        <p className="text-muted leading-7">{siteCopy.docs.body}</p>
        <a className="button-primary mt-6" href="/docs/index.html">
          {siteCopy.footer.docs}
        </a>
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

function getContentLanguage(siteCopy: SiteCopy): Language {
  return siteCopy.htmlLang === 'zh-CN' ? 'zh-CN' : 'en'
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
  if (isDocsHref(to)) {
    return (
      <a className="route-card" href={to}>
        <RouteCardContent
          body={body}
          eyebrow={eyebrow}
          number={number}
          title={title}
        />
      </a>
    )
  }

  return (
    <RouteLink className="route-card" onNavigate={onNavigate} to={to}>
      <RouteCardContent
        body={body}
        eyebrow={eyebrow}
        number={number}
        title={title}
      />
    </RouteLink>
  )
}

function RouteCardContent({
  body,
  eyebrow,
  number,
  title,
}: {
  body: string
  eyebrow: string
  number: number
  title: string
}) {
  return (
    <>
      <span className="route-card-number">
        {String(number).padStart(2, '0')}
      </span>
      <span className="card-meta">{eyebrow}</span>
      <strong className="font-display mt-3 block text-2xl leading-tight font-black">
        {title}
      </strong>
      <span className="text-muted mt-4 block leading-7">{body}</span>
    </>
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

function SiteFooter({ siteCopy }: { siteCopy: SiteCopy }) {
  return (
    <footer className="border-line bg-paper/75 border-t px-6 py-10 lg:px-8">
      <div className="text-muted mx-auto flex max-w-7xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
        <p>{siteCopy.footer.body}</p>
        <div className="flex flex-wrap gap-3">
          <a className="footer-link" href="/docs/index.html">
            {siteCopy.footer.docs}
          </a>
          <a className="footer-link" href="/docs/index.html#/deployment">
            {siteCopy.footer.deployment}
          </a>
          <a className="footer-link" href="/docs/index.html#/api-reference">
            {siteCopy.footer.apiReference}
          </a>
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

function isDocsHref(href: string) {
  return href === '/docs/index.html' || href.startsWith('/docs/index.html#/')
}

export default App
