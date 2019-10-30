const assert = require('assert')
const path = require('path')
const fs = require('fs')
const Chromatica = require('chromatica')

const SERVER_PORT = 3000
const SERVER_ROUTES = [
  {
    test: /hart\.js/,
    file: fs.readFileSync(path.resolve(`${__dirname}/../dist/hart.js`))
  },
  {
    test: null,
    file: fs.readFileSync(path.resolve(__dirname, './templates/base.html'))
  },
]

describe("Behavior", function () {

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

  describe('Build', function () {
    it('exports all expected values', async function () {
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
      assert.ok(result.render, "Exports the `render` function")
      assert.ok(result.pipe, "Exports the `pipe` function")
      assert.ok(result.asyncPipe, "Exports the `asyncPipe` function")
      assert.ok(result.tap, "Exports the `tap` function")
      assert.ok(result.inject, "Exports the `inject` function")
      assert.ok(result.leak, "Exports the `leak` function")
      assert.ok(result.pass, "Exports the `pass` function")
      assert.ok(result.effects, "Exports the `effects` function")
    })
  })

})
