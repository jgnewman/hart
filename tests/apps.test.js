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

describe("Apps", function () {

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

  describe("app", function () {
    it("returns an object with watch and update", async function () {
      const result = await this.page.evaluate(() => {
        const app = hart.app(() => {})
        return {
          watch: typeof app.watch === "function",
          update: typeof app.update === "function",
        }
      })
      assert.deepEqual(result, { watch: true, update: true })
    })

    it("passes updates to watchers", async function () {
      const result = await this.page.evaluate(async () => {
        let val = { value: 0 }
        const app = hart.app()
        app.watch(newVal => val = newVal)
        app.update({ value: 1 })
        return new Promise(resolve => setTimeout(() => resolve(val), 10))
      })
      assert.deepEqual(result, { value: 1 })
    })

    it("allows custom value calculation", async function () {
      const result = await this.page.evaluate(async () => {
        const app = hart.app((change, prevVal) => {
          switch (change.type) {
            case "INIT": return { ...prevVal, ...change.payload }
            case "INC": return { ...prevVal, value: prevVal.value + change.payload }
          }
        })
        app.watch(newVal => val = newVal)
        app.update({ type: "INIT", payload: { foo: "bar", value: 0 }})
        app.update({ type: "INC", payload: 5})
        return new Promise(resolve => setTimeout(() => resolve(val), 10))
      })
      assert.deepEqual(result, { value: 5, foo: "bar" })
    })

    it("executes its calculator once per run loop", async function () {
      const result = await this.page.evaluate(async () => {
        let inc = 0
        const app = hart.app()
        app.watch(() => { inc += 1 })
        app.update()
        app.update()
        app.update()
        return new Promise(resolve => setTimeout(() => resolve(inc), 10))
      })
      assert.equal(result, 1)
    })

    it("renders html", async function () {
      const result = await this.page.evaluate(async () => {
        const node = hart.elem

        const Root = props => node("span", {id: "foo"}, props.name)
        const app = hart.app(Root, document.querySelector("#root"))

        app.update({ name: "John" })
        await new Promise(resolve => setTimeout(resolve, 10))

        const span = document.querySelector("#foo")
        return span.innerHTML.trim()
      })
      assert.equal(result, "John")
    })
  })

  describe("subapp", function () {
    it("mounts subapps", async function () {
      const result = await this.page.evaluate(async () => {

        const Nested = hart.subapp(() => {
          return hart.elem("div", { id: "subapp-id" })
        })

        const Root = () => {
          return hart.elem("div", {}, hart.elem(Nested))
        }

        const app = hart.app(Root, "#root")
        app.update()

        await new Promise(resolve => setTimeout(resolve, 10))

        const div = document.querySelector("#subapp-id")
        return !!div

      })

      assert.ok(result, "Found mounted subapp")
    })

    it("rerenders subapps with changes to local data", async function () {
      const result = await this.page.evaluate(async () => {

        const Nested = hart.subapp(({ update, localData }) => {
          const { foo } = localData
          hart.useAfterEffect(() => update({ foo: "baz" }), [update])
          return hart.elem("div", { id: "subapp-id" }, foo)
        }, {
          init: { foo: "bar" },
          reducer: (next, prev) => ({ ...prev, ...next }),
        })

        const Root = () => {
          return hart.elem("div", {}, hart.elem(Nested))
        }

        const app = hart.app(Root, "#root")
        app.update()

        await new Promise(resolve => setTimeout(resolve, 10))

        const div = document.querySelector("#subapp-id")
        return div.innerHTML.trim()
      })

      assert.equal(result, "baz", "Subapp re-rendered")
    })
  })
})
