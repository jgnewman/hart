import hart, {
  app,
  subapp,
  useAfterEffect,
  useMemo,
  useMemoFn,
  useRef,
  withPropCheck,
} from "../index"

const randomItem = items => {
  return items[Math.floor(Math.random()*items.length)]
}

const randomLetters = (len) => {
  const chars = "abcdefghijklmnopqrstuvwxyz".split("")
  let str = ""
  let i = 0
  while (i < (len || 6)) {
    str += randomItem(chars)
    i += 1
  }
  return str
}

const reducer = app((change, currentValue) => {
  switch (change.type) {
    case "INIT":
      return {
        ...currentValue,
        ...change.payload,
      }

    case "UPDATE_COUNTER":
      return {
        ...currentValue,
        counter: currentValue.counter + 1,
      }

    case "CHANGE_TEXT_FIELD":
      return {
        ...currentValue,
        textField: change.payload,
      }

    case "CHANGE_CHECKBOX":
      return {
        ...currentValue,
        checkbox: change.payload,
      }

    case "TOGGLE_WELCOME":
      return {
        ...currentValue,
        showWelcome: !currentValue.showWelcome,
      }

    case "TOGGLE_SUBAPP":
      return {
        ...currentValue,
        showSubapp: !currentValue.showSubapp,
      }

    case "ADD_ITEM":
      return {
        ...currentValue,
        listData: currentValue.listData.slice().concat({
          id: randomLetters(10),
          val: randomLetters(5),
        }),
      }

    case "REMOVE_ITEM":
      return {
        ...currentValue,
        listData: currentValue.listData.slice(0, currentValue.listData.length - 1),
      }

    case "REVERSE_ITEM":
      return {
        ...currentValue,
        listData: currentValue.listData.slice().reverse(),
      }

    case "REORDER_ITEM":
      const curList = currentValue.listData
      if (curList.length < 3) return currentValue
      const newList = curList.slice()
      newList[1] = curList[2]
      newList[2] = curList[1]
      return {
        ...currentValue,
        listData: newList,
      }

    case "REMOVE_CHILD_NAME":
      return {
        ...currentValue,
        childNames: currentValue.childNames.slice(0, currentValue.childNames.length - 1),
      }

    default:
      return currentValue
  }
})

reducer.watch(newVal => console.log("NEW REDUCER VAL", newVal))

const handleClickCounter = () => {
  reducer.update({
    type: "UPDATE_COUNTER",
  })
}

const handleClickAddItem = () => {
  reducer.update({
    type: "ADD_ITEM",
  })
}

const handleClickRemoveItem = () => {
  reducer.update({
    type: "REMOVE_ITEM",
  })
}

const handleClickRemoveChildName = () => {
  reducer.update({
    type: "REMOVE_CHILD_NAME",
  })
}

const handleClickReorderItem = () => {
  reducer.update({
    type: "REORDER_ITEM",
  })
}

const handleClickReverseItem = () => {
  reducer.update({
    type: "REVERSE_ITEM",
  })
}

const handleClickToggleWelcome = () => {
  reducer.update({
    type: "TOGGLE_WELCOME",
  })
}

const handleClickToggleSubapp = () => {
  reducer.update({
    type: "TOGGLE_SUBAPP",
  })
}

const handleKeyupTextField = (evt) => {
  reducer.update({
    type: "CHANGE_TEXT_FIELD",
    payload: evt.target.value,
  })
}

const handleCheckbox = (evt) => {
  reducer.update({
    type: "CHANGE_CHECKBOX",
    payload: evt.target.checked,
  })
}

const ChildRenderer = ({ name }, children) => {
  const memoizedName = useMemo(() => name, [name])
  const memoizedSuffix = useMemo(() => name === "bill" ? "x" : "y", [name])

  return (
    <div class="dib" style="background: black; color: white; margin-bottom: 5px;">
      <div>{memoizedName}{memoizedSuffix}</div>
      {children}
    </div>
  )
}

const Span = ({ value }) => {
  const spanRef = useRef(null)
  return (
    <span ref={spanRef}>{value}</span>
  )
}

const ListItem = ({ value }) => {
  const liRef = useRef(null)
  const spanRef = useRef(null)
  const clickHandler = useMemoFn(evt => {
    console.log("ref, evt:", liRef.current, evt)
  }, [liRef])

  useAfterEffect(() => console.log(`mounted ${value}!`), [])
  useAfterEffect(() => () => console.log(`unmounted ${value}!`), [])

  return (
    <li ref={liRef} onclick={clickHandler}>
      <span ref={spanRef}></span>
      <Span value={value} />
    </li>
  )
}

