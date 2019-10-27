import {
  PIPE_INJECT,
  PIPE_TAP,
  PIPE_GET,
} from "./constants"

const pipe = () => {
  let value = {}
  const taps = []

  return {
    [PIPE_INJECT]: (newValue) => {
      const oldVal = { ...value }
      const newVal = { ...value, ...newValue }
      value = newVal
      taps.forEach(listener => listener(newVal, oldVal))
    },
    [PIPE_TAP]: (listener) => taps.push(listener),
    [PIPE_GET]: () => ({ ...value })
  }
}

const tap = (pipeObject, listener) => pipeObject[PIPE_TAP](listener)
const inject = (pipeObject, data={}) => pipeObject[PIPE_INJECT](data)
const leak = (pipeObject) => pipeObject[PIPE_GET]()

const asyncPipe = () => {
  const basicPipe = pipe()
  const taps = []

  let runLoopExists = false
  let valPriorToRunLoop = null

  const idempotentCreateRunLoop = () => {
    if (!runLoopExists) {
      runLoopExists = true
      valPriorToRunLoop = leak(basicPipe)

      const end = () => {
        const newVal = leak(basicPipe)
        const oldVal = valPriorToRunLoop

        runLoopExists = false
        valPriorToRunLoop = null

        taps.forEach(listener => listener(newVal, oldVal))
      }

      typeof Promise !== "undefined"
        ? Promise.resolve().then(end)
        : setTimeout(end, 0)
    }
  }

  return {
    [PIPE_INJECT]: (newValue) => {
      idempotentCreateRunLoop()
      inject(basicPipe, newValue)
    },
    [PIPE_TAP]: (listener) => taps.push(listener),
    [PIPE_GET]: () => leak(basicPipe)
  }
}

export {
  pipe,
  asyncPipe,
  tap,
  inject,
  leak,
}
