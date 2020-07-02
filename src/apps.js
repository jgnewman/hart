import {
  ADD,
  REMOVE,
  REORDER,
  REPLACE,
  UPDATE,
} from "./constants"

import {
  generateVDom,
} from "./vdom"

import {
  observable,
  observableAsync,
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
  childPack,
  optimizedFunction,
  fragment,
  vNode,
} from "./fragments"

const CHILD_PACK_REF = Symbol()

let appIdCounter = 0
function genAppId() {
  if (appIdCounter > 10000) {
    appIdCounter = 0
  }
  return String(Date.now()).slice(0, 6) + (appIdCounter += 1)
}

function createApp(rootFragmentFn, target, options) {
  let prevTree = null

  let rootTarget = target
  if (options.useShadowRoot) {
    target.attachShadow({ mode: "open" })
    rootTarget = target.shadowRoot
  }

  return () => {
    return {
      appId: options.id || genAppId(),
      rootTarget,
      rootFragmentFn,
      prevTree,
      setPrevTree: (vTree) => prevTree = vTree,
    }
  }
}

function render(appFn, props={}, appOptions) {
  const { appId, rootTarget, rootFragmentFn, prevTree, setPrevTree } = appFn()
  const parentAppChildPack = appOptions[CHILD_PACK_REF] ? appOptions[CHILD_PACK_REF].current : childPack()

  const [nextTree, nextParent] = generateVDom(
    appId,
    rootTarget,
    rootFragmentFn,
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

function createObserver(fn, outputElem, options={}, isAsync) {
  const observerCalc = outputElem ? null : fn
  const observer = isAsync ? observableAsync(observerCalc) : observable(observerCalc)

  if (outputElem) {
    const realNode = typeof outputElem === "string" ? document.querySelector(outputElem) : outputElem
    const app = createApp(fn, realNode, options)
    observer.watch(newVal => render(app, newVal, options))
  }

  return observer
}

function app(fn, outputElem, options) {
  return createObserver(fn, outputElem, options, true)
}

function appSync(fn, outputElem, options) {
  return createObserver(fn, outputElem, options, false)
}

function subapp(userFn, settings = {}) {
  const appOptions = settings.options || {}
  const appFn = settings.sync ? appSync : app
  let updateReducer

  const RootFragment = optimizedFunction({
    userFn,
    customCompare: settings.compareProps,
    updater: change => updateReducer && updateReducer(change)
  })

  const AppGenerator = fragment(({ effects, id,...rest }, childPack) => {
    const subrootRef = effects.ref()
    const propsRef = effects.ref({ ...rest })
    const childRef = effects.ref(childPack)
    const currentHash = nodeTracker.getHash()

    effects.afterEffect(() => {
      const { current: elem } = subrootRef
      const { current: props } = propsRef

      const Reducer = appFn(settings.reducer || (change => ({ current: change })))
      updateReducer = Reducer.update

      const Renderer = appFn(RootFragment, elem, {
        ...appOptions,
        id: currentHash + "-subapp",
        [CHILD_PACK_REF]: childRef,
      })

      Reducer.watch((newData) => Renderer.update({ ...props, localData: newData }))
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
  appSync,
  subapp,
}
