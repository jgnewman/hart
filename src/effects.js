import {
  nodeTracker,
} from "./tracking"

export const globalEffectCache = new Map()

export function assertCache() {
  const currentHash = nodeTracker.getHash()
  let cell = globalEffectCache.get(currentHash)

  if (!cell) {
    cell = new CacheObject(currentHash)
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

function getEffectUsage(cacheObject) {
  return [cacheObject.effectMem, (cacheObject.effectCount += 1)]
}

function useMemo(calculator, newDeps = []) {
  const [effectMem, position] = getEffectUsage(assertCache())
  const [prevVal, prevDeps] = effectMem[position] || []
  const newVal = depsDidChange(prevDeps, newDeps) ? calculator() : prevVal

  effectMem[position] = [newVal, newDeps]
  return newVal
}

function useMemoFn(newCb, newDeps = []) {
  const [effectMem, position] = getEffectUsage(assertCache())
  const [prevCb, prevDeps] = effectMem[position] = effectMem[position] || []
  const callback = depsDidChange(prevDeps, newDeps) ? newCb : prevCb

  effectMem[position] = [callback, newDeps]
  return callback
}

function useAfterEffect(newEffect, newDeps) {
  const cacheObject = assertCache()
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

function useRef(initVal) {
  const [effectMem, position] = getEffectUsage(assertCache())
  const ref = effectMem[position] = effectMem[position] || { current: initVal }
  return ref
}

class CacheObject {
  constructor(currentHash) {
    this.childLength = 0
    this.cleanups = []
    this.effectCount = -1
    this.effectMem = []
    this.node = null
    this.props = null

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

export {
  CacheObject,
  useAfterEffect,
  useMemo,
  useMemoFn,
  useRef,
}
