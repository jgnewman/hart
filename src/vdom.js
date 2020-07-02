import {
  EMPTY,
  FRAG,
  LIST,
  TEXT,
} from "./constants"

import {
  nodeTracker,
} from "./tracking"

import {
  fragment,
  hasBeenOptimized,
  isChildPack,
  vNode,
  vNodeObject,
} from "./fragments"

function isVNodeWrapper(value) {
  return typeof value === "object" && value[FRAG] === FRAG
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

function buildVNodeFromWrapper(wrapper, trackKeys) {
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


function buildVNodeFromFragFn(fragFn, trackKeys) {
  const trackingKey = trackKeys ? fragFn[FRAG].attrs.key : null
  const originalFragment = fragFn[FRAG].frag

  nodeTracker.trackTag(originalFragment, trackingKey)
  const out = buildTree(fragFn())
  nodeTracker.untrackTag()

  return out
}

function buildTree(value, parent, trackKeys) {
  let out

  // for raw elements like divs
  if (isVNodeWrapper(value)) {
    out = buildVNodeFromWrapper(value, trackKeys)

  // for fragment calls
  } else if (typeof value === "function") {
    out = buildVNodeFromFragFn(value, trackKeys)

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

function generateVDom(appId, rootTarget, rootFragmentFn, fragProps, parentAppChildPack) {
  nodeTracker.trackApp(appId, rootFragmentFn)

  const rootFragment = hasBeenOptimized(rootFragmentFn) ? rootFragmentFn : fragment(rootFragmentFn)
  const nextTreeFragFn = rootFragment(fragProps, parentAppChildPack)

  const nextTree = buildTree(nextTreeFragFn)
  const nextParent = nextTree.parent = { html:rootTarget }

  nodeTracker.untrackApp()

  return [nextTree, nextParent]
}

export {
  generateVDom,
}
