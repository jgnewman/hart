import {
  ADD,
  FRAG,
  REMOVE,
  REORDER,
  REPLACE,
  TEXT,
  UPDATE,
} from "./constants"

import {
  nodeTracker,
} from "./tracking"

import {
  observable,
  observableAsync,
} from "./observables"

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
  isChildPack,
  createOptimizedVNodeFactory,
  fragment,
  optimizedFragment,
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
      appId: genAppId(),
      rootTarget,
      rootFragmentFn,
      prevTree,
      setPrevTree: (vTree) => prevTree = vTree,
    }
  }
}

function isFragList(value) {
  return Array.isArray(value) && value[0] === FRAG
}

function buildTree(value) {
  let out

  if (isFragList(value)) {
    const [_, tag, closure] = value
    nodeTracker.trackTag(tag)

    out = closure()
    out.children = out.children.map(child => buildTree(child))

    nodeTracker.untrackTag()

  } else if (isChildPack(value)) {
    console.log("got a child pack!", value)
    throw new Error()

  } else if (Array.isArray(value)) {
    console.log("got an array!", value)
    throw new Error()

  } else if (value === null || value === undefined || value === false) {
    console.log("got an falsy!", value)
    throw new Error()

  } else if (typeof value === "object") {
    console.log("got an object!", value)
    throw new Error()

  } else {
    out = buildTree(vNode(TEXT))
    out.text = String(value)
  }

  return out
}

function render(appFn, props={}, appOptions) {
  const { appId, rootTarget, rootFragmentFn, prevTree, setPrevTree } = appFn()
  const fragProps = !appOptions.id ? props : { ...props, id: appOptions.id }
  const parentAppChildPack = appOptions[CHILD_PACK_REF] ? appOptions[CHILD_PACK_REF].current : childPack()

  nodeTracker.nest()
  nodeTracker.trackTag(appId)

  const nextTreeFragList = rootFragmentFn(fragProps, parentAppChildPack)
  const nextTree = buildTree(nextTreeFragList)
  const nextParent = { html:rootTarget }

  nodeTracker.untrackTag()
  nodeTracker.unnest()

  nextTree.parent = nextParent
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

function subappFragment(userFn, settings = {}) {
  const appOptions = settings.options || {}
  const appFn = settings.sync ? appSync : app
  let updateReducer

  const RootFragment = createOptimizedVNodeFactory({
    userFn,
    customCompare: settings.compareProps,
    updater: change => updateReducer && updateReducer(change)
  })

  const AppGenerator = optimizedFragment(({ effects, id,...rest }, childPack) => {
    const subrootRef = effects.ref()
    const propsRef = effects.ref({ ...rest })
    const childRef = effects.ref(childPack)

    effects.afterEffect(() => {
      const { current: elem } = subrootRef
      const { current: props } = propsRef

      const Reducer = appFn(settings.reducer || (change => ({ current: change })))
      updateReducer = Reducer.update

      const Renderer = appFn(RootFragment, elem, {
        ...appOptions,
        id: appOptions.id || id + "-subapp",
        [CHILD_PACK_REF]: childRef,
      })

      Reducer.watch((newData) => Renderer.update({ ...props, localData: newData }))
      Reducer.update(settings.hasOwnProperty("init") ? settings.init : null)

    }, [propsRef, childRef, subrootRef])

    const wrapper = settings.wrapper || vNode("div")
    wrapper.attrs.ref = subrootRef

    return wrapper
  })

  return AppGenerator
}

fragment.subapp = subappFragment

export {
  app,
  appSync,
}
