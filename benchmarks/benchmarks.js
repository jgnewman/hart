import { fragment, app } from "../src/index"
import SvelteApp from "./svelte-benchmark"
import SvelteAppForce from "./svelte-benchmark-force"
import {
  largeArr,
  smallArr,
  defer,
  next,
  end,
  populateOutput,
  registerTest,
  registerForceTest,
  init
} from "./setup"

const hCreate = fragment.elem
const rCreate = React.createElement
const pCreate = preact.createElement

init()

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

registerTest(goHart)
registerTest(goVue)
registerTest(goReact)
registerTest(goPreact)
registerTest(goSvelte)

registerForceTest(goHartForce)
registerForceTest(goVueForce)
registerForceTest(goReactForce)
registerForceTest(goPreactForce)
registerForceTest(goSvelteForce)

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

function goHartForce() {
  console.log("running force")
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
        return setTimeout(() => repeat(counter + 1), 0)

      case 2:
        Reducer.update({ type: "SMALL" })
        return setTimeout(() => repeat(counter + 1), 0)

      default:
        return defer(() => end(beginStamp, output, rootNode, goHartForce))
    }
  }

  setTimeout(() => repeat(1), 0)
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

function goVueForce() {
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
  function recurse(count=0) {
    setTimeout(() => {
      count += 1
      if (count === 1 || count === 3) {
        app.items = largeArr
        return recurse(count)
      } else if (count === 2) {
        app.items = smallArr
        return recurse(count)
      } else {
        rootNode = document.querySelector("#vue-app")
        end(beginStamp, output, rootNode, goVueForce)
      }
    }, 0)
  }

  recurse()
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

  const Li = React.memo(props => {
    return rCreate("li", {}, props.val)
  })

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

function goReactForce() {
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
        count: 0,
        lis: [],
      }
    }
    componentDidUpdate() {
      if (this.state.count === 1) {
        setTimeout(() => this.setState({ count: 2, lis: smallArr }), 0)
      } else if (this.state.count === 2) {
        setTimeout(() => this.setState({ count: 3, lis: largeArr }), 0)
      } else if (this.state.count === 3) {
        defer(() => end(beginStamp, output, rootNode, goReactForce))
      }
    }
    componentDidMount() {
      setTimeout(() => this.setState({ count: 1, lis: largeArr }), 0)
    }
    render() {
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

  rootNode.innerHTML = ''

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

function goPreactForce() {
  let beginStamp = null
  const output = document.querySelector('#preact-output')
  const rootNode = document.querySelector('#preact-app')

  rootNode.innerHTML = ''

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
        count: 0,
        lis: [],
      }
    }
    componentDidUpdate() {
      if (this.state.count === 1) {
        setTimeout(() => this.setState({ count: 2, lis: smallArr }), 0)
      } else if (this.state.count === 2) {
        setTimeout(() => this.setState({ count: 3, lis: largeArr }), 0)
      } else if (this.state.count === 3) {
        defer(() => end(beginStamp, output, rootNode, goPreactForce))
      }
    }
    componentDidMount() {
      setTimeout(() => this.setState({ count: 1, lis: largeArr }), 0)
    }
    render() {
      return pCreate('ul', {}, [
        this.state.lis.map(item => pCreate(Li, { key: item+"", val: item }))
      ])
    }
  }
  beginStamp = performance.now()
  const instance = preact.createElement(MyApp)
  preact.render(instance, document.querySelector('#preact-app'))
}

// Test for Svelte
function goSvelte() {
  let beginStamp = null
  const output = document.querySelector('#svelte-output')
  const rootNode = document.querySelector('#svelte-app')

  rootNode.innerHTML = ''

  const skip = document.querySelector('#svelte-skip')
  if (skip.checked) return defer(next)

  populateOutput(output)

  beginStamp = performance.now()

  const svelteApp = new SvelteApp({
    target: rootNode,
    props: {
      largeArr,
      smallArr,
      finish: () => {
        defer(() => end(beginStamp, output, rootNode, goSvelte))
      },
    }
  })
}

function goSvelteForce() {
  let beginStamp = null
  const output = document.querySelector('#svelte-output')
  const rootNode = document.querySelector('#svelte-app')

  rootNode.innerHTML = ''

  const skip = document.querySelector('#svelte-skip')
  if (skip.checked) return defer(next)

  populateOutput(output)

  beginStamp = performance.now()

  const svelteAppForce = new SvelteAppForce({
    target: rootNode,
    props: {
      largeArr,
      smallArr,
      finish: () => {
        defer(() => end(beginStamp, output, rootNode, goSvelteForce))
      },
    }
  })
}
