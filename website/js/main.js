let results = []
let searchQuery
let outputQuery

const worker = new Worker('js/worker.js')

$(function () {
  searchQuery = $('#search')
  outputQuery = $('#output')

  $.getJSON('../json/data.json', function (data) {
    worker.postMessage({ sections: data })
    worker.onmessage = e => {
      results = e.data.results
      outputQuery.empty()

      const displayNextResult = (i) => {
        if (i >= results.length) {
          return
        }
        const html = results[i].html
        outputQuery.append(html)

        // Call this again next frame.
        setTimeout(() => displayNextResult(i + 1), 0)
      }

      // Display the first result (the rest will come in gradually).
      displayNextResult(0)
    }

    searchQuery.on('input', function () {
      const search = $(this).val()
      let root = null
      try {
        const tokens = tokenize(search)
        root = parse(tokens)
      } catch (error) {
        if (error instanceof CompileError) {
          outputQuery.text(error.message)
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
