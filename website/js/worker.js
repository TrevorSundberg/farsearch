importScripts('tokenizer.js')
importScripts('parser.js')
importScripts('interpreter.js')

let sections
let index
const maxDivisions = 1000

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
    index = e.data.index
    return
  }

  const results = []
  for (const section of sections) {
    const result = interpret(e.data.root, section)

    if (result.score) {
      let index = 0
      let html = '<hr>'
      let nest = 0
      const divisions = result.divisions

      for (let i = 0; i < maxDivisions && i < divisions.length; ++i) {
        const division = divisions[i]
        html += section.text.substring(index, division.index).replace(/\n/g, '<br>')
        index = division.index
        if (division.type == divisionType.BEGIN) {
          const hash = `${division.text}`.hashCode()
          const dark = colorDarkFromNumber(hash)
          const light = colorLightFromNumber(hash * 1257 + 34896)
          html += `<span style="color: ${dark}; background-color: ${light}">`
          ++nest
        } else {
          html += '</span>'
          --nest
        }
      }

      // This can only happen because we can exit the loop early.
      while (nest > 0) {
        html += '</span>'
        --nest
      }

      html += section.text.substring(index, section.text.length).replace(/\n/g, '<br>') + '<br>'
      result.html = html
      result.index = index
      delete result.ranges
      delete result.divisions
      results.push(result)
    }
  }
  results.sort((a, b) => {
    return b.score - a.score
  })

  postMessage({ results, version: e.data.version });
}