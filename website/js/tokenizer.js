
function CompileError(message) {
  this.message = message
}

const sectionRegex = /\$([0-9]+(\.[0-9]+)?)([a-zA-Z]?)([0-9]+)?([iI]+)?/
const stringRegex = /'([^\\']|\\.)*'|"([^\\"]|\\.)*"|`([^\\`]|\\.)*`/
const regexRegex = /\/((?:[^\\\/]|\\.)*)\/([a-z]*)/
const wordRegex = /[^()|&!~/'"`$ \f\t\r\n\v][^()|&!~ \f\t\r\n\v]*/

const tokenRegex = /(\$([0-9]+(\.[0-9]+)?)([a-zA-Z]?)([0-9]+)?([iI]+)?)|('([^\\']|\\.)*'|"([^\\"]|\\.)*"|`([^\\`]|\\.)*`)|(\/((?:[^\\\/]|\\.)*)\/([a-z]*))|([^()|&!~/'"`$ \f\t\r\n\v][^()|&!~ \f\t\r\n\v]*)|\(|\)|\&|\||\!|\~|\-/gm

const tokenType = {
  // Binary.
  OR: 'or',
  AND: 'and',

  // Unary.
  NOT: 'not',
  MAYBE: 'maybe',

  // Parens.
  OPEN: '(',
  CLOSE: ')',

  // Misc.
  RANGE: 'range',

  // Literals.
  SECTION: 'section',
  STRING: 'string',
  REGEX: 'regex',
  WORD: 'word'
}

function escapeRegExp(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const tokenize = function (inputString) {
  const tokens = []
  const matches = inputString.match(tokenRegex)
  if (!matches) {
    return tokens
  }

  for (const match of matches) {
    const token = {
      text: match,
      regex: new RegExp(escapeRegExp(match), 'ig')
    }

    let type
    switch (match) {
      case '|':
      case tokenType.OR:
        type = tokenType.OR
        break
      case '&':
      case tokenType.AND:
        type = tokenType.AND
        break

      case '!':
      case tokenType.NOT:
        type = tokenType.NOT
        break
      case '~':
      case tokenType.MAYBE:
        type = tokenType.MAYBE
        break

      case tokenType.OPEN:
        type = tokenType.OPEN
        break
      case tokenType.CLOSE:
        type = tokenType.CLOSE
        break

      case '-':
        type = tokenType.RANGE
        break
    }

    const c = match.charAt(0)
    switch (c) {
      case '$':
        type = tokenType.SECTION
        break
      case '\'':
      case '"':
      case '`':
        type = tokenType.STRING
        token.text = match.substring(1, match.length - 1).replace(/\\'/g, '\'').replace(/\\/g, '')
        token.regex = new RegExp(escapeRegExp(token.text), (c == '"') ? 'g' : 'ig')
        break
      case '/':
        {
          type = tokenType.REGEX
          const matches = match.match(regexRegex)
          const regex = matches[1]
          const flags = matches[2]
          try {
            token.regex = new RegExp(regex, flags.includes('g') ? flags : flags + 'g')
          }
          catch (error) {
            throw new CompileError(error.message)
          }
        }
        break
    }

    if (!type) {
      type = tokenType.WORD
    }

    token.type = type
    tokens.push(token)
  }
  return tokens
}
