export function pass(arg) {
  const chain = []
  const origVal = arg

  function runChain() {

    const recurser = (value, links) => {
      if (!links.length) return value

      const [fn, ...args] = links[0]
      args.push(value)
      return recurser(fn(...args), links.slice(1))
    }

    return recurser(origVal, chain)
  }

  runChain.to = function (...rest) {
    chain.push(rest)
    return runChain
  }

  return runChain
}
