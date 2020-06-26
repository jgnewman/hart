import {
  fragment,
  app,
  appSync,
  pass,
  effects,
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

const ChildRenderer = fragment((props, children) => {
  return (
    <div class="dib" style="background: black; color: white; margin-bottom: 5px;">
      <div>{props.name}</div>
      {children}
    </div>
  )
})

const Span = fragment(({ value }) => (
  <span ref="myspancomponent">{value}</span>
))

const ListItem = fragment(({ value }) => {
  const { refs, captureRefs, onmount, onunmount } = effects()

  const handleClick = (evt) => {
    console.log("ref, evt:", refs(), evt)
  }

  const handlemount = onmount(() => {
    console.log("mounted!")
  })

  const handleunmount = onunmount(() => {
    console.log("unmounted!")
  })

  return handleunmount(handlemount(captureRefs(
    <li ref="myli" onclick={handleClick}>
      <span ref="myspan"></span>
      <Span value={value} />
    </li>
  )))
})

const RootFragment = fragment((props) => {
  const { onmount } = effects()

  const mounthandler = onmount(() => console.log("mounted root"))
  console.log("new props", props)
  return mounthandler(
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
      <ChildRenderer id="cr1" name="bill">
        {!!props.childNames[0] && <div>{props.childNames[0]}</div>}
        {!!props.childNames[1] && <div>{props.childNames[1]}</div>}
        {!!props.childNames[2] && <div>{props.childNames[2]}</div>}
      </ChildRenderer>
      <ChildRenderer id="cr2" name="bob">
        {!!props.childNames[0] && <div>{props.childNames[0]}</div>}
        {!!props.childNames[1] && <div>{props.childNames[1]}</div>}
        {!!props.childNames[2] && <div>{props.childNames[2]}</div>}
      </ChildRenderer>
    </div>
  )
})

const renderer = app(RootFragment, document.getElementById("app"))
reducer.watch(newProps => renderer.update(newProps))

reducer.update({
  type: "INIT",
  payload: {
    counter: 0,
    showWelcome: true,
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

/*******************/

const App2Root = fragment(props => {
  if (props.showDiv) return <div>Showing Div</div>
  return <span>Showing Span</span>
})

const app2 = appSync(App2Root, document.getElementById("app2"))
app2.update({ showDiv: true })
app2.update({ showDiv: false })

/*******************/

const mod = (toAdd, prevVal) => {
  return prevVal + toAdd
}

const chain = pass("Hello").to(mod, " ").to(mod, "world").to(mod, "!")()
console.log("chain:", chain)

/*


    import { fragment, app } from "hart"

    const Root = fragment(props => {
      return <input type="text" value={props.value} onkeyup={(evt) => renderer.update({ value: evt.target.value })} />
    })

    const renderer = app(Root, document.getElementById("app")) // or appSync

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
