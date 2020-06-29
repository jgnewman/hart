import {
  ADD,
  DELETE,
  LIST,
  REMOVE,
  REORDER,
  REPLACE,
  SET,
  TEXT,
  UPDATE,
} from "./constants"

function positionSort(a, b) {
  return a.pos === b.pos ? 0 : (a.pos < b.pos ? -1 : 1)
}

function changeObject(type, prev, next, options) {
  return {
    type,
    prev,
    next,
    options,
  }
}

function getAttrDiff(prevAttrs, nextAttrs) {
  const diff = []
  const checked = {}

  for (let i in prevAttrs) {
    if (prevAttrs.hasOwnProperty(i) && i !== "key") {
      checked[i] = true

      if (prevAttrs[i] !== nextAttrs[i]) {
        diff.push(!nextAttrs.hasOwnProperty(i) ? [DELETE, i] : [SET, i, nextAttrs[i]])
      }
    }
  }

  for (let i in nextAttrs) {
    const isNewlyAddedAttr = i !== "key" && nextAttrs.hasOwnProperty(i) && !checked[i]
    isNewlyAddedAttr && diff.push([SET, i, nextAttrs[i]])
  }

  return diff
}

function getListDiff(prev, next) {
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

function diff(prev, next, queue=[]) {
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

  const attrDiff = getAttrDiff(prev.attrs, next.attrs)
  attrDiff.length && queue.push(changeObject(UPDATE, prev, next, attrDiff))

  const prevChildren = prev.children
  const nextChildren = next.children

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

export {
  changeObject,
  diff,
  positionSort,
}
