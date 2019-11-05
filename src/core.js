import {
  deepEqual,
} from "./helpers"

import {
  observable,
  observableAsync,
} from "./observables"

import {
  SVG_NS,
  TEXT,
  LIST,
  CHILD,
  PROOF,
  ADD,
  REMOVE,
  REPLACE,
  UPDATE,
  REORDER,
  SET,
  DELETE,
} from "./constants"

const attrMap = {
  className: "class",
  htmlFor: "for",
}

const isSpecialInputAttr = (attrName) => {
  switch (attrName) {
    case "value":
    case "checked":
      return true
    default:
      return false
  }
}

const isInputTag = (tag) => {
  return tag && tag.tagName && tag.tagName.toUpperCase() === "INPUT"
}

const assertPureFragment = (fn) => {
  if (fn[PROOF] !== PROOF) {
    let err
    if (fn.name) {
      err = `${fn.name} should be wrapped in a \`hart\` call.`
    } else {
      err = `All fragments must be defined using the \`hart\` function.`
    }
    throw new Error(err)
  }
}

const positionSort = (a, b) => {
  return a.pos === b.pos ? 0 : (a.pos < b.pos ? -1 : 1)
}

const getAttrDiff = (prev, next, inputController) => {
  const diff = []
  const checked = {}

  for (let i in prev) {
    if (prev.hasOwnProperty(i) && i !== "key") {
      checked[i] = true
      if (prev[i] !== next[i] || i === inputController) {
        diff.push(!next.hasOwnProperty(i) ? [DELETE, i] : [SET, i, next[i]])
      }
    }
  }

  for (let i in next) {
    i !== "key" && next.hasOwnProperty(i) && !checked[i] && diff.push([SET, i, next[i]])
  }

  return diff
}

const getListDiff = (prev, next) => {
  let reorder = false
  let prevLen = 0

  let toRemove = []
  let toAdd = []
  let toCompare = []
  const checked = {}

  for (let i in prev) {
    if (prev.hasOwnProperty(i)) {
      const p = prev[i]
      const n = next[i]

      checked[i] = true
      prevLen += 1

      if (!next.hasOwnProperty(i)) {
        toRemove.push(p)
      } else {
        toCompare.push([p, n])
        if (p.pos !== n.pos) { // Reorder if an existing node is in a new position
          reorder = true
        }
      }
    }
  }

  // This usually happens in a case where the list members have all new keys
  // on render. In this case, we won't want to reorder the list because the
  // new additions will already be in the intended order.
  const removingAllPrevChildren = toRemove.length === prevLen

  for (let i in next) {
    if (next.hasOwnProperty(i) && !checked[i]) {
      toAdd.push(next[i])
      if (next[i].pos < prevLen && !removingAllPrevChildren) { // Reorder if a new node is not at the end of the list
        reorder = true
      }
    }
  }

  // In the case that all children are being replaced, it is less efficient
  // to trigger a bunch of removals then additions, and more efficient
  // to compare as many nodes as we can, triggering updates only when necessary.
  // It's a good chance that this happened only because list keys were
  // regenerated and in a case like that, we shouldn't be updating anything.
  if (removingAllPrevChildren) {
    toRemove.some((removal, index) => {
      const addition = toAdd[index]
      if (!addition) return true
      toCompare.push([removal, addition])
    })

    toRemove = toRemove.slice(toCompare.length)
    toAdd = toAdd.slice(toCompare.length)
  }

  return {
    toRemove,
    toAdd: toAdd.sort(positionSort),
    toCompare,
    reorder,
  }
}

const append = (target, nodes) => {
  if (Array.isArray(nodes)) {
    const frag = document.createDocumentFragment()
    nodes.forEach(node => frag.appendChild(node))
    target.appendChild(frag)
  } else {
    target.appendChild(nodes)
  }
}

const controlInputWithProp = (tag, attrs) => {
  if (tag !== "input" && tag !== "textarea") return null

  const hasValue = attrs.hasOwnProperty("value")
  const hasChecked = attrs.hasOwnProperty("checked")

  if (!hasValue && !hasChecked) return null
  return hasChecked ? "checked" : "value"
}

const childPack = (children=null) => ({
  [CHILD]: CHILD,
  nodes: children,
})

