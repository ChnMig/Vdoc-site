import { useEffect, useMemo, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import {
  copy,
  supportedLanguages,
  type Feature,
  type Language,
  type SiteCopy,
  type TrustLoopStep,
  type WorkflowStep,
} from './content'

const languageStorageKey = 'vdoc-site-language'
const githubUrl = 'https://github.com/ChnMig/Vdoc'

type Route =
  | { kind: 'home' }
  | { kind: 'concepts' }
  | { kind: 'workflows' }
  | { kind: 'not-found' }

type DocsSlug =
  | 'product-overview'
  | 'deployment'
  | 'api-reference'
  | 'mcp-tools'
  | 'skill-workflows'

type DocsEntrypointCard = {
  body: string
  intent: string
  slug: DocsSlug
  title: string
}

type GuideRoute = {
  body: string
  label: string
  title: string
  to: string
}

const docsEntrypointCards: Record<Language, DocsEntrypointCard[]> = {
  en: [
    {
      intent: 'Understand',
      title: 'Product model',
      body: 'Start with the reviewed document lifecycle, trust boundary, and public versus Admin responsibilities.',
      slug: 'product-overview',
    },
    {
      intent: 'Follow',
      title: 'Deployment path',
      body: 'Bring the backend online, then complete first-use setup without mixing public docs and Admin work.',
      slug: 'deployment',
    },
    {
      intent: 'Reference',
      title: 'Backend API reference',
      body: 'Check route groups, response envelopes, and OpenAPI handoff details from the Docsify reference.',
      slug: 'api-reference',
    },
    {
      intent: 'Operate',
      title: 'MCP tool catalog',
      body: 'Use the installable MCP tools agents call when reading reviewed Vdoc project facts.',
      slug: 'mcp-tools',
    },
    {
      intent: 'Operate',
      title: 'Agent Skill workflows',
      body: 'Resolve IDs, compare versions, and avoid contract guesses with the Vdoc Skill playbooks.',
      slug: 'skill-workflows',
    },
  ],
  'zh-CN': [
    {
      intent: '理解',
      title: '产品模型',
      body: '先理解已审核文档生命周期、可信边界，以及公共文档和 Admin 的职责分工。',
      slug: 'product-overview',
    },
    {
      intent: '跟随',
      title: '部署路径',
      body: '启动后端并完成首次使用设置，不把公共文档和 Admin 操作混在一起。',
      slug: 'deployment',
    },
    {
      intent: '查阅',
      title: '后端 API 参考',
      body: '在 Docsify 参考中查看路由分组、响应信封和 OpenAPI 交接说明。',
      slug: 'api-reference',
    },
    {
      intent: '运维',
      title: 'MCP 工具目录',
      body: '查看 Agent 读取 Vdoc 已审核项目事实时调用的可安装 MCP 工具。',
      slug: 'mcp-tools',
    },
    {
      intent: '运维',
      title: 'Agent Skill 工作流',
      body: '按 Vdoc Skill 流程解析 ID、比较版本，避免编造契约事实。',
      slug: 'skill-workflows',
    },
  ],
}

const guideLabels: Record<
  Language,
  {
    conceptList: string
    documentPreview: string
    docsLead: string
    docsPathCue: string
    docsPaths: string
    guidePages: string
    journey: string
    journeyTitle: string
    missingPageTitle: string
    nextPages: string
    reviewedBadge: string
    routeLabel: string
    routeSummary: string
    workflowSequence: string
  }
> = {
  en: {
    conceptList: 'Vdoc concepts',
    documentPreview: 'Reviewed document preview',
    docsLead: 'The quickest reading path',
    docsPathCue: 'Open guide',
    docsPaths: 'Documentation paths',
    guidePages: 'Guide pages',
    journey: 'Document journey',
    journeyTitle: 'Draft to agent answer, with review in the middle.',
    missingPageTitle: 'This page is not part of the public guide.',
    nextPages: 'Keep reading',
    reviewedBadge: 'Human-reviewed facts',
    routeLabel: 'Page',
    routeSummary: 'What you will learn',
    workflowSequence: 'Workflow sequence',
  },
  'zh-CN': {
    conceptList: 'Vdoc 产品概念',
    documentPreview: '已审核文档预览',
    docsLead: '最快阅读路径',
    docsPathCue: '打开指南',
    docsPaths: '文档路径',
    guidePages: '指南页面',
    journey: '文档旅程',
    journeyTitle: '从草稿到 Agent 答案，中间必须经过人工审核。',
    missingPageTitle: '这个页面不属于公共指南。',
    nextPages: '继续阅读',
    reviewedBadge: '人工审核事实',
    routeLabel: '页面',
    routeSummary: '你会理解什么',
    workflowSequence: '工作流顺序',
  },
}

function prefersReducedMotion() {
  if (typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function docsHref(language: Language, slug: DocsSlug = 'product-overview') {
  if (language === 'en') {
    return `/docs/index.html#/en/${slug}`
  }

  if (slug === 'product-overview') {
    return '/docs/index.html'
  }

  return `/docs/index.html#/${slug}`
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
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <div className="bg-canvas text-ink selection:bg-review selection:text-reverse min-h-screen overflow-x-hidden">
      <a className="skip-link" href="#main-content">
        {siteCopy.accessibility.skipToMain}
      </a>
      <SiteHeader
        currentPathname={pathname}
        language={language}
        onLanguageChange={setLanguage}
        onNavigate={navigate}
        siteCopy={siteCopy}
      />
      <main className="site-main" id="main-content">
        <RouteRenderer
          language={language}
          onNavigate={navigate}
          route={route}
          siteCopy={siteCopy}
        />
      </main>
      <SiteFooter language={language} siteCopy={siteCopy} />
    </div>
  )
}

function SiteHeader({
  currentPathname,
  language,
  onLanguageChange,
  onNavigate,
  siteCopy,
}: {
  currentPathname: string
  language: Language
  onLanguageChange: (language: Language) => void
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <RouteLink
          className="brand-lockup"
          onNavigate={onNavigate}
          to="/"
          aria-label="Vdoc"
        >
          <span className="brand-mark">V/</span>
          <span>
            <span className="brand-name">Vdoc</span>
            <span className="brand-tagline">{siteCopy.header.tagline}</span>
          </span>
        </RouteLink>
        <div className="header-actions">
          <nav
            aria-label={siteCopy.accessibility.primaryNav}
            className="site-nav"
          >
            {siteCopy.navItems.map((item) => {
              const isDocs = item.href.startsWith('/docs')
              const href = isDocs ? docsHref(language) : item.href

              if (isDocs) {
                return (
                  <a className="nav-link" href={href} key={item.href}>
                    {item.label}
                  </a>
                )
              }

              const isCurrent = normalizePathname(item.href) === currentPathname
              return (
                <RouteLink
                  aria-current={isCurrent ? 'page' : undefined}
                  className="nav-link"
                  key={item.href}
                  onNavigate={onNavigate}
                  to={item.href}
                >
                  {item.label}
                </RouteLink>
              )
            })}
            <a
              aria-label={siteCopy.github.cta}
              className="nav-link nav-link-github"
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              {siteCopy.github.label}
            </a>
          </nav>
          <LanguageSwitcher
            language={language}
            onLanguageChange={onLanguageChange}
            siteCopy={siteCopy}
          />
        </div>
      </div>
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
      {supportedLanguages.map((option) => (
        <button
          aria-label={`${siteCopy.accessibility.languageOption} ${copy[option].languageName}`}
          aria-pressed={option === language}
          className="language-button"
          data-active={option === language}
          key={option}
          onClick={() => onLanguageChange(option)}
          type="button"
        >
          <span>{copy[option].shortLanguageName}</span>
          {copy[option].languageName}
        </button>
      ))}
    </div>
  )
}

function RouteRenderer({
  language,
  onNavigate,
  route,
  siteCopy,
}: {
  language: Language
  onNavigate: (to: string) => void
  route: Route
  siteCopy: SiteCopy
}) {
  if (route.kind === 'concepts') {
    return <ConceptsGuide language={language} siteCopy={siteCopy} />
  }

  if (route.kind === 'workflows') {
    return <WorkflowGuide language={language} siteCopy={siteCopy} />
  }

  if (route.kind === 'not-found') {
    return (
      <HelpfulNotFound
        language={language}
        onNavigate={onNavigate}
        siteCopy={siteCopy}
      />
    )
  }

  return (
    <GuideHome
      language={language}
      onNavigate={onNavigate}
      siteCopy={siteCopy}
    />
  )
}

function GuideHome({
  language,
  onNavigate,
  siteCopy,
}: {
  language: Language
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  const guideRoutes: GuideRoute[] = [
    {
      body: siteCopy.concepts.body,
      label: siteCopy.concepts.eyebrow,
      title: siteCopy.concepts.title,
      to: '/concepts',
    },
    {
      body: siteCopy.workflows.body,
      label: siteCopy.workflows.eyebrow,
      title: siteCopy.workflows.title,
      to: '/workflows',
    },
  ]

  return (
    <section className="guide-home" aria-labelledby="guide-home-title">
      <IntroHero language={language} siteCopy={siteCopy} />
      <DocumentJourney language={language} siteCopy={siteCopy} />
      <GuidePaths
        guideRoutes={guideRoutes}
        language={language}
        onNavigate={onNavigate}
        siteCopy={siteCopy}
      />
    </section>
  )
}

function IntroHero({
  language,
  siteCopy,
}: {
  language: Language
  siteCopy: SiteCopy
}) {
  return (
    <section className="intro-hero" aria-labelledby="guide-home-title">
      <div className="intro-copy">
        <p className="section-kicker">{siteCopy.guide.eyebrow}</p>
        <h1 className="intro-title" id="guide-home-title">
          {siteCopy.guide.title}
        </h1>
        <p className="intro-brief">{siteCopy.guide.body}</p>
        <div className="intro-actions">
          <a className="button-primary" href={docsHref(language)}>
            {siteCopy.guide.ctas.docs}
          </a>
          <a
            className="button-secondary"
            href={docsHref(language, 'api-reference')}
          >
            {siteCopy.guide.ctas.apiReference}
          </a>
          <a
            className="button-tertiary"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            {siteCopy.guide.ctas.github}
          </a>
        </div>
      </div>
      <DocumentSheet language={language} siteCopy={siteCopy} />
    </section>
  )
}

function DocumentSheet({
  language,
  siteCopy,
}: {
  language: Language
  siteCopy: SiteCopy
}) {
  const labels = guideLabels[language]
  const activeStep = siteCopy.guide.trustLoop[2]

  return (
    <aside className="document-sheet" aria-label={labels.documentPreview}>
      <div className="sheet-topline">
        <span>{labels.reviewedBadge}</span>
        <span>{siteCopy.guide.documentPreview.documentVersion} v0.1</span>
      </div>
      <div className="sheet-ledger-code" aria-hidden="true">
        <span>ledger://prod/openapi</span>
        <span>branch:main</span>
        <span>seal:human</span>
      </div>
      <div className="sheet-title-row">
        <h2>{activeStep.label}</h2>
        <span>{siteCopy.guide.documentPreview.immutable}</span>
      </div>
      <p>{activeStep.detail}</p>
      <div className="sheet-change">
        <div>
          <span>{siteCopy.guide.documentPreview.semanticDiff}</span>
          <strong>{siteCopy.guide.documentPreview.fieldRemoved}</strong>
        </div>
        <div>
          <span>{siteCopy.guide.documentPreview.stableMarkdown}</span>
          <em>{siteCopy.guide.documentPreview.breaking}</em>
        </div>
      </div>
      <div className="sheet-footer-tags" aria-hidden="true">
        {siteCopy.guide.documentPreview.nodes.map((node) => (
          <span key={node}>{node}</span>
        ))}
      </div>
    </aside>
  )
}

function DocumentJourney({
  language,
  siteCopy,
}: {
  language: Language
  siteCopy: SiteCopy
}) {
  const labels = guideLabels[language]

  return (
    <section
      className="document-journey"
      aria-labelledby="document-journey-title"
    >
      <div className="section-heading-row">
        <p className="section-kicker">{labels.journey}</p>
        <h2 className="section-title" id="document-journey-title">
          {labels.journeyTitle}
        </h2>
      </div>
      <TrustLoop steps={siteCopy.guide.trustLoop} />
    </section>
  )
}

function TrustLoop({ steps }: { steps: TrustLoopStep[] }) {
  return (
    <ol className="trust-loop" aria-label="Draft to reviewed agent query">
      {steps.map((step, index) => (
        <li className="trust-loop-step" data-step={index + 1} key={step.label}>
          <span className="step-index">
            {String(index + 1).padStart(2, '0')}
          </span>
          <strong>{step.label}</strong>
          <p>{step.detail}</p>
        </li>
      ))}
    </ol>
  )
}

function GuidePaths({
  guideRoutes,
  language,
  onNavigate,
  siteCopy,
}: {
  guideRoutes: GuideRoute[]
  language: Language
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  const labels = guideLabels[language]

  return (
    <section className="guide-paths" aria-labelledby="guide-paths-title">
      <div className="guide-pages" aria-label={labels.guidePages}>
        <p className="section-kicker">{labels.nextPages}</p>
        <h2 className="section-title">{labels.guidePages}</h2>
        <div className="guide-route-list">
          {guideRoutes.map((route) => (
            <RouteLink
              className="guide-route"
              key={route.to}
              onNavigate={onNavigate}
              to={route.to}
            >
              <span>{route.label}</span>
              <strong>{route.title}</strong>
              <p>{route.body}</p>
            </RouteLink>
          ))}
        </div>
      </div>
      <div className="docs-paths" aria-labelledby="guide-paths-title">
        <p className="section-kicker">{siteCopy.docs.eyebrow}</p>
        <h2 className="section-title" id="guide-paths-title">
          {siteCopy.docs.title}
        </h2>
        <p className="docs-paths-copy">{siteCopy.docs.body}</p>
        <div className="docs-route-stack" aria-label={labels.docsPaths}>
          {docsEntrypointCards[language].map((card, index) => (
            <a
              className="route-card"
              href={docsHref(language, card.slug)}
              key={card.slug}
            >
              <span className="path-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="card-meta">{card.intent}</span>
              <strong>{card.title}</strong>
              <span>{card.body}</span>
              <span className="route-card-cue" aria-hidden="true">
                {labels.docsPathCue}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function ConceptsGuide({
  language,
  siteCopy,
}: {
  language: Language
  siteCopy: SiteCopy
}) {
  const labels = guideLabels[language]

  return (
    <section className="concepts-guide" aria-labelledby="concepts-title">
      <div className="page-intro">
        <p className="section-kicker">{siteCopy.concepts.eyebrow}</p>
        <h1 className="page-title" id="concepts-title">
          {siteCopy.concepts.title}
        </h1>
        <p>{siteCopy.concepts.body}</p>
      </div>
      <div className="concept-list" aria-label={labels.conceptList}>
        {siteCopy.concepts.cards.map((card) => (
          <ConceptArticle card={card} key={card.title} />
        ))}
      </div>
    </section>
  )
}

function ConceptArticle({ card }: { card: Feature }) {
  return (
    <article className="concept-article">
      <div>
        <p className="card-meta">{card.meta}</p>
        <h2>{card.title}</h2>
        <p>{card.body}</p>
      </div>
    </article>
  )
}

function WorkflowGuide({
  language,
  siteCopy,
}: {
  language: Language
  siteCopy: SiteCopy
}) {
  const labels = guideLabels[language]

  return (
    <section className="workflow-guide" aria-labelledby="workflows-title">
      <div className="page-intro">
        <p className="section-kicker">{siteCopy.workflows.eyebrow}</p>
        <h1 className="page-title" id="workflows-title">
          {siteCopy.workflows.title}
        </h1>
        <p>{siteCopy.workflows.body}</p>
      </div>
      <ol className="workflow-sequence" aria-label={labels.workflowSequence}>
        {siteCopy.workflows.steps.map((step, index) => (
          <WorkflowStepItem index={index} key={step.label} step={step} />
        ))}
      </ol>
    </section>
  )
}

function WorkflowStepItem({
  index,
  step,
}: {
  index: number
  step: WorkflowStep
}) {
  return (
    <li className="workflow-step">
      <span className="path-number">{String(index + 1).padStart(2, '0')}</span>
      <div>
        <h2>{step.label}</h2>
        <p>{step.detail}</p>
      </div>
    </li>
  )
}

function HelpfulNotFound({
  language,
  onNavigate,
  siteCopy,
}: {
  language: Language
  onNavigate: (to: string) => void
  siteCopy: SiteCopy
}) {
  const labels = guideLabels[language]

  return (
    <section className="helpful-not-found" aria-labelledby="not-found-title">
      <div>
        <p className="section-kicker">404</p>
        <h1 className="page-title" id="not-found-title">
          {labels.missingPageTitle}
        </h1>
        <p>{siteCopy.docs.body}</p>
        <div className="intro-actions">
          <RouteLink className="button-primary" onNavigate={onNavigate} to="/">
            {siteCopy.navItems[0].label}
          </RouteLink>
          <a className="button-secondary" href={docsHref(language)}>
            {siteCopy.footer.docs}
          </a>
        </div>
      </div>
      <div className="not-found-paths" aria-label={labels.nextPages}>
        <RouteLink
          className="guide-route"
          onNavigate={onNavigate}
          to="/concepts"
        >
          <span>{siteCopy.concepts.eyebrow}</span>
          <strong>{siteCopy.concepts.title}</strong>
          <p>{siteCopy.concepts.body}</p>
        </RouteLink>
        <RouteLink
          className="guide-route"
          onNavigate={onNavigate}
          to="/workflows"
        >
          <span>{siteCopy.workflows.eyebrow}</span>
          <strong>{siteCopy.workflows.title}</strong>
          <p>{siteCopy.workflows.body}</p>
        </RouteLink>
      </div>
    </section>
  )
}

function SiteFooter({
  language,
  siteCopy,
}: {
  language: Language
  siteCopy: SiteCopy
}) {
  return (
    <footer className="site-footer">
      <div>
        <strong>Vdoc</strong>
        <p>{siteCopy.footer.body}</p>
      </div>
      <nav aria-label="Footer">
        <a href={docsHref(language)}>{siteCopy.footer.docs}</a>
        <a href={docsHref(language, 'deployment')}>
          {siteCopy.footer.deployment}
        </a>
        <a href={docsHref(language, 'api-reference')}>
          {siteCopy.footer.apiReference}
        </a>
        <a href={githubUrl} rel="noreferrer" target="_blank">
          {siteCopy.github.footer}
        </a>
      </nav>
    </footer>
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
    props.onClick?.(event)

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
    <a href={to} {...props} onClick={handleClick}>
      {children}
    </a>
  )
}

export default App
