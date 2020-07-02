import {
  DOC_FRAG,
} from "./constants"

import {
  vNode,
} from "./nodes"

import {
  app,
  appSync,
  subapp,
} from "./apps"

const hart = {
  elem: vNode,
  docFrag: DOC_FRAG,
}

export {
  hart,
  app,
  appSync,
  subapp,
}
