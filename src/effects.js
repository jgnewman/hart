/*
const Comp = component(props => {
  const { getRefs, captureRefs, onmount } = effects()

  const input1focushandler = () => {
    getRefs().input2.blur()
  }

  const input2focushandler = () => {
    getRefs().input.blur()
  }

  cont mount = onmount((props) => {
    console.log("mounted")
  })

  return onmount(captureRefs(
    <div>
      <input class="input1" ref="input1" onfocus={input1focushandler} />
      <input class="input2" ref="input2" onfocus={input2focushandler} />
    </div>
  ))
})
*/

import { objectMap } from "./helpers"

export const effects = () => {
  let refs = {}

  const captureRefs = (vnode) => {
    const { attrs } = vnode

    const localRef = attrs.ref
    if (localRef) {
      refs[localRef] = vnode
    }

    vnode.children.forEach(child => !child.component && captureRefs(child))
    return vnode
  }

  const getRefs = () => {
    return objectMap(refs, (val) => val.html)
  }

  const onmount = (handler) => {
    return (vnode) => {
      vnode.onmount = handler
      return vnode
    }
  }

  const ondismount = (handler) => {
    return (vnode) => {
      vnode.ondismount = handler
      return vnode
    }
  }

  return {
    captureRefs,
    getRefs,
    onmount,
    ondismount,
  }
}
