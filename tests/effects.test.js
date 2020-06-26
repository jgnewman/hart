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

  describe("refs & captureRefs", function () {
    it("does not break rendering", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart
        const id = "a" + Math.random().toString().slice(2)

        const Frag = fragment(() => {
          const { captureRefs } = hart.effects()
          return captureRefs(node("span", { id: id }, "Hello, world!"))
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update()

        const selection = document.querySelectorAll("#" + id)
        return selection.length
      })
      assert.equal(result, 1)
    })

    it("provides references to nodes", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart
        const id = "a" + Math.random().toString().slice(2)

        let expectedNode = 0
        let referencedNode = 1

        const Frag = fragment(() => {
          const { captureRefs, refs } = hart.effects()
          const handleClick = () => referencedNode = refs()[id]
          return captureRefs(node("span", { id: id, ref: id, onclick: () => handleClick() }, "Hello, world!"))
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update()

        expectedNode = document.querySelector("#" + id)
        expectedNode.click()

        return expectedNode === referencedNode
      })
      assert.equal(result, true)
    })

    it("scopes references to a given fragment", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart
        const id1 = "a" + Math.random().toString().slice(2)
        const id2 = "a" + Math.random().toString().slice(2)

        let expectedNode = 0
        let unexpectedNode = 1
        let referencedNode = 2

        const NestedFrag = fragment(() => {
          return node("span", { id: id2, ref: id1 }, "Not this one.")
        })

        const RootFrag = fragment(() => {
          const { captureRefs, refs } = hart.effects()
          const handleClick = () => referencedNode = refs()[id1]
          return captureRefs(
            node("div", null,
              node("span", { id: id1, ref: id1, onclick: () => handleClick() }, "This one."),
              node(NestedFrag, {})
            )
          )
        })

        const app = hart.appSync(RootFrag, document.querySelector("#root"))
        app.update()

        expectedNode = document.querySelector("#" + id1)
        unexpectedNode = document.querySelector("#" + id2)
        expectedNode.click()

        return {
          rightNodeSelected: referencedNode === expectedNode,
          wrongNodeSelected: referencedNode === unexpectedNode,
        }
      })
      assert.deepEqual(result, { rightNodeSelected: true, wrongNodeSelected: false })
    })
  })

  describe("onmount", function () {
    it("does not break rendering", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart
        const id = "a" + Math.random().toString().slice(2)

        const Frag = fragment(() => {
          const { onmount } = hart.effects()
          const mountHandler = onmount(() => { return })
          return mountHandler(node("span", { id: id }, "Hello, world!"))
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update()

        const selection = document.querySelectorAll("#" + id)
        return selection.length
      })
      assert.equal(result, 1)
    })

    it("runs on mount but not on update", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart

        let runCount = 0

        const Frag = fragment(() => {
          const { onmount } = hart.effects()
          const mountHandler = onmount(() => { runCount += 1 })
          return mountHandler(node("span", null, "Hello, world!"))
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update()
        app.update()
        app.update()

        return runCount
      })
      assert.equal(result, 1)
    })

    it("runs if a node is removed then re-added", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart

        let runCount = 0

        const NestedFrag = fragment(() => {
          const { onmount } = hart.effects()
          const mountHandler = onmount(() => { runCount += 1 })
          return mountHandler(node("span", null, "Hello, world!"))
        })

        const Frag = fragment((props) => {
          if (props.showNested) return node("div", null, node(NestedFrag))
          return node("div")
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update({ showNested: true })
        app.update({ showNested: false })
        app.update({ showNested: true })
        app.update({ showNested: false })

        return runCount
      })
      assert.equal(result, 2)
    })
  })

  describe("onunmount", function () {
    it("does not break rendering", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart
        const id = "a" + Math.random().toString().slice(2)

        const Frag = fragment(() => {
          const { onunmount } = hart.effects()
          const unmountHandler = onunmount(() => { return })
          return unmountHandler(node("span", { id: id }, "Hello, world!"))
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update()

        const selection = document.querySelectorAll("#" + id)
        return selection.length
      })
      assert.equal(result, 1)
    })

    it("runs on unmount but not on update", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart

        let runCount = 0

        const NestedFrag = fragment(() => {
          const { onunmount } = hart.effects()
          const unmountHandler = onunmount(() => { runCount += 1 })
          return unmountHandler(node("span", null, "Hello, world!"))
        })

        const Frag = fragment((props) => {
          if (props.showNested) return node("div", null, node(NestedFrag))
          return node("div")
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update({ showNested: true })
        app.update({ showNested: false })
        app.update({ showNested: true })
        app.update({ showNested: true })

        return runCount
      })
      assert.equal(result, 1)
    })

    it("runs again if a node is re-added then re-removed", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart

        let runCount = 0

        const NestedFrag = fragment(() => {
          const { onunmount } = hart.effects()
          const unmountHandler = onunmount(() => { runCount += 1 })
          return unmountHandler(node("span", null, "Hello, world!"))
        })

        const Frag = fragment((props) => {
          if (props.showNested) return node("div", null, node(NestedFrag))
          return node("div")
        })

        const app = hart.appSync(Frag, document.querySelector("#root"))
        app.update({ showNested: true })
        app.update({ showNested: false })
        app.update({ showNested: true })
        app.update({ showNested: false })
        app.update({ showNested: true })

        return runCount
      })
      assert.equal(result, 2)
    })
  })
})
