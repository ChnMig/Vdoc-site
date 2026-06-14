import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

describe('Vdoc public site', () => {
  const adminPath = ['/', 'admin'].join('')
  const englishAdminConsoleCta = new RegExp(
    `Go to ${['admin', 'console'].join(' ')}`,
    'i',
  )
  const englishAdminConsoleLabel = new RegExp(
    ['Admin', 'console'].join(' '),
    'i',
  )
  const chineseAdminConsoleCta = new RegExp(['进入', '管理', '后台'].join(''))
  const chineseAdminConsoleLabel = new RegExp(['管理', '后台'].join(''))
  const githubUrl = 'https://github.com/ChnMig/Vdoc'

  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('vdoc-site-language', 'en')
    window.history.pushState({}, '', '/')
    window.scrollTo = vi.fn()
  })

  it('renders home with simplified nav, repository links, Docs last, and no admin links', () => {
    const { container } = render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /a living dossier for ai-assisted teams/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Home/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getAllByRole('link', { name: /view github repository/i }).length,
    ).toBeGreaterThan(0)
    expect(
      container.querySelectorAll(`a[href="${githubUrl}"]`).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(englishAdminConsoleCta)).not.toBeInTheDocument()
    expect(screen.queryByText(englishAdminConsoleLabel)).not.toBeInTheDocument()
    expect(
      container.querySelector(`a[href="${adminPath}"]`),
    ).not.toBeInTheDocument()

    const navLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        'header .nav-link:not(.nav-link-github)',
      ),
    )
    expect(navLinks.map((link) => link.textContent)).toEqual([
      'Home',
      'Concepts',
      'Workflows',
      'Docs',
    ])
    expect(navLinks.at(-1)).toHaveAttribute('href', '/docs/index.html')
    expect(
      container.querySelector('header a[href="/api"]'),
    ).not.toBeInTheDocument()
    expect(
      container.querySelector('header a[href="/agents"]'),
    ).not.toBeInTheDocument()
  })

  it('navigates between Home, Concepts, and Workflows with isolated route content', () => {
    const { container } = render(<App />)

    const conceptsNavLink = container.querySelector<HTMLAnchorElement>(
      'header a[href="/concepts"]',
    )
    expect(conceptsNavLink).toBeInTheDocument()
    fireEvent.click(conceptsNavLink!)
    expect(window.location.pathname).toBe('/concepts')
    expect(
      screen.getByRole('heading', {
        name: /Not a Swagger clone\. A collaboration boundary/i,
      }),
    ).toBeInTheDocument()

    const workflowsNavLink = container.querySelector<HTMLAnchorElement>(
      'header a[href="/workflows"]',
    )
    expect(workflowsNavLink).toBeInTheDocument()
    fireEvent.click(workflowsNavLink!)
    expect(window.location.pathname).toBe('/workflows')
    expect(screen.getByRole('link', { name: /Workflows/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('heading', {
        name: /Draft, review, version, compare, act/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Submit/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: /One Go backend, four exposed surfaces/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('hands API, MCP, Skill, and footer entry points to Docsify links', () => {
    const { container } = render(<App />)

    expect(
      screen.getByRole('link', { name: /Open document index/i }),
    ).toHaveAttribute('href', '/docs/index.html')
    expect(
      screen.getByRole('link', { name: /Read API reference/i }),
    ).toHaveAttribute('href', '/docs/index.html#/api-reference')
    expect(
      container.querySelector('a.route-card[href="/docs/index.html"]'),
    ).toBeInTheDocument()
    expect(
      container.querySelector(
        'a.route-card[href="/docs/index.html#/api-reference"]',
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector(
        'a.route-card[href="/docs/index.html#/mcp-tools"]',
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector(
        'a.route-card[href="/docs/index.html#/skill-workflows"]',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Read docs/i })).toHaveAttribute(
      'href',
      '/docs/index.html',
    )
    expect(screen.getByRole('link', { name: /Deployment/i })).toHaveAttribute(
      'href',
      '/docs/index.html#/deployment',
    )
    expect(
      screen
        .getAllByRole('link', { name: /API reference/i })
        .some(
          (link) =>
            link.getAttribute('href') === '/docs/index.html#/api-reference',
        ),
    ).toBe(true)
  })

  it('treats retired API and Agent paths as not found instead of React pages', () => {
    window.history.pushState({}, '', '/api')
    const { unmount } = render(<App />)

    expect(
      screen.queryByRole('heading', {
        name: /One Go backend, four exposed surfaces/i,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: /Read docs/i })
        .some((link) => link.getAttribute('href') === '/docs/index.html'),
    ).toBe(true)

    unmount()
    window.history.pushState({}, '', '/agents')
    render(<App />)

    expect(
      screen.queryByRole('heading', {
        name: /Give agents a reviewed memory/i,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: /Read docs/i })
        .some((link) => link.getAttribute('href') === '/docs/index.html'),
    ).toBe(true)
  })

  it('switches to Simplified Chinese and keeps Docs as the last normal nav link', () => {
    const { container } = render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: /Switch language to 简体中文/i }),
    )

    expect(
      screen.getByRole('heading', { name: /面向 AI 协作团队的活文档档案馆/ }),
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll(`a[href="${githubUrl}"]`).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(chineseAdminConsoleCta)).not.toBeInTheDocument()
    expect(screen.queryByText(chineseAdminConsoleLabel)).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(document.title).toBe('Vdoc - 面向 AI 协作的文档中心')
    expect(window.localStorage.getItem('vdoc-site-language')).toBe('zh-CN')

    const navLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        'header .nav-link:not(.nav-link-github)',
      ),
    )
    expect(navLinks.map((link) => link.textContent)).toEqual([
      '首页',
      '产品概念',
      '工作流',
      '文档',
    ])
    expect(navLinks.at(-1)).toHaveAttribute('href', '/docs/index.html')
  })

  it('responds to browser back and popstate navigation for remaining React pages', async () => {
    const { container } = render(<App />)

    const conceptsNavLink = container.querySelector<HTMLAnchorElement>(
      'header a[href="/concepts"]',
    )
    expect(conceptsNavLink).toBeInTheDocument()
    fireEvent.click(conceptsNavLink!)

    expect(window.location.pathname).toBe('/concepts')
    expect(
      screen.getByRole('heading', {
        name: /Not a Swagger clone\. A collaboration boundary/i,
      }),
    ).toBeInTheDocument()

    window.history.back()

    await waitFor(() => expect(window.location.pathname).toBe('/'))
    expect(
      screen.getByRole('heading', {
        name: /a living dossier for ai-assisted teams/i,
      }),
    ).toBeInTheDocument()
  })
})
