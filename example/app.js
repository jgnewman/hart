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
import MenuLink from "./js/MenuLink"

const Root = () => {
  return (
    <div class="wrapper">
      <div class="stars"></div>
      <div class="twinkling"></div>
      <div class="gradient"></div>

      <MenuLink />

      <div class="center-content">
        <HartIcon />
        <h1 class="main-title">HART</h1>
        <InnerCircle />
        <MiddleCircle />
        <OuterCircle />
      </div>
    </div>
  )
}

const renderer = app(Root, "#app")
renderer.update()
