import { constants } from 'node:fs'
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')
const rootWriteup = path.join(projectRoot, 'HW2_PROJECT_WRITEUP.md')
const publicWriteup = path.join(publicDir, 'HW2_PROJECT_WRITEUP.md')
const noJekyll = path.join(publicDir, '.nojekyll')

await mkdir(publicDir, { recursive: true })
await syncIfExists(rootWriteup, publicWriteup, 'write-up')
await writeFile(noJekyll, '')

console.log('Prepared static Pages assets and ensured .nojekyll.')

async function syncIfExists(sourcePath, targetPath, label) {
  try {
    await access(sourcePath, constants.F_OK)
    await copyFile(sourcePath, targetPath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.warn(`Skipped ${label}: ${path.basename(sourcePath)} was not found in the repo root.`)
      return
    }

    throw error
  }
}
