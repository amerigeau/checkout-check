import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { main } from '../src/cli.js'
import { fixtureCheck, startFixtureShop } from '../src/fixture-shop.js'

const shop = await startFixtureShop()
const dir = await mkdtemp(join(tmpdir(), 'checkout-check-'))
const configPath = join(dir, 'checks.json')
const reportPath = join(dir, 'report.json')

await writeFile(
  configPath,
  JSON.stringify({ concurrency: 1, checks: [fixtureCheck(shop.url)] }, null, 2),
)

try {
  const code = await main(['node', 'checkout-check', 'run', '--config', configPath, '--json', reportPath])
  console.log(`fixture: ${shop.url}`)
  process.exitCode = code
} finally {
  await shop.close()
}
