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
  const result = { score: 0, ranges: [], divisions: [] }
  if (!root) {
    return result
  }

  let score = 1
  let ranges = []
  const evaluate = (node) => {
    switch (node.type) {
      case tokenType.OR:
        return evaluate(node.children[0]) || evaluate(node.children[1])
      case tokenType.AND:
        return evaluate(node.children[0]) && evaluate(node.children[1])
      case tokenType.NOT:
        return !evaluate(node.children[0])
      case tokenType.MAYBE:
        evaluate(node.children[0])
        return true
      case tokenType.RANGE:
        // For now just evaluate the first SECTION argument.
        return evaluate(node.children[0])
      case tokenType.SECTION:
        // If we're just looking for a part...
        if (node.token.text.indexOf('.') == -1) {
          // Fix this, we should parse section.id here.
          if (section.id.startsWith(node.token.text)) {
            ++score
            return true
          }
        } else {
          if (section.id === node.token.text) {
            ++score
            return true
          }
        }
        return false
      case tokenType.STRING:
      case tokenType.WORD:
      case tokenType.REGEX:
        {
          let found = false
          const regex = node.token.regex
          regex.lastIndex = 0
          let match
          while (match = regex.exec(section.text)) {
            const start = match.index
            const end = start + match[0].length
            ranges.push([start, end, node.token.text])
            ++score
            found = true
          }
          return found
        }
    }
  }

  if (evaluate(root)) {
    for (const range of ranges) {
      result.divisions.push({
        index: range[0],
        type: divisionType.BEGIN,
        text: range[2]
      })
      result.divisions.push({
        index: range[1],
        type: divisionType.END,
        text: range[2]
      })
    }

    // Sort all the ranges by the first index in the range.
    ranges.sort((a, b) => {
      return a[0] - b[0]
    })
    result.divisions.sort((a, b) => {
      const compare = a.index - b.index
      if (compare !== 0) {
        return compare
      }
      return a.type - b.type
    })

    result.score = score
    result.ranges = ranges
  }

  return result
}
