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

Working API

```javascript

const MyFrag = fragment.optim(({ id }) => {
  return <div id={id}>Something</div>
})

const AppGen = fragment.optim(({ effects, id,...rest }, children) => {
  const subrootRef = effects.ref()
  const propsRef = effects.ref({ ...rest })
  const childRef = effects.ref(children)

  effects.afterEffect(() => {
    const { current: subrootElem } = subrootRef
    const { current: parentProps } = propsRef
    const { current: nestedChildren } = childRef

    const SubApp = app(SubSub, subrootElem, { id: id + "-subapp" })
    const Counter = app((inc, prev) => ({ counter: (prev.counter || 0) + inc }))
    let timeout

    Counter.watch(({ counter }) => {
      SubApp.update({ counter, nestedChildren, ...parentProps })
    })

    Counter.watch(({ counter }) => {
      counter <= 100 && (timeout = setTimeout(() => Counter.update(1), 1000))
    })

    Counter.update(1)

    return () => clearTimeout(timeout)
  }, [propsRef, childRef, subrootRef])

  return (
    <div id={id} ref={subrootRef}></div>
  )
})

```

Desired API Option 1

```javascript

const settings = {
  compareProps: (a, b) => a === b, // defaults to basic shallowcompare
  init: 0, // defaults to null
  options: { enableShadowRoot: false}, // defaults to { id: id + "-subapp" }
  reducer: count => ({ count }), // defaults to change => ({ current: change })
  sync: false // defaults to false
  wrapper: <div></div>, // defaults to div
}

const MyFrag = fragment.subapp(({ id, effects, localData }, children) => {
  setTimeout(() => effects.update(localData.count + 1), 1000)
  return <div id={id}>Something</div>
}, settings)

```

