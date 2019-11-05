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

describe("Fragments", function () {

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

  describe("fragment", function () {
    it("returns a function", async function () {
      const result = await this.page.evaluate(() => {
        const node = hart.fragment.hart
        const fragment = hart.fragment
        const frag = fragment(() => node("span"))
        return typeof frag
      })
      assert.equal(result, "function")
    })

    context("when there is no id prop", function () {
      it("does not cache its result", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          const fragment = hart.fragment
          let inc = 0
          const frag = fragment(() => {
            inc += 1
            return node("span")
          })
          frag({})
          frag({})
          return inc
        })
        assert.equal(result, 2)
      })
    })

    context("when there is an id prop and children", function () {
      it("does not cache its result", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          const fragment = hart.fragment
          const id = "a" + Math.random().toString().slice(2)
          let inc = 0
          const frag = fragment(() => {
            inc += 1
            return node("span")
          })
          frag({ id: id }, { nodes: [node("span")] })
          frag({ id: id }, { nodes: [node("span")] })
          return inc
        })
        assert.equal(result, 2)
      })
    })

    context("when there is an id prop and no children", function () {
      context("when props have changed", function () {
        it("does not cache its result", async function () {
          const result = await this.page.evaluate(() => {
            const node = hart.fragment.hart
            const fragment = hart.fragment
            const id = "a" + Math.random().toString().slice(2)
            let inc = 0
            const frag = fragment(() => {
              inc += 1
              return node("span")
            })
            frag({ id: id, class: "bar" })
            frag({ id: id, class: "baz" })
            return inc
          })
          assert.equal(result, 2)
        })
      })

      context("when props have not changed", function () {
        it("caches its result", async function () {
          const result = await this.page.evaluate(() => {
            const node = hart.fragment.hart
            const fragment = hart.fragment
            const id = "a" + Math.random().toString().slice(2)
            let inc = 0
            const frag = fragment(() => {
              inc += 1
              return node("span")
            })
            frag({ id: id, class: "bar" })
            frag({ id: id, class: "bar" })
            frag({ id: id, class: "bar" })
            return inc
          })
          assert.equal(result, 1)
        })
      })
    })
  })
})
