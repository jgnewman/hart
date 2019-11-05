<p align="center">
  <img src="https://github.com/jgnewman/hart/blob/master/assets/logo.svg" alt="Hart" width="137" height="207"/>
</p>

<hr/>

Hart is a lithe, nimble core for scalable web apps. It's tiny, component-based, and optimized for speed.

Hart makes use of some familiar patterns – it uses a virtual DOM and integrates with JSX – but it stands out in a few key ways. First, it's tiny. The core framework is **<9.5kB minified** and **~3kB gzipped**. Second: terminology. Components in Hart are called **fragments**. Lastly, Hart asks you to write purely functional apps. (_Don't be scared!_)

When you create a fragment with Hart, you do so with an understanding that as long as the fragment's input doesn't change, neither will its output. In fact, Hart can often go so far as to compare each fragment's input to its previous input and completely skip re-computing and re-rendering the fragment if its input hasn't changed.

With this nuance in mind, and by scaling back on some unnecessary features, Hart is able to deliver insane performance with minimal size and boilerplate, and with patterns that will scale as much as you need.

#### In this doc

- [Getting set up](#getting-set-up)
- [Building apps](#building-apps)
  - [Props](#props)
  - [Nesting](#nesting)
  - [Children](#children)
  - [Architecture](#architecture)
  - [Optimizing](#optimizing)
  - [Effects](#effects)
  - [Chains](#chains)
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

> Note: Hart does not require you to use special, camel-cased attribute names in your JSX. For example, whereas React requires syntax such as `<div className="foo" tabIndex="1">`, Hart requires the native HTML form: `<div class="foo" tabindex="1">`. However, some older browsers may not accept reserved words such as "class" to be used as object keys. In cases where JavaScript reserved words conflict with HTML attributes, Hart supports the React versions of these attributes (such as "className" and "htmlFor").

## Building apps

A Hart app in its simplest form is a glorified recursive function. Consider the following:

```javascript
const copycat = (value) => {
  console.log(value)
  readNextInput(newValue => copycat(newValue))
}

copycat("I'm ready to start copying you!")
```

In this pseudo-code example, every time the `copycat` function is called it logs out its value, waits for user input, and then calls itself again with the value it got from the user. Because there is no mutable state, the function has to be called with a new value in order to produce new results. This is essentially how Hart works. With that in mind, here is an example of an extremely basic Hart app:

```javascript
import { fragment, app } from "hart"

const Root = fragment((data) => {
  return (
    <input
      type="text"
      value={data.value}
      onkeyup={(evt) => renderer.update({ ...data, value: evt.target.value })}
    />
  )
})

const renderer = app(Root, document.getElementById("app"))

renderer.update({ value: "foo" })
```

This example illustrates what we call the **Hart loop**. We begin by importing two Hart functions – `fragment` and `app` – which will, respectively, allow us to create fragments and apps. Our fragment assumes it will take some data with a "value" property, and it returns an HTML text field whose value is controlled by that property.

Our app (which we've called `renderer`) is a combination of our fragment and an HTML container where the app should appear. When we call `renderer.update`, the data we pass in is handed to the fragment and Hart takes care of updating the actual DOM. Whenever the user types into our text field, it will trigger another update call, passing in a copy of the previous data, along with the new field value. This model allows us to avoid mutable state altogether and also allows us to run multiple Hart apps on the same page at once.

Interestingly, a Hart app doesn't strictly have to render HTML into the DOM. You could create an app that simply implements a counter, for example. Take a look:

```javascript
import { app } from "hart"

const counter = app((data) => {
  console.log(data.value)
  setTimeout(() => counter.update({ ...data, counter: data.value + 1 }), 1000)
})

counter.update({ value: 0 })
```

This may not seem like a very useful pattern at first. However, what makes it powerful is the fact that Hart apps are observable, meaning you can register a function to run whenever one of your apps is updated. This allows us to make 2 Hart apps work together toward a common goal:

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

Here we have two apps working together. The `counter` app re-runs itself once per second, incrementing its value each time. When those updates occur, our watcher function picks up the new data and uses it to update the `renderer` app. The result is that a user viewing the page will be able to watch as the number slowly counts upward.

We'll come back to this pattern shortly. For now, let's dig into more of the basics.

### Props

Up until now, we've been using the word "data" to describe a fragment's input. In reality, we usually say that a fragment receives "props". Props must always take the form of an object.

```javascript
import { fragment, app } from "hart"

const RootFragment = fragment((props) => (
  <div>
    Hello, {props.name}!
  </div>
))

const renderer = app(RootFragment, document.getElementById("root"))
renderer.update({ name: "new Hart user" })
```

In this example, our app will generate the sentence, "Hello, new Hart user!" This becomes even more interesting when we start nesting fragments.

### Nesting

In Hart, as in most other component-based frameworks, we can render fragments as children of other fragments. We can then control which props are passed to our nested fragments.

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

In this example, we included our `NestedFragment` inside of the `RootFragment` via JSX syntax. Its props were defined as if they were attributes on an HTML element!

> Note that this only works if our fragments have capitalized names. If a fragment's name isn't capitalized, JSX syntax will assume you want to render a native html element instead of executing a fragment function.

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

### Architecture

We've already seen how a Hart app can be updated by calling its `update` function and passing in new props. But the problem with relying on recursive syntax in such a basic form is that, just as your app will need to import its fragments, your fragments will also need to import your app in order to update it. If we try to spread the Hart loop out over multiple files, we'll start running into circular import problems.

Fortunately, observable apps can come to our rescue here. The following example shows how we can create two apps (one for rendering and one for managing data), that work together to provide a beautifully scalable architecture.

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

This example ought to feel very familiar to anyone who's ever used [Redux](https://redux.js.org/). Here, we've created two apps. The `reducer` app does nothing but give us a predicable way to transform one object into another. It doesn't need to know about our `renderer` app at all and therefore allows us to avoid circular import problems. Additionally, by ensuring that all transformations happen in one place, we can avoid the spaghetti we would inevitably see if we were to perform these transformations all across our fragments.

Our `renderer` app, on the other hand, relies on the data provided by the `reducer`. Whenever the reducer runs, our watcher function will take its value and call `update` on the renderer. This pattern makes it extremely easy to build Hart applications, no fancy middleware, or 3rd party tools required.

#### Batched updates

By default, applications wrapped in Hart's `app` function are asynchronous. In other words, whenever you call `update`, your app function doesn't _immediately_ run. Instead, new data is generated from your update and your app function is queued to run again on the next native run loop. This allows us to avoid cases where we fire multiple updates in quick succession, recalculating every fragment, diffing the virtual DOM, and updating the real DOM for each of those updates. Rather, your app will re-render only once for every update triggered within a single native event loop. Consider the following:

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

In this example, although `reducer.update` is called 11 times, our renderer only recalculates and updates the DOM twice (once for the "INIT" update, and once for all 10 "UPDATE_COUNTER" updates).

Normally, because Hart apps are functional, this nuance will be entirely invisible to you, provided you aren't trying to hack some kind of local state into your fragments (which you shouldn't be!). It will, however, allow your app to maximize its speed and efficiency. If, for some reason, you find yourself needing your app to run synchronously, you can achieve this by using the `appSync` function instead of the `app` function, although you will incur an efficiency penalty in doing so. Fortunately, that penalty will not be worse than using any other framework that re-renders synchronously for every update.

### Optimizing

Because all of your fragments are functions, by default, whenever your app is rendered, Hart will have to invoke every function all the way down the tree in order to find changes between renders and update the DOM appropriately. Other frameworks using virtual DOMs work similarly and they often have some way of optimizing this process. For example, React provides a `shouldComponentUpdate` method allowing you to skip recalculating a given node and its children.

In Hart this is a little simpler. As long as you aren't trying to hack some kind of local state into your fragments (which you shouldn't be!), Hart can safely assume that they will return the same output when given the same props and zero children. To capitalize on this, you can tell Hart to skip re-computing and re-rendering any fragment under safe conditions by simply by giving that fragment an `id` prop.

> Note that all `id`s must be unique to a given fragment, otherwise you'll get crazy behavior.

In the following case, without using `id`s, `NestedFrag` will re-compute once every second.

```javascript
const RootFrag = fragment((props) => {
  return <NestedFrag value={props.value}/>
})

const renderer = app(RootFrag, rootNode)

setInterval(() => {
  renderer.update({ value: "Hello, world!" })
}, 1000)
```

However, by introducing the `id` prop, `NestedFrag` will only recompute when its props change. Since they never do, it will only compute once.

```javascript
const RootFrag = fragment((props) => {
  return <NestedFrag id="foo" value={props.value}/>
})

const renderer = app(RootFrag, rootNOde)

setInterval(() => {
  renderer.update({ value: "Hello, world!" })
}, 1000)
```

Using `id`s is almost always the recommended course of action. The only reason this behavior isn't default is because it requires caching previous props. Since fragments are just functions, Hart needs a way to identify a cached group of previous props for any given invocation of the same function so it's up to you to provide that identifier via an `id`.

### Effects

As functional as Hart is, sometimes it's nice to be able to quickly and easily trigger certain effects at the moment when a fragment has mounted or dismounted the DOM. Additionally, sometimes you need access to a real live DOM node in order to do things such as trigger a blur on a form field. Hart makes all of this easy with "effect" functions. Let's start with mount and dismount:

#### Mounting & Dismounting

Mounting describes the moment when a real DOM node is rendered onto the page. Similarly, dismounting (not "unmounting") describes the moment when a real DOM node is removed from the page.

> **Fun fact:** The reason Hart uses the word "dismount" instead of "unmount" (as we find in similar frameworks) is pretty much only because, before engineers came up with the word "unmount" to describe the process of hopping off of things, "dismount" was already a perfectly good English word that meant the exact same thing. Anyway, "in computer jargon," an unmounted thing usually becomes completely inaccessible to the operating system. It's debatable whether what happens in a case like ours is really all that similar given that the same application that removes the node remains ready to rebuild and append an identical node at a moment's notice. So, effectively, we like to say it's more of a dismount.

To run a function when a fragment is initially mounted, you will want to generate a collection of effect functions within your fragment, one of which is `onmount`. You will use this to create a mount handler which you can then use to wrap your fragment's output. For example:

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

The above example will log "I mounted!" only when its output div is rendered into the DOM. The mount handler will not run for any subsequent invocations of the fragment function, unless it is removed from the DOM and then mounted again later.

Similarly, we can create dismount handlers, which will run only when a fragment's output is removed from the DOM. In fact, we can combine mount and dismount handlers:

```javascript
const Frag = fragment(props => {
  const { onmount, ondismount } = effects()

  const handleMount = onmount(() => {
    console.log("I mounted!")
  })

  const handleDismount = ondismount(() => {
    console.log("I dismounted!")
  })

  return handleDismount(handleMount(
    <div>Hello, world!</div>
  ))
})
```

The order in which we call our mount and dismount handlers does not matter. However, each handler can only be called once per fragment. In other words, the following won't execute two mount handlers; instead the outer call will simply override the inner call:

```javascript
// Overrides a mount handler
handleMount(handleMount(<div></div>))
```

#### Referencing Real DOM Nodes

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

In this example, because we have wrapped the output with the `captureRefs` function, each of our live input elements has become available by calling `refs`. Note that `captureRefs` can be combined with mount and dismount handlers.

### Chains

Because Hart encourages functional style when writing your apps, you might sometimes end up with a lot of nested function calls, for example:

```javascript
handleMount(handleDismount(captureRefs(<div></div>)))
```

If you are uncomfortable with this, Hart provides a utility function called `pass` that allows you to simplify your syntax. Using `pass`, the above example becomes the following:

```javascript
import { pass } from "hart"

// ...

pass(<div></div>).to(captureRefs).to(handleDismount).to(handleMount)()
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

## Prefab Fragments

Part of Hart's philosophy is that its core should be as tiny as possible to facilitate web apps everywhere. However, there are solutions to a few common use cases that lie outside the responsibilities of the core framework that you can include in your build as desired. Those solutions are _coming soon..._

> **TODO:** I think chains could be better. Also, can we do some benchmarks? Also can we rewrite this readme to be shorter and more impactful?
