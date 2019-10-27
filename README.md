<p align="center">
  <img src="https://github.com/jgnewman/hart/blob/master/assets/logo.svg" alt="Hart" width="137" height="207"/>
</p>

<hr/>

Hart is a lithe, nimble core for scalable web apps. It's tiny, component-based, and optimized for speed.

Hart makes use of some familiar patterns – it uses a virtual DOM and integrates with JSX – but it stands out in two ways. The first is in terminology: components in Hart are called **fragments**. The second is in the fact that Hart asks you to write purely functional apps.

When you create a fragment with Hart, you do so with an understanding that as long as the fragment's input doesn't change, neither will its output. In fact, Hart goes so far as to compare each fragment's input to its previous input and will completely skip re-computing and re-rendering the fragment if its input hasn't changed.

With this nuance in mind, and by scaling back on some unnecessary features, Hart is able to deliver insane performance with minimal size and boilerplate, and with patterns that will scale as much as you need.

## Getting set up

The first thing you'll want to do is install Hart, which can be done via `npm install hart` or `yarn add hart`.

Secondly, you'll probably want to configure it to work with JSX. You don't have to, but it sure is nicer to work with. Here are your options for creating elements with and without JSX:

**Without JSX**
```javascript
import { fragment } from "hart"

export default fragment(props => {
  return fragment.hart("div", { id: "foo" }, "Hello, world!")
})
```

**With JSX**
```javascript
import { fragment } from "hart"

export default fragment(props => (
  <div id="foo">
    Hello, world!
  </div>
))
```

To configure JSX, you will need a JSX transpiler such as [@babel/plugin-transform-react-jsx](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx). Read the docs for your transpiler of choice and learn how to set the "pragma" configuration option. All you have to do is set that value to "fragment.hart" and you're done! Here is an example webpack rule for reference:

```javascript
{
  test: /\.jsx?$/,
  use: [
    {
      loader: "babel-loader",
      options: {
        plugins: [["@babel/plugin-transform-react-jsx", {
          pragma: "fragment.hart"
        }]]
      }
    },
  ]
},
```

With JSX configured, you are ready to start building with Hart!

## Building apps

A Hart app in its simplest form is a combination of a fragment function and an HTML element where the fragment will be rendered.

Root elements can be selected using whatever method you like, for example `document.getElementById`.

Fragments are created by calling the `fragment` function.

Apps are created by calling the `app` function, and passing it a root element and a fragment. This way you can run multiple Hart apps on the same page without worry. To trigger any and all DOM updates, we call the `render` function.

```javascript
import { fragment, app, render } from "hart"

const RootFragment = fragment(() => (
  <div>
    Hello, world!
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)
render(myApp)
```

### Props

Props are what we call a fragment function's input. We can pass props to our app when we render it like so:

```javascript
import { fragment, app, render } from "hart"

const RootFragment = fragment((props) => (
  <div>
    Hello, {props.name}!
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)
render(myApp, { name: "new Hart user" })
```

In this example, our app will generate the sentence, "Hello, new Hart user!" This becomes even more interesting when we start nesting fragments.

### Nesting

In Hart, as in most other component-based frameworks, we can render fragments as children of other fragments. We can then control which props are passed to our nested fragments.

```javascript
import { fragment, app, render } from "hart"

const NestedFragment = fragment((props) => (
  <p>Hart is {props.adjective}!</p>
))

const RootFragment = fragment((props) => (
  <div>
    <h1>Hello, {props.name}!</h1>
    <NestedFragment adjective="cool" />
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)
render(myApp, { name: "new Hart user" })
```

In this example, we included our `NestedFragment` inside of the `RootFragment` via JSX syntax. Its props were defined as if they were attributes on an HTML element!

> Note that this only works if our fragments have capitalized names. If a fragment's name isn't capitalized, JSX syntax will try to render a native html element instead of executing your fragment function.

### Updating

Obviously, Hart wouldn't be complete if it didn't have a nice, "reactive" way to update the DOM. To make this work, Hart provides a nice pattern and a few utilities, but you are free to devise your own methods as well. The general pattern is extremely simple and works like this: we define an `update` function whose job is to call `render` over and over again. Then we just call `update` whenever we want the DOM to change. For example...

```javascript
import { fragment, app, render } from "hart"

const RootFragment = fragment((props) => (
  <div>
    {props.counter}
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)

let counter = 0
const update = () => render(myApp, { counter: counter++ })
setInterval(update, 1000)
```

In this example, our fragment is meant to display the current value of a counter. Our `update` function simply increments the counter and calls `render` to trigger updates to the DOM. We then set an interval to run this process once per second.

Of course, this is an extremely basic example designed to illustrate a pattern. What's a little more useful are Hart's reactive "pipes".

