const divisionType = {
  BEGIN: 0,
  END: 1,
}

// An object with a 'score' and the found ranges of text.
// A score of 0 means it failed. Higher is better.
const interpret = (root, section) => {
  if (!root) {
    return { score: 0, divisions: [] }
  }

  if (!section.cache) {
    section.cache = {}
  }

  const evaluate = node => {
    let result = section.cache[node.cacheConstant]
    if (result !== undefined) {
      return result
    }

    switch (node.type) {
      case tokenType.OR:
        {
          const lhs = evaluate(node.children[0])
          const rhs = evaluate(node.children[1])
          if (lhs.score || rhs.score) {
            result = { score: lhs.score + rhs.score, divisions: lhs.divisions.concat(rhs.divisions) }
          } else {
            result = { score: 0, divisions: [] }
          }
        }
        break
      case tokenType.AND:
        {
          const lhs = evaluate(node.children[0])
          const rhs = evaluate(node.children[1])
          if (lhs.score && rhs.score) {
            result = { score: lhs.score + rhs.score, divisions: lhs.divisions.concat(rhs.divisions) }
          } else {
            result = { score: 0, divisions: [] }
          }
        }
        break
      case tokenType.NOT:
        {
          const operand = evaluate(node.children[0])
          if (!operand.score) {
            result = { score: 1, divisions: [] }
          } else {
            result = { score: 0, divisions: [] }
          }
        }
        break
      case tokenType.MAYBE:
        {
          const operand = evaluate(node.children[0])
          if (operand.score) {
            result = operand
          } else {
            result = { score: 1, divisions: operand.divisions }
          }
        }
        break
      case tokenType.RANGE:
        {
          // For now just evaluate the first SECTION argument.
          result = evaluate(node.children[0])
        }
        break
      case tokenType.SECTION:
        {
          // If we're just looking for a part...
          if (node.token.text.indexOf('.') == -1) {
            // Fix this, we should parse section.id here.
            if (section.id.startsWith(node.token.text)) {
              result = { score: 1, divisions: [] }
            }
          } else {
            if (section.id === node.token.text) {
              result = { score: 1, divisions: [] }
            }
          }
          if (!result) {
            result = { score: 0, divisions: [] }
          }
        }
        break
      case tokenType.STRING:
      case tokenType.WORD:
      case tokenType.REGEX:
        {
          let score = 0
          const divisions = []
          const regex = node.token.regex
          const text = node.token.text
          regex.lastIndex = 0
          let match
          while (match = regex.exec(section.text)) {
            divisions.push({ index: match.index, type: divisionType.BEGIN, text })
            divisions.push({ index: match.index + match[0].length, type: divisionType.END, text })
            ++score
          }
          result = { score, divisions }
        }
        break
    }

    section.cache[node.cacheConstant] = result
    return result
  }

  const result = evaluate(root)

  // Sort all the ranges by the first index in the range.
  result.divisions.sort((a, b) => {
    const compare = a.index - b.index
    if (compare !== 0) {
      return compare
    }
    return a.type - b.type
  })

  return result
}
