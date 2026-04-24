import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const durationMs = Number.parseInt(process.env.CALENDAR_PERF_DURATION_MS ?? '2500', 10)
const scrollDistancePx = Number.parseInt(process.env.CALENDAR_PERF_SCROLL_PX ?? '4800', 10)
const headless = process.env.CALENDAR_PERF_HEADLESS !== '0'

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate))
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port)
        else reject(new Error('Could not allocate a local port'))
      })
    })
  })
}

async function waitForJson(url, timeoutMs = 5000) {
  const startedAt = Date.now()
  let lastError
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`)
}

class CdpClient {
  constructor(wsUrl) {
    this.nextId = 1
    this.pending = new Map()
    this.events = new Map()
    this.ws = new WebSocket(wsUrl)
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }

      const listeners = this.events.get(message.method)
      if (listeners) {
        for (const listener of listeners) listener(message.params)
      }
    })
  }

  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
  }

  send(method, params = {}) {
    const id = this.nextId
    this.nextId += 1
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  once(method) {
    return new Promise((resolve) => {
      const listener = (params) => {
        const listeners = this.events.get(method)
        listeners?.delete(listener)
        resolve(params)
      }
      const listeners = this.events.get(method) ?? new Set()
      listeners.add(listener)
      this.events.set(method, listeners)
    })
  }

  close() {
    this.ws.close()
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

function round(value) {
  return Math.round(value * 100) / 100
}

async function main() {
  if (typeof WebSocket === 'undefined') {
    throw new Error('This script requires Node.js with global WebSocket support.')
  }

  const chrome = findChromeExecutable()
  if (!chrome) {
    throw new Error('Chrome/Chromium was not found. Set CHROME_PATH=/path/to/chrome and retry.')
  }

  const server = await createServer({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await server.listen()

  const localUrl = server.resolvedUrls?.local[0]
  if (!localUrl) throw new Error('Vite did not expose a local URL')

  const debugPort = await getFreePort()
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'calendar-perf-chrome-'))
  const chromeArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--window-size=900,900',
  ]
  if (headless) chromeArgs.push('--headless=new')

  const child = spawn(chrome, chromeArgs, { stdio: 'ignore' })

  let client
  try {
    const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`)
    if (!version.webSocketDebuggerUrl) throw new Error('Chrome did not expose a browser websocket')

    const targetResponse = await fetch(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${localUrl}perf/scroll.html`)}`,
      { method: 'PUT' },
    )
    if (!targetResponse.ok) throw new Error(`Could not create Chrome target: ${targetResponse.statusText}`)
    const target = await targetResponse.json()

    client = new CdpClient(target.webSocketDebuggerUrl)
    await client.open()
    await client.send('Page.enable')
    await client.send('Runtime.enable')

    await client.send('Runtime.evaluate', {
      expression: `
        new Promise((resolve, reject) => {
          const startedAt = performance.now();
          const tick = () => {
            const scroll = document.querySelector('.calendar__scroll');
            if (window.__calendarPerf?.ready && scroll && scroll.querySelector('.calendar__day')) {
              resolve(true);
              return;
            }
            if (performance.now() - startedAt > 5000) {
              reject(new Error('Calendar perf page did not become ready'));
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        })
      `,
      awaitPromise: true,
    })

    const result = await client.send('Runtime.evaluate', {
      expression: `(${measureInBrowser.toString()})(${JSON.stringify({ durationMs, scrollDistancePx })})`,
      awaitPromise: true,
      returnByValue: true,
    })

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? 'Browser measurement failed')
    }

    const raw = result.result.value
    const frameDeltas = raw.frameDeltas
    const report = {
      scenario: {
        mode: 'range',
        durationMs,
        scrollDistancePx,
      },
      frames: raw.frames,
      avgFrameMs: round(frameDeltas.reduce((sum, value) => sum + value, 0) / Math.max(1, frameDeltas.length)),
      p95FrameMs: round(percentile(frameDeltas, 95)),
      maxFrameMs: round(Math.max(0, ...frameDeltas)),
      framesOver16ms: frameDeltas.filter((value) => value > 16.7).length,
      framesOver32ms: frameDeltas.filter((value) => value > 32).length,
      scrollEvents: raw.scrollEvents,
      blankFrames: raw.blankFrames,
      fastScrollClassFrames: raw.fastScrollClassFrames,
      avgRenderedMonths: round(
        raw.renderedMonthSamples.reduce((sum, value) => sum + value, 0) / raw.renderedMonthSamples.length,
      ),
      maxRenderedMonths: Math.max(0, ...raw.renderedMonthSamples),
      monthChanges: raw.monthChanges,
      profilerCommits: raw.profilerCommits,
      profilerActualDurationMs: round(raw.profilerActualDurationMs),
      profilerMaxActualDurationMs: round(raw.profilerMaxActualDurationMs),
      finalScrollTop: round(raw.finalScrollTop),
      scrollHeight: round(raw.scrollHeight),
    }

    const outputDir = path.join(root, 'perf-results')
    await mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, `scroll-${new Date().toISOString().replaceAll(':', '-')}.json`)
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)

    console.log('Calendar scroll perf')
    console.log(`frames: ${report.frames}`)
    console.log(`avg/p95/max frame: ${report.avgFrameMs}ms / ${report.p95FrameMs}ms / ${report.maxFrameMs}ms`)
    console.log(`frames >16.7ms / >32ms: ${report.framesOver16ms} / ${report.framesOver32ms}`)
    console.log(`scroll events: ${report.scrollEvents}`)
    console.log(`blank frames: ${report.blankFrames}`)
    console.log(`fast-scroll class frames: ${report.fastScrollClassFrames}`)
    console.log(`rendered months avg/max: ${report.avgRenderedMonths} / ${report.maxRenderedMonths}`)
    console.log(`React commits: ${report.profilerCommits}`)
    console.log(
      `React actual duration total/max: ${report.profilerActualDurationMs}ms / ${report.profilerMaxActualDurationMs}ms`,
    )
    console.log(`result: ${path.relative(root, outputPath)}`)
  } finally {
    client?.close()
    child.kill('SIGTERM')
    await server.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
}

