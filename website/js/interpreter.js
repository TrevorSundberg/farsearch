const divisionType = {
  BEGIN: 0,
  END: 1,
}

function escapeRegExp(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// An object with a 'score' and the found ranges of text.
// A score of 0 means it failed. Higher is better.
const interpret = (root, section) => {
  if (!root) {
    return { score: 0, divisions: [] }
  }

  const evaluate = (node) => {
    switch (node.type) {
      case tokenType.OR:
        {
          const lhs = evaluate(node.children[0])
          const rhs = evaluate(node.children[1])
          if (lhs.score || rhs.score) {
            return { score: lhs.score + rhs.score, divisions: lhs.divisions.concat(rhs.divisions) }
          } else {
            return { score: 0, divisions: [] }
          }
        }
      case tokenType.AND:
        {
          const lhs = evaluate(node.children[0])
          const rhs = evaluate(node.children[1])
          if (lhs.score && rhs.score) {
            return { score: lhs.score + rhs.score, divisions: lhs.divisions.concat(rhs.divisions) }
          } else {
            return { score: 0, divisions: [] }
          }
        }
      case tokenType.NOT:
        {
          const operand = evaluate(node.children[0])
          if (!operand.score) {
            return { score: 1, divisions: [] }
          } else {
            return { score: 0, divisions: [] }
          }
        }
      case tokenType.MAYBE:
        {
          const operand = evaluate(node.children[0])
          if (operand.score) {
            return operand
          }
          return { score: 1, divisions: operand.divisions }
        }
      case tokenType.RANGE:
        {
          // For now just evaluate the first SECTION argument.
          return evaluate(node.children[0])
        }
      case tokenType.SECTION:
        {
          // If we're just looking for a part...
          if (node.token.text.indexOf('.') == -1) {
            // Fix this, we should parse section.id here.
            if (section.id.startsWith(node.token.text)) {
              return { score: 1, divisions: [] }
            }
          } else {
            if (section.id === node.token.text) {
              return { score: 1, divisions: [] }
            }
          }
          return { score: 0, divisions: [] }
        }
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
          return { score, divisions }
        }
    }
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
