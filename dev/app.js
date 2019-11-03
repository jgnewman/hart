import {
  fragment,
  app,
  render,
  pipe,
  asyncPipe,
  tap,
  inject,
  leak,
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

// const data = pipe()
const data = asyncPipe()

const updatePipe = (change) => {
  const currentValue = leak(data)

  switch (change.type) {
    case "INIT":
      return inject(data, {
        ...currentValue,
        ...change.payload,
      })

    case "UPDATE_COUNTER":
      return inject(data, {
        ...currentValue,
        counter: currentValue.counter + 1,
      })

    case "CHANGE_TEXT_FIELD":
      return inject(data, {
        ...currentValue,
        textField: change.payload,
      })

    case "CHANGE_CHECKBOX":
      return inject(data, {
        ...currentValue,
        checkbox: change.payload,
      })

    case "TOGGLE_WELCOME":
      return inject(data, {
        ...currentValue,
        showWelcome: !currentValue.showWelcome,
      })

    case "ADD_ITEM":
      return inject(data, {
        ...currentValue,
        listData: currentValue.listData.slice().concat({
          id: randomLetters(10),
          val: randomLetters(5),
        }),
      })

    case "REMOVE_ITEM":
      return inject(data, {
        ...currentValue,
        listData: currentValue.listData.slice(0, currentValue.listData.length - 1),
      })

    case "REVERSE_ITEM":
      return inject(data, {
        ...currentValue,
        listData: currentValue.listData.slice().reverse(),
      })

    case "REORDER_ITEM":
      const curList = currentValue.listData
      if (curList.length < 3) return
      const newList = curList.slice()
      newList[1] = curList[2]
      newList[2] = curList[1]
      return inject(data, {
        ...currentValue,
        listData: newList,
      })

    case "REMOVE_CHILD_NAME":
      return inject(data, {
        ...currentValue,
        childNames: currentValue.childNames.slice(0, currentValue.childNames.length - 1),
      })

    default:
      return
  }
}

const handleClickCounter = () => {
  updatePipe({
    type: "UPDATE_COUNTER",
  })
}

const handleClickAddItem = () => {
  updatePipe({
    type: "ADD_ITEM",
  })
}

const handleClickRemoveItem = () => {
  updatePipe({
    type: "REMOVE_ITEM",
  })
}

const handleClickRemoveChildName = () => {
  updatePipe({
    type: "REMOVE_CHILD_NAME",
  })
}

const handleClickReorderItem = () => {
  updatePipe({
    type: "REORDER_ITEM",
  })
}

const handleClickReverseItem = () => {
  updatePipe({
    type: "REVERSE_ITEM",
  })
}

const handleClickToggleWelcome = () => {
  updatePipe({
    type: "TOGGLE_WELCOME",
  })
}

const handleKeyupTextField = (evt) => {
  updatePipe({
    type: "CHANGE_TEXT_FIELD",
    payload: evt.target.value,
  })
}

const handleCheckbox = (evt) => {
  updatePipe({
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
  const { refs, captureRefs, onmount, ondismount } = effects()

  const handleClick = (evt) => {
    console.log("ref, evt:", refs(), evt)
  }

  const handlemount = onmount(() => {
    console.log("mounted!")
  })

  const handledismount = ondismount(() => {
    console.log("dismounted!")
  })

  return handledismount(handlemount(captureRefs(
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

const myApp = app(document.getElementById("app"), RootFragment)
tap(data, (props) => {
  // console.log("new props", props)
  render(myApp, props)
})

updatePipe({
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

const mod = (toAdd, prevVal) => {
  return prevVal + toAdd
}

const chain = pass("Hello").to(mod, " ").to(mod, "world").to(mod, "!")()
console.log("chain:", chain)

/*

// old way

    import { app, fragment, render, asyncPipe, inject, tap } from "hart"

    const myPipe = asyncPipe()

    const App = app(document.getElementById("app"), RootFragment) // necessary for tracking prev tree

    const RootFragment = fragment(props => {
      return <input type="text" value={props.value} onkeyup={(evt) => inject(myPipe, { value: evt.target.value })} />
    })

    tap(myPipe, (newVal) => render(App, newVal))

    inject(myPipe, { value: "" })

// new way

    import { fragment, createLoop } from "hart"

    const Root = fragment(props => {
      return <input type="text" value={props.value} onkeyup={(evt) => app.loop({ value: evt.target.value })} />
    })

    const app = createLoop(Root, document.getElementById("app")) // or createSyncLoop

    app.loop({ value: "foo" })

To make this work:
- IMPORTANT! We need the reducer to be able to live in a file other than where the app lives.
  - The app and various fragments will live in separate files.
  - The reducer must be available to the app (for binding) and to other files (for being called).
  - Therefore the reducer CAN NOT depend on the app being available to it or any other files being available to it.
  - It must be written in such a way that it can be imported by other files, and not import them.
- Pipes no longer auto-grow. Values are just replaced.
- createLoop will...
  - if rootElem exists...
    - create an asyncPipe
    - create an app
    - return a loop object that injects into the pipe
  - if rootElem does not exist...
    - just return a loop object with { onloop, loop }
- We will also include createSyncLoop which will use a synchronous pipe

    const updater = createLoop((change, prevVal) => {
      switch (change.type) {
        case "INIT":
          return { ...prevVal, ...action.payload }
        default:
          return prevVal
      }
    })

    updater.onloop(val => app.loop(val))
    updater.loop({ type: "INIT", payload: { value: "foo" } }) // instead of app.loop above

*/
