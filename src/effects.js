import {
  nodeTracker,
} from "./tracking"

export const globalEffectCache = new Map()

export function assertCache(id, updater) {
  const currentHash = nodeTracker.getHash()
  let cell = globalEffectCache.get(currentHash)
  if (!cell) {
    cell = new CacheObject(id, currentHash, updater)
    globalEffectCache.set(currentHash, cell)
  }
  return cell
}

function depsDidChange(prevDeps, newDeps) {
  let changed = false

  if (!prevDeps || !newDeps || newDeps.length !== prevDeps.length) {
    changed = true
  }

  !changed && newDeps.length && newDeps.every((newDep, index) => {
    const prevDep = prevDeps[index]
    if (prevDep !== newDep) {
      changed = true
      return false
    }
    return true
  })

  return changed
}



/********************************************************************/

function getEffectUsage(cacheObject) {
  return [cacheObject.effectMem, (cacheObject.effectCount += 1)]
}

function createMemoTracker(cacheObject) {
  return function (calculator, newDeps=[]) {
    const [effectMem, position] = getEffectUsage(cacheObject)
    const [prevVal, prevDeps] = effectMem[position] || []
    const newVal = depsDidChange(prevDeps, newDeps) ? calculator() : prevVal

    effectMem[position] = [newVal, newDeps]
    return newVal
  }
}

function createMemoFnTracker(cacheObject) {
  return function (newCb, newDeps=[]) {
    const [effectMem, position] = getEffectUsage(cacheObject)
    const [prevCb, prevDeps] = effectMem[position] = effectMem[position] || []
    const callback = depsDidChange(prevDeps, newDeps) ? newCb : prevCb

    effectMem[position] = [callback, newDeps]
    return callback
  }
}

function createAfterEffectTracker(cacheObject) {
  return function (newEffect, newDeps) {
    const [effectMem, position] = getEffectUsage(cacheObject)
    const [prevCleanup, prevDeps] = effectMem[position] || []
    const prevCleanupIsFn = typeof prevCleanup === "function"

    if (depsDidChange(prevDeps, newDeps)) {
      prevCleanupIsFn && cacheObject.unregisterCleanup(prevCleanup)

      setTimeout(() => {
        prevCleanupIsFn && prevCleanup()
        const newCleanup = newEffect()
        effectMem[position] = [newCleanup, newDeps]
        typeof newCleanup === "function" && cacheObject.registerCleanup(newCleanup)
      }, 0)
    }
  }
}

function createRefTracker(cacheObject) {
  return function (initVal) {
    const [effectMem, position] = getEffectUsage(cacheObject)
    const ref = effectMem[position] = effectMem[position] || { current: initVal }
    return ref
  }
}

export class CacheObject {
  constructor(id, currentHash, updater) {
    this.childLength = 0
    this.cleanups = []
    this.effectCount = -1
    this.effectMem = []
    this.id = id
    this.node = null
    this.props = null

    this.effects = {
      afterEffect: createAfterEffectTracker(this),
      memo: createMemoTracker(this),
      memoFn: createMemoFnTracker(this),
      ref: createRefTracker(this),
    }

    if (updater) {
      this.effects.update = updater
    }

    this.onunmount = () => {
      this.cleanups.forEach(callback => callback())
      this.cleanups = []
      globalEffectCache.delete(currentHash)
    }
  }

  unregisterCleanup(callback) {
    this.cleanups.splice(this.cleanups.indexOf(callback), 1)
  }

  registerCleanup(callback) {
    this.cleanups.push(callback)
  }

  resetCounts() {
    this.effectCount = -1
  }
}
