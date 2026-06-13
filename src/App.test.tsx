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

  it('renders a routed home page with repository links and without admin links', () => {
    const { container } = render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /a living dossier for ai-assisted teams/i,
      }),
    ).toBeInTheDocument()
    expect(container.querySelector('a[href="/concepts"]')).toBeInTheDocument()
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
    expect(
      screen.queryByText(/Configuration variables that matter/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(englishAdminConsoleCta)).not.toBeInTheDocument()
    expect(screen.queryByText(englishAdminConsoleLabel)).not.toBeInTheDocument()
    expect(
      container.querySelector(`a[href="${adminPath}"]`),
    ).not.toBeInTheDocument()
  })

  it('navigates between top-level pages with isolated route content', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: /Workflows/i }))

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

  it('renders the docs landing as a document index and opens one doc article', () => {
    const { container } = render(<App />)

    fireEvent.click(screen.getByRole('link', { name: /^Docs$/i }))

    expect(window.location.pathname).toBe('/docs')
    expect(
      screen.getByRole('heading', {
        name: /Deploy it, operate it, connect agents/i,
      }),
    ).toBeInTheDocument()
    const runtimeDocLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/docs/runtime-env"]',
    )
    expect(runtimeDocLink).toBeInTheDocument()

    fireEvent.click(runtimeDocLink!)

    expect(window.location.pathname).toBe('/docs/runtime-env')
    expect(
      container.querySelector(
        'a[href="/docs/runtime-env"][aria-current="page"]',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /Configuration variables that matter/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Configuration variables that matter example/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText(/PostgreSQL plus RustFS\/S3 storage example/i),
    ).not.toBeInTheDocument()
  })

  it('renders MCP and Skill installation guidance with valid tools', () => {
    window.history.pushState({}, '', '/agents')

    render(<App />)

    expect(
      screen.getAllByRole('link', { name: /Install MCP adapter/i }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: /Install Skill/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('get_endpoint_detail').length).toBeGreaterThan(0)
    expect(screen.getByText('compare_doc_versions')).toBeInTheDocument()
  })

  it('switches from English to Simplified Chinese and persists the choice on a doc route', () => {
    window.history.pushState({}, '', '/docs/infrastructure')

    const { container } = render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: /Switch language to 简体中文/i }),
    )

    expect(
      screen.getByRole('heading', { name: /PostgreSQL 加 RustFS\/S3 存储/ }),
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll(`a[href="${githubUrl}"]`).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(chineseAdminConsoleCta)).not.toBeInTheDocument()
    expect(screen.queryByText(chineseAdminConsoleLabel)).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(document.title).toBe('Vdoc - 面向 AI 协作的文档中心')
    expect(window.localStorage.getItem('vdoc-site-language')).toBe('zh-CN')
  })

  it('responds to browser back and popstate navigation', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: /^API$/ }))

    expect(window.location.pathname).toBe('/api')
    expect(
      screen.getByRole('heading', {
        name: /One Go backend, four exposed surfaces/i,
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
