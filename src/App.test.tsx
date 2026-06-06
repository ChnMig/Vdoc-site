import { fireEvent, render, screen } from '@testing-library/react'
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

  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('vdoc-site-language', 'en')
  })

  it('renders the portal hero and primary documentation sections', () => {
    const { container } = render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /a contract observatory for ai-assisted teams/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /PostgreSQL plus RustFS\/S3 storage/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /Configuration variables that matter/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Backend API overview/i)).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: /Language switcher/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(englishAdminConsoleCta)).not.toBeInTheDocument()
    expect(screen.queryByText(englishAdminConsoleLabel)).not.toBeInTheDocument()
    expect(
      container.querySelector(`a[href="${adminPath}"]`),
    ).not.toBeInTheDocument()
  })

  it('renders MCP and Skill installation guidance with valid tools', () => {
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

  it('switches from English to Simplified Chinese and persists the choice', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: /Switch language to 简体中文/i }),
    )

    expect(
      screen.getByRole('heading', {
        name: /面向 AI 协作团队的契约观测台。/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /PostgreSQL 加 RustFS\/S3 存储/ }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /安装 MCP Adapter/i }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: /安装 Skill/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(chineseAdminConsoleCta)).not.toBeInTheDocument()
    expect(screen.queryByText(chineseAdminConsoleLabel)).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(window.localStorage.getItem('vdoc-site-language')).toBe('zh-CN')
  })
})
