importScripts('tokenizer.js')
importScripts('parser.js')
importScripts('interpreter.js')

let sections
const maxDivisions = 1000
const maxResults = 100
const maxOutput = 20

String.prototype.hashCode = function () {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function colorDarkFromNumber(x) {
  var letters = '01234567'
  var color = '#'
  for (let i = 0; i < 6; ++i) {
    color += letters[x % 8]
    x = x >> 4;
  }
  return color;
}

function colorLightFromNumber(x) {
  var letters = '89ABCDEF'
  var color = '#'
  for (let i = 0; i < 6; ++i) {
    color += letters[x % 8]
    x = x >> 4;
  }
  return color;
}

onmessage = e => {
  if (e.data.sections) {
    sections = e.data.sections
    return
  }

  const results = []
  let tooManyResults = false

  for (const section of sections) {
    const result = interpret(e.data.root, section)

    if (!result.score) {
      continue
    }

    result.section = section
    results.push(result)

    if (results.length == maxResults) {
      tooManyResults = true
      break
    }
  }

  results.sort((a, b) => {
    return b.score - a.score
  })

  if (results.length > maxOutput) {
    results.length = maxOutput
  }

  const output = []
  for (const result of results) {
    const section = result.section
    const divisions = result.divisions
    let index = 0
    let nest = 0
    output.push('<hr>')

    let str = ''

    for (let i = 0; i < maxDivisions && i < divisions.length; ++i) {
      const division = divisions[i]
      const text = section.text.substring(index, division.index).replace(/\n/g, '<br>')
      if (nest) {
        str += text
      } else {
        output.push(text)
      }
      index = division.index
      if (division.type == divisionType.BEGIN) {
        const hash = `${division.text}`.hashCode()
        const dark = colorDarkFromNumber(hash)
        const light = colorLightFromNumber(hash * 1257 + 34896)
        str += `<span style="color: ${dark}; background-color: ${light}">`
        ++nest
      } else {
        str += '</span>'
        --nest

        if (nest == 0) {
          output.push(str)
          str = ''
        }
      }
    }

    // This can only happen because we can exit the loop early.
    str += '</span>'.repeat(nest)
    if (str.length !== 0) {
      output.push(str)
    }

    output.push(section.text.substring(index, section.text.length).replace(/\n/g, '<br>') + '<br>')
  }

  postMessage({ output, tooManyResults })
}