const PassedChild = ({ name }) => {
  const nameRef = useRef(name)
  useAfterEffect(() => () => console.log(`unmounted passed child ${nameRef.current}`), [nameRef])
  const out = <div>Heyo, I'm {name}, a child passed from one app to another app!</div>
  return out
}

const AppGen = subapp(({ localData, update, extra }, children) => {
  const { count } = localData

  useAfterEffect(() => {
    console.log("mounted subapp")
    return () => console.log("unmounted subapp")
  }, [])

  useAfterEffect(() => {
    const timeout = setTimeout(() => count < 100 && update(count + 1), 1000)
    return () => clearTimeout(timeout)
  }, [count, update])

  return (
    <span>
      This is the content of a localized subapp {count} {extra}
      {children}
      <PassedChild name="sammy" />
    </span>
  )
}, {
  reducer: (count) => ({ count }),
  init: 0,
})

const RootFragment = (props) => {
  useAfterEffect(() => console.log("mounted root!"), [])

  console.log("new props", props)
  return (
    <div>
      {props.counter}
      <input id="one" oop="foo" type="checkbox" onchange={handleCheckbox} checked={props.checkbox}/>
      <input type="text" onkeyup={handleKeyupTextField} value={"foo"}/>
      <button onclick={handleClickCounter}>Click me to update counter</button>
      <button onclick={handleClickAddItem}>Click me to add a list item</button>
      <button onclick={handleClickRemoveItem}>Click me to remove a list item</button>
      <button onclick={handleClickReorderItem}>Click me to reorder 2 items</button>
      <button onclick={handleClickReverseItem}>Click me to reverse items</button>
      <button onclick={handleClickToggleWelcome}>Click me to toggle welcome message</button>
      <button onclick={handleClickToggleSubapp}>Click me to toggle the subapp</button>
      <button onclick={handleClickRemoveChildName}>Click me to remove a child name</button>
      <ul>
        {props.listData.map(datum => (
          <ListItem key={datum.id} value={datum.val}/>
        ))}
      </ul>
      {props.showWelcome && (
        <div>
          This is the welcome message!
        </div>
      )}
      {props.showSubapp && (
        <AppGen extra="extrito">
          <PassedChild name="mike" />
        </AppGen>
      )}
      <ChildRenderer name="bill">
        {!!props.childNames[0] && <div>{props.childNames[0]}</div>}
        {!!props.childNames[1] && <div>{props.childNames[1]}</div>}
        {!!props.childNames[2] && <div>{props.childNames[2]}</div>}
      </ChildRenderer>
      <ChildRenderer name="bob">
        {!!props.childNames[0] && <div>{props.childNames[0]}</div>}
        {!!props.childNames[1] && <div>{props.childNames[1]}</div>}
        {!!props.childNames[2] && <div>{props.childNames[2]}</div>}
      </ChildRenderer>
    </div>
  )
}

const renderer = app(RootFragment, "#app", {
  id: "root",
  useShadowRoot: false,
})

reducer.watch(newProps => renderer.update(newProps))

reducer.update({
  type: "INIT",
  payload: {
    counter: 0,
    showWelcome: true,
    showSubapp: true,
    textField: "",
    checkbox: false,
    childNames: ["one", "two", "three"],
    listData: [
      { id: randomLetters(10), val: randomLetters(5) },
      { id: randomLetters(10), val: randomLetters(5) },
      { id: randomLetters(10), val: randomLetters(5) },
    ],
  },
})

/*


    import { fragment, app } from "hart"

    const Root = props => {
      return <input type="text" value={props.value} onkeyup={(evt) => renderer.update({ value: evt.target.value })} />
    }

    const renderer = app(Root, document.getElementById("app"))

    renderer.update({ value: "foo" })

// OR with a reducer...

    const reducer = app((change, prevVal) => {
      switch (change.type) {
        case "INIT":
          return { ...prevVal, ...action.payload }
        default:
          return prevVal
      }
    })

    reducer.watch(val => renderer.update(val))
    reducer.update({ type: "INIT", payload: { value: "foo" } }) // instead of renderer.update above

*/
