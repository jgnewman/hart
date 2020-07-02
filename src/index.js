import {
  DOC_FRAG,
} from "./constants"

import {
  withPropCheck,
  vNode,
} from "./nodes"

export {
  useAfterEffect,
  useMemo,
  useMemoFn,
  useRef,
} from "./effects"

export {
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
  withPropCheck,
}
