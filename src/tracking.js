import {
  FN_ID,
} from "./constants"

let fnCounter = 0
function createFnId() {
  return "fn(" + (fnCounter += 1) + ")"
}

class NodeTracker {
  constructor() {
    this.ids = []
    this.position = []
  }

  _getCurPos() {
    return this.position[this.position.length - 1]
  }

  _setCurPos(val) {
    this.position[this.position.length - 1] = val
  }

  _incCurPos() {
    this.position[this.position.length - 1] = this._getCurPos() + 1
  }

  _getCurId() {
    return this.ids.join(" ")
  }

  getHash() {
    const source = this._getCurId()
    let hash = 0
    if (!source.length) return hash
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i)
      hash = hash * 31 + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }

  trackApp(appId, rootUserFn) {
    this.nest()
    this.trackTag(appId)
    this.nest()
    this.trackTag(rootUserFn)
    this.nest()
  }

  untrackApp() {
    this.unnest()
    this.untrackTag()
    this.unnest()
    this.untrackTag()
    this.unnest()
  }

  trackTag(tag, key) {
    (key === null || key === undefined) ? this._incCurPos() : this._setCurPos(key)

    let tagName
    if (typeof tag === "function") {
      tagName = tag[FN_ID] = tag[FN_ID] || createFnId()
    } else {
      tagName = String(tag)
    }

    this.ids.push(tagName + ":" + this._getCurPos())
  }

  untrackTag() {
    this.ids.length = this.ids.length - 1
  }

  nest() {
    this.position.push(-1)
  }

  unnest() {
    this.position.length = this.position.length - 1
  }

}

export const nodeTracker = new NodeTracker()
