/* global document, fetch, navigator, window */

;(function () {
  function currentMarkdownPath() {
    var route = window.location.hash.replace(/^#\/?/, '').split(/[?#]/)[0]
    var cleanRoute = route.replace(/\/$/, '')

    if (!cleanRoute) {
      return 'product-overview.md'
    }

    if (cleanRoute.endsWith('.md')) {
      return cleanRoute
    }

    return cleanRoute + '.md'
  }

  window.$docsify = window.$docsify || {}
  window.$docsify.plugins = [].concat(
    window.$docsify.plugins || [],
    function (hook) {
      hook.afterEach(function (html, next) {
        next(
          '<button class="vdoc-copy-markdown" type="button">复制本页 Markdown</button><div class="vdoc-copy-status" aria-live="polite"></div>' +
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
              status.textContent = '已复制 ' + markdownPath
            })
            .catch(function () {
              status.textContent = '复制失败 ' + markdownPath
            })
        })
      })
    },
  )
})()
