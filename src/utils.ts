import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Config } from './types.js'

export const CONFIG_FILE = 'jsonrpcgen.config.json'
export const CWD: string = process.cwd()

const configHelper = (directory: string): { path: string, config: Config } => {
  const parsedPath = path.parse(directory)

  if (directory == parsedPath.root) {
    throw new Error('No config file found')
  }

  const file = path.join(directory, CONFIG_FILE)

  try {
    const config = JSON.parse(readFileSync(file, 'utf-8'))

    return { config, path: directory }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      configHelper(path.join(path.normalize(directory), '..'))
    }

    throw err
  }
}

export const readConfigFile = () => configHelper(CWD)
