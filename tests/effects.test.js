const assert = require("assert")
const path = require("path")
const fs = require("fs")
const Chromatica = require("chromatica")

const SERVER_PORT = 3000
const SERVER_ROUTES = [
  {
    test: /hart\.js/,
    file: fs.readFileSync(path.resolve(`${__dirname}/../dist/hart.js`))
  },
  {
    test: null,
    file: fs.readFileSync(path.resolve(__dirname, "./templates/base.html"))
  },
]

describe("Effects", function () {

  before(async function () {
    this.browser = new Chromatica({
      port: SERVER_PORT,
      routes: SERVER_ROUTES
    })

    const page = await this.browser.getPage()
    this.page = page

    this.page.on("console", msg => {
      console.log(msg.text())
    })

  })

  after(async function () {
    await this.page.close()
    await this.browser.closeBrowser()
  })

  describe("useAfterEffect", function () {
    it("runs after effects", async function () {
      const result = await this.page.evaluate(async () => {
        let x

        const Nested = () => {
          hart.useAfterEffect(() => x = "hello")
          return hart.elem("div")
        }

        const Root = () => {
          return hart.elem(Nested)
        }

        const App = hart.app(Root, "#root")
        App.update({})

        await new Promise(resolve => setTimeout(resolve, 10))

        return x === "hello"
      })

      assert.ok(result, "Effect ran")
    })

    context("when dependencies change", function () {
      it("re-runs after-effects", async function () {
        const result = await this.page.evaluate(async () => {
          let x = 0

          const Nested = ({ count }) => {
            hart.useAfterEffect(() => (x = count), [count])
            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested, { count })
          }

          const App = hart.app(Root, "#root")
          App.update({ count: x + 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: x + 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: x + 1 })

          await new Promise(resolve => setTimeout(resolve, 10))

          return x === 3
        })

        assert.ok(result, "Effect ran when deps changed")
      })

      it("runs cleanups before the after-effect", async function () {
        const result = await this.page.evaluate(async () => {
          let x = ""

          const Nested = ({ count }) => {
            hart.useAfterEffect(() => {
              x += "world"
              return () => {
                x = "hello "
              }
            }, [count])

            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested, { count })
          }

          const App = hart.app(Root, "#root")
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 2 })

          await new Promise(resolve => setTimeout(resolve, 10))
          return x
        })

        assert.equal(result, "hello world", "Cleanup ran before effect")
      })
    })

    context("when dependencies don't change", function () {
      it("does not re-run after effects", async function () {
        const result = await this.page.evaluate(async () => {
          let x = 1

          const Nested = ({ count }) => {
            hart.useAfterEffect(() => (x = x * 10), [count])
            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested, { count })
          }

          const App = hart.app(Root, "#root")
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          return x === 10
        })

        assert.ok(result, "Effect did not run when deps did not change")
      })
    })

    context("when a component unmounts", function () {
      it("runs cleanups", async function () {
        const result = await this.page.evaluate(async () => {
          let ranCleanup = false

          const Nested = () => {
            hart.useAfterEffect(() => {
              return () => {
                ranCleanup = true
              }
            }, [])
            return hart.elem("div")
          }

          const Root = ({ showNested }) => {
            if (showNested) {
              return hart.elem(Nested)
            } else {
              return null
            }
          }

          const App = hart.app(Root, "#root")
          App.update({ showNested: true })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ showNested: false })

          await new Promise(resolve => setTimeout(resolve, 10))

          return ranCleanup
        })

        assert.ok(result, "Cleanup ran")
      })
    })
  })

  describe("useMemo", function () {
    context("when dependencies don't change", function () {
      it("does not recalculate", async function () {
        const result = await this.page.evaluate(async () => {
          let x = 0

          const Nested = () => {
            hart.useMemo(() => (x += 1), [])
            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested)
          }

          const App = hart.app(Root, "#root")
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 2 })

          await new Promise(resolve => setTimeout(resolve, 10))

          return x
        })

        assert.equal(result, 1, "Did not recalculate")
      })
    })

    context("when dependencies change", function () {
      it("recalculates", async function () {
        const result = await this.page.evaluate(async () => {
          let x = 0

          const Nested = ({ count }) => {
            hart.useMemo(() => (x += 1), [count])
            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested, { count })
          }

          const App = hart.app(Root, "#root")
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 2 })

          await new Promise(resolve => setTimeout(resolve, 10))

          return x
        })

        assert.equal(result, 2, "Recalculated")
      })
    })
  })

  describe("useMemoFn", function () {
    context("when dependencies don't change", function () {
      it("returns a memoized function", async function () {
        const result = await this.page.evaluate(async () => {
          let x
          let y

          const Nested = ({ count }) => {
            const fn = hart.useMemoFn(() => { return }, [])
            if (count === 1) {
              x = fn
            } else {
              y = fn
            }
            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested, { count })
          }

          const App = hart.app(Root, "#root")
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 2 })

          await new Promise(resolve => setTimeout(resolve, 10))

          return x === y
        })

        assert.ok(result, "Returned memoized function")
      })
    })

    context("when dependencies change", function () {
      it("returns a new function", async function () {
        const result = await this.page.evaluate(async () => {
          let x
          let y

          const Nested = ({ count }) => {
            const fn = hart.useMemoFn(() => { return }, [count])
            if (count === 1) {
              x = fn
            } else {
              y = fn
            }
            return hart.elem("div")
          }

          const Root = ({ count }) => {
            return hart.elem(Nested, { count })
          }

          const App = hart.app(Root, "#root")
          App.update({ count: 1 })

          await new Promise(resolve => setTimeout(resolve, 10))
          App.update({ count: 2 })

          await new Promise(resolve => setTimeout(resolve, 10))

          return x !== y
        })

        assert.ok(result, "Returned new function")
      })
    })
  })

  describe("useRef", function () {
    it("always returns the same singleton", async function () {
      const result = await this.page.evaluate(async () => {
        let x
        let y

        const Nested = ({ count }) => {
          const ref = hart.useRef(count)
          if (count === 1) {
            x = ref
          } else {
            y = ref
          }
          return hart.elem("div")
        }

        const Root = ({ count }) => {
          return hart.elem(Nested, { count })
        }

        const App = hart.app(Root, "#root")
        App.update({ count: 1 })

        await new Promise(resolve => setTimeout(resolve, 10))
        App.update({ count: 2 })

        await new Promise(resolve => setTimeout(resolve, 10))

        return x === y
      })

      assert.ok(result, "Returned memoized function")
    })

  })

})
