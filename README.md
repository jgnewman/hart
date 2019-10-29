<p align="center">
  <img src="https://github.com/jgnewman/hart/blob/master/assets/logo.svg" alt="Hart" width="137" height="207"/>
</p>

<hr/>

Hart is a lithe, nimble core for scalable web apps. It's tiny, component-based, and optimized for speed.

Hart makes use of some familiar patterns – it uses a virtual DOM and integrates with JSX – but it stands out in a few key ways. First, it's tiny. The core framework is **~ 9.5kB minified** and **~ 3.5kB gzipped**. Second: terminology. Components in Hart are called **fragments**. Lastly, Hart asks you to write purely functional apps. (_Don't be scared!_)

When you create a fragment with Hart, you do so with an understanding that as long as the fragment's input doesn't change, neither will its output. In fact, Hart can often go so far as to compare each fragment's input to its previous input and completely skip re-computing and re-rendering the fragment if its input hasn't changed.

With this nuance in mind, and by scaling back on some unnecessary features, Hart is able to deliver insane performance with minimal size and boilerplate, and with patterns that will scale as much as you need.

#### In this doc

- [Getting set up](#getting-set-up)
- [Building apps](#building-apps)
  - [Props](#props)
  - [Nesting](#nesting)
  - [Children](#children)
  - [Updating](#updating)
  - [Optimizing](#optimizing)
- [Prefab Fragments](#prefab-fragments)

## Getting set up

The first thing you'll want to do is install Hart, which can be done via `npm install hart` or `yarn add hart`.

Secondly, you'll probably want to configure it to work with JSX. You don't have to, but it sure is nice to work with. Here are your options for creating fragments with and without JSX:

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
  <div id="foo">Hello, world!</div>
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

> Note: Hart does not require you to use special, camel-cased attribute names in your JSX. For example, whereas React requires syntax such as `<div className="foo" tabIndex="1">`, Hart will allow the native HTML form: `<div class="foo" tabindex="1">`. However, some older browsers may not accept reserved words such as "class" to be used as object keys. In cases where JavaScript reserved words conflict with HTML attributes, Hart supports the React versions of these attributes (such as "className" and "htmlFor").

## Building apps

A Hart app in its simplest form is a combination of a fragment function and a root HTML element where the fragment will be rendered.

Root elements can be selected using whatever method you like, for example `document.getElementById`.

Fragments are created by calling the `fragment` function.

Apps are created by calling the `app` function, and passing it a root element and a fragment. This way you can run multiple Hart apps on the same page without worry. To trigger any and all DOM updates, we call the `render` function.

```javascript
import { fragment, app, render } from "hart"

const rootElement = document.getElementById("root")

const RootFragment = fragment(() => (
  <div>
    Hello, world!
  </div>
))

const myApp = app(rootElement, RootFragment)
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

### Children

We've already seen how each fragment takes a props argument. However, fragments can take a second argument as well: children. Let's look at an example of how it works, and then we'll talk through it.

```javascript
const NestedFragment = fragment((props, children) => (
  <p>{children}</p>
))

const RootFragment = fragment((props) => (
  <div>
    <NestedFragment>
      <span></span>
      <span></span>
      <span></span>
    </NestedFragment>
  </div>
))
```

This structure will produce the following output:

```html
<div>
  <p>
    <span></span>
    <span></span>
    <span></span>
  </p>
</div>
```

In Hart, you can nest children within your fragments by using opening/closing tag syntax instead of self-closing tag syntax. When you do, those children are wrapped up in a special object we call `children` so that you can determine where they should appear in your fragment's output.

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

In this example, our fragment is meant to display the current value of a counter. Our `update` function simply increments the counter and calls `render` to trigger updates to the DOM. We then set an interval to run this process once per second. This pattern is called the **Hart loop**.

Of course, this is an extremely basic example designed to illustrate a pattern. To help us put our loop together cleanly, we can use Hart's reactive "pipes".

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

In this example, our update function taps into the `appData` pipe. Whenever the pipe's value changes, the update function will run. We then inject an object with a counter into that pipe. This object becomes the props that are used to render the app. Within our fragment we also have a button. Whenever we click it, we will inject new data into the pipe, thus triggering the Hart loop to run again.

You may notice a couple of problems with this approach. For one, it's not very scalable and it's pretty prone to spaghetti. But now that you get the idea, let's introduce a more scalable technique:

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

Within our fragment, the button's click handler simply calls `updatePipe` and passes in a change object. Later, when we want to get the app started, we call `updatePipe` and pass in a change that sets our initial data. Because we have tapped our pipe with a function that triggers a render call, the DOM will respond whenever we fire a change.

If you've used [Redux](https://redux.js.org/) before, this should all look very familiar. However, since you will be manually calling the `updatePipe` function and the `inject` function, there is no need for plugins and magic middleware. Your updates can be synchronous or asynchronous, or become as complex as you like. It'll work with anything right out of the box.

Speaking of going asynchronous...

#### Batching updates

Hart tries to avoid doing too many unexpected things behind the scenes. As such, updating your application is synchronous by default. This means that if you inject data into a pipe multiple times in quick succession (if you have some process that triggers a sequence of changes, for example), the DOM will update in response to each change.

This may not be what you want, given that a Hart app is supposed to be declarative and purely functional. What would be really nice would be the ability to combine all the data changes created within a single event loop and trigger a DOM update only once with a final value.

To do this, just use the `asyncPipe` function instead of the `pipe` function. You don't need to change anything else about your application. Assuming you haven't hacked any non-functional code into it (which you shouldn't have!), everything should work the same way, but you'll be re-rendering a lot less frequently.

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

### Optimizing

Because all of your fragments are functions, by default, whenever your app is rendered, Hart will have to invoke every function all the way down the tree in order to find changes between renders and update the DOM appropriately. Other frameworks using virtual DOMs work similarly and they often have some way of optimizing this process. For example, React provides a `shouldComponentUpdate` method allowing you to skip recalculating a given node and its children.

In Hart this is a little simpler. As long as you aren't trying to hack some kind of local state into your fragments (which you shouldn't be!), Hart can safely assume that they will return the same output when given the same props and zero children. To capitalize on this, you can tell Hart to skip re-computing and re-rendering any fragment under safe conditions by simply by giving that fragment an `id` prop.

> Note that all `id`s must be unique to a given fragment, otherwise you'll get crazy behavior.

In the following case, without using `id`s, `NestedFrag` will re-compute once every second.

```javascript
const rootFrag = fragment((props) => {
  return <NestedFrag value={props.value}/>
})

const myApp = app(rootNode, rootFrag)

setInterval(() => {
  render(myApp, { value: "Hello, world!" })
}, 1000)
```

However, by introducing the `id` prop, `NestedFrag` will only recompute when its props change. Since they never do, it will only compute once.

```javascript
const rootFrag = fragment((props) => {
  return <NestedFrag id="foo" value={props.value}/>
})

const myApp = app(rootNode, rootFrag)

setInterval(() => {
  render(myApp, { value: "Hello, world!" })
}, 1000)
```

Using `id`s is almost always the recommended course of action. The only reason this behavior isn't default is because it requires caching previous props. Since fragments are just functions, Hart needs a way to identify a cached group of previous props for any given invocation of the same function so it's up to you to provide that identifier via an `id`.

## Prefab Fragments

Part of Hart's philosophy is that its core should be as tiny as possible to facilitate web apps everywhere. However, there are solutions to a few common use cases that lie outside the responsibilities of the core framework that you can include in your build as desired. Those solutions are _coming soon..._
