import {
  hart,
  app,
  render,
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

const Span = hart(({ value }) => (
  <span ref="myspancomponent">{value}</span>
))

const ListItem = hart(({ value }) => {
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

const RootComponent = hart((props) => {
  const { onmount } = effects()

  const mounthandler = onmount(() => console.log("mounted root"))

  return mounthandler(
    <div>
      {props.counter}
      <button onclick={handleClickCounter}>Click me to update counter</button>
      <button onclick={handleClickAddItem}>Click me to add a list item</button>
      <button onclick={handleClickRemoveItem}>Click me to remove a list item</button>
      <button onclick={handleClickReorderItem}>Click me to reorder 2 items</button>
      <button onclick={handleClickReverseItem}>Click me to reverse items</button>
      <ul>
        {props.listData.map(datum => (
          <ListItem key={datum.id} value={datum.val}/>
        ))}
      </ul>
    </div>
  )
})

const myApp = app(document.getElementById("app"), RootComponent)
tap(data, (props) => {
  // console.log("new props", props.listData)
  render(myApp, props)
})

updatePipe({
  type: "INIT",
  payload: {
    counter: 0,
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
