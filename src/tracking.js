const FRAG_ID = Symbol.for("FRAG_id")

let fragCounter = 0
function createFragId() {
  return "frag(" + (fragCounter += 1) + ")"
}

class NodeTracker {
  constructor() {
    this.ids = []
    this.position = []
  }

  _getCurPos() {
    return this.position[this.position.length - 1]
  }

  _incCurPos() {
    this.position[this.position.length - 1] = this._getCurPos() + 1
  }

  getCurrent() {
    return this.ids.join(" ")
  }

  trackTag(tag) {
    this._incCurPos()

    let tagName
    if (typeof tag === "function") {
      tagName = tag[FRAG_ID] = tag[FRAG_ID] || createFragId()
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
