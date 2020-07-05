import {
  EMPTY,
  LAZY,
  LIST,
  TEXT,
} from "./constants"

import {
  nodeTracker,
} from "./tracking"

import {
  hasBeenOptimized,
  isChildPack,
  vNode,
  vNodeObject,
  optimizedFunction,
} from "./nodes"

function isLazyVnode(value) {
  return typeof value === "object" && value[LAZY] === LAZY
}

function addParent(child, parent) {
  child.parent = parent
  child.onaddparent && child.onaddparent(parent)
  return child
}

function buildListVNode(children, parent, shouldTrackChildKeys) {
  const listNode = addParent(buildTree(vNode(LIST, null, ...children), shouldTrackChildKeys), parent)
  const keyCache = listNode.keyCache = {}

  listNode.children.forEach((childNode, index) => {
    if (!childNode.attrs.hasOwnProperty("key") || keyCache.hasOwnProperty(childNode.attrs.key)) {
      throw new Error("Every member of a node array must have a unique `key` prop.")
    }
    childNode.listed = true
    childNode.parent = parent
    keyCache[childNode.attrs.key] = { node: childNode, pos: index }
  })

  return listNode
}

function delazifyVNode(wrapper, trackKeys) {
  const trackingKey = trackKeys ? wrapper.attrs.key : null
  const shouldTrackChildKeys = wrapper.tag === LIST
  nodeTracker.trackTag(wrapper.tag, trackingKey)

  const out = wrapper.factory()
  out.onunmount = wrapper.onunmount

  nodeTracker.nest()
  const mappedChildren = []

  out.children.forEach(child => {

    if (isChildPack(child)) {
      child.nodes && child.nodes.forEach(cpChild => {
        mappedChildren.push(addParent(buildTree(cpChild, out, shouldTrackChildKeys), out))
      })

    } else if (Array.isArray(child)) {
      mappedChildren.push(buildListVNode(child, out, shouldTrackChildKeys))

    } else {
      mappedChildren.push(addParent(buildTree(child, out, shouldTrackChildKeys), out))
    }
  })

  out.children = mappedChildren
  nodeTracker.unnest()

  nodeTracker.untrackTag()
  return out
}


function execOptimizedFn(optimizedFn, trackKeys) {
  const trackingKey = trackKeys ? optimizedFn[LAZY].attrs.key : null
  const userFn = optimizedFn[LAZY].userFn

  nodeTracker.trackTag(userFn, trackingKey)
  nodeTracker.nest()
  const out = buildTree(optimizedFn())
  nodeTracker.unnest()
  nodeTracker.untrackTag()

  return out
}

function buildTree(value, parent, trackKeys) {
  let out

  // for raw elements like divs
  if (isLazyVnode(value)) {
    out = delazifyVNode(value, trackKeys)

  // for optimized function calls
  } else if (typeof value === "function") {
    out = execOptimizedFn(value, trackKeys)

  } else if (value === null || value === undefined || value === false) {
    nodeTracker.trackTag(EMPTY)
    out = vNodeObject(EMPTY, null, [])
    out.parent = parent
    nodeTracker.untrackTag()

  } else if (typeof value === "object") {
    throw new Error(`Value ${value} is not valid for building DOM.`)

  } else {
    nodeTracker.trackTag(TEXT)
    out = vNodeObject(TEXT, null, [])
    out.parent = parent
    out.text = String(value)
    nodeTracker.untrackTag()
  }

  return out
}

function generateVDom(appId, rootTarget, rootUserFn, props, parentAppChildPack) {
  nodeTracker.trackApp(appId, rootUserFn)

  // In the case of subapps, the rootUserFn has already been optimized.
  const rootOptimizedFn = hasBeenOptimized(rootUserFn)
                        ? rootUserFn
                        : optimizedFunction(rootUserFn)

  const lazyTree = rootOptimizedFn(props, parentAppChildPack)
  const nextTree = buildTree(lazyTree)
  const nextParent = nextTree.parent = { html:rootTarget }

  nodeTracker.untrackApp()

  return [nextTree, nextParent]
}

export {
  generateVDom,
}
