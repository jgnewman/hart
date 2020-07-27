import "./style.css"

import hart, {
  app,
  subapp,
  useAfterEffect,
  useMemo,
  useMemoFn,
  useRef,
  withPropCheck,
} from "../index"

import HartIcon from "./js/HartIcon"
import InnerCircle from "./js/InnerCircle"
import MiddleCircle from "./js/MiddleCircle"
import OuterCircle from "./js/OuterCircle"

const Root = () => {
  return (
    <div class="wrapper">
      <img class="background-stars" src="/assets/background.png" />
      <img class="foreground-stars" src="/assets/foreground.png" />

      <div class="center-content">
        <HartIcon />
        <InnerCircle />
        <MiddleCircle />
        <OuterCircle />
      </div>
    </div>
  )
}

const renderer = app(Root, "#app")
renderer.update()