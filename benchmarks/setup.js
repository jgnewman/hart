const ITERATIONS = 10
const MAX_ITEMS = 10000
let runForceRenderTests = false

export const largeArr = []
export const smallArr = []
for (let i = 0; i < MAX_ITEMS; i += 1) {
  largeArr.push(i)
  i % 2 === 0 && smallArr[i % 3 === 0 ? 'unshift' : 'push'](i)
}

const TEST_ARRAY = []
const TEST_ARRAY_FORCE = []

export function registerTest(fn) {
  TEST_ARRAY.push(fn)
}

export function registerForceTest(fn) {
  TEST_ARRAY_FORCE.push(fn)
}

function average(arr) {
  let total = 0;
  arr.forEach(item => total += item)
  const rawAvg = (total / arr.length) / 1000
  return Math.round(rawAvg * 10000) / 10000
}

export function defer(fn, time) {
  setTimeout(fn, time || 0)
}

let timesRan = 0
let durations = []
let currentTest = null

export function next() {
  const fns = runForceRenderTests ? TEST_ARRAY_FORCE : TEST_ARRAY
  timesRan = 0
  durations = []
  if (!currentTest) {
    currentTest = fns[0]
    return currentTest()
  }
  const index = fns.indexOf(currentTest)
  currentTest = fns[index + 1] || null
  if (!currentTest) return;
  return currentTest()
}

export function end(beginStamp, outputNode, rootNode, recurser) {
  defer(() => {
    const endStamp = performance.now()
    timesRan += 1
    durations.push(endStamp - beginStamp)
    if (timesRan < ITERATIONS) {
      outputNode.innerHTML = outputNode.innerHTML + '.'
      recurser()
    } else {
      outputNode.innerHTML = `Average seconds: ${average(durations)}`
      rootNode.innerHTML = ""
      defer(next, 1000)
    }
  })
}

export function populateOutput(outputNode) {
  if (!outputNode.innerHTML.trim()) {
    outputNode.innerHTML = 'Running...'
  }
}

export function init() {
  document.querySelector('#go').addEventListener('click', () => {
    runForceRenderTests = false
    document.querySelector('#hart-output').innerHTML = ''
    document.querySelector('#react-output').innerHTML = ''
    document.querySelector('#preact-output').innerHTML = ''
    document.querySelector('#vue-output').innerHTML = ''
    currentTest = null
    next()
  })

  document.querySelector('#go-force').addEventListener('click', () => {
    runForceRenderTests = true
    document.querySelector('#hart-output').innerHTML = ''
    document.querySelector('#react-output').innerHTML = ''
    document.querySelector('#preact-output').innerHTML = ''
    document.querySelector('#vue-output').innerHTML = ''
    currentTest = null
    next()
  })
}
