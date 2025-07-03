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

const templateMethods = new Set(['#handleResponse', '#parsePendingResponses', '#sendRequest', 'connect', 'close', 'batch'])

const walkAst = (ast) => {
  if (!('body' in ast)) {
    return
  }

  if (!Array.isArray(ast.body)) {
    if (ast.type === 'ClassDeclaration') {
      walkAst(ast.body)
    }

    return
  }

  // if ast is a ClassBody, remove methods that are mocked for the template
  // add the methods as expressions within a template literal
  // identifier type as this will be parsed to a string
  if (ast.type === 'ClassBody') {
    ast.body = ast.body.filter((node) => {
      if (node.type === 'MethodDefinition' && node.kind === 'method') {
        return templateMethods.has(node.key.name)
      }
      return true
    })

    ast.body.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'Identifier',
        name: '${methods}',
      },
    })
    return
  }


  for (const node of ast.body) {
    walkAst(node)
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

  console.log(ast)

  walkAst(ast)

  const template = `
  export const template = \`${toJs(ast).value}\`
  `

  const targetDir = normalize(`${import.meta.dirname}/../src/stub/templates/${config.template}`)
  writeFileSync(
    path.join(targetDir, '/template.ts'),
    template,
    { encoding: 'utf8' },
  )
}

main()
