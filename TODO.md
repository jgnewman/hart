TODO:
  - [x] Do we like the API where effects are injected into props?
  - [x] How do we want to enforce adding IDs so we don't forget to add them?
  - [x] Need a useCallback equivalent
  - [x] Need to allow providing a prop comparison func, and document it.
  - [x] Experiment: Can we localize state via refs and apps within apps?
        - So it looks like we CAN mount an app inside another app and we CAN pass props down to it.
        - Is there a way to pass children to a subapp fragment?
          - Do the unmounters work? Yes.
  - [x] Based on this experiment ^^ can we provide a prefab convenience fragment for this?
  - Unsatisfactory pieces of UI
      - [ ] I don't like having to wrap components in the fragment function.
  - [ ] Need to generate TS types for user API
  - Need to document...
    - [x] New effect API
  - Need to test...
    - [ ] New effect API
    - [ ] Document fragments
    - [ ] fragment vs fragment.optim vs fragment.subapp
  - [ ] Update any packages needing updating.
  - [ ] Benchmark against latest libs.
  - [ ] Create a production build



```javascript
import hart, { optimized } from "hart"

const Foo = (props, children) => {
  return (
    <div></div>
  )
}

const Foo = optimized((props, children) => {
  return (
    <div></div>
  )
})
```

Idea!

I think we might be able to dump the whole mandatory ID thing, and thus make caching and hooks available to all components.

Maybe we could track the component at any given position by implicit IDs where each ID was dot-separated number. Each number in the dot chain would represent an ancestor of the current node at its own position in a list of children with the final number representing the node itself at it's position. For example:

```jsx
<section>  0
  <div>    0.0
    <span> 0.0.0
    <span> 0.0.1
  <div>    0.1
    <span> 0.1.0
```

Additionally we could use `key` in lists instead of a child position number to indicate re-orderable stuff:

```jsx
<section>               0
  {[
    <span key="foo" />  0.foo
    <span key="bar" />  0.bar
  ]}
</section>
```

This could theoretically work because we will always drop in a placeholder whenever something gets removed. In that case, we'd just need a way to account for else cases. For example:

```jsx
<section>              0
  <div>                0.0
    <span>             0.0.0
    {x ? <h1> : <h2> } 0.0.1
  <div>                0.1
    <span>             0.1.0
```

In this case, two different components end up with the same ID. HOWEVER, A GIVEN COMPONENT DOES NOT CARRY STATE ACROSS UNMOUNTS AND REMOUNTS SO ANYTHING ASSOCIATED WITH IT COULD THEORETICALLY BE CLEANED UP ON UNMOUNT BEFORE NEW IDS ARE ASSIGNED.

**Problem:**

This will be tricky because our current process is to run the function when building the new tree in order to recursively get its children and such. That would mean hooks and things would run before we diff and unmount the old component and we would accidentally get bad hook values.

So in the case of like an h1 or an h2, that's bad because they would behave differently... but also they aren't components with hooks. We REALLY only need to worry about the wrong hook being called across two actually different components. Like `MyFn1` vs `MyFn2`. Because that's the only time hooks could exist to conflict. If the components were the same type of component, it would actually be totally fine to call same hooks because it's an instance of the same component in the same position.

**Resolution:**

SOOOO... all we really need to do is keep track of the type of component at each position as well. Right?

```jsx
<section>              section0
  <div>                section0 div0
    <span>             section0 div0 span0
    {x ? <A> : <B> }   section0 div0 A0 <===> section0 div0 B0
  <div>                section0 div1
    <span>             section0 div1 span0
```

We can get even safer by autogening app ids:

```jsx
<section>         foo section0
  {(() => {
    if (x) {
      return (
        <A>       foo section0 A0
          <B/>    foo section0 A0 B0
        </A>
      )
    } else {
      return (
        <C>       foo section0 C0
          <D/>    foo section0 C0 D0
        </C>
      )
    }
  })()}
</section>
```

In the above example, all IDs are unique. If both nested children were the same and they were wrapped in the same parent, it's the same structure so it's ok. If both nested children were wrapped in the same parent, they would not have the same ID because their parents would put different values in the ID chain. This seems to work logically.

I think this might work. It deserves an experiment. How can we make this work?

Phase 1

- [x] Create app IDs
- [x] Set a global ID tracker
- [x] Find the best way to identify nodes and components in ID fashion.
      - Html: element.nodeName + childPosition
      - Function: fn[FRAG_ID] + childPosition
- [x] As we generate a tree, update the ID tracker
- [x] Make sure we don't actually call function components before updating the tracker
- [x] Make sure this works

Phase 2

- [x] BUG: Subapp IDs keep getting regenerated and don't clean up after themselves.
      - Subapps no longer have auto-generated ids. Instead their IDs are assigned by current hash.

- [x] Stop tracking caches and effects per fragment definition and make them global.
- [x] Combine fragment and fragment.optim into fragment where we always return an optimized component.
- [x] Figure out how to remove the fragment function and just use normal functions.
- [x] Remove reliance on ids and rely solely on tracking hash.
- [x] Since we no longer call fragment, update JSX pragma system.
- [x] Make sure this works.

Phase 3

- [x] ISSUE: Semantics are so messy in here I can barely understand what's going on anymore.
      - We are now completely separated from the word "fragment".
      - We have a concept of a `userFn` which is provided by the user and an `optimizedFn`
        which is our wrapped version.

- [ ] Make sure users can add their own custom prop compare functions
- [ ] Dump injected effects and make them global.
- [ ] Whenever an effect call is made, check the tracker to determine which cell in memory to use.
- [ ] As we generate a tree, give every component an unmount function associated with its ID that removes its hooks from the global effects memory.
- [ ] Continue to call unmounters as we already do.
- [ ] Update the readme
