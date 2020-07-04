import {
  ADD,
  REMOVE,
  REORDER,
  REPLACE,
  UPDATE,
} from "./constants"

import {
  useRef,
  useAfterEffect,
} from "./effects"

import {
  generateVDom,
} from "./vdom"

import {
  observable,
} from "./observables"

import {
  nodeTracker,
} from "./tracking"

import {
  changeObject,
  diff,
} from "./diffing"

import {
  addHTML,
  replaceHTML,
  removeHTML,
  reorderHTML,
  updateHTML,
} from "./dom"

import {
  withPropCheck,
  childPack,
  optimizedFunction,
  vNode,
} from "./nodes"

const CHILD_PACK_REF = Symbol()

let appIdCounter = 0
function genAppId() {
  if (appIdCounter > 10000) {
    appIdCounter = 0
  }
  return String(Date.now()).slice(0, 6) + (appIdCounter += 1)
}

function createIo(rootUserFn, target, options) {
  let prevTree = null
  const appId = options.id || genAppId()

  let rootTarget = target
  rootTarget.innerHTML = ""

  if (options.useShadowRoot) {
    target.attachShadow({ mode: "open" })
    rootTarget = target.shadowRoot
  }

  return () => {
    return {
      appId,
      rootTarget,
      rootUserFn,
      prevTree,
      setPrevTree: (vTree) => prevTree = vTree,
    }
  }
}

function render(ioFn, props={}, appOptions) {
  const { appId, rootTarget, rootUserFn, prevTree, setPrevTree } = ioFn()
  const parentAppChildPack = appOptions[CHILD_PACK_REF] ? appOptions[CHILD_PACK_REF].current : childPack()

  const [nextTree, nextParent] = generateVDom(
    appId,
    rootTarget,
    rootUserFn,
    props,
    parentAppChildPack,
  )

  setPrevTree(nextTree)

  if (!prevTree) {
    addHTML(changeObject(ADD, null, nextParent, nextTree))

  } else {
    const changeObjects = diff(prevTree, nextTree)

    changeObjects.forEach(change => {
      const { type } = change
      switch (type) {
        case ADD: return addHTML(change)
        case REMOVE: return removeHTML(change)
        case REPLACE: return replaceHTML(change)
        case UPDATE: return updateHTML(change)
        case REORDER: return reorderHTML(change)
        default: throw new Error(`Change type ${type} does not exist.`)
      }
    })
  }
}

function createObserver(rootUserFn, outputElem, options={}) {
  const observerCalc = outputElem ? null : rootUserFn
  const observer = observable(observerCalc)

  if (outputElem) {
    const realNode = typeof outputElem === "string" ? document.querySelector(outputElem) : outputElem
    const io = createIo(rootUserFn, realNode, options)
    observer.watch(newVal => render(io, newVal, options))
  }

  return observer
}

function app(rootUserFn, outputElem, options) {
  return createObserver(rootUserFn, outputElem, options)
}

function subapp(userFn, settings = {}) {
  const appOptions = settings.options || {}
  const RootOptimizedFn = optimizedFunction(userFn)

  const AppGenerator = optimizedFunction((userProps, childPack) => {
    const subrootRef = useRef()
    const propsRef = useRef({ ...userProps })
    const childRef = useRef(childPack)
    const currentHash = nodeTracker.getHash()

    useAfterEffect(() => {
      const { current: elem } = subrootRef
      const { current: props } = propsRef

      const Reducer = app(settings.reducer || (change => ({ current: change })))

      const Renderer = app(RootOptimizedFn, elem, {
        ...appOptions,
        id: currentHash + "-subapp",
        [CHILD_PACK_REF]: childRef,
      })

      Reducer.watch((newData) => Renderer.update({
        ...props,
        localData: newData,
        update: Reducer.update,
      }))

      Reducer.update(settings.hasOwnProperty("init") ? settings.init : null)
    }, [propsRef, childRef, subrootRef, currentHash])

    const wrapper = settings.wrapper || vNode("div")
    wrapper.attrs.ref = subrootRef

    return wrapper
  })

  return AppGenerator
}


export {
  app,
  subapp,
}
