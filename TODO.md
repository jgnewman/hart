ULTIMATELY, since Hart is more functional and is intended to be fastest and most efficient, we need a way to keep track of the currently rendering component at all times without crippling the vdom. We've already said that if it has an ID, it can cache. Let's lean into this. Maybe if it has an ID it can also use hooks. So you as the user are identifying unique fragment instances, and doing so opens up more functionality. This will encourage users to use ids.

    <Custom id="foo" first="john" last="newman">

    const Custom = fragment.optim(({ hooks, first, last }, children) => {
      const full = hooks.useMemo(() => first + " " + last, [first, last])
      return <span>{full} {children}</span>
    })

This could potentially allow us to dump everything having to do with mounters. If we do a useEffect, we probably will want to keep unmounters though, so we can run cleanup when a component leaves the DOM. We'd just need to handle it a little differently so that every component with an ID automatically gets 1 unmounter that runs all of its useEffect cleanup on unmount. These unmounters should dump caches as well.

Since IDs are important to the availability of functionality now, we will probably want to provide some kind of requireID functionality.

In future is there a smart way we could implicitly id everything?

TODO:
  - [x] Do we like the API where effects are injected into props?
  - [x] How do we want to enforce adding IDs so we don't forget to add them?
  - [x] Need a useCallback equivalent
  - [x] Need to allow providing a prop comparison func, and document it.
  - [ ] Need to generate TS types for user API
  - Need to document...
    - [x] New effect API
  - Need to test...
    - [ ] New effect API
    - [ ] fragment vs fragment.optim
  - [ ] Update any packages needing updating.
  - [ ] Benchmark against latest libs.
  - [ ] Create a production build