const vNode = (tag, attrs, ...children) => {
  attrs = attrs || {}
  const controllingProp = controlInputWithProp(tag, attrs)

  if (typeof tag === "function") {
    assertPureFragment(tag)

    const out = tag(attrs, childPack(children))
    out.fragment = true

    if (attrs.key) {
      out.attrs.key = attrs.key
    }

    if (controllingProp) {
      out.controller = controllingProp
    }

    return out
  }

  const node = {
    tag,
    attrs,
    listed: false,
    html: null,
    parent: null,
  }

  if (controllingProp) {
    node.controller = controllingProp
  }

  node.children = []
  const childIterator = child => {
    if (child === null || child === undefined || child === false) return

    if (child[CHILD] === CHILD) return !child.nodes ? null : child.nodes.forEach(c => childIterator(c))

    let childNode

    if (Array.isArray(child)) {
      childNode = vNode(LIST, null, ...child)
      childNode.keyCache = {}
      child.map((n, i) => {
        if (!n.attrs.hasOwnProperty("key") || childNode.keyCache.hasOwnProperty(n.attrs.key)) {
          throw new Error(`Every member of a node array must have a unique \`key\` prop.`)
        }

        n.listed = true
        n.parent = node
        childNode.keyCache[n.attrs.key] = { node: n, pos: i }
      })

    } else if (typeof child === "object") {
      childNode = child

    } else {
      childNode = vNode(TEXT)
      childNode.text = String(child)
    }

    childNode.parent = node
    return node.children.push(childNode)
  }
  children.forEach(childIterator)

  return node
}

const changeObject = (type, prev, next, options) => ({
  type,
  prev,
  next,
  options,
})

const attachAttr = (target, isSVG, attrName, attrVal) => {
  attrName = attrMap[attrName] || attrName
  if (attrName === "children") return

  const isInputValue = isSpecialInputAttr(attrName) && isInputTag(target)

  if (isInputValue || /^on/.test(attrName)) {
    target[attrName] = attrVal

  } else if (isSVG) {
    target.setAttributeNS(null, attrName, attrVal)

  } else {
    target.setAttribute(attrName, attrVal)
  }
}

const detachAttr = (target, isSVG, attrName) => {
  attrName = attrMap[attrName] || attrName
  if (attrName === "children") return

  const isInputValue = isSpecialInputAttr(attrName) && isInputTag(target)

  if (isInputValue) {
    target[attrName] = ""

  } else if (/^on/.test(attrName)) {
    target[attrName] = null

  } else if (isSVG) {
    target.removeAttributeNS(null, attrName)

  } else {
    target.removeAttribute(attrName)
  }
}

const buildHTML = (vTree, mounters, parentDismounters) => {
  mounters = mounters || []
  const dismounters = []

  vTree.onmount && mounters.push(vTree.onmount)
  if (vTree.ondismount) {
    dismounters.push(vTree.ondismount)
    parentDismounters && parentDismounters.push(vTree.ondismount)
  }

  if (vTree.tag === TEXT) {
    vTree.html = document.createTextNode(vTree.text)

  } else if (vTree.tag === LIST) {
    vTree.html = document.createDocumentFragment()
    vTree.children.forEach(child => {
      buildHTML(child, mounters, dismounters)
      vTree.html.appendChild(child.html)
    })
    parentDismounters.push.apply(parentDismounters, dismounters)

  } else {
    const isSVG = vTree.tag === "svg"
    const tag = isSVG ? document.createElementNS(SVG_NS, vTree.tag) : document.createElement(vTree.tag)

    vTree.html = tag

    const attrKeys = Object.keys(vTree.attrs)
    attrKeys.forEach(name => attachAttr(tag, isSVG, name, vTree.attrs[name]))

    if (vTree.children.length) {
      const frag = document.createDocumentFragment()

      vTree.children.forEach(child => {
        buildHTML(child, mounters, dismounters)
        vTree.html.appendChild(child.html)
      })

      vTree.html.appendChild(frag)
    }

  }

  vTree.mounters = mounters
  vTree.dismounters = dismounters
  return vTree
}

const addHTML = (change) => {
  const { next, options } = change
  const optionsArray = Array.isArray(options) ? options : [options]
  const target = next.html

  const nodesToAdd = optionsArray.map(node => {
    buildHTML(node)
    return node.html
  })

  append(target, nodesToAdd)
  optionsArray.forEach(node => {
    node.mounters && node.mounters.forEach(handler => handler())
  })
}

const removeHTML = (change) => {
  const { prev } = change
  prev.parent.html.removeChild(prev.html)
  prev.dismounters && prev.dismounters.forEach(handler => handler())
  prev.html = null
}

const replaceHTML = (change) => {
  const { prev, next } = change
  buildHTML(next)
  next.parent.html.replaceChild(next.html, prev.html)
  prev.dismounters && prev.dismounters.forEach(handler => handler())
  next.mounters && next.mounters.forEach(handler => handler())
  prev.html = null
}

const updateHTML = (change) => {
  const { prev, next, options } = change
  const isSVG = next.tag === "svg"

  next.html = next.html || prev.html

  options.forEach(([type, attrName, value]) => {
    switch (type) {
      case DELETE: return detachAttr(next.html, isSVG, attrName)
      case SET: return attachAttr(next.html, isSVG, attrName, value)
      default:
        throw new Error(`Attribute change type ${type} does not exist.`)
    }
  })
}

