import { fragment } from "../src/core"
import { objectLoop } from "../src/helpers"

const Input = fragment((props) => {
  const handlers = {}
  const controlledValue = props.value
  let keyChangeHandled = false

  const createHandler = (handler) => {
    return (evt) => {
      // Note, order is important here. The handler has to fire
      // first in order to get the right data up the tree.
      const out = handler ? handler(evt) : undefined
      evt.preventDefault()
      evt.target.value = controlledValue
      return out
    }
  }

  if (props.hasOwnProperty("value")) {

    objectLoop(props, (handler, handlerName) => {
      if (/^on/.test(handlerName)) {
        handlers[handlerName] = createHandler(handler)

        if (handlerName === "onkeyup") {
          keyChangeHandled = true
        }
      }
    })

    if (!keyChangeHandled) {
      handlers.onkeyup = createHandler()
    }
  }

  return fragment.hart("input", { ...props, ...handlers })
})

export default Input
