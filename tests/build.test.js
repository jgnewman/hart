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

    this.page.on("console", msg => {
      console.log(msg.text())
    })

  })

  after(async function () {
    await this.page.close()
    await this.browser.closeBrowser()
  })

  it("exports all expected values", async function () {
    const expectedValues = [
      "app",
      "default",
      "docFrag",
      "elem",
      "subapp",
      "useAfterEffect",
      "useMemo",
      "useMemoFn",
      "useRef",
      "withoutCache",
      "withPropCheck",
    ]

    const result = await this.page.evaluate(() => {
      const hart = window.hart || {}
      return Object.keys(hart)
    })

    assert.deepEqual(expectedValues.sort(), result.sort())
  })

})
