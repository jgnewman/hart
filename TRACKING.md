# How Side Effects Are Applied To The Right Components

In order to understand how Hart knows which memoized side-effect values are associated with any given instance of a component, you first need to know the answer to another question. Specifically...

## How does Hart algorithmically keep track of the current component rendering at any given time?

Let's start with the basics.

If you want to use a virtual DOM, then your JSX ultimately has to build a tree of objects that describe what the DOM should look like. In our case, JSX is transpiled to `hart.elem` calls. You might conceptualize a scaled-down version of `hart.elem` as looking something like this:

```javascript
hart.elem = function(tag, attrs = {}, ...children) {

  if (typeof tag === "function") {
    return tag(attrs, children)
  }

  return {
    tag,
    attrs,
    children,
    html: null,
  }

}
```

When the first render occurs, we build all of our html for the first time and store references to real DOM nodes in the proper places in our virtual node objects. We also hold on to this virtual tree in memory so that when the next render occurs, we can recursively compare old virtual nodes to new ones and do what we need to with the html nodes whenever we detect a change.

The trick is that our components are just functions. This means that a JSX structure like the following...

```javascript
<A>
  <B>
    <C/>
  </B>
</A>
```

...essentially amounts to our tree being generated via functions called like `A(B(C()))`. This is a problem because the innermost functions are called _before_ their returned values can be passed to the outermost functions. Thus these nested calls have _no knowledge_ of the calls they are nested within. In other words, by default we are trying to recursively build our virtual tree from the inside out. Doing it this way prevents us from being able to track which functions are being called relative to the position of any other functions.

So instead, Hart builds the tree from the outside in. Here's a simple way we could modify our scaled-down code to make that work:

```javascript
hart.elem = function(tag, attrs = {}, ...children) {

  if (typeof tag === "function") {
    return () => tag(attrs, children)
  }

  return () => ({
    tag,
    attrs,
    children,
    html: null,
  })

}
```

Because this new structure returned by `hart.elem` is comprised of a bunch of functions that have not yet actually created any virtual nodes or executed any component functions, we can control the order in which those things occur. For example...

```javascript
function buildVirtualTree(wrappedNode) {
  const virtualNode = wrappedNode()
  virtualNode.children = virtualNode.children.map(child => buildVirtualTree(child))
  return virtualNode
}
```

With this technique, we are able to invoke parent component functions before we invoke their children, thus allowing us build our tree from the outside in, and to get knowledge of things like the parent of a given node before we invoke it, and the position of a node in a list of children.

Now that this data is available we can algorithmically generate consistent, location-based IDs for every instance of every node in the tree. All we have to do is make sure that we apply an auto-generated ID to every app and every component function the first time we see it so that we can recognize it and differentiate it from other apps/components in the future.

Here's how it works; let's say we have the following html structure:

```html
<section>
  <div>
    <span/>
  </div>
  <div>
    <span/>
  </div>
</section>
```

We can generate positional IDs like the following:

```html
<section>    App(123):0 section:0
  <div>      App(123):0 section:0 div:0
    <span/>  App(123):0 section:0 div:0 span:0
  </div>
  <div>      App(123):0 section:0 div:1
    <span/>  App(123):0 section:0 div:1 span:0
  </div>
</section>
```

And if it happens to contain some components:

```jsx
<section>  App(123):0
  <A>      App(123):0 Component(A):0
    <C/>   App(123):0 Component(A):0 Component(C):0
  </A>
  <B>      App(123):0 Component(B):1
    <C/>   App(123):0 Component(B):1 Component(C):0
  </B>
</section>
```

Of course, Hart doesn't actually store a positional ID like this for every virtual node that gets generated. After all, your structure could get pretty deep and contain a lot of nodes, in which case we could end up storing hundreds or even thousands of _really long_ strings.

Instead, it holds on to a single array that tracks these ID chunks piece by piece during the render process. This way, at a given moment in time when a given component function is invoked, the ID array is guaranteed to accurately reflect the current positional ID of that component.

## Caching

Sometimes we do need to store IDs though. For example, Hart automatically caches the previous set of props for every component and compares them to new props on every render to determine whether it should (A) actually invoke the component function and build its whole subtree, or (B) simply return the previous subtree (which is often _much_ faster.)

This means Hart has to store the positional ID of every component call, but none of the basic elements like `div` or `span`. In order to avoid the possibility of storing tons of inordinately huge strings, however, Hart performs a quick join on the array and a quick, non-encryption-grade hash of the resulting string for every ID it needs to store. Thus the stored ID ends up looking a lot more like `721963694` instead of some super long string of nested element names and positions.

## Applying Side Effects

With all of this in mind, it should start to become clear how side effects are able to associate values with what appear to be "instances" of function calls. Whenever a side effect function is called, it hashes the global ID array and looks up any stored data associated with that hash, which can include cached props, or memoized side effect values and the like.

The reason you can call side effect functions multiple times within the body of your component is because the stored data associated with your function call contains a counter for how many side effects are called while the function is rendering, and an array of values generated by those side effects. Whenever you invoke a side effect, the counter increments by 1, thus telling us the position in the values array of any previous dependencies and results of a previous call to the same side effect.

This also explains why you can't trigger side effects conditionally or within loops and such. Doing so would make it impossible to associate any given side effect call with the same call made in a previous render.

And that's how it all works!
