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

describe("Observables", function () {

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

  it("triggers listeners with new values", async function () {
    const result = await this.page.evaluate(async () => {
      const value = hartObservable()
      let x
      let y
      value.watch(newVal => x = newVal.msg)
      value.watch(newVal => y = newVal.msg)
      value.update({ msg: "hello" })
      await new Promise(resolve => setTimeout(resolve, 10))
      return [x === "hello", y === "hello"]
    })

    assert.ok(result[0], "Updated first watcher")
    assert.ok(result[1], "Updated multiple watchers")
  })

  it("allows custom calculators", async function () {
    const result = await this.page.evaluate(async () => {
      const value = hartObservable(({ msg }) => ({ text: msg }))
      let x
      value.watch(newVal => x = newVal.text)
      value.update({ msg: "hello" })
      await new Promise(resolve => setTimeout(resolve, 10))
      return x === "hello"
    })

    assert.ok(result, "Correctly calculated the value")
  })

})
