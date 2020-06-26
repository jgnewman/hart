/*
const Frag = fragment(props => {
  const { refs, captureRefs, onmount } = effects()

  const input1focushandler = () => {
    refs().input2.blur()
  }

  const input2focushandler = () => {
    refs().input1.blur()
  }

  const mount = onmount((props) => {
    console.log("mounted")
  })

  return mount(captureRefs(
    <div>
      <input class="input1" ref="input1" onfocus={input1focushandler} />
      <input class="input2" ref="input2" onfocus={input2focushandler} />
    </div>
  ))
})
*/

import { objectMap } from "./helpers"

export const effects = () => {
  let references = {}

  const captureRefs = (vnode) => {
    const { attrs } = vnode

    const localRef = attrs.ref
    if (localRef) {
      references[localRef] = vnode
    }

    vnode.children.forEach(child => !child.fragment && captureRefs(child))
    return vnode
  }

  const refs = () => {
    return objectMap(references, (val) => val.html)
  }

  const onmount = (handler) => {
    return (vnode) => {
      vnode.onmount = handler
      return vnode
    }
  }

  const onunmount = (handler) => {
    return (vnode) => {
      vnode.onunmount = handler
      return vnode
    }
  }

  return {
    captureRefs,
    refs,
    onmount,
    onunmount,
  }
}
