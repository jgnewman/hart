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

describe("Virtual Nodes", function () {

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

  describe("hart.elem", function () {
    context("when the result is an html element instance", function () {
      it("generates a lazy virtual node", async function () {
        const result = await this.page.evaluate(() => {
          const { LAZY } = hartConstants
          const lazyNode = hart.elem("span")
          return [
            lazyNode[LAZY] === LAZY,
            lazyNode.tag === "span",
            typeof lazyNode.attrs === "object",
            typeof lazyNode.factory === "function",
          ]
        })

        const [markedLazy, setsTagField, capturesAttrs, hasFactoryFn] = result
        assert.ok(markedLazy, "Result is marked with a symbol")
        assert.ok(setsTagField, "Result has a tag field")
        assert.ok(capturesAttrs, "Result has an attrs object")
        assert.ok(hasFactoryFn, "Result has a factory function")
      })
    })

    context("when the result is a component instance", function () {
      it("generates a lazy function", async function () {
        const result = await this.page.evaluate(() => {
          const { LAZY } = hartConstants
          const Foo = () => hart.elem("span")
          const lazyNode = hart.elem(Foo)
          return [
            typeof lazyNode === "function",
            typeof lazyNode[LAZY] === "object",
          ]
        })

        const [returnsFn, fnMarkedLazy] = result
        assert.ok(returnsFn, "Result is a function")
        assert.ok(fnMarkedLazy, "Result is marked with a symbol")
      })
    })
  })
})
