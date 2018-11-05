const perfStart = performance.now()
let sections
let version = 0
let results = []
let replyCount = 0
let searchQuery
let outputQuery

const workerCount = 10
const workers = []
const maxOutput = 20

for (var i = 0; i < workerCount; ++i) {
  workers.push(new Worker('worker.js'))
}

function chunkify(a, n) {
  if (n < 2)
    return [a]

  let len = a.length
  let out = []
  let i = 0
  let size

  if (len % n === 0) {
    size = Math.floor(len / n);
    while (i < len) {
      out.push(a.slice(i, i += size));
    }
  } else {
    while (i < len) {
      size = Math.ceil((len - i) / n--);
      out.push(a.slice(i, i += size));
    }
  }

  return out;
}

$(function () {
  const perfLoad = performance.now()
  console.log(`Perf Load Page: ${perfLoad - perfStart}ms`)
  searchQuery = $('#search')
  outputQuery = $('#output')

  $.getJSON('../json/data.json', function (data) {
    sections = data

    const perfJson = performance.now()
    console.log(`Perf Load Json: ${perfJson - perfLoad}ms`)

    const sectionChunks = chunkify(sections, workerCount)
    for (let i = 0; i < workerCount; ++i) {
      const worker = workers[i]
      worker.postMessage({ sections: sectionChunks[i], index: i })

      worker.onmessage = e => {
        if (e.data.version !== version) {
          return
        }
        results = results.concat(e.data.results)
        ++replyCount

        if (replyCount !== workerCount) {
          return
        }

        const perfBefore = performance.now()
        results.sort((a, b) => {
          const compare = b.score - a.score
          if (compare !== 0) {
            return compare
          }
          return b.index - a.index
        })
        outputQuery.empty()
        const perfAfter = performance.now()
        console.log(`Perf Sort: ${perfAfter - perfBefore}ms`)

        const displayNextResult = (i, displayVersion) => {
          if (displayVersion != version) {
            return
          }
          if (i >= maxOutput || i >= results.length) {
            return
          }
          const perfBefore = performance.now()

          const html = results[i].html
          outputQuery.append(html)

          // Call this again next frame.
          setTimeout(() => displayNextResult(i + 1, displayVersion), 20)

          const perfAfter = performance.now()
          console.log(`Perf Display: ${perfAfter - perfBefore}ms`)
        }

        // Display the first result (the rest will come in gradually).
        displayNextResult(0, version)
      }
    }
    const perfWorkers = performance.now()
    console.log(`Perf Start Workers: ${perfWorkers - perfJson}ms`)

    searchQuery.on('input', function () {
      const perfBefore = performance.now()
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
        ++version
        replyCount = 0
        results = []

        for (const worker of workers) {
          worker.postMessage({ root, version })
        }
      }
      const perfAfter = performance.now()
      console.log(`Perf Compile & Send: ${perfAfter - perfBefore}ms`)
    })

    if (searchQuery.val()) {
      searchQuery.trigger('input')
    }
  })
})
