/**
 * This is a script that generates the template source code for a stub based on a specified template (i.e. 'tcp').
 */

import path, { normalize } from 'node:path'

import { readFileSync, writeFileSync } from 'fs'
import { parse } from 'acorn'
import { toJs } from 'estree-util-to-js'

const args = process.argv.slice(2)
const isArgumentParsed = Array(args).fill(false)

const config = {}

/**
 * @param {number} index - the index of the template argument in process.argv
 */
const setTemplate = (index) => {
  const supportedTemplates = new Set(['tcp'])

  if (index + 1 >= args.length) {
    console.error(`Error: No template specified after ${template}`)
    process.exit(1)
  }

  const template = args[index + 1]

  if (!(supportedTemplates.has(template))) {
    console.error(`Error: Unsupported template "${template}". Supported templates are: ${Array.from(supportedTemplates).join(', ')}`)
    process.exit(1)
  }

  config.template = template
  isArgumentParsed[index + 1] = true
}

const processArguments = () => {
  args.forEach((arg, index) => {
    switch (arg) {
      case '-t': {
        setTemplate(index)
        break
      }

      default: {
        if (!isArgumentParsed[index]) {
          console.error(`Error: Unknown argument "${arg}". Use -t <template> to specify a template.`)
          process.exit(1)
        }
      }
    }
  })

  if (!('template' in config)) {
    console.error('Error: No template specified. Use -t <template> to specify a template.')
    process.exit(1)
  }
}

const templateMethods = new Set(['handleResponse', 'parsePendingResponses', 'sendRequest', 'connect', 'close', 'batch'])

/**
 * Use this to create a statement for a template. This removes the quotes when encoding a source code to a string
 * @param {string} name - the actual identifier that
 * @returns {Object} - an ExpressionStatement AST node
 */
const createExpressionStatementIdentifier = (name) => ({
  type: 'ExpressionStatement',
  expression: {
    type: 'Identifier',
    name: name,
  },
})

const walkAst = (ast) => {
  if (ast.type === 'MemberExpression'  &&  ast.object.name === 'configs') {
    ast.object.name = '{{config'
    ast.property.name += '}}'
  }

  if (ast.type === 'ClassBody') {
    ast.body = ast.body.filter((node) => {
      if (node.type === 'MethodDefinition' && node.kind === 'method') {
        return templateMethods.has(node.key.name)
      }

      return true
    })

    ast.body.push(createExpressionStatementIdentifier('{{methods}}'))
  }

  if (ast.type === 'Program') {
    ast.body = ast.body.filter((node) => {
      if (node.type === 'ImportDeclaration') {
        return node.source.value !== './configs.js'
      }

      return true
    })
  }

  // actual AST traversal, the conditions above are the use case specific modification
  for (const key in ast) {
    const value = ast[key]

    if (Array.isArray(value)) {
      for (const node of value) {
        walkAst(node)
      }
    } else if (value && typeof value === 'object' && 'type' in value && typeof value.type === 'string') {
      walkAst(value)
    }
  }
}

const main = () => {
  processArguments()

  const templateDir = normalize(`${import.meta.dirname}/../base-templates/${config.template}`)
  const templateContent = readFileSync(`${templateDir}/template.js`, 'utf8')

  const ast = parse(templateContent, {
    ecmaVersion: 2022,
    sourceType: 'module',
  })

  walkAst(ast)

  // Since the source code will be parsed to a template string, replace actual carriage returns and
  // template expressions with escaped versions.
  const sourceCode = toJs(ast).value
    .replace(/(`.*\${.*}.*`)|(\\n)/g, (match) => {
      if (match === '\\n') {
        return '\\\\n'
      }
      const normalized = match
        .split('${')
        .join('\\${')
      return `\\\`${normalized.substring(1, normalized.length - 1)}\\\``
    })

  const template = `export const template = \`${sourceCode}\``

  const targetDir = normalize(`${import.meta.dirname}/../src/stub/templates/${config.template}`)
  writeFileSync(
    path.join(targetDir, '/template.ts'),
    template,
    { encoding: 'utf8' },
  )
}

main()