const reorderHTML = (change) => {
  const { prev, next, options } = change

  // To reorder the list we will...
  //   Created a sortedList of keyCache items, sorted by intended position.
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

const diff = (prev, next, queue=[]) => {
  if (prev === next) return queue

  if (prev.tag !== next.tag) {
    queue.push(changeObject(REPLACE, prev, next))
    return queue
  }

  if (!next.html) {
    next.html = prev.html
  }

  if (next.tag === TEXT) {
    if (prev.text !== next.text) queue.push(changeObject(REPLACE, prev, next))
    return queue
  }

  if (next.tag === LIST) {
    const { toRemove, toAdd, toCompare, reorder } = getListDiff(prev.keyCache, next.keyCache)
    toCompare.forEach(([prevItem, nextItem]) => diff(prevItem.node, nextItem.node, queue))
    toRemove.forEach(prevItem => queue.push(changeObject(REMOVE, prevItem.node)))
    toAdd.length && queue.push(changeObject(ADD, null, next.parent, toAdd.map(item => item.node)))
    reorder && queue.push(changeObject(REORDER, prev, next, toRemove))
    return queue
  }

  const attrDiff = getAttrDiff(prev.attrs, next.attrs, next.controller)
  attrDiff.length && queue.push(changeObject(UPDATE, prev, next, attrDiff))

  const prevChildren = prev.children
  const nextChildren = next.children
  let shorterChildList
  let longerChildList

  if (prevChildren.length > nextChildren.length) {
    const prevChildrenToMatch = prevChildren.slice(0, nextChildren.length)
    const prevChildrenAddtl = prevChildren.slice(nextChildren.length)

    prevChildrenToMatch.forEach((prevChild, index) => diff(prevChild, nextChildren[index], queue))
    prevChildrenAddtl.forEach(prevChild => queue.push(changeObject(REMOVE, prevChild)))

  } else {
    const nextChildrenToMatch = nextChildren.slice(0, prevChildren.length)
    const nextChildrenAddtl = nextChildren.slice(prevChildren.length)

    nextChildrenToMatch.forEach((nextChild, index) => diff(prevChildren[index], nextChild, queue))
    nextChildrenAddtl.length && queue.push(changeObject(ADD, prev, next, nextChildrenAddtl))
  }

  return queue
}

const fragment = (fn) => {
  let prevData = {}

  const output = (props, children) => {
    const cacheId = props.id

    if (!cacheId) {
      return fn(props, children)
    }

    const prevCache = prevData[cacheId] = prevData[cacheId] || {}
    const prevProps = prevCache.props
    const prevNode = prevCache.node
    const nextChildLength = children && children.nodes ? children.nodes.length : 0

    const noChildrenOverChange = prevCache.childLength === 0 && nextChildLength === 0
    const prevChildLen = prevCache.childLength

    if (prevNode && noChildrenOverChange && deepEqual(prevProps, props)) {
      prevCache.props = props
      return prevNode
    }

    const nextNode = fn(props, children)
    const shouldTransferHtml = prevNode && !prevNode.listed && !nextNode.html
    const shouldTransferDismounters = prevNode && prevNode.dismounters && !nextNode.dismounters

    if (shouldTransferHtml) {
      nextNode.html = prevNode.html
    }

    if (shouldTransferDismounters) {
      nextNode.dismounters = prevNode.dismounters
    }

    prevCache.props = props
    prevCache.node = nextNode
    prevCache.childLength === nextChildLength
    return nextNode
  }

  output[PROOF] = PROOF
  return output
}

const createApp = (rootFragmentFn, rootTarget) => {
  assertPureFragment(rootFragmentFn)
  let prevTree = null
  return () => {
    return {
      rootTarget,
      rootFragmentFn,
      prevTree,
      setPrevTree: (vTree) => prevTree = vTree,
    }
  }
}

const render = (appFn, props={}) => {
  const { rootTarget, rootFragmentFn, prevTree, setPrevTree } = appFn()

  const nextTree = rootFragmentFn(props)
  setPrevTree(nextTree)

  if (!prevTree) {
    addHTML({
      next: { html: rootTarget },
      options: nextTree,
    })

  } else {
    const changeObjects = diff(prevTree, nextTree)

    changeObjects.forEach(change => {
      const { type } = change
      switch (type) {
        case ADD: return addHTML(change)
        case REMOVE: return removeHTML(change)
        case REPLACE: return replaceHTML(change)
        case UPDATE: return updateHTML(change)
        case REORDER: return reorderHTML(change)
        default: throw new Error(`Change type ${type} does not exist.`)
      }
    })
  }
}

const createObserver = (isAsync, fn, outputElem) => {
  const observerCalc = outputElem ? null : fn
  const observer = isAsync ? observableAsync(observerCalc) : observable(observerCalc)

  if (outputElem) {
    const app = createApp(fn, outputElem)
    observer.watch(newVal => render(app, newVal))
  }

  return observer
}

const app = (fn, outputElem) => createObserver(true, fn, outputElem)
const appSync = (fn, outputElem) => createObserver(false, fn, outputElem)

fragment.hart = vNode

export {
  fragment,
  app,
  appSync,
}
