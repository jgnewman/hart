const observable = (calculator) => {
  const calc = calculator || function (x) { return x }
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

const observableAsync = (calculator) => {
  const watchers = []
  const observed = observable(calculator)

  let prevVal = observed.get()
  observed.watch((_, prevObservedVal) => prevVal = prevObservedVal)

  let loopRunning = false

  const assertRunLoop = () => {
    if (!loopRunning) {
      loopRunning = true

      const end = () => {
        loopRunning = false
        const nextVal = observed.get()
        watchers.forEach(watcher => watcher(nextVal, prevVal))
      }

      typeof Promise !== "undefined" ? Promise.resolve().then(end) : setTimeout(end, 0)
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
