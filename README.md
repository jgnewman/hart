<p align="center">
  <img src="https://github.com/jgnewman/hart/blob/master/assets/logo.svg" alt="Hart" width="137" height="207"/>
</p>

<hr/>

Hart is a lithe, nimble core for scalable web apps.

The main advantage to using Hart over some other component-based framework is that Hart is designed to help you write purely functional apps. _**But don't be scared!**_ The patterns are all very familiar. And since you'll be avoiding mutable state, Hart can provide some optimizations that lead to [fantastic performance](https://github.com/jgnewman/hart/blob/master/BENCHMARKS.md) and a very small footprint in terms of file size, memory consumption, and processing power.

Though tiny (**~11.5kB minified** and **~4kB gzipped/compressed**), Hart is geared toward scalability. You can spin up a small app with almost no boilerplate, and you can scale it up modularly as needed. The biggest thing to keep in mind is that Hart _really does not want_ you to try to hack some kind of quick and dirty local state into your components. If you can follow this rule, the two of you should easily fall in love. With that in mind, let me introduce you to Hart...

#### In this doc

- [Getting set up](#getting-set-up)
- [Building apps](#building-apps)
  - [Nesting](#nesting)
  - [Children](#children)
  - [Architecture](#architecture)
- [Batched updates](#batched-updates)
- [Optimizing](#optimizing)
  - [Shadow DOM](#shadow-dom)
- [Side Effects](#side-effects)
  - [After Effects](#useaftereffect)
  - [Memoized Values](#usememo)
  - [Memoized Functions](#usememofn)
  - [Accessing Real DOM Nodes](#useref)
  - [Rules of Side Effects](#rules-of-side-effects)
- [There must be some way to use local state](#there-must-be-some-way-to-use-local-state)

## Getting set up

The first thing you'll want to do is install Hart, which can be done via `npm install hart` or anything else compatible.

Secondly, you'll probably want to configure it to work with JSX. You don't have to, but it sure is nice to work with. Here is what a component will look like with and without JSX:

**With JSX**
```javascript
import hart from "hart"

export default props => {
  return <div id="foo">Hello, world!</div>
}
```

**Without JSX**
```javascript
import hart from "hart"

export default props => {
  return hart.elem("div", { id: "foo" }, "Hello, world!")
}
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
          pragma: "hart.elem",
          pragmaFrag: "hart.docFrag"
        }]]
      }
    },
  ]
},
```

Once you have JSX configured, you are ready to start building!

> Note: Hart does not require camel-cased attribute names in JSX. For example, whereas React demands attribute names like `className` and `tabIndex`, Hart will accept `class` and `tabindex` as if you were writing normal HTML. Some older browsers may not accept reserved words like `class` to be used in this way, however, so if you run into this problem, Hart does support two of React's camel-cased versions, specifically `className` and `htmlFor` as well.

## Building apps

A Hart app in its simplest form is a glorified recursive function. You start with a top-level component function that generates some HTML, then you call that function with any dynamic data you need to craft the output properly. When it's time to update the DOM (such as when an event handler fires), you call the function again with _new_ data and Hart takes care of diffing and updating the DOM. Here's an example of a minimal Hart app:

```javascript
import hart, { app } from "hart"

const Root = (props) => {
  return (
    <input
      type="text"
      value={data.value}
      onkeyup={(evt) => App.update({ ...props, value: evt.target.value })}
    />
  )
}

const App = app(Root, document.getElementById("app"))

App.update({ value: "foo" })
```

This pattern is called the **Hart loop**. Once we've defined a component and a DOM element where the component should render, we pass them to `app` to create a Hart app. Whenever we want the DOM to update, we call our app's `update` method and pass it some data that gets handed to our component as the `props` argument. **Note that `props` should always take the form of a plain object.**

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
import hart, { app } from "hart"

const Renderer = app(
  (data) => <div>{data.value}</div>,
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

As you might expect, components can be rendered as children of other components. When using JSX, the nested component's props are written as HTML attributes. Keep in mind that JSX requires components to have capitalized names to distinguish them from native HTML elements.

```javascript
import hart, { app } from "hart"

const NestedComponent = (props) => (
  <p>Hart is {props.adjective}!</p>
)

const RootComponent = (props) => (
  <div>
    <h1>Hello, {props.name}!</h1>
    <NestedComponent adjective="cool" />
  </div>
))

const Renderer = app(RootComponent, document.getElementById("root"))
Renderer.update({ name: "new Hart user" })
```

### Lists

Sometimes you may need to include an array of elements in your JSX. For example:

```javascript
const Component = ({ personList }) => (
  <div>
    {personList.map(person => <span key={person.id}>{person.name}</span>)}
  </div>
)
```

In this case, note the use of the `key` prop on each span we generate in our iteration. Giving each item in your list a unique key is something Hart requires you to do so that it can optimize diffing an array across renders. It will not actually appear in the item's `props` object, but Hart _will_ throw an error if you forget to include keys.

### Children

In addition to the `props` argument, components take a second argument as well – `children`. When passing child nodes to your components in JSX, the `children` object allows you to determine where those nodes should be rendered within your component's output.

```javascript
const NestedComponent = (props, children) => (
  <p>{children}</p>
)

const RootComponent = (props) => (
  <div>
    <NestedFragment>
      <span></span>
      <span></span>
      <span></span>
    </NestedFragment>
  </div>
)
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

We've seen that apps require components in order to render DOM. We've also seen that components require apps in order to trigger updates. So we need a way to avoid circular dependency problems if we define apps and components in different files. This is where watchability really comes to the rescue.

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
import hart, { app } from "hart"
import { Reducer } from "./Reducer"
import { handleButtonClick } from "./Handlers

const Root = (props) => {
  return (
    <div>
      {props.counter}
      <button onclick={handleClickButton}>Click me</button>
    </div>
  )
}

const Renderer = app(Root, document.getElementById("root"))

Reducer.watch(newData => Renderer.update(newData))

Reducer.update({
  type: "INIT",
  payload: { counter: 0 }
})
```

This ought to feel very familiar to anyone who's ever used [Redux](https://redux.js.org/). One app (the `Reducer`) does nothing but manage data transformations in a predictable way. The other app (the `Renderer`) manages building the DOM. The Renderer also observes the Reducer for changes and makes use of event handlers that trigger those changes.

This pattern makes it extremely easy to build Hart applications, no fancy middleware or 3rd party tools required.

## Batched updates

Applications created with the `app` function are asynchronous. In other words, whenever you call `update`, your app function doesn't immediately run. Instead, new data is generated from the update and your app function is _queued_ to run. This allows you to trigger multiple updates in a single native event loop resulting in only a single update to the DOM once that data reaches its final form. Consider the following:

```javascript
import hart, { app } from "hart"

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
  (props) => <div>{props.counter}</div>,
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

Because Hart apps are functional, this nuance should be entirely invisible to you, provided you aren't trying to hack in some kind of local state (which you shouldn't be!). But it's important because it allows Hart to maximize speed and efficiency.

## Optimizing

Hart makes use of the virtual DOM model, meaning that whenever your app updates, it calculates a slimmed down version of what the new DOM should look like, diffs it against the previous version, and then makes surgical changes as needed.

But with Hart, you'll be writing functional apps. So, assuming you aren't trying to hack in some kind of local state, we can assume that a component will always return the same output when given unchanged input and zero children. By default, Hart capitalizes on this and skips re-computing any given component under these conditions.

If you ever have an edge case need to disable prop caching for a given component, you can do so by wrapping it in a call to `withoutCache`, for example `export default withoutCache(MyComponent)`.

In the following case, by disabling caching, the `Nested` function will re-compute once every second.

```javascript
const Nested = withoutCache(props => (
  <span>{props.value}</span>
))

const RootFrag = props => (
  <Nested value={props.value}/>
)

const Renderer = app(RootFrag, rootNode)

setInterval(() => {
  Renderer.update({ value: "Hello, world!" })
}, 1000)
```

However, by allowing Hart to apply its default optimizations, `Nested` will only run when its props change. Since they never do, it will only run once.

```javascript
const NestedFrag = props => (
  <span>{props.value}</span>
))

const RootFrag = props => (
  <Nested value={props.value}/>
))

const Renderer = app(RootFrag, rootNOde)

setInterval(() => {
  Renderer.update({ value: "Hello, world!" })
}, 1000)
```

By default, Hart performs a shallow equality check against props objects to determine whether or not they have changed. If you would rather roll your own prop comparison function, you can wrap your component in a call to `withPropCheck` and pass one in as the second argument. Your comparator function should take two arguments (previous props and next props), and return a boolean indicating whether or not the props are _equal_.

```javascript
const MyComponent = props => <div></div>

export default withPropCheck(MyComponent, (prevProps, nextProps) => {
  if (prevProps.foo === nextProps.foo) {
    return true
  } else {
    return false
  }
})
```

> **NOTE:** If a given component has children, it will always re-render, regardless of whether or not props have changed. Due to the fact that components have the access to and can therefore modify their children (especially via side effects), it is too dangerous to skip re-rendering components that have them.

> **NOTE:** Allowing Hart to cache props and optimize _almost always_ the right course of action. If you think you might want to disable this, think twice, and make sure you are absolutely sure you know what you're doing. If you are following good practices and aren't trying to hack things in some weird way, you should almost never need to do it.

### Shadow DOM

The `app` function takes three arguments: a root component function, an optional DOM element for rendering, and an optional object where you can include some app-level settings. One of these settings allows you to render your app within a shadow DOM in order to shield it from things like external CSS.

To enable this, simply set `useShadowRoot` to `true` in your options object.

```javascript
const Renderer = app(Root, "#app", { useShadowRoot: true })
```

## Side Effects

As much as Hart would like you to build purely functional apps, there are actually a few instances in which it allows you to bend the paradigm just a little bit in order to memoize things, get access to real DOM nodes, and trigger side effects under certain conditions. You can do these things with side effect functions, which are nearly exactly the same as [React's "hooks"](https://reactjs.org/docs/hooks-intro.html). In fact, they are so similar that existing linters for React hooks will be compatible with Hart side effects.

Side effect functions are called within the body of your components, and some of them require you to pass in dependency arrays. Dependency arrays determine when an effect should make use of a cached value, or migrate to a new one. If all dependencies in a given render remain the same since the last render, cached values and effects will be used.

Here are your available side effects:

### `useAfterEffect`

This allows you to run a function on the next event loop after a component has rendered. It takes in a function and a dependency array for determining whether or not the function should run. If your after-effect function returns another function, the returned function will serve as a cleanup procedure that runs before running the effect again, or whenever your component unmounts from the DOM.

In the following example we define two after-effects. The first one has no dependency array so there is nothing to compare and it runs on every render. The second one uses an empty dependency array, meaning that dependencies will be considered the same from render to render. It will therefore only run on the first render, and it's cleanup function will only run when it unmounts from the DOM.

```javascript
import hart, { useAfterEffect } from "hart"

const MyComponent = () => {

  useAfterEffect(() => {
    console.log("I run after every render!")
  })

  useAfterEffect(() => {
    return () => {
      console.log("I run only when the component unmounts!")
    }
  }, [])

  return <div></div>
})
```

### `useMemo`

This function allows you to memoize a value across renders. It takes in a function that calculates the value and a dependency array so that the value can be recalculated if any dependencies change.

In the following example, the `fullName` will only be recalculated if the `firstName` or the `lastName` has changed since the previous render. Otherwise, it will not recalculate.

```javascript
import hart, { useMemo } from "hart"

const MyComponent = ({ firstName, lastName }) => {
  const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName])

  return <span>{fullName}</span>
}
```

### `useMemoFn`

This function behaves like `useMemo`, but it returns a cached function rather than a cached value. This is good for creating event handler functions so that you don't trigger unnecessary re-renders by passing in new handler functions to your components on every render.

The following example shows a component built in two different ways — one with `useMemoFn` and one without. When `useMemoFn` is not used, the sub-component always re-renders because it is called with a new handler function. When `useMemoFn` is used, the sub-component does not needlessly re-render.

```javascript
import hart, { useMemoFn } from "hart"

// Without memoFn, SubComponent always re-renders.
const MyComponent = () => {
 const handler = () => console.log("I ran!")

  return <SubComponent handler={handler}/>
}

// With memoFn, SubComponent is able to use cached output.
// Since the dependency array is empty, we always use a cached function.
const MyComponent = () => {
  const handler = useMemoFn(() => console.log("I ran!"), [])

  return <SubComponent handler={handler}/>
}
```

### `useRef`

This function takes in an initial value, and returns a cached object with a property called `current`, containing the object's _current_ value. This is useful for wrapping frequently-changing values in an object that never changes. It can also be used to get a reference to a real DOM node as shown in the following example:

```javascript
import hart, { useMemoFn, useRef } from "hart"

const MyComponent = () => {
  const buttonRef = useRef(null)
  const logButtonNode = useMemoFn(() => console.log(buttonRef.current), [buttonRef])

  return (
    <button ref={buttonRef} onclick={logButtonNode}>
      Click me
    </button>
  )
}
```

In this example, we pass the `buttonRef` into our jsx as an attribute called `ref`. By doing this, Hart will automatically keep the ref up to date with the actual DOM node associated with the button. When we click the button, we will get a console log showing us that node.

### Rules of Side Effects

Side effects only work because Hart algorithmically keeps track of which component is rendering at any given time. Because of this, you need to call them at the "top level" of your functions. They won't work if you try to call them within any kind of context that isn't always guaranteed to be the same all the time, for example within conditions or within nested iterator functions. So the following would be bad:

```javascript
// BAD EXAMPLE 1
const Component = ({ foo }) => {

  if (foo) {
    useAfterEffect(() => foo(), [foo]) // <- DO NOT DO THIS
  }

  return <div></div>
}

// BAD EXAMPLE 2
const Component = ({ foo }) => {

  const memoFn = useMemoFn(() => {
    const ref = useRef(foo) // <- DO NOT DO THIS
    doSomethingWith(ref)
  })

  return <div></div>
}
```

However, if you can guarantee that your side effects will always be called in the same way every time your function is called, then it's actually safe to start building your own side effects and breaking them out into other functions. For example:

```javascript
function usePreviousValue(next) {
  const ref = useRef()
  const { current: previous } = ref
  ref.current = next
  return previous
}

const Component = ({ foo }) => {
  const prevFoo = usePreviousValue(foo)
  return <div>{prevFoo !== foo ? "Prop changed!" : "Prop did not change!"}</div>
}
```

The above example is safe because all side effects are always called the same way every time the component renders.

## There must be some way to use local state

Ok, fine. You got me. There technically _is_ a way to do this. After all, how else are you going to build cool, prefab components with sweet, built-in behaviors without any local state?

If you're clever, you may have begun to wonder whether or not you could use effects to mount an app inside another app. If such a thing were possible, your subapp could respond to its own reducer, which would behave very much like local state. And you are absolutely correct. This is the one and only way to get local state within Hart. But it's a ridiculously tedious process, which is why Hart provides a convenient way to do it quickly.

To help you make sense of it, here's the basic gist of how you would mount an app inside another app if you were to do it manually:

```javascript
import hart { useAfterEffect, useRef } from "hart"

// This component will get mounted into our subapp.
// We want it to use a number called `count` as local
// state, and we want to be able to trigger re-renders
// with a `setCount` function that updates that state.
const SubappRoot = ({ count, setCount }) => {

  useAfterEffect(() => {
    setTimeout(() => setCount(count + 1), 1000)
  }, [count])

  return (
    <div>I've been updated {count} times!</div>
  )
}

// To make it work, this component will need to create a
// subapp and attach that app to a DOM node in the parent app.
const SubappWrapper = (nextProps, children) => {

  // We'll need a reference to the actual DOM node
  const rootNodeRef = useRef()

  // We'll also need a couple refs for the props and children
  // we want to pass down to the subapp. Otherwise useAfterEffect
  // would run more than once.
  const propsRef = useRef({ ...nextProps })
  const childRef = useRef(children)

  // Next we set up an after-effect with dependencies that never
  // change. This way, it will only run once on mount.
  useAfterEffect(() => {
    const { current: rootNode } = rootNodeRef
    const { current: props } = propsRef
    const { current: nestedChildren } = childRef

    // We create a Renderer app for DOM stuff and a Counter app
    // to serve as local state. It will contain a single property
    // called `count` that we can increment.
    const Renderer = app(SubappRoot, rootNode)
    const Counter = app((inc, prev) => ({ counter: (prev.count || 0) + inc }))

    // We start watching the Counter for updates. When we get them,
    // we'll update the renderer with the new count, a function for
    // updating the counter, the current props, and the children.
    Counter.watch(({ count }) => {
      Renderer.update({
        count,
        setCount: Counter.update,
        nestedChildren,
        ...props,
      })
    })

    // We'll initialize the app with some data.
    Counter.update(1)

  }, [propsRef, childRef, rootNodeRef])

  // Lastly, we return the node that will serve as the mounting
  // wrapper for our subapp.
  return (
    <div ref={subrootRef}></div>
  )
}

// Having done all this, we can finally use our subapp:
<SubappWrapper />
```

_Whew!_

As I said before, this is ridiculously tedious. It also has the rather glaring problem that if you want to pass children down to a subapp, you have to pass them as a prop, which creates inconsistency in terms of how you would have to write fragments that served as subapp roots. Not only that, but this is just a proof-of-concept and in real life you will probably run into some interesting bugs that are hard to diagnose.

This POC _should_ work though! And because of this, Hart provides an easier way to accomplish the exact same thing, with the added benefit that children can be bassed down and accessed as a second argument to your component. So before we get into it, the important takeaways are:

1. To use local state, you have to create a subapp within your app.
2. Subapps mount during after-effects, so they always render after the parent app has finished rendering.
3. A subapp is, itself, a side effect, meaning that although it mounts and unmounts correctly, and can take in values from the parent app, the parent app will have _no knowledge of its existence._

Here's how you do it:

```javascript
import hart, { subapp, useAfterEffect } from "hart"

const SubApp = subapp(({ localData, update ...props }, children) => {
  const { count } = localData

  useAfterEffect(() => {
    setTimeout(() => update(count + 1), 1000)
  }, [count])

  return (
    <div>I've been updated {count} times!</div>
  )
}, {
  reducer: (count) => ({ count }),
  init: 1,
})
```

The first thing to notice here is that we are wrapping our component in a call to the `subapp` function. Doing so gets us two new props automatically injected into our props object – namely `localData` and `update`. `localData` contains all of your local state, and `update` can be used to update that state and trigger a re-render. Any props passed in are available as well, as are the children, as a second argument to the component function.

Subapps are also highly customizable via a `settings` object passed in as a second argument to `subapp`. Here are your available options:

- `init`: An initial value to be passed to your reducer. Defaults to `null`.
- `options`: An app options object as described above. Defaults to `{ id: id + "-subapp" }`.
- `reducer`: A function for generating new state from an update value. Defaults to `change => ({ current: change })`.
- `wrapper`: JSX specifying the node that the subapp will mount itself to. Defaults to `<div></div>`.

