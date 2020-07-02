import {
  CHILD_PACK,
  COMPARE,
  DOC_FRAG,
  EMPTY,
  LAZY,
  OPTIM,
  CACHELESS,
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
    const optimizedFn = optimizedFunction(tag)

    const out = function () {
      const out = optimizedFn(attrs, childPack(children))

      if (attrs.hasOwnProperty("key")) {
        out.attrs.key = attrs.key
      }

      return out
    }

    out[LAZY] = { userFn: tag, attrs }
    return out
  }

  return {
    [LAZY]: LAZY,
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

function optimizedFunction(userFn) {

  if (userFn[CACHELESS]) {
    const quickOut = function (props, children) {
      return userFn(props, children) || vNode(EMPTY)
    }
    quickOut[OPTIM] = OPTIM
    return quickOut
  }

  const customCompare = userFn[COMPARE]
  const assertEqualProps = customCompare || propsEqual

  function output(nextProps, children) {
    const prevCache = assertCache()

    const prevProps = prevCache.props
    const prevNode = prevCache.node

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

function throwFnTypeConflict() {
  throw new Error("You can not add prop checks to cacheless functions.")
}

function withPropCheck(userFn, customCompare) {
  userFn[COMPARE] = customCompare
  userFn[CACHELESS] && throwFnTypeConflict()
  return userFn
}

function withoutCache(userFn) {
  userFn[CACHELESS] = CACHELESS
  userFn[COMPARE] && throwFnTypeConflict()
  return userFn
}

export {
  childPack,
  hasBeenOptimized,
  isChildPack,
  optimizedFunction,
  vNode,
  vNodeObject,
  withoutCache,
  withPropCheck,
}