async function measureInBrowser({ durationMs, scrollDistancePx }) {
  const scroll = document.querySelector('.calendar__scroll')
  if (!(scroll instanceof HTMLElement)) throw new Error('Could not find .calendar__scroll')

  scroll.scrollTop = 0
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => setTimeout(resolve, 250))

  if (window.__calendarPerf) {
    window.__calendarPerf.monthChanges = 0
    window.__calendarPerf.profilerCommits = 0
    window.__calendarPerf.profilerActualDurationMs = 0
    window.__calendarPerf.profilerMaxActualDurationMs = 0
  }

  const metrics = {
    frames: 0,
    frameDeltas: [],
    scrollEvents: 0,
    blankFrames: 0,
    fastScrollClassFrames: 0,
    renderedMonthSamples: [],
    monthChanges: 0,
    profilerCommits: 0,
    profilerActualDurationMs: 0,
    profilerMaxActualDurationMs: 0,
    finalScrollTop: 0,
    scrollHeight: 0,
  }

  const onScroll = () => {
    metrics.scrollEvents += 1
  }
  scroll.addEventListener('scroll', onScroll, { passive: true })

  const hasBlankViewportGap = () => {
    const viewport = scroll.getBoundingClientRect()
    const ranges = Array.from(scroll.querySelectorAll('.calendar__month'))
      .map((node) => node.getBoundingClientRect())
      .map((rect) => ({
        top: Math.max(rect.top, viewport.top),
        bottom: Math.min(rect.bottom, viewport.bottom),
      }))
      .filter((range) => range.bottom > range.top)
      .sort((a, b) => a.top - b.top)

    let cursor = viewport.top
    for (const range of ranges) {
      if (range.top - cursor > 1) return true
      cursor = Math.max(cursor, range.bottom)
      if (cursor >= viewport.bottom - 1) return false
    }
    return viewport.bottom - cursor > 1
  }

  const maxScrollTop = Math.max(0, Math.min(scrollDistancePx, scroll.scrollHeight - scroll.clientHeight))
  const startedAt = performance.now()
  let prevFrameAt = startedAt

  await new Promise((resolve) => {
    const tick = (now) => {
      metrics.frames += 1
      metrics.frameDeltas.push(now - prevFrameAt)
      prevFrameAt = now

      const progress = Math.min(1, (now - startedAt) / durationMs)
      scroll.scrollTop = progress * maxScrollTop

      metrics.renderedMonthSamples.push(scroll.querySelectorAll('.calendar__month').length)
      if (scroll.classList.contains('is-fast-scrolling')) metrics.fastScrollClassFrames += 1
      if (hasBlankViewportGap()) metrics.blankFrames += 1

      if (progress < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })

  await new Promise((resolve) => setTimeout(resolve, 150))

  scroll.removeEventListener('scroll', onScroll)
  const perf = window.__calendarPerf
  metrics.monthChanges = perf?.monthChanges ?? 0
  metrics.profilerCommits = perf?.profilerCommits ?? 0
  metrics.profilerActualDurationMs = perf?.profilerActualDurationMs ?? 0
  metrics.profilerMaxActualDurationMs = perf?.profilerMaxActualDurationMs ?? 0
  metrics.finalScrollTop = scroll.scrollTop
  metrics.scrollHeight = scroll.scrollHeight
  return metrics
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
