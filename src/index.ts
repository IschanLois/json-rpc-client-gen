import { isAbsolute, join, normalize } from 'node:path'

import { readConfigFile } from './utils.js'

const { path, config } = readConfigFile()
const functionsFile = isAbsolute(config.source) ? config.source : join(normalize(path), config.source)
