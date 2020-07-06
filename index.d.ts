import {
  CHILD_PACK,
  CHILD_PACK_REF,
} from "./constants"

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

export interface Children {
  [CHILD_PACK]: CHILD_PACK
  nodes: JSX[]
}

export type Component = (props: unknown, children: ChildPack) => JSX.IntrinsicElements;

export type OutputElem = string | HTMLElement;

export interface Ref<T> {
  current: T;
}

export interface AppOptions {
  [CHILD_PACK_REF]?: Ref<ChildPack>;
  id?: string;
  useShadowRoot?: boolean;
}

export interface Observer {
  watch: (watcher: any) => void;
  update: (change?: {}) => void;
}

export interface SubappProps<T> {
  localData: T;
  update: <U>(change: U) => void;
}

export interface SubappSettings<T> {
  init?: T;
  options?: AppOptions;
  reducer?: (change: unknown, prev?: T) => T;
  wrapper?: JSX.IntrinsicElements;
}

export function app(rootUserFn: Component, outputElem?: OutputElem, options?: AppOptions): Observer;
export function subapp<T>(userFn: Component, settings?: SubappSettings<T>): Component;

export type VoidFn = () => void;
export type EffectFn = () => void | VoidFn;

export function useAfterEffect(effectFn: EffectFn, deps: any[]): void;
export function useMemo<T>(memFn: () => T, deps: any[]): T;
export function useMemoFn<T>(calculator: T, deps: any[]): T;
export function useRef<T>(initVal?: T): Ref<T | undefined>;

export function withoutCache(userFn: Component): Component;
export function withPropCheck(userFn: Component, customCompare: (a: unknown, b: unknown) => boolean): Component;
