/* global document, fetch, navigator, window */

;(function () {
  function currentMarkdownPath() {
    var route = window.location.hash.replace(/^#\/?/, '').split(/[?#]/)[0]
    var cleanRoute = route.replace(/\/$/, '').replace(/\.md$/, '')

    if (!cleanRoute || cleanRoute === 'README') {
      return 'product-overview.md'
    }

    if (cleanRoute === 'en') {
      return 'en/product-overview.md'
    }

    if (cleanRoute === 'en/README') {
      return 'en/product-overview.md'
    }

    return cleanRoute + '.md'
  }

  function isEnglishRoute() {
    var route = window.location.hash.replace(/^#\/?/, '').split(/[?#]/)[0]
    return route === 'en' || route.indexOf('en/') === 0
  }

  function copyButtonLabel() {
    return isEnglishRoute() ? 'Copy this Markdown' : '复制本页 Markdown'
  }

  function copiedStatus(markdownPath) {
    return isEnglishRoute()
      ? 'Copied ' + markdownPath
      : '已复制 ' + markdownPath
  }

  function failedStatus(markdownPath) {
    return isEnglishRoute()
      ? 'Copy failed ' + markdownPath
      : '复制失败 ' + markdownPath
  }

  window.$docsify = window.$docsify || {}
  window.$docsify.plugins = [].concat(
    window.$docsify.plugins || [],
    function (hook) {
      hook.afterEach(function (html, next) {
        next(
          '<button class="vdoc-copy-markdown" type="button">' +
            copyButtonLabel() +
            '</button><div class="vdoc-copy-status" aria-live="polite"></div>' +
            html,
        )
      })

      hook.doneEach(function () {
        var button = document.querySelector('.vdoc-copy-markdown')
        var status = document.querySelector('.vdoc-copy-status')

        if (!button || !status) {
          return
        }

        button.addEventListener('click', function () {
          var markdownPath = currentMarkdownPath()

          fetch(markdownPath)
            .then(function (response) {
              if (!response.ok) {
                throw new Error('无法读取 ' + markdownPath)
              }

              return response.text()
            })
            .then(function (markdown) {
              return navigator.clipboard.writeText(markdown)
            })
            .then(function () {
              status.textContent = copiedStatus(markdownPath)
            })
            .catch(function () {
              status.textContent = failedStatus(markdownPath)
            })
        })
      })
    },
  )
})()
