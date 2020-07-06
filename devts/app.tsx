import hart, {
  Children,
  SubappProps,
  app,
  subapp,
  useAfterEffect,
  useMemo,
  useMemoFn,
  useRef,
  withoutCache,
  withPropCheck,
} from "../src/index"

interface NestedProps {
  counter: number
}

interface NestedData {
  multiplier: number
}

const initialNestedData: NestedData = {
  multiplier: 10,
}

const Nested = subapp(({
  counter,
  localData,
  update,
}: NestedProps & SubappProps<NestedData>, children: Children) => {
  const { multiplier } = localData

  useAfterEffect(() => {
    update({ multiplier: 100 })
  }, [])

  return (
    <div class="nested">
      {children} {counter * multiplier}
    </div>
  )
}, {
  init: initialNestedData,
  options: { id: "bar" },
  reducer: (change: Partial<NestedData>, prev: NestedData) => ({ ...prev, ...change }),
  wrapper: <div></div>,
})

interface RootProps {
  counter: number
}

const Root = ({ counter }: RootProps) => {
  const memoizedCounter = useMemo(() => counter, [counter])
  const clickHandler = useMemoFn(() => console.log("clicked"), [])
  const rootRef = useRef<HTMLDivElement>()

  useAfterEffect(() => {
    const { current } = rootRef
    console.log("Root mounted!", current)
  }, [rootRef])

  return (
    <div id="ts-app" ref={rootRef} onclick={clickHandler}>
      <Nested counter={memoizedCounter}>
        <span>Hello, world!</span>
      </Nested>
    </div>
  )
}

const App = app(Root, "#app")

App.update({ counter: 0 })
