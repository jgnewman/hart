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
        let currentVal = null
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
        const fragment = hart.fragment
        const node = hart.fragment.hart

        const Frag = fragment(props => node("span", {id: "my-span"}, props.name))
        const app = hart.app(Frag, document.querySelector("#root"))

        app.update({ name: "John" })
        await new Promise(resolve => setTimeout(resolve, 10))

        const span = document.querySelector("#my-span")
        return span.innerHTML.trim()
      })
      assert.equal(result, "John")
    })
  })

  describe("appSync", function () {
    it("returns an object with watch and update", async function () {
      const result = await this.page.evaluate(() => {
        const app = hart.appSync(() => {})
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
        const app = hart.appSync()
        app.watch(newVal => val = newVal)
        app.update({ value: 1 })
        return new Promise(resolve => setTimeout(() => resolve(val), 10))
      })
      assert.deepEqual(result, { value: 1 })
    })

    it("allows custom value calculation", async function () {
      const result = await this.page.evaluate(async () => {
        let currentVal = null
        const app = hart.appSync((change, prevVal) => {
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

    it("executes its calculator once per update", async function () {
      const result = await this.page.evaluate(async () => {
        let inc = 0
        const app = hart.appSync()
        app.watch(() => { inc += 1 })
        app.update()
        app.update()
        app.update()
        return new Promise(resolve => setTimeout(() => resolve(inc), 10))
      })
      assert.equal(result, 3)
    })

    it("renders html", async function () {
      const result = await this.page.evaluate(async () => {
        const fragment = hart.fragment
        const node = hart.fragment.hart

        const Frag = fragment(props => node("span", {id: "my-span"}, props.name))
        const app = hart.appSync(Frag, document.querySelector("#root"))

        app.update({ name: "John" })
        await new Promise(resolve => setTimeout(resolve, 10))

        const span = document.querySelector("#my-span")
        return span.innerHTML.trim()
      })
      assert.equal(result, "John")
    })
  })
})
