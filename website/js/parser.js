/*
e0 = e1 (or e1)*
e1 = e2 (and? e2)*
e2 = (not | maybe) e2 | e3
e3 = open e0 close | e4
e4 = section (range section)? | string | regex | word
*/

const parse = function (tokens) {
  if (!tokens) {
    return null
  }

  let i = 0
  let lastToken

  const accept = (type) => {
    if (typeof (type) == 'string') {
      const token = tokens[i]
      if (token && token.type == type) {
        ++i
        lastToken = token
        return token
      }
      return undefined
    }

    return type
  }

  const expect = (type, error) => {
    const result = accept(type)
    if (result) {
      return result
    }
    if (error)
      throw new CompileError(error)
    else
      throw new CompileError(`Expected ${JSON.stringify(type)}`)
  }

  const e0 = () => {
    let lhs = e1()
    if (!lhs) return null

    while (accept(tokenType.OR)) {
      const rhs = expect(e1(), `Missing right hand side of 'or' expression`)
      lhs = { type: tokenType.OR, children: [lhs, rhs] }
    }
    return lhs
  }

  const e1 = () => {
    let lhs = e2()
    if (!lhs) return null

    for (; ;) {
      let rhs
      if (accept(tokenType.AND)) {
        rhs = expect(e2(), `Missing right hand side of 'and' expression`)
      } else {
        rhs = e2()
      }

      if (rhs) {
        lhs = { type: tokenType.AND, children: [lhs, rhs] }
      } else {
        break
      }
    }
    return lhs
  }

  const e2 = () => {
    if (accept(tokenType.NOT) || accept(tokenType.MAYBE)) {
      const op = lastToken.type
      const rhs = expect(e2(), `Missing right hand side of ${op} expression`)
      return { type: op, children: [rhs] }
    }

    return e3()
  }

  const e3 = () => {
    if (accept(tokenType.OPEN)) {
      const expression = expect(e0(), `Missing expression inside parentheses`)
      expect(tokenType.CLOSE, "Expected closing parentheses")
      return expression
    }

    return e4()
  }

  const e4 = () => {
    if (accept(tokenType.SECTION)) {
      const lhs = { type: lastToken.type, token: lastToken }
      if (accept(tokenType.RANGE)) {
        expect(tokenType.SECTION, `Expected another section to the right of the range '-'`)
        const rhs = { type: lastToken.type, token: lastToken }
        return { type: tokenType.RANGE, children: [lhs, rhs] }
      }
      return lhs
    } else if (accept(tokenType.STRING) || accept(tokenType.REGEX) || accept(tokenType.WORD)) {
      return { type: lastToken.type, token: lastToken }
    }
    return null
  }

  let root = null

  root = e0()

  if (i !== tokens.length) {
    throw new CompileError('Unexpected tokens at the end of the input')
  }

  return root
}