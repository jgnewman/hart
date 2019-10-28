import { fragment } from "../src/core"
import { objectLoop } from "../src/helpers"

const Input = fragment((props) => {
  const handlers = {}
  const isCheckInput = props.type === "checkbox" || props.type === "radio"
  const isTextarea = props.type === "textarea"
  const specialAttr = isCheckInput ? "checked" : "value"
  const controlledValue = props[specialAttr]
  let changeHandled = false

  const createHandler = (handler, shouldPreventDefault) => {
    return (evt) => {
      // Note, order is important here. The handler has to fire
      // first in order to get the right data up the tree.
      const out = handler ? handler(evt) : undefined
      shouldPreventDefault && evt.preventDefault()
      evt.target[specialAttr] = controlledValue
      return out
    }
  }

  if (props.hasOwnProperty(specialAttr)) {

    objectLoop(props, (handler, handlerName) => {
      const isOnChange = handlerName === "onchange"
      const isOnKeyUp = handlerName === "onkeyup"

      if (/^on/.test(handlerName)) {
        // If we preventDefault on the onchange event for checkboxes, we'll never
        // pick up the new intended value.
        const shouldPreventDefault = isCheckInput ? !isOnChange : true
        handlers[handlerName] = createHandler(handler, shouldPreventDefault)

        if (isCheckInput && isOnChange) { changeHandled = true }
        if (!isCheckInput && isOnKeyUp) { changeHandled = true }
      }
    })

    if (!changeHandled) {
      handlers[isCheckInput ? "onchange" : "onkeyup"] = createHandler(null, !isCheckInput)
    }
  }

  return fragment.hart(isTextarea ? "textarea" : "input", { ...props, ...handlers })
})

export default Input
