/* global document, MutationObserver, window */

;(function () {
  var observerStarted = false
  var refreshTimer = null

  function normalizeRoute() {
    return window.location.hash
      .replace(/^#\/?/, '')
      .split(/[?#]/)[0]
      .replace(/\/$/, '')
  }

  function normalizePage(page) {
    var normalizedPage = page.replace(/\.md$/, '')

    if (!normalizedPage || normalizedPage === 'README') {
      return 'product-overview'
    }

    return normalizedPage
  }

  function getRouteInfo() {
    var route = normalizeRoute()
    var isEnglish = route === 'en' || route.indexOf('en/') === 0
    var page = normalizePage(isEnglish ? route.replace(/^en\/?/, '') : route)

    return {
      isEnglish: isEnglish,
      page: page,
    }
  }

  function docsPath(language, page) {
    var normalizedPage = normalizePage(page)

    if (language === 'en') {
      return '#/en/' + normalizedPage
    }

    if (normalizedPage === 'product-overview') {
      return '/docs/index.html'
    }

    return '#/' + normalizedPage
  }

  function setText(element, value) {
    if (element.textContent !== value) {
      element.textContent = value
    }
  }

  function setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value)
    }
  }

  function updateLanguageChrome() {
    var routeInfo = getRouteInfo()
    var nextLanguage = routeInfo.isEnglish ? 'zh-CN' : 'en'
    var links = document.querySelectorAll('[data-vdoc-language-switch]')
    var appNameLink = document.querySelector('.app-name-link')

    document.documentElement.lang = routeInfo.isEnglish ? 'en' : 'zh-CN'

    if (appNameLink) {
      setText(appNameLink, routeInfo.isEnglish ? 'Vdoc Docs' : 'Vdoc 文档')
      setAttribute(
        appNameLink,
        'href',
        docsPath(routeInfo.isEnglish ? 'en' : 'zh-CN', 'product-overview'),
      )
    }

    Array.prototype.forEach.call(links, function (link) {
      setText(link, routeInfo.isEnglish ? '中文' : 'English')
      setAttribute(link, 'href', docsPath(nextLanguage, routeInfo.page))
      setAttribute(
        link,
        'aria-label',
        routeInfo.isEnglish
          ? '切换到中文文档'
          : 'Switch to English documentation',
      )
    })
  }

  function scheduleLanguageChromeUpdate() {
    updateLanguageChrome()
    window.setTimeout(updateLanguageChrome, 0)
    window.setTimeout(updateLanguageChrome, 50)
  }

  function startLanguageChromeRefresh() {
    var attempts = 0

    scheduleLanguageChromeUpdate()

    if (refreshTimer) {
      window.clearInterval(refreshTimer)
    }

    refreshTimer = window.setInterval(function () {
      attempts += 1
      updateLanguageChrome()

      if (attempts >= 25) {
        window.clearInterval(refreshTimer)
        refreshTimer = null
      }
    }, 100)
  }

  function observeLanguageChrome() {
    if (
      observerStarted ||
      !document.body ||
      typeof MutationObserver === 'undefined'
    ) {
      return
    }

    observerStarted = true
    new MutationObserver(function () {
      startLanguageChromeRefresh()
    }).observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  function findLanguageSwitchLink(target) {
    var currentTarget = target

    while (currentTarget && currentTarget !== document) {
      if (
        currentTarget.hasAttribute &&
        currentTarget.hasAttribute('data-vdoc-language-switch')
      ) {
        return currentTarget
      }

      currentTarget = currentTarget.parentNode
    }

    return null
  }

  function handleLanguageSwitchClick(event) {
    var link = findLanguageSwitchLink(event.target)

    if (!link) {
      return
    }

    var routeInfo = getRouteInfo()
    var nextLanguage = routeInfo.isEnglish ? 'zh-CN' : 'en'
    var nextPath = docsPath(nextLanguage, routeInfo.page)

    setAttribute(link, 'href', nextPath)
    event.preventDefault()
    event.stopPropagation()

    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation()
    }

    window.location.href = nextPath
    startLanguageChromeRefresh()
  }

  window.$docsify = window.$docsify || {}
  window.$docsify.plugins = [].concat(
    window.$docsify.plugins || [],
    function (hook) {
      hook.doneEach(startLanguageChromeRefresh)
    },
  )

  window.addEventListener('hashchange', startLanguageChromeRefresh)
  document.addEventListener('click', handleLanguageSwitchClick, true)
  window.addEventListener('DOMContentLoaded', function () {
    observeLanguageChrome()
    startLanguageChromeRefresh()
  })
})()
