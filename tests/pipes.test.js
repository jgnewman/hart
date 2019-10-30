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

describe("Pipes", function () {

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

  describe("pipe", function () {
    it("returns an object with 0 string keys", async function () {
      const result = await this.page.evaluate(() => {
        const mypipe = hart.pipe()
        let stringKeys = 0
        for (let i in mypipe) {
          if (mypipe.hasOwnProperty(i)) {
            stringKeys += 1
          }
        }
        return stringKeys
      })
      assert.equal(result, 0)
    })
  })

  describe("inject, leak", function () {
    it("allows updating and exposing the value", async function () {
      const result = await this.page.evaluate(() => {
        const { pipe, inject, leak } = hart
        const mypipe = pipe()
        inject(mypipe, { a: 1 })
        return leak(mypipe)
      })
      assert.deepEqual(result, { a: 1 })
    })

    it("allows allows the value to grow over time", async function () {
      const result = await this.page.evaluate(() => {
        const { pipe, inject, leak } = hart
        const mypipe = pipe()
        inject(mypipe, { a: 1 })
        inject(mypipe, { b: 2 })
        return leak(mypipe)
      })
      assert.deepEqual(result, { a: 1, b: 2 })
    })
  })

  describe("tap", function () {
    it("allows observing the pipe", async function () {
      const result = await this.page.evaluate(() => {
        const { pipe, inject, tap } = hart
        let out
        const mypipe = pipe()
        tap(mypipe, newVal => out = newVal)
        inject(mypipe, { a: 1 })
        return out
      })
      assert.deepEqual(result, { a: 1 })
    })

    it("allows multiple observers", async function () {
      const result = await this.page.evaluate(() => {
        const { pipe, inject, tap } = hart
        let out = 0
        const mypipe = pipe()
        tap(mypipe, newVal => out += newVal.a)
        tap(mypipe, newVal => out += newVal.b)
        inject(mypipe, { a: 1, b: 2 })
        return out
      })
      assert.deepEqual(result, 3)
    })

    it("provides old value and new value to observers", async function () {
      const result = await this.page.evaluate(() => {
        const { pipe, inject, tap } = hart
        const out = {}
        const mypipe = pipe()
        inject(mypipe, { a: 1 })
        tap(mypipe, (newVal, oldVal) => {
          out.newVal = newVal
          out.oldVal = oldVal
        })
        inject(mypipe, { b: 2 })
        return out
      })
      assert.deepEqual(result, {
        oldVal: { a: 1 },
        newVal: { a: 1, b: 2 },
      })
    })
  })

  describe("asyncPipe", function () {
    it("can be updated and can expose value", async function () {
      const result = await this.page.evaluate(async () => {
        const { asyncPipe, inject, leak } = hart
        const mypipe = asyncPipe()
        inject(mypipe, { a: 1 })
        await (() => { return new Promise(resolve => setTimeout(resolve, 10)) })()
        return leak(mypipe)
      })
      assert.deepEqual(result, { a: 1 })
    })

    it("can be observed", async function () {
      const result = await this.page.evaluate(async () => {
        const { asyncPipe, inject, tap } = hart
        let out
        const mypipe = asyncPipe()
        tap(mypipe, val => out = val)
        inject(mypipe, { a: 1 })
        await (() => { return new Promise(resolve => setTimeout(resolve, 10)) })()
        return out
      })
      assert.deepEqual(result, { a: 1 })
    })

    it("batches updates", async function () {
      const result = await this.page.evaluate(async () => {
        const { asyncPipe, inject, tap } = hart
        let out = 0
        const mypipe = asyncPipe()
        tap(mypipe, val => out = out + val.a)
        inject(mypipe, { a: 10 })
        inject(mypipe, { a: 11 })
        inject(mypipe, { a: 12 })
        await (() => { return new Promise(resolve => setTimeout(resolve, 10)) })()
        return out
      })
      assert.deepEqual(result, 12)
    })
  })
})