A pipe in Hart is an observable object. You can tap the pipe with functions that will run when its value is updated and you can inject new values into the pipe which will be passed along to all of your tap functions. Let's rewrite our previous example now using pipes and a button that will trigger updates instead of an interval.

```javascript
import { fragment, app, render } from "hart"
import { pipe, tap, inject } from "hart"

const appData = pipe()

const RootFragment = fragment((props) => (
  <div>
    {props.counter}
    <button onclick={() => inject(appData, { counter: props.counter + 1 })}>
      Click me
    </button>
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)
const update = (props) => render(myApp, props)

tap(appData, update)

inject(appData, { counter: 0 })
```

In this example, our update function taps into the `appData` pipe. Whenever the pipe's value changes, the update function will run. We then inject an object with a counter into that pipe. This object becomes the props that are used to render the app. Within our fragment we also have a button. Whenever we click it, we will inject new data into the pipe, thus triggering the process to run again.

You may notice a couple of problems with this approach. For one, it's not very scalable and it's pretty prone to spaghetti. But now that you get the idea, let's introduce a more scalable pattern:

```javascript
import { fragment, app, render } from "hart"
import { pipe, tap, leak, inject } from "hart"

const appData = pipe()

const updatePipe = (change) => {
  const currentValue = leak(appData)

  switch (change.type) {
    case "INIT":
      return inject(appData, {
        ...currentValue,
        ...change.payload,
      })

    case "UPDATE_COUNTER":
      return inject(appData, {
        ...currentValue,
        counter: currentValue.counter + 1,
      })

    default:
      return
  }
}

const handleClickButton = () => {
  updatePipe({
    type: "UPDATE_COUNTER",
  })
}

const RootFragment = fragment((props) => (
  <div>
    {props.counter}
    <button onclick={handleClickButton}>
      Click me
    </button>
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)
tap(appData, (props) => render(myApp, props))

updatePipe({
  type: "INIT",
  payload: { counter: 0 },
})
```

We now have the beginnings of a highly scalable application architecture. In this example, the entire application responds to a single pipe. This pipe only gets updated in one way – via the `updatePipe` function. This function takes a "change object" and updates the pipe in a predictable way based on the type of change we give it. Notice that we've introduced a new function (`leak`) here, which just grabs the current value of a pipe. Whenever we inject new data into the pipe, we make sure to copy the old data as well.

Within our fragment, the button click handler simply calls `updatePipe` and passes in a change object. Later, when we want to get the app started, we call `updatePipe` and pass in a change that sets our initial data. Because we have tapped our pipe with a function that triggers a render call, the DOM will respond whenever we fire a change.

If you've used [Redux](https://redux.js.org/) before, this should all look very familiar. However, since you will be manually calling the `updatePipe` function and the `inject` function, there is no need for plugins and magic middleware. Your updates can be synchronous or asynchronous, or become as complex as you like. It'll work with anything right out of the box.

Speaking of going asynchronous...

#### Batching updates

Hart tries to avoid doing too many unexpected things behind the scenes. As such, updating your application is synchronous by default. This means that if you inject data into a pipe multiple times in quick succession (if you have some process that triggers a sequence of changes, for example), the DOM will update in response to each change.

This may not be what you want, given that a Hart app is supposed to be declarative and purely functional. What would be really nice would be the ability to amalgamate all the data changes created within a single event loop and trigger a DOM update only once with a final value.

To do this, just use the `asyncPipe` function instead of the `pipe` function. You don't need to change anything else about your application. Assuming you haven't hacked any non-functional code into it, everything should work the same way, but you'll be re-rendering a lot less frequently.

```javascript
import {
  fragment,
  app,
  render,
  asyncPipe,
  tap,
  inject,
} from "hart"

const appData = asyncPipe()

const updatePipe = (change) => {
  const currentValue = leak(appData)

  switch (change.type) {
    case "INIT":
      return inject(appData, {
        ...currentValue,
        ...change.payload,
      })

    case "UPDATE_COUNTER":
      return inject(appData, {
        ...currentValue,
        counter: currentValue.counter + 1,
      })

    default:
      return
  }
}

const RootFragment = fragment((props) => (
  <div>
    {props.counter}
  </div>
))

const myApp = app(document.getElementById("root"), RootFragment)
tap(appData, (props) => render(myApp, props))

updatePipe({
  type: "INIT",
  payload: { counter: 0 },
})

setTimeout(() => {
  let i = 0
  while (i < 10) {
    i++
    updatePipe({ type: "UPDATE_COUNTER" })
  }
}, 0)
```

In this example, the DOM is updated exactly twice, even though 11 total changes are triggered. In the first event loop, the DOM is updated and rendered with initial data. In a separate run loop triggered by the timeout, the counter is incremented 10 times and the DOM updates only once at the end to display the number 10.
