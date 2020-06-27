<p align="center">
  <img src="https://github.com/jgnewman/hart/blob/master/assets/logo.svg" alt="Hart" width="137" height="207"/>
</p>

<hr/>

Hart is a lithe, nimble core for scalable web apps.

The main advantage to using Hart over some other component-based framework is that Hart is designed to help you write purely functional apps. _**But don't be scared!**_ The patterns are all very familiar. And since you'll be avoiding mutable state, Hart can provide some optimizations that lead to [fantastic performance](https://github.com/jgnewman/hart/blob/master/BENCHMARKS.md) and a very small footprint in terms of file size, memory consumption, and processing power.

Though tiny (**~9.6kB minified** and **~3.3kB gzipped**), Hart is geared toward scalability. You can spin up a small app with almost no boilerplate, and you can scale it up modularly as needed. The biggest thing to keep in mind is that Hart _really does not want_ you to try to hack some kind of local state into your components (called **"fragments"** in Hart). If you can follow this rule, the two of you should easily fall in love. With that in mind, let me introduce you to Hart...

#### In this doc

- [Getting set up](#getting-set-up)
- [Building apps](#building-apps)
  - [Nesting](#nesting)
  - [Children](#children)
  - [Architecture](#architecture)
- [Batched updates](#batched-updates)
- [Optimizing](#optimizing)
- [Effects](#effects)
  - [Mounting and unmounting](#mounting-and-unmounting)
  - [Referencing DOM nodes](#referencing-dom-nodes)
- [Chains](#chains)
- [Prefab fragments](#prefab-fragments)

## Getting set up

The first thing you'll want to do is install Hart, which can be done via `npm install hart` or anything else compatible.

Secondly, you'll probably want to configure it to work with JSX. You don't have to, but it sure is nice to work with. Here is what a fragment will look like with and without JSX:

**With JSX**
```javascript
import { fragment } from "hart"

export default fragment(props => (
  <div id="foo">Hello, world!</div>
))
```

**Without JSX**
```javascript
import { fragment } from "hart"

export default fragment(props => {
  return fragment.jsx("div", { id: "foo" }, "Hello, world!")
})
```

To configure JSX, just pick a transpiler (such as [@babel/plugin-transform-react-jsx](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx)) and set the "pragma" options as follows in this webpack example:

```javascript
{
  test: /\.jsx?$/,
  use: [
    {
      loader: "babel-loader",
      options: {
        plugins: [["@babel/plugin-transform-react-jsx", {
          pragma: "fragment.jsx",
          pragmaFrag: "fragment.jsxFrag"
        }]]
      }
    },
  ]
},
```

Once you have JSX configured, you are ready to start building!

> Note: Hart does not require camel-cased attribute names in JSX. For example, whereas React demands attribute names like `className` and `tabIndex`, Hart will accept `class` and `tabindex` as if you were writing normal HTML. Some older browsers may not accept reserved words like `class` to be used in this way, however, so if you run into this problem, Hart does support two of React's camel-cased versions, specifically `className` and `htmlFor` as well.

## Building apps

A Hart app in its simplest form is a glorified recursive function. You start with a top-level fragment function that generates some HTML, then you call that function with any dynamic data you need to craft the output properly. When it's time to update the DOM (such as when an event handler fires), you call the function again with _new_ data and Hart takes care of diffing and updating the DOM. Here's an example of a minimal Hart app:

```javascript
import { fragment, app } from "hart"

const RootFragment = fragment((props) => {
  return (
    <input
      type="text"
      value={data.value}
      onkeyup={(evt) => App.update({ ...props, value: evt.target.value })}
    />
  )
})

const App = app(RootFragment, document.getElementById("app"))

App.update({ value: "foo" })
```

This pattern is called the **Hart loop** and it requires two functions – `fragment` and `app`. We use `fragment` to create fragments, allowing Hart to build in some optimizations. Next, we use `app` to create a Hart app, which in this case is a combination of a top-level fragment and an HTML container where the app should be rendered. Whenever we want the DOM to update, we call our app's `update` method and pass it some data that gets passed to our fragment as the `props` argument. **Note that `props` should always take the form of a plain object.**

Interestingly, a Hart app doesn't strictly have to render HTML into the DOM. In fact the HTML container argument is optional. So if we wanted to, we could create an app that simply implements a counter. For example:

```javascript
import { app } from "hart"

const Counter = app((data) => {
  console.log(data.value)
  setTimeout(() => Counter.update({ ...data, counter: data.value + 1 }), 1000)
})

Counter.update({ value: 0 })
```

> **NOTE:** If you do provide an output element to the `app` function, you can pass in a selector string instead of an actual DOM node and Hart will select that node for you. You can also pass in an options object as a third argument, which we will get to in a bit.

The counter we've written may not seem very useful on its own. But, what makes it powerful is the fact that you can set up a watcher function that runs whenever one of your apps is updated, thus allowing you to link 2 Hart apps together and have them to work together toward a common goal:

```javascript
import { fragment, app } from "hart"

const Renderer = app(
  fragment((data) => <div>{data.value}</div>),
  document.getElementById("app")
)

const Counter = app((data) => {
  setTimeout(() => Counter.update({
    ...data,
    counter: data.value + 1,
  }), 1000)
})

Counter.watch(newData => Renderer.update(newData))
Counter.update({ value: 0 })
```

In this example, `Renderer` is updated every time `Counter` is updated. The result is that a user viewing the page will now be able to watch as the number slowly counts upward.

We'll come back to this pattern shortly. For now, let's dig into more of the basics.

### Nesting

As you might expect, fragments can be rendered as children of other fragments. When using JSX, the nested fragment's props are written as HTML attributes. Keep in mind that JSX requires fragments to have capitalized names to distinguish them from native HTML elements.

```javascript
import { fragment, app } from "hart"

const NestedFragment = fragment((props) => (
  <p>Hart is {props.adjective}!</p>
))

const RootFragment = fragment((props) => (
  <div>
    <h1>Hello, {props.name}!</h1>
    <NestedFragment adjective="cool" />
  </div>
))

const Renderer = app(RootFragment, document.getElementById("root"))
Renderer.update({ name: "new Hart user" })
```

### Children

In addition to the `props` argument, fragments take a second argument as well – `children`. When passing child nodes to your fragments in JSX, the `children` object allows you to determine where those nodes should be rendered within your fragment's output.

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

### Architecture

We've seen that apps require fragments in order to render DOM. We've also seen that fragments require apps in order to trigger updates. So we need a way to avoid circular dependency problems if we define apps and fragments in different files. This is where watchability really comes to our rescue.

The following example shows how we can separate concerns between two apps working together to provide a beautifully scalable architecture without circular dependencies.

```javascript
// Reducer.js
import { app } from "hart"

export const Reducer = app((change, previousData) => {
  switch (change.type) {
    case "INIT": return { ...previousData, ...change.payload }
    case "UPDATE_COUNTER": return { ...previousData, counter: previousData.counter + 1 }
    default: return previousData
  }
})

// Handlers.js
import { Reducer } from "./Reducer"

export const handleButtonClick = () => {
  Reducer.update({ type: "UPDATE_COUNTER" })
}

// index.js
import { app, fragment } from "hart"
import { Reducer } from "./Reducer"
import { handleButtonClick } from "./Handlers

const Renderer = app(
  fragment((props) => {
    return (
      <div>
        {props.counter}
        <button onclick={handleClickButton}>Click me</button>
      </div>
    )
  }),
  document.getElementById("root")
)

Reducer.watch(newData => Renderer.update(newData))
Reducer.update({
  type: "INIT",
  payload: { counter: 0 }
})
```

This ought to feel very familiar to anyone who's ever used [Redux](https://redux.js.org/). One app (the `Reducer`) does nothing but manage data transformations in a predictable way. The other app (the `Renderer`) manages building the DOM. The Renderer also observes the Reducer for changes and makes use of event handlers that trigger those changes.

This pattern makes it extremely easy to build Hart applications, no fancy middleware or 3rd party tools required.

## Batched updates

Applications created with the `app` function are asynchronous by default. In other words, whenever you call `update`, your app function doesn't immediately run. Instead, new data is generated from the update and your app function is _queued_ to run. This allows you to trigger multiple updates in a single native event loop resulting in only a single update to the DOM once that data reaches its final form. Consider the following:

```javascript
import { fragment, app } from "hart"

// Create a Reducer
const Reducer = app((change, prev) => {
  switch (change.type) {
    case "INIT": return { ...prev, ...change.payload }
    case "UPDATE_COUNTER": return { ...prev, counter: prev.counter + 1 }
    default: return prev
  }
})

// Create a Renderer
const Renderer = app(
  fragment((props) => <div>{props.counter}</div>),
  document.getElementById("root")
)

// Startup the application
Reducer.watch(newData => Renderer.update(newData))
Reducer.update({ type: "INIT", payload: { counter: 0 } })

// Update the Reducer multiple times in quick succession
setTimeout(() => {
  let i = 0
  while (i < 10) {
    i++
    Reducer.update({ type: "UPDATE_COUNTER" })
  }
}, 0)
```

In this example, although `Reducer.update` is called 11 times, our renderer only updates the DOM twice (once for the "INIT" update, and once for all 10 "UPDATE_COUNTER" updates).

Because Hart apps are functional, this nuance should be entirely invisible to you, provided you aren't trying to hack in some kind of local state (which you shouldn't be!). But it's important because it allows Hart to maximize speed and efficiency. If, for some reason, you find yourself needing synchronous updates, you can use the `appSync` function instead of the `app` function, although you'll incur a performance penalty for doing so, putting your app more in line with apps built on frameworks that update synchronously.

## Optimizing

Hart makes use of the virtual DOM model, meaning that whenever your app updates, it calculates a slimmed down version of what the new DOM should look like, diffs it against the previous version, and then makes surgical changes as needed.

But with Hart, you'll be writing functional apps. So, assuming you aren't trying to hack in some kind of local state, we can assume that a fragment will always return the same output when given unchanged input and zero children. You can capitalize on this and tell Hart to skip re-computing and re-rendering any given fragment under these conditions by building your component with `fragment.optim`.

> Note that all fragments built with `fragment.optim` require you to pass in an `id` prop, otherwise you will get an error. As you might expect, `id`s should always be unique (as was always the rule in HTML) otherwise you'll get crazy behavior.

In the following case, without using `fragment.optim`, the `NestedFrag` function will run once every second.

```javascript
const NestedFrag = fragment(props => (
  <span>{props.value}</span>
))

const RootFrag = fragment(props => (
  <NestedFrag value={props.value}/>
))

const Renderer = app(RootFrag, rootNode)

setInterval(() => {
  Renderer.update({ value: "Hello, world!" })
}, 1000)
```

However, by using `fragment.optim`, `NestedFrag` will only run when its props change (by a shallow comparison). Since they never do, it will only run once.

```javascript
const NestedFrag = fragment.optim(props => (
  <span>{props.value}</span>
))

const RootFrag = fragment(props => (
  <NestedFrag id="foo" value={props.value}/>
))

const Renderer = app(RootFrag, rootNOde)

setInterval(() => {
  Renderer.update({ value: "Hello, world!" })
}, 1000)
```

Using `fragment.optim` is almost always the recommended course of action. In fact this behavior would be enabled by default but Hart needs you to provide unique names so that it can cache collections of props over time.

If you need the root fragment of your app to be an optimized fragment, you can pass the `id` into the options object accepted by the `app` function. For example:

```javascript
const Renderer = app(RootFragment, "#app", { id: "my-app" })
```

## Effects

As much as Hart would like you to build purely functional apps, there are actually a few instances in which it allows you to bend the paradigm just a little bit in order to memoize things, get access to real DOM nodes, and trigger side effects under certain conditions. You can do these things with effect functions that are implicitly available within the props argument of all fragments built with `fragment.optim`.

Effect functions are called within the body of your fragments, and some of them require you to pass in dependency arrays, not unlike React's hooks. Dependency arrays determine when an effect should make use of a cached value, or migrate to a new one. If all dependencies remain the same since the last render, cached values and effects will be used.

Here are your available effects:

### `afterEffect`

This allows you to run a function on the next event loop after a fragment has rendered. It takes in a function and a dependency array for determining whether or not the function should run. If your function returns another function, the returned function will serve as a cleanup procedure that runs before running the effect again, or whenever your fragment unmounts from the DOM.

In the following example we define two after-effects. The first one has no dependency array so there is nothing to compare and it runs on every render. The second one uses an empty dependency array, meaning that dependencies will be considered the same from render to render. It will therefore only run on the first render, and it's cleanup function will only run when it unmounts from the DOM.

```javascript
fragment.optim(({ effects }) => {
  const { afterEffect } = effects

  afterEffect(() => {
    console.log("I run after every render!")
  })

  afterEffect(() => {
    return () => {
      console.log("I run only when the fragment unmounts!")
    }
  }, [])

  return <div></div>
})
```

### `memo`

This function allows you to memoize a value across renders. It takes in a function that calculates the value and a dependency array so that the value can be recalculated if any dependencies change.

In the following example, the `fullName` will only be recalculated if the `firstName` or the `lastName` has changed since the previous render. Otherwise, it will not recalculate.

```javascript
fragment.optim(({ effects, firstName, lastName }) => {
  const { memo } = effects
  const fullName = memo(() => `${firstName} ${lastName}`, [firstName, lastName])

  return <span>{fullName}</span>
})
```

### `memoFn`

This function behaves like `memo`, but it returns a cached function rather than a cached value. This is good for creating event handler functions so that you don't trigger unnecessary re-renders by passing in new handler functions to your fragments on every render.

The following example shows a fragment built in two different ways — one with `memoFn` and one without. When `memoFn` is not used, the sub-fragment always re-renders because it is called with a new handler function. When `memoFn` is used, the sub-fragment does not needlessly re-render.

```javascript
// Without memoFn, AnotherFragment always re-renders.
fragment.optim(() => {
 const handler = () => console.log("I ran!")

  return <AnotherFragment id="foo" handler={handler}/>
})

// With memoFn, AnotherFragment is able to use cached output.
// Since the dependency array is empty, we always use a cached function.
fragment.optim(({ effects }) => {
  const { memoFn } = effects

  const handler = memoFn(() => console.log("I ran!"), [])

  return <AnotherFragment id="foo" handler={handler}/>
})
```

### `ref`

This function takes in an initial value, and returns a cached object with a property called `current`, containing the object's _current_ value. This is useful for wrapping frequently-changing values in an object that never changes. It can also be used to get a reference to a real DOM node as shown in the following example:

```javascript
fragment.optim(({ effects }) => {
  const { ref, memoFn } = effects

  const buttonRef = ref(null)
  const logButtonNode = memoFn(() => console.log(buttonRef.current), [buttonRef])

  return (
    <button ref={buttonRef} onclick={logButtonNode}>
      Click me
    </button>
  )
})
```

In this example, we pass the `buttonRef` into our jsx as an attribute called `ref`. By doing this, Hart will automatically keep the ref up to date with the actual DOM node associated with the button. When we click the button, we will get a console log showing us that node.

## Prefab fragments

Part of Hart's philosophy is that its core should be as tiny as possible to facilitate web apps everywhere. However, there are solutions to a few common use cases that lie outside the responsibilities of the core framework that you can include in your build as desired. Those solutions are _coming soon..._
