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
  if (ast.type === 'MethodDefinition') {
    walkAst(ast.value)
  }

  if (ast.type === 'ExpressionStatement') {
    walkAst(ast.expression)
  }

  if (ast.type === 'AssignmentExpression') {
    walkAst(ast.right)
  }

  if (ast.type === 'CallExpression') {
    for (const arg of ast.arguments) {
      walkAst(arg)
    }

    walkAst(ast.arguments)
  }

  if (ast.type === 'ObjectExpression') {
    for (const prop of ast.properties) {
      walkAst(prop)
    }

    return
  }

  if (ast.type === 'Property') {
    if (ast.value.type === 'MemberExpression' &&  ast.value.object.name === 'configs') {
      ast.value.object.name = '${config'
      ast.value.property.name += '}'
    }

    return
  }


  if (!('body' in ast)) {
    return
  }

  if (!Array.isArray(ast.body)) {
    walkAst(ast.body)

    return
  }

  // if ast is a ClassBody, remove methods that are mocked for the template
  // also add the methods as expressions within a template literal
  // identifier type as this will be parsed to a string
  if (ast.type === 'ClassBody') {
    ast.body = ast.body.filter((node) => {
      if (node.type === 'MethodDefinition' && node.kind === 'method') {
        return templateMethods.has(node.key.name)
      }

      return true
    })

    for (const node of ast.body) {
      walkAst(node)
    }

    ast.body.push(createExpressionStatementIdentifier('${methods}'))

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
