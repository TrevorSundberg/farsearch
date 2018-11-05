const workerCount = 10
const workers = []

for (var i = 0; i < workerCount; ++i) {
  workers.push(new Worker('worker.js'))
}
