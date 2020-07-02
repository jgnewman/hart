import {
  DOC_FRAG,
} from "./constants"

import {
  addPropCheck,
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
  addPropCheck,
  app,
  appSync,
  subapp,
}
