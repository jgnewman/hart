<p align="center">
  <img src="https://github.com/jgnewman/hart/blob/master/assets/logo.svg" alt="Hart" width="137" height="207"/>
</p>

<hr/>

Hart is a lithe, nimble core for scalable web apps.

## TODO

- Update any packages needing updating.
- Benchmark against latest libs.
- Maybe output stuff to shadow root?
- Do we _really_ have to force the user to cache with id or can we cache automatically by just using classes or something?
- Can we replace mounters/dismounters/etc with a hooks system like react?

The main advantage to using Hart over some other component-based framework is that Hart is designed to help you write purely functional apps. _**But don't be scared!**_ The patterns are all very familiar. And since you'll be avoiding mutable state, Hart can provide some optimizations that lead to [fantastic performance](https://github.com/jgnewman/hart/blob/master/BENCHMARKS.md) and a very small footprint in terms of file size, memory consumption, and processing power.

Though tiny (**<9.5kB minified** and **~3.2kB gzipped**), Hart is geared toward scalability. You can spin up a small app with almost no boilerplate, and you can scale it up modularly as needed. The biggest thing to keep in mind is that Hart _really does not want_ you to try to hack some kind of local state into your components (called **"fragments"** in Hart). If you can follow this rule, the two of you should easily fall in love. With that in mind, let me introduce you to Hart...

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
  return fragment.hart("div", { id: "foo" }, "Hello, world!")
})
```

To configure JSX, just pick a transpiler (such as [@babel/plugin-transform-react-jsx](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx)) and set the "pragma" option to `fragment.hart`. Here's a webpack example:

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

Once you have JSX configured, you are ready to start building!

> Note: Hart does not require camel-cased attribute names in JSX. For example, whereas React demands attribute names like `className` and `tabIndex`, Hart will accept `class` and `tabindex` as if you were writing normal HTML. Some older browsers may not accept reserved words like `class` to be used in this way, however, so if you run into this problem, Hart does support two of React's camel-cased versions, specifically `className` and `htmlFor` as well.

## Building apps

A Hart app in its simplest form is a glorified recursive function. You start with a top-level fragment function that generates some HTML, then you call that function with any dynamic data you need to craft the output properly. When it's time to update the DOM (such as when an event handler fires), you call the function again with _new_ data and Hart takes care of diffing and updating the DOM. Here's an example of a minimal Hart app:

```javascript
import { fragment, app } from "hart"

const Root = fragment((props) => {
  return (
    <input
      type="text"
      value={data.value}
      onkeyup={(evt) => renderer.update({ ...props, value: evt.target.value })}
    />
  )
})

const renderer = app(Root, document.getElementById("app"))

renderer.update({ value: "foo" })
```

This pattern is called the **Hart loop** and it requires two functions – `fragment` and `app`. We use `fragment` to create fragments, allowing Hart to build in some optimizations. Next, we use `app` to create a Hart app, which in this case is a combination of a top-level fragment and an HTML container where the app should be rendered. Whenever we want the DOM to update, we call our app's `update` method and pass it some data that gets passed to our fragment as the `props` argument. **Note that `props` should always take the form of a plain object.**

Interestingly, a Hart app doesn't strictly have to render HTML into the DOM. In fact the HTML container argument is optional so, if we wanted to, we could create an app that simply implements a counter. Take a look:

```javascript
import { app } from "hart"

const counter = app((data) => {
  console.log(data.value)
  setTimeout(() => counter.update({ ...data, counter: data.value + 1 }), 1000)
})

counter.update({ value: 0 })
```

The counter may not seem very useful on its own. But, what makes it powerful is the fact that you can register a function to run whenever one of your apps is updated, allowing you to link 2 Hart apps together and have them to work together toward a common goal:

```javascript
import { fragment, app } from "hart"

const renderer = app(
  fragment((data) => <div>{data.value}</div>),
  document.getElementById("app")
)

const counter = app((data) => {
  setTimeout(() => counter.update({
    ...data,
    counter: data.value + 1,
  }), 1000)
})

