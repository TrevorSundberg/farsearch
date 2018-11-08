let output = []
let searchQuery
let outputQuery
let displayRequest = null
const maxHtmlPerFrame = 2000

const worker = new Worker('js/worker.js')

$(function () {
  searchQuery = $('#search')
  outputQuery = $('#output')

  $.getJSON('../json/data.json', function (data) {
    worker.postMessage({ sections: data })
    worker.onmessage = e => {
      output = e.data.output
      outputQuery.empty()

      if (displayRequest !== null) {
        window.cancelAnimationFrame(displayRequest)
        displayRequest = null
      }

      const displayNext = i => {
        if (i >= output.length) {
          return
        }

        // Display as much html as we can this frame without lagging.
        let totalHtml = 0
        while (i < output.length) {
          const html = output[i]
          totalHtml += html.length
          outputQuery.append(html)
          ++i

          if (totalHtml > maxHtmlPerFrame) {
            break
          }
        }

        // Call this again next frame.
        displayRequest = window.requestAnimationFrame(() => displayNext(i), 0)
      }

      // Display the first result (the rest will come in gradually).
      displayNext(0)
    }

    searchQuery.on('input', function () {
      const search = $(this).val()

      let root = null
      try {
        const tokens = tokenize(search)
        root = parse(tokens)
        $(this).removeClass('invalid')
      } catch (error) {
        if (error instanceof CompileError) {
          outputQuery.text(error.message)
          $(this).addClass('invalid')
        } else {
          throw error
        }
      }

      if (root) {
        worker.postMessage({ root })
      }
    })

    if (searchQuery.val()) {
      searchQuery.trigger('input')
    }
  })
})
