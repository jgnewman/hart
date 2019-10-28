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

import Input from "../prefab/Input"

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

const Span = fragment(({ value }) => (
  <span ref="myspancomponent">{value}</span>
))

const ListItem = fragment(({ value }) => {
  const { getRefs, captureRefs, onmount, ondismount } = effects()

  const handleClick = (evt) => {
    console.log("ref, evt:", getRefs(), evt)
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
  // console.log("new props", props)
  return mounthandler(
    <div>
      {props.counter}
      <Input id="one" oop="foo" type="checkbox" onchange={handleCheckbox} checked={props.checkbox}/>
      <Input id="two" type="text" onkeyup={handleKeyupTextField} value={props.textField}/>
      <button onclick={handleClickCounter}>Click me to update counter</button>
      <button onclick={handleClickAddItem}>Click me to add a list item</button>
      <button onclick={handleClickRemoveItem}>Click me to remove a list item</button>
      <button onclick={handleClickReorderItem}>Click me to reorder 2 items</button>
      <button onclick={handleClickReverseItem}>Click me to reverse items</button>
      <button onclick={handleClickToggleWelcome}>Click me to toggle welcome message</button>
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
