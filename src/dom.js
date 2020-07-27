import {
  DELETE,
  DOC_FRAG,
  EMPTY,
  LIST,
  SET,
  SVG_NS,
  TEXT,
} from "./constants"

import {
  positionSort,
} from "./diffing"

const attrMap = {
  className: "class",
  htmlFor: "for",
}

function isSpecialInputAttr(attrName) {
  switch (attrName) {
    case "value":
    case "checked":
      return true
    default:
      return false
  }
}

function isInputTag(tag) {
  return tag && tag.tagName && tag.tagName.toUpperCase() === "INPUT"
}

function append(target, nodes) {
  if (Array.isArray(nodes)) {
    const docFrag = document.createDocumentFragment()
    nodes.forEach(node => docFrag.appendChild(node))
    target.appendChild(docFrag)
  } else {
    target.appendChild(nodes)
  }
}

function attachAttr(target, attrName, attrVal) {
  attrName = attrMap[attrName] || attrName
  if (attrName === "children") return

  const isInputValue = isSpecialInputAttr(attrName) && isInputTag(target)

  if (attrName === "ref") {
    attrVal && (attrVal.current = target)

  } else if (isInputValue || /^on/.test(attrName)) {
    target[attrName] = attrVal

  } else if (attrName.indexOf(":") > -1) {
    target.setAttributeNS(SVG_NS, attrName, attrVal)

  } else {
    target.setAttribute(attrName, attrVal)
  }
}

function detachAttr(target, attrName) {
  attrName = attrMap[attrName] || attrName
  if (attrName === "children") return

  const isInputValue = isSpecialInputAttr(attrName) && isInputTag(target)

  if (isInputValue) {
    target[attrName] = ""

  } else if (/^on/.test(attrName)) {
    target[attrName] = null

  } else if (attrName.indexOf(":") > -1) {
    target.removeAttributeNS(SVG_NS, attrName)

  } else {
    target.removeAttribute(attrName)
  }
}

function buildHTML(vTree) {
  if (vTree.tag === EMPTY) {
    vTree.html = document.createComment("")

  } else if (vTree.tag === TEXT) {
    vTree.html = document.createTextNode(vTree.text)

  } else if (vTree.tag === LIST || vTree.tag === DOC_FRAG) {
    vTree.html = document.createDocumentFragment()
    vTree.children.forEach(child => {
      buildHTML(child)
      vTree.html.appendChild(child.html)
    })

  } else {
    const isSVG = vTree.parent.html.hartSVG || vTree.tag === "svg"
    const tag = isSVG ? document.createElementNS(SVG_NS, vTree.tag) : document.createElement(vTree.tag)

    vTree.html = tag

    if (vTree.onunmount) {
      vTree.html.hartUnmount = vTree.onunmount
    }

    if (isSVG) {
      vTree.html.hartSVG = true
    }

    const attrKeys = Object.keys(vTree.attrs)
    attrKeys.forEach(name => attachAttr(tag, name, vTree.attrs[name]))

    if (vTree.children.length) {
      const docFrag = document.createDocumentFragment()

      vTree.children.forEach(child => {
        buildHTML(child)
        vTree.html.appendChild(child.html)
      })

      vTree.html.appendChild(docFrag)
    }

  }

  return vTree
}

function runUnmounters(html) {
  const { childNodes, hartUnmount } = html
  childNodes.length && childNodes.forEach(child => runUnmounters(child))
  hartUnmount && hartUnmount()
}

function addHTML(change) {
  const { next, options } = change
  const optionsArray = Array.isArray(options) ? options : [options]
  const target = next.html

  const nodesToAdd = optionsArray.map(node => {
    buildHTML(node)
    return node.html
  })

  append(target, nodesToAdd)
}

function removeHTML(change) {
  const { prev } = change

  if (prev.tag === DOC_FRAG) {
    return prev.children.forEach(child => removeHTML({ prev: child }))

  } else {
    const prevHtml = prev.html
    prevHtml.parentNode.removeChild(prevHtml)
    Promise.resolve().then(() => runUnmounters(prevHtml))
  }

  prev.html = null
}

function replaceHTML(change) {
  const { prev, next } = change
  const nextParentIsDocFrag = next.parent.html.nodeType === 11
  const replacerParent = nextParentIsDocFrag ? prev.html.parentNode : next.parent.html
  const prevIsDocFrag = prev.tag === DOC_FRAG

  buildHTML(next)

  if (prevIsDocFrag) {
    const [first, ...rest] = prev.children
    rest.forEach(child => removeHTML({ prev: child }))
    replacerParent.replaceChild(next.html, first.html)

  } else {
    const prevHtml = prev.html
    replacerParent.replaceChild(next.html, prevHtml)
    Promise.resolve().then(() => runUnmounters(prevHtml))
  }

  prev.html = null
}

function updateHTML(change) {
  const { prev, next, options } = change
  next.html = next.html || prev.html

  options.forEach(([type, attrName, value]) => {
    switch (type) {
      case DELETE: return detachAttr(next.html, attrName)
      case SET: return attachAttr(next.html, attrName, value)
      default:
        throw new Error(`Attribute change type ${type} does not exist.`)
    }
  })
}

function reorderHTML(change) {
  const { prev, next, options } = change

  // To reorder the list we will...
  //   Create a sortedList of keyCache items, sorted by intended position.
  //   Find the first node currently rendered in the DOM.
  //   Use the first rendered node as a position marker.
  //   Iterate over the sorted list. For each...
  //     If it's the 0th node
  //       Ensure it's at the front of the list by inserting it before the first rendered node.
  //       Replace the position marker with the current node.
  //     Otherwise,
  //       Grab the position marker's next sibling.
  //       If the sibling is not the current node, move the node in front of the sibling.
  //       Replace the position marker with the current node.

  const queuedForRemoval = options.sort(positionSort)
  const prevChildren = prev.children

  const sortedList = Object.keys(next.keyCache).map(k => next.keyCache[k]).sort(positionSort)

  // The first node currently rendered in the DOM is the first item in
  // prevChildren that hasn't been queued for removal.
  let firstRenderedChild
  if (!queuedForRemoval.length) {
    firstRenderedChild = prevChildren[0].html
  } else {
    let currentRemoval = 0
    let currentRemovalNode = queuedForRemoval[currentRemoval]
    for (let i = 0; i < prevChildren.length; i += 1) {
      if (currentRemovalNode.pos > i) {
        firstRenderedChild = prevChildren[i].html
        break
      }
      currentRemoval += 1
      currentRemovalNode = queuedForRemoval[currentRemoval]
    }
  }

  let positionMarker = firstRenderedChild
  sortedList.forEach(({ node }, index) => {
    const html = node.html

    if (index === 0) {
      positionMarker !== html && html.parentNode.insertBefore(html, positionMarker)

    } else {
      const nextSibling = positionMarker.nextSibling
      nextSibling && nextSibling !== html && html.parentNode.insertBefore(html, nextSibling)
    }

    positionMarker = html
  })
}

export {
  addHTML,
  removeHTML,
  replaceHTML,
  reorderHTML,
  updateHTML,
}
