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

describe("Build", function () {

  before(async function () {
    this.browser = new Chromatica({
      port: SERVER_PORT,
      routes: SERVER_ROUTES
    })

    const page = await this.browser.getPage()
    this.page = page

    this.page.on('console', msg => {
      console.log(msg.text())
    })

  })

  after(async function () {
    await this.page.close()
    await this.browser.closeBrowser()
  })

  it("exports all expected values", async function () {
    const result = await this.page.evaluate(() => {
      const hart = window.hart || {}
      const out = {}
      for (let i in hart) {
        if (hart.hasOwnProperty(i)) {
          out[i] = !!hart[i]
        }
      }
      return out
    })

    assert.ok(result.fragment, "Exports the `fragment` function")
    assert.ok(result.app, "Exports the `app` function")
    assert.ok(result.appSync, "Exports the `app` function")
    assert.ok(result.pass, "Exports the `pass` function")
    assert.ok(result.effects, "Exports the `effects` function")
  })

})
