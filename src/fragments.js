import {
  CHILD_PACK,
  DOC_FRAG,
  EMPTY,
  FRAG,
  OPTIM,
} from "./constants"

import {
  assertCache,
} from "./effects"

function childPack(children=null) {
  return {
    [CHILD_PACK]: CHILD_PACK,
    nodes: children,
  }
}

function isChildPack(object) {
  return typeof object === "object" && object[CHILD_PACK] === CHILD_PACK
}

function vNodeObject(tag, attrs, children) {
  return {
    tag,
    attrs,
    children,
    listed: false,
    html: null,
    parent: null,
  }
}

function vNode(tag, attrs, ...children) {
  attrs = attrs || {}

  if (tag === DOC_FRAG) {
    if (!children.length) {
      throw new Error("Document-fragment nodes must contain at least one child.")
    } else if (Object.keys(attrs).length) {
      throw new Error("Document-fragment nodes may not be given attributes.")
    }
  }

  if (typeof tag === "function") {
    const wrappedTag = fragment(tag)

    const out = function () {
      const out = wrappedTag(attrs, childPack(children))

      if (attrs.hasOwnProperty("key")) {
        out.attrs.key = attrs.key
      }

      return out
    }

    out[FRAG] = { frag: tag, attrs }
    return out
  }

  return {
    [FRAG]: FRAG,
    tag,
    attrs,
    factory: () => vNodeObject(tag, attrs, children),
  }
}

function propsEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)

  const len = aKeys.length
  if (bKeys.length !== len) return false

  for (let i = 0; i < len; i++) {
    const key = aKeys[i]
    if (a[key] !== b[key] || !Object.prototype.hasOwnProperty.call(b, key)) return false
  }

  return true
}

function hasBeenOptimized(fn) {
  return typeof fn === "function" && fn[OPTIM] === OPTIM
}

function optimizedFunction({ userFn, customCompare, updater }) {
  const assertEqualProps = customCompare ? customCompare : propsEqual

  function output(props, children) {
    const prevCache = assertCache(updater)

    const prevProps = prevCache.props
    const prevNode = prevCache.node

    const nextProps = { ...props, effects: prevCache.effects }
    const nextChildLength = children && children.nodes ? children.nodes.length : 0
    const noChildrenOverChange = prevCache.childLength === 0 && nextChildLength === 0

    if (prevNode && noChildrenOverChange && assertEqualProps(prevProps, nextProps)) {
      prevCache.props = nextProps
      return prevNode
    }

    const nextNode = userFn(nextProps, children) || vNode(EMPTY)
    prevCache.resetCounts()
    nextNode.onunmount = prevCache.onunmount

    const shouldTransferHtml = prevNode && !prevNode.listed && !nextNode.html

    if (shouldTransferHtml) {
      nextNode.html = prevNode.html
    }

    prevCache.props = nextProps
    prevCache.node = nextNode
    prevCache.childLength = nextChildLength
    return nextNode
  }
  output[OPTIM] = OPTIM

  return output
}

function fragment(userFn, customCompare) {
  return optimizedFunction({ userFn, customCompare })
}

export {
  childPack,
  fragment,
  hasBeenOptimized,
  isChildPack,
  optimizedFunction,
  vNode,
  vNodeObject,
}
