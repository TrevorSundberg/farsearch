const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const traverse = require('traverse')
const escape = require('escape-html')

const sections = []

const sanitize = (text) => {
  return text.replace(/§/g, '$').replace(/ /g, '')
}

const cfrPath = 'cfrs'
for (const file of fs.readdirSync(cfrPath)) {
  const xmlPath = path.join(cfrPath, file)
  const xmlData = fs.readFileSync(xmlPath, { encoding: 'utf8' })
  xml2js.parseString(xmlData, (err, result) => {
    traverse(result).forEach(function (x) {
      if (this.key == 'SECTION') {

        let hasSubSection = false
        // Make sure there are no other sections under this section.
        traverse(x).forEach(function (y) {
          if (this.key == 'SECTION') {
            hasSubSection = true
            this.stop()
          }
        })

        if (hasSubSection) {
          return
        }

        for (const sourceSection of x) {
          const section = { id: '$0', text: '' }

          traverse(sourceSection).forEach(function (y) {
            if (this.key == 'SECTNO') {
              section.id = sanitize(y.join(''))
            } else if (typeof (y) == 'string' && (this.key === '_' || !isNaN(this.key))) {
              section.text += escape(sanitize(y) + '\n')
            }
          })

          sections.push(section)
        }
      }
    })
  })
}

const output = JSON.stringify(sections)
fs.writeFileSync('../website/json/cfrs.json', output)
