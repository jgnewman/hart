function observable(calculator) {
  const calc = calculator ? calculator : x => x
  const watchers = []
  let val = {}

  return {
    get: () => {
      return { ...val }
    },

    update: (change) => {
      const oldVal = { ...val }
      val = { ...calc(change, oldVal) }
      watchers.forEach(watcher => watcher(val, oldVal))
    },

    watch: (watcher) => {
      watchers.push(watcher)
    }
  }
}

function observableAsync(calculator) {
  const watchers = []
  const observed = observable(calculator)

  let prevVal = observed.get()
  observed.watch((_, prevObservedVal) => prevVal = prevObservedVal)

  let loopRunning = false

  function assertRunLoop() {
    if (!loopRunning) {
      loopRunning = true

      Promise.resolve().then(function () {
        loopRunning = false
        const nextVal = observed.get()
        watchers.forEach(watcher => watcher(nextVal, prevVal))
      })
    }
  }

  return {
    update: (change) => {
      observed.update(change)
      assertRunLoop()
    },

    watch: (watcher) => {
      watchers.push(watcher)
    }
  }
}

export {
  observable,
  observableAsync,
}
