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

describe("DOM Updates", function () {

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


  it("appends items", async function () {
    const result = await this.page.evaluate(async () => {
      const fragment = hart.fragment
      const node = hart.fragment.hart
      const divId = "a" + Math.random().toString().slice(2)
      const spanId = "a" + Math.random().toString().slice(2)

      let div
      let span

      const NestedFrag = fragment(() => {
        return node("div", { id: divId },
          node("span", { id: spanId }, "Hello, world!")
        )
      })

      const Frag = fragment((props) => {
        if (props.showNested) return node("div", null, node(NestedFrag))
        return node("div")
      })

      const app = hart.appSync(Frag, document.querySelector("#root"))
      app.update({ showNested: false })
      app.update({ showNested: true })

      div = document.querySelector("#" + divId)
      span = document.querySelector("#" + spanId)

      return { div: !!div, span: !!span }
    })
    assert.deepEqual(result, { div: true, span: true })
  })

  it("removes items", async function () {
    const result = await this.page.evaluate(async () => {
      const fragment = hart.fragment
      const node = hart.fragment.hart
      const divId = "a" + Math.random().toString().slice(2)
      const spanId = "a" + Math.random().toString().slice(2)

      let div
      let span

      const NestedFrag = fragment(() => {
        return node("div", { id: divId },
          node("span", { id: spanId }, "Hello, world!")
        )
      })

      const Frag = fragment((props) => {
        if (props.showNested) return node("div", null, node(NestedFrag))
        return node("div")
      })

      const app = hart.appSync(Frag, document.querySelector("#root"))
      app.update({ showNested: true })
      app.update({ showNested: false })

      div = document.querySelector("#" + divId)
      span = document.querySelector("#" + spanId)

      return { div: !!div, span: !!span }
    })
    assert.deepEqual(result, { div: false, span: false })
  })

  it("replaces items", async function () {
    const result = await this.page.evaluate(async () => {
      const fragment = hart.fragment
      const node = hart.fragment.hart
      const divId = "a" + Math.random().toString().slice(2)
      const spanId = "a" + Math.random().toString().slice(2)

      let div
      let span

      const Frag = fragment((props) => {
        if (props.showDiv) return node("div", { id: divId })
        return node("span", { id: spanId })
      })

      const app = hart.appSync(Frag, document.querySelector("#root"))
      app.update({ showDiv: true })
      app.update({ showDiv: false })

      div = document.querySelector("#" + divId)
      span = document.querySelector("#" + spanId)

      return { div: !!div, span: !!span }
    })
    assert.deepEqual(result, { div: false, span: true })
  })

  it("updates item attributes", async function () {
    const result = await this.page.evaluate(async () => {
      const fragment = hart.fragment
      const node = hart.fragment.hart
      const divId = "a" + Math.random().toString().slice(2)

      const Frag = fragment((props) => {
        return node("div", { id: divId, class: props.class })
      })

      const app = hart.appSync(Frag, document.querySelector("#root"))
      app.update({ class: "foo" })
      app.update({ class: "bar" })

      div = document.querySelector("#" + divId)
      return div.className
    })
    assert.equal(result, "bar")
  })

  it("translates certain camel-cased attributes", async function () {
    const result = await this.page.evaluate(async () => {
      const fragment = hart.fragment
      const node = hart.fragment.hart
      const divId = "a" + Math.random().toString().slice(2)

      const Frag = fragment((props) => {
        return node("div", { id: divId, ...props })
      })

      const app = hart.appSync(Frag, document.querySelector("#root"))
      app.update({ className: "foo", htmlFor: "bar" })

      div = document.querySelector("#" + divId)
      return {
        class: div.getAttribute("class"),
        for: div.getAttribute("for")
      }
    })
    assert.deepEqual(result, { class: "foo", for: "bar" })
  })

  it("reorders items", async function () {
    const result = await this.page.evaluate(async () => {
      const fragment = hart.fragment
      const node = hart.fragment.hart
      const divId = "a" + Math.random().toString().slice(2)

      const Frag = fragment((props) => {
        return node("div", { id: divId }, props.spans.map(spanId => (
          node("span", { id: spanId, key: spanId }, spanId)
        )))
      })

      const app = hart.appSync(Frag, document.querySelector("#root"))
      app.update({ spans: ["baz", "bar", "foo"] })
      app.update({ spans: ["foo", "bar", "baz"] })

      const div = document.querySelector("#" + divId)
      const spans = Array.prototype.slice.call(div.querySelectorAll("span"))

      return spans.map(span => span.getAttribute("id"))
    })
    assert.deepEqual(result, ["foo", "bar", "baz"])
  })

})
