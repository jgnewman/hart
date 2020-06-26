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

  describe("fragment.hart", function () {
    it("generates a basic virtual node", async function () {
      const result = await this.page.evaluate(() => {
        return hart.fragment.hart("span")
      })
      assert.equal(result.tag, "span", "Result has a tag field")
      assert.deepEqual(result.attrs, {}, "Result has an attrs object")
      assert.deepEqual(result.children, [], "Result has a children array")
    })

    it("gathers attributes", async function () {
      const result = await this.page.evaluate(() => {
        return hart.fragment.hart("span", {id: "foo"})
      })
      assert.deepEqual(result.attrs, {id: "foo"})
    })

    it("gathers children", async function () {
      const result = await this.page.evaluate(() => {
        const tree = hart.fragment.hart("div", null, hart.fragment.hart("span"))
        return tree.children[0].tag
      })
      assert.equal(result, "span")
    })

    context("when a child is intended to be text", function () {
      it("creates a string node", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, "hello")
          return tree.children[0].text
        })
        assert.equal(result, "hello")
      })

      it("stringifies non-string values", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, 123)
          return tree.children[0].text
        })
        assert.equal(result, "123")
      })
    })

    context("when a child is `false`", function () {
      it("creates an empty node", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, false)
          return tree.children[0].tag.toString()
        })
        assert.equal(result, "Symbol(EMPTY)")
      })
    })

    context("when a child is `null`", function () {
      it("creates an empty node", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, null)
          return tree.children[0].tag.toString()
        })
        assert.equal(result, "Symbol(EMPTY)")
      })
    })

    context("when a child is `undefined`", function () {
      it("creates an empty node", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, undefined)
          return tree.children[0].tag.toString()
        })
        assert.equal(result, "Symbol(EMPTY)")
      })
    })

    context("when a child is a list", function () {
      it("fails if one of the items doesn't have a key prop", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          let error = null
          try {
            const tree = node("div", null, [node("span", {})])
          } catch (err) {
            error = err
          }
          return error.message
        })
        assert.equal(result, "Every member of a node array must have a unique `key` prop.")
      })

      it("marks the correct parent of each list item", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          const tree = node("div", null, [node("span", { key: "foo" })])
          return tree.children[0].children[0].parent.tag
        })
        assert.equal(result, "div")
      })
    })

    context("when a node is a function", function () {
      it("fails if the function hasn't been wrapped in `fragment`", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          const FnNode = () => node("span")
          let error = null
          try {
            const tree = node(FnNode)
          } catch (err) {
            error = err
          }
          return error.message
        })
        assert.equal(result, "FnNode should be wrapped in a `fragment` call.")
      })

      it("succeeds if the function has been wrapped in `fragment`", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          const FnNode = hart.fragment(() => node("span"))
          let error = null
          try {
            const tree = node(FnNode)
          } catch (err) {
            error = err
          }
          return error
        })
        assert.equal(result, null)
      })

      it("executes the function with correct props", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          let receivedProps = null
          const FnNode = hart.fragment((props) => {
            receivedProps = { ...props }
            return node("span")
          })
          const tree = node(FnNode, { id: "foo" })
          return receivedProps
        })
        assert.deepEqual(result, { id: "foo" })
      })

      it("executes the function with a children object", async function () {
        const result = await this.page.evaluate(() => {
          const node = hart.fragment.hart
          let receivedChildren = null
          const FnNode = hart.fragment((_, children) => {
            receivedChildren = { ...children }
            return node("span")
          })
          const tree = node(FnNode, null, node("span"))
          return receivedChildren.nodes.length
        })
        assert.equal(result, 1)
      })

      context("when there is a key prop", function () {
        it("transfers the key to its output node", async function () {
          const result = await this.page.evaluate(() => {
            const node = hart.fragment.hart
            const FnNode = hart.fragment(() => node("span"))
            const tree = node(FnNode, { key: "foo" }, node("span"))
            return tree.attrs
          })
          assert.deepEqual(result, { key: "foo" })
        })
      })

    })
  })
})
