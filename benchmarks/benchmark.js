import { fragment, app, appSync } from "../index"

const hCreate = fragment.hart
const rCreate = React.createElement
const pCreate = preact.createElement

const ITERATIONS = 10
const MAX_ITEMS = 10000

const largeArr = []
const smallArr = []
for (let i = 0; i < MAX_ITEMS; i += 1) {
  largeArr.push(i)
  i % 2 === 0 && smallArr[i % 3 === 0 ? 'unshift' : 'push'](i)
}

function average(arr) {
  let total = 0;
  arr.forEach(item => total += item)
  const rawAvg = (total / arr.length) / 1000
  return Math.round(rawAvg * 10000) / 10000
}

function defer(fn, time) {
  setTimeout(fn, time || 0)
}

let timesRan = 0
let durations = []
let currentTest = null

function next() {
  const fns = [goHart, goVue, goReact, goPreact]
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

document.querySelector('#go').addEventListener('click', () => {
  document.querySelector('#hart-output').innerHTML = ''
  document.querySelector('#react-output').innerHTML = ''
  document.querySelector('#preact-output').innerHTML = ''
  document.querySelector('#vue-output').innerHTML = ''
  currentTest = null
  next()
})

function end(beginStamp, outputNode, rootNode, recurser) {
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

function populateOutput(outputNode) {
  if (!outputNode.innerHTML.trim()) {
    outputNode.innerHTML = 'Running...'
  }
}

/*************************************************************************
* Test functions after this point
*
* Each test function should...
* 1. create a begin timestamp ONLY when it's ready to do heavy lifting
* 2. clear any html left over from the previous test
* 3. select the element used for its text output on screen (output node)
* 4. select the element used for determining if the test should be skipped
* 5. call `return defer(next)` if the test should be skipped
* 6. call `populateOutput` with the output node
* 7. execute all library-specific dom stuff
*    - render an empty ul
*    - populate it with li's based on the `largeArr` variable
*    - repopulate it with li's based on the `smallArr` variable
*    - repopulate it again with li's based on the `largeArr` variable
* 8. when finished, call `end` with the begin timestamp, the output node,
*    and the test function for recursion purposes
*
* Once a test function has been written, add it to the `fns` array inside
* the `next` function and make sure it has corresponding markup written.
* Also make sure to clear the text from your associated output in the
* click handler for the go button.
*************************************************************************/

// Test for Hart
function goHart() {
  let beginStamp = null
  const output = document.querySelector('#hart-output')
  const rootNode = document.querySelector('#hart-app')

  const skip = document.querySelector('#hart-skip')
  if (skip.checked) return defer(next)

  rootNode.innerHTML = ''

  populateOutput(output)

  const Li = fragment(props => {
    return hCreate("li", null, props.key)
  })

  const RootFrag = fragment(props => {
    return hCreate("ul", null, props.lis.map(item => {
      return hCreate(Li, { key: item })
    }))
  })

  const Renderer = app(RootFrag, rootNode)

  const Reducer = app((change, prev) => {
    switch (change.type) {
      case "INIT": return { ...prev, lis: [] }
      case "LARGE": return { ...prev, lis: largeArr }
      case "SMALL": return { ...prev, lis: smallArr }
      default: return prev
    }
  })

  Reducer.watch(newVal => Renderer.update(newVal))

  beginStamp = performance.now()

  Reducer.update({ type: "INIT" })

  function repeat(counter) {
    switch (counter) {
      case 1:
      case 3:
        Reducer.update({ type: "LARGE" })
        return repeat(counter + 1)

      case 2:
        Reducer.update({ type: "SMALL" })
        return repeat(counter + 1)

      default:
        return defer(() => end(beginStamp, output, rootNode, goHart))
    }
  }

  repeat(1)
}

// Test for Vue
function goVue() {
  let beginStamp = null
  let rootNode = document.querySelector("#vue-app")
  document.querySelector('#vue-list').innerHTML = '<li v-for="item in items" :key="item">{{item}}</li>'

  const output = document.querySelector('#vue-output')

  const skip = document.querySelector('#vue-skip')
  if (skip.checked) return defer(next)

  populateOutput(output)

  beginStamp = performance.now()

  const app = new Vue({
    el: '#vue-app',
    data: {
      items: []
    }
  })

  // Use this technique if you want to make sure that each
  // update actually gets handled in the update cycle.
  // Vue.nextTick(() => {
  //   app.items = largeArr
  //   Vue.nextTick(() => {
  //     app.items = smallArr
  //     Vue.nextTick(() => {
  //       app.items = largeArr
  //       Vue.nextTick(() => {
  //         rootNode = document.querySelector("#vue-app")
  //         end(beginStamp, output, rootNode, goVue)
  //       })
  //     })
  //   })
  // })

  // Use this technique if you want to measure vue's maximum
  // performance potential.
  app.items = largeArr
  app.items = smallArr
  app.items = largeArr
  Vue.nextTick(() => {
    rootNode = document.querySelector("#vue-app")
    end(beginStamp, output, rootNode, goVue)
  })

}

// Test for React
function goReact() {
  let beginStamp = null
  const output = document.querySelector('#react-output')
  const rootNode = document.querySelector('#react-app')

  // React's cleanup processes are complicated and async, however
  // ReactDOM.render essentially handles this same process. So we don't
  // need to manually clear innerHTML before each round of tests.
  // document.querySelector('#react-app').innerHTML = ''

  const skip = document.querySelector('#react-skip')
  if (skip.checked) return defer(next)

  populateOutput(output)

  const Li = props => {
    return rCreate("li", {}, props.val)
  }

  class MyApp extends React.Component {
    constructor() {
      super()
      this.state = {
        shouldEnd: false,
        lis: [],
      }
    }
    componentDidMount() {
      this.setState({ lis: largeArr })
      this.setState({ lis: smallArr })
      this.setState({ lis: largeArr, shouldEnd: true })
    }
    render() {
      if (this.state.shouldEnd) {
        defer(() => end(beginStamp, output, rootNode, goReact))
      }

      return rCreate('ul', {}, [
        this.state.lis.map(item => rCreate(Li, { key: item+"", val: item }))
      ])
    }
  }

  beginStamp = performance.now()
  const instance = React.createElement(MyApp)
  ReactDOM.render(instance, document.querySelector('#react-app'))
}

// Test for Preact
function goPreact() {
  let beginStamp = null
  const output = document.querySelector('#preact-output')
  const rootNode = document.querySelector('#preact-app')

  document.querySelector('#preact-app').innerHTML = ''

  const skip = document.querySelector('#preact-skip')
  if (skip.checked) return defer(next)

  populateOutput(output)

  const Li = props => {
    return pCreate("li", {}, props.val)
  }

  class MyApp extends preact.Component {
    constructor() {
      super()
      this.state = {
        shouldEnd: false,
        lis: [],
      }
    }
    componentDidMount() {
      this.setState({ lis: largeArr })
      this.setState({ lis: smallArr })
      this.setState({ lis: largeArr, shouldEnd: true })
    }
    render() {
      console.log(this.state)
      if (this.state.shouldEnd) {
        defer(() => end(beginStamp, output, rootNode, goPreact))
      }

      return pCreate('ul', {}, [
        this.state.lis.map(item => pCreate(Li, { key: item+"", val: item }))
      ])
    }
  }
  beginStamp = performance.now()
  const instance = preact.createElement(MyApp)
  preact.render(instance, document.querySelector('#preact-app'))
}
