import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { gzipSync } from 'node:zlib'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(projectRoot, 'docs', '.vitepress', 'dist')
const budgetPath = join(projectRoot, 'performance-budget.json')
const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))

if (!existsSync(distRoot)) {
  process.stderr.write(
    'Build budget failed: docs/.vitepress/dist does not exist\n',
  )
  process.exitCode = 1
} else {
  const files = listFiles(distRoot)
  const metrics = measure(files)
  const failures = compare(metrics, budget.limits)

  process.stdout.write(
    JSON.stringify(
      {
        baseline: budget.baseline,
        limits: budget.limits,
        actual: metrics,
      },
      null,
      2,
    ) + '\n',
  )

  if (failures.length > 0) {
    process.stderr.write(`Build budget failed:\n${failures.join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('Build budget passed\n')
  }
}

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function relativePath(path) {
  return relative(distRoot, path).split(sep).join('/')
}

function gzipBytesForPrefixes(files, prefixes) {
  return files
    .filter((file) =>
      prefixes.some((prefix) => relativePath(file).startsWith(prefix)),
    )
    .reduce((total, file) => total + gzipSync(readFileSync(file)).length, 0)
}

function measure(files) {
  const allowedGeneratedFont = new RegExp(budget.allowedGeneratedFontPattern)
  const customFontFiles = files
    .map(relativePath)
    .filter(
      (path) =>
        ['.woff', '.woff2', '.ttf', '.otf'].includes(
          extname(path).toLowerCase(),
        ) && !allowedGeneratedFont.test(path),
    )
  const imageFiles = files
    .map(relativePath)
    .filter((path) =>
      ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'].includes(
        extname(path).toLowerCase(),
      ),
    )

  return {
    totalFiles: files.length,
    totalBytes: files.reduce((total, file) => total + statSync(file).size, 0),
    sharedJavaScriptGzipBytes: gzipBytesForPrefixes(
      files,
      budget.sharedJavaScriptPrefixes,
    ),
    sharedCssGzipBytes: gzipBytesForPrefixes(files, budget.sharedCssPrefixes),
    customFontFiles,
    imageFiles,
  }
}

function compare(metrics, limits) {
  const failures = []
  checkMaximum(failures, 'total files', metrics.totalFiles, limits.totalFiles)
  checkMaximum(failures, 'total bytes', metrics.totalBytes, limits.totalBytes)
  checkMaximum(
    failures,
    'shared JavaScript gzip bytes',
    metrics.sharedJavaScriptGzipBytes,
    limits.sharedJavaScriptGzipBytes,
  )
  checkMaximum(
    failures,
    'shared CSS gzip bytes',
    metrics.sharedCssGzipBytes,
    limits.sharedCssGzipBytes,
  )
  checkMaximum(
    failures,
    'custom font files',
    metrics.customFontFiles.length,
    limits.customFontFiles,
  )
  checkMaximum(
    failures,
    'image files',
    metrics.imageFiles.length,
    limits.imageFiles,
  )
  return failures
}

function checkMaximum(failures, label, actual, maximum) {
  if (actual > maximum) {
    failures.push(`- ${label}: ${actual} > ${maximum}`)
  }
}
