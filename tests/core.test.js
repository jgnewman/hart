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

describe("Core", function () {

  before(async function () {
    this.browser = new Chromatica({
      port: SERVER_PORT,
      routes: SERVER_ROUTES
    })

    const page = await this.browser.getPage()
    this.page = page

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

    context("when the node is an input type", function () {
      context("when the node has a value attr", function () {
        it("marks the node's controlling prop as 'value'", async function () {
          const result = await this.page.evaluate(() => {
            const tree = hart.fragment.hart("input", {id: "foo", value: "bar"})
            return tree
          })
          assert.equal(result.controller, "value")
        })
      })

      context("when the node has a checked attr", function () {
        it("marks the node's controlling prop as 'checked'", async function () {
          const result = await this.page.evaluate(() => {
            const tree = hart.fragment.hart("input", {id: "foo", checked: false})
            return tree
          })
          assert.equal(result.controller, "checked")
        })
      })
    })

    context("when the node is not an input type", function () {
      it("does not mark a controlling prop", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", {value: "foo", checked: false})
          return tree
        })
        assert.ok(!result.hasOwnProperty("controller"))
      })
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
      it("omits the child", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, "foo", false, "bar")
          return tree.children.length
        })
        assert.equal(result, 2)
      })
    })

    context("when a child is `null`", function () {
      it("omits the child", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, "foo", null, "bar")
          return tree.children.length
        })
        assert.equal(result, 2)
      })
    })

    context("when a child is `undefined`", function () {
      it("omits the child", async function () {
        const result = await this.page.evaluate(() => {
          const tree = hart.fragment.hart("div", null, "foo", undefined, "bar")
          return tree.children.length
        })
        assert.equal(result, 2)
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

    context("when a child node is a function", function () {
      // fails if it doesn't have fragment proof
      // passes in props and children
      // provides children as a single object
      // passes key prop down to its output child
    })
  })

  describe("fragment", function () {
    // it("passes an argument between functions", async function () {
    //   const result = await this.page.evaluate(() => {
    //     const mod = (toAdd, prevVal) => prevVal + toAdd
    //     return hart.pass("Hello").to(mod, " ").to(mod, "world").to(mod, "!")()
    //   })
    //   assert.equal(result, "Hello world!")
    // })
  })

  describe("app", function () {
    // it("passes an argument between functions", async function () {
    //   const result = await this.page.evaluate(() => {
    //     const mod = (toAdd, prevVal) => prevVal + toAdd
    //     return hart.pass("Hello").to(mod, " ").to(mod, "world").to(mod, "!")()
    //   })
    //   assert.equal(result, "Hello world!")
    // })
  })

  describe("appSync", function () {
    // it("passes an argument between functions", async function () {
    //   const result = await this.page.evaluate(() => {
    //     const mod = (toAdd, prevVal) => prevVal + toAdd
    //     return hart.pass("Hello").to(mod, " ").to(mod, "world").to(mod, "!")()
    //   })
    //   assert.equal(result, "Hello world!")
    // })
  })
})
