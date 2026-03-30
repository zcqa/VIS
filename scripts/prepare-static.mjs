import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')
const rootWriteup = path.join(projectRoot, 'HW2_PROJECT_WRITEUP.md')
const publicWriteup = path.join(publicDir, 'HW2_PROJECT_WRITEUP.md')
const noJekyll = path.join(publicDir, '.nojekyll')

await mkdir(publicDir, { recursive: true })
await copyFile(rootWriteup, publicWriteup)
await writeFile(noJekyll, '')

console.log('Synced write-up to public and ensured .nojekyll for Pages.')