counter.watch(newData => renderer.update(newData))
counter.update({ value: 0 })
```

In this example, `renderer` is updated every time `counter` is updated. The result is that a user viewing the page will now be able to watch as the number slowly counts upward.

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

const renderer = app(RootFragment, document.getElementById("root"))
renderer.update({ name: "new Hart user" })
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

The problem with relying on the Hart loop's recursive style is that an app requires fragments and fragments also require the app in order to update it. If we want to spread these pieces over multiple files, we'll run into circular import problems. Fortunately the fact that apps are observable and can be cooperative comes to our rescue here.

The following example shows how we can separate concerns between two apps working together to provide a beautifully scalable architecture.

```javascript
import { fragment, app } from "hart"

const reducer = app((change, previousData) => {
  switch (change.type) {

    case "INIT":
      return {
        ...previousData,
        ...change.payload,
      }

    case "UPDATE_COUNTER":
      return {
        ...previousData,
        counter: previousData.counter + 1,
      }

    default:
      return previousData
  }
})

const handleButtonClick = () => {
  reducer.update({ type: "UPDATE_COUNTER" })
}

const renderer = app(
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

reducer.watch(newData => renderer.update(newData))
reducer.update({
  type: "INIT",
  payload: { counter: 0 }
})
```

This ought to feel very familiar to anyone who's ever used [Redux](https://redux.js.org/). One app (the `reducer`) does nothing but manage data transformations in a predictable way. The other app (the `renderer`) manages building the DOM. The renderer also observes the reducer for changes. When event handlers within the renderer trigger updates to the reducer, the updated data is passed back into the renderer which updates the DOM.

This pattern makes it extremely easy to build Hart applications, no fancy middleware or 3rd party tools required.

## Batched updates

Applications created with the `app` function are asynchronous by default. In other words, whenever you call `update`, your app function doesn't immediately run. Instead, new data is generated from the update and your app function is _queued_ to run. This allows you to trigger multiple updates in a single native event loop resulting in only a single update to the DOM once that data reaches its final form. Consider the following:

```javascript
import { fragment, app } from "hart"

const reducer = app((change, prev) => {
  switch (change.type) {
    case "INIT": return { ...prev, ...change.payload }
    case "UPDATE_COUNTER": return { ...prev, counter: prev.counter + 1 }
    default: return prev
  }
})

const renderer = app(
  fragment((props) => <div>{props.counter}</div>),
  document.getElementById("root")
)

reducer.watch(newData => renderer.update(newData))

reducer.update({
  type: "INIT",
  payload: { counter: 0 }
})

setTimeout(() => {
  let i = 0
  while (i < 10) {
    i++
    reducer.update({ type: "UPDATE_COUNTER" })
  }
}, 0)
```

In this example, although `reducer.update` is called 11 times, our renderer only updates the DOM twice (once for the "INIT" update, and once for all 10 "UPDATE_COUNTER" updates).

Because Hart apps are functional, this nuance should be entirely invisible to you, provided you aren't trying to hack in some kind of local state (which you shouldn't be!). But it's important because it allows Hart to maximize speed and efficiency. If, for some reason, you find yourself needing synchronous updates, you can use the `appSync` function instead of the `app` function, although you'll incur a performance penalty for doing so, putting your app more in line with apps built on frameworks that update synchronously.

## Optimizing

Hart makes use of the virtual DOM model, meaning that whenever your app updates, it calculates a slimmed down version of what the new DOM should look like, diffs it against the previous version, and then makes changes.

But with Hart, you'll be writing functional apps. So, assuming you aren't trying to hack in some kind of local state, we can assume that a fragment will always return the same output when given unchanged input and zero children. You can capitalize on this and tell Hart to skip re-computing and re-rendering any given fragment under these conditions by simply giving that fragment an `id` prop.

> Note that all `id`s should be unique (as was always the rule in HTML) otherwise you'll get crazy behavior.

In the following case, without using `id`s, the `NestedFrag` function will run once every second.

```javascript
const RootFrag = fragment((props) => {
  return <NestedFrag value={props.value}/>
})

const renderer = app(RootFrag, rootNode)

setInterval(() => {
  renderer.update({ value: "Hello, world!" })
}, 1000)
```

However, by introducing the `id` prop, `NestedFrag` will only run when its props change. Since they never do, it will only run once.

```javascript
const RootFrag = fragment((props) => {
  return <NestedFrag id="foo" value={props.value}/>
})

const renderer = app(RootFrag, rootNOde)

setInterval(() => {
  renderer.update({ value: "Hello, world!" })
}, 1000)
```

Using `id`s is almost always the recommended course of action. In fact this behavior would be enabled by default but Hart needs you to provide unique names so that it can cache collections of props over time.

## Effects

As much as Hart would like you to build purely functional apps, there are actually a few instances in which it allows you to bend the paradigm just a little bit, specifically if you need access to a real DOM node in the page, if you want to do something only when a node is rendered into the DOM, or if you want to do something when it is removed. In Hart, these cases are handled with "effect" functions.

### Mounting and unmounting

Mounting describes the moment when a real DOM node is rendered onto the page. Similarly, unmounting describes the moment when a real DOM node is removed from the page.

To run a function when a fragment is mounted, you will want to generate a collection of effect functions within your fragment, one of which is `onmount`. You can use this to create a mount handler which you can then use to wrap your fragment's output. For example:

```javascript
const Frag = fragment(props => {
  const { onmount } = effects()

  const handleMount = onmount(() => {
    console.log("I mounted!")
  })

  return handleMount(
    <div>Hello, world!</div>
  )
})
```

The above example will log "I mounted!" only its output div is rendered into the DOM, but not on subsequent invocations of the fragment function.

Similarly, we can create unmount handlers, which will run only when a fragment's output is removed from the DOM. In fact, we can combine mount and unmount handlers:

```javascript
const Frag = fragment(props => {
  const { onmount, onunmount } = effects()

  const handleMount = onmount(() => {
    console.log("I mounted!")
  })

  const handleUnmount = onunmount(() => {
    console.log("I unmounted!")
  })

  return handleUnmount(handleMount(
    <div>Hello, world!</div>
  ))
})
```

The order in which we call our mount and unmount handlers does not matter. However, each handler can only be called once per fragment. In other words, the following won't execute two mount handlers; instead the outer call will simply override the inner call:

```javascript
// Overrides a mount handler
handleMount(handleMount(<div></div>))
```

### Referencing DOM nodes

Getting a reference to a live DOM node is an effect that combines two functions: `refs` and `captureRefs`. You'll use `captureRefs` to wrap a fragment's output and you'll use `refs` to access the live DOM nodes that were captured on the most recent invocation of the fragment function. In order for a node to be captured you must give it a `ref` attribute with a value unique to all refs in that fragment.

```javascript
const Frag = fragment(props => {
  const { refs, captureRefs } = effects()

  const input1focushandler = () => {
    refs().input2.blur()
  }

  const input2focushandler = () => {
    refs().input.blur()
  }

  return captureRefs(
    <div>
      <input class="input1" ref="input1" onfocus={input1focushandler} />
      <input class="input2" ref="input2" onfocus={input2focushandler} />
    </div>
  )
})
```

In this example, because we have wrapped the output with the `captureRefs` function, each of our live input elements has become available by calling `refs`. Note that `captureRefs` can be combined with mount and unmount handlers.

## Chains

Because Hart encourages functional style when writing your apps, you might sometimes end up with a lot of nested function calls, for example:

```javascript
handleMount(handleUnmount(captureRefs(<div></div>)))
```

If you are uncomfortable with this, Hart provides a utility function called `pass` that allows you to simplify your syntax. Using `pass`, the above example becomes the following:

```javascript
import { pass } from "hart"

// ...

pass(<div></div>).to(captureRefs).to(handleUnmount).to(handleMount)()
```

Each invocation of `to` in this example takes as many arguments as you would like to provide. The first argument should be a function and the rest should be arguments that will be passed to that function. Additionally, `to` will take the value of whatever came before it and pass that along as the final argument to the function as well. This is a little tricky to describe, so let's look at another example.

```javascript
const add = (x, y) => {
  return x + y
}

pass(2).to(add, 3)()
//=> returns 5

const combineStr = (toAdd, prevStr) => {
  return prevStr + toAdd
}

pass("Hello")
  .to(combineStr, " ")
  .to(combineStr, "world")
  .to(combineStr, "!")()
//=> returns "Hello world!"
```

In these examples, you should be able to see how arguments are passed down the chain.

## Prefab fragments

Part of Hart's philosophy is that its core should be as tiny as possible to facilitate web apps everywhere. However, there are solutions to a few common use cases that lie outside the responsibilities of the core framework that you can include in your build as desired. Those solutions are _coming soon..._
