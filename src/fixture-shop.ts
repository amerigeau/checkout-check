import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

export function fixtureRoot(): string {
  return fileURLToPath(new URL('../fixtures/shop/', import.meta.url))
}

export async function startFixtureShop(root = fixtureRoot()): Promise<{
  url: string
  close: () => Promise<void>
}> {
  const rootDir = resolve(root)
  const server = createServer(async (request, response) => {
    try {
      const file = resolveInside(rootDir, request.url ?? '/')
      const body = await readFile(file)
      response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      response.end(body)
    } catch (error) {
      const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
      response.writeHead(missing ? 404 : 403, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(missing ? 'not found' : 'forbidden')
    }
  })

  await listen(server)
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fixture shop failed to bind a port')

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((done, reject) => {
        server.close((error) => (error ? reject(error) : done()))
      }),
  }
}

function resolveInside(rootDir: string, requestUrl: string): string {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname)
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const file = resolve(rootDir, relative)
  if (file !== rootDir && !file.startsWith(rootDir + sep)) throw new Error('path escapes fixture root')
  return file
}

function listen(server: Server): Promise<void> {
  return new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      done()
    })
  })
}

export function fixtureCheck(baseUrl: string, name = 'fixture-shop') {
  return {
    name,
    platform: 'woocommerce' as const,
    baseUrl,
    productPath: '/product.html',
    cartPath: '/cart.html',
    timeoutMs: 10_000,
    selectors: {
      addToCart: 'button.single_add_to_cart_button',
      checkoutLink: 'a.checkout-button',
      checkoutReady: 'h1.checkout-title',
    },
  }
}
