function store(val = {}) {
  return {
    get: () => ({ ...val }),
    set: newVal => (val = newVal),
  }
}

function observable(calculator) {
  const calc = calculator ? calculator : x => x
  const watchers = []
  let curVal = store()
  let loopRunning = false

  function endLoop() {
    loopRunning = false
    const next = curVal.get()
    watchers.forEach(watcher => watcher(next))
  }

  function assertRunLoop() {
    if (!loopRunning) {
      loopRunning = true
      Promise.resolve().then(endLoop)
    }
  }

  return {
    watch: (watcher) => watchers.push(watcher),

    update: (change) => {
      curVal.set({ ...calc(change, curVal.get()) })
      assertRunLoop()
    },
  }
}

export {
  observable,
}
