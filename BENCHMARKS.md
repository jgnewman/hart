# Hart Informal Benchmarks

To help you understand what kind of performance Hart delivers, I've put together some informal benchmarks that you can read and run yourself by cloning this repo, installing dependencies, and running `npm run benchmark`.

There are two tests (Internal Optimization and Render Efficiency) that stack Hart up against the following popular frameworks:

- React
- Vue
- Svelte
- Preact

## Internal Optimization

For the Internal Optimization test, all frameworks are asked to perform the following tasks over 10 iterations using the most optimized out-of-the-box structure for each. We then take the mean average time it took for each framework to complete the tasks. The tasks are:

- Given 2 arrays (a larger array of 10k numbers and a smaller array of 5k numbers) populated via the following algorithm: `largeArr.push(i); i % 2 === 0 && smallArr[i % 3 === 0 ? 'unshift' : 'push'](i);`...
  - Set up an app designed to respond to an array of numbers where each number represents an `<li>` to be rendered by the app. (Note that, if possible, the `<li>` should be built from a nested component.)
    - Render an empty `ul`,
    - Recalculate the app using the large array,
    - Recalculate the app using the small array,
    - Recalculate the app using the large array
  - Iterate/end

These tasks are designed to force the framework to add, remove, and sort HTML based on selections from a 10k-item set, which are some of the most DOM-intensive tasks a framework needs to accomplish. Performance will therefore be based on the framework's ability to optimize internal data calculations and minimize reflows/repaints of the DOM.

> Note that some frameworks provide additional ability to manually optimize applications. For example, React provides the `shouldComponentUpdate` function, allowing you to determine the conditions for recalculating a given component. These types of optimizations were left out of our benchmarks because what we are looking for here is purely a measure of the framework's out-of-the-box algorithms that don't rely on a given engineer's cleverness.

## Render Efficiency

For the Render Efficiency test, each framework performs the same tasks, however we force each framework to forego internal optimizations and fully render the DOM for every update. This is done by wrapping each update trigger in a `setTimeout` call set to 0ms. As a result, each repaint is visible onscreen as the tasks are performed. This test is designed to measure how efficiently each framework can trigger visual updates to the DOM without being able to internally batch updates.

## Results

Here is how our frameworks stack up (smaller is better):

**Internal Optimization**
```
Hart v0.0.1            0.3455 seconds   ■■■■■■■■■■■■
Vue v2.6.11            0.4661 seconds   ■■■■■■■■■■■■■■■■
Preact v10.4.5         0.4926 seconds   ■■■■■■■■■■■■■■■■
Svelte v3.23.2         0.6209 seconds   ■■■■■■■■■■■■■■■■■■■■■
React v16.13.1         0.7939 seconds   ■■■■■■■■■■■■■■■■■■■■■■■■■■
```

**Render Efficiency**
```
Svelte v3.23.2         1.2268 seconds   ■■■■■■■■■■■■
Hart v0.0.1            1.3436 seconds   ■■■■■■■■■■■■■
Vue v2.6.11            1.5264 seconds   ■■■■■■■■■■■■■■■
React v16.10.2         1.6822 seconds   ■■■■■■■■■■■■■■■■■
Preact v10.4.5         2.9113 seconds   ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
```

Tests were performed on a Lenovo X1 Carbon running Ubuntu 18.04.3 (16GB Ram, 2.7GHz Intel Core i7, Brave 0.62.50)

### Interpretation

Although these benchmarks aren't scientifically rigorous, they do provide a roughly accurate picture of how well Hart performs relative to the other frameworks in our sample. Excitingly, it significantly out-performs all of them when it comes to internal optimizations, and it stands pretty close to Svelte for the Render Efficiency test. In fact a previous pre-release of Hart that did not include the capability for side-effects ran neck-and-neck with Svelte, slightly out-performing it roughly half of the time.

Unsurprisingly, React is consistently among the slowest performers, probably because it performs the most actions behind the scenes. Every option and feature provided by a framework will necessarily reduce its performance due to the additional data calculations and conditional checks they require. There are, however, two other more interesting points that merit discussion:

1. Preact was by far the worst performer when it came to pure render efficiency but was middle of the road when it came to Internal Optimizations.
2. Svelte is out-performed by Hart, Preact, and Vue when it comes to Internal Optimizations but is the clear winner when it comes to Render Efficiency.

#### Preact

This result was so surprising to me that I actually re-ran the tests and checked the code over multiple times looking for a mistake. In fact, a previous version (8.5.2) performed roughly 33% better than version 10.4.5 in the same test. If there's something I could do to better optimize the test for Preact, please let me know.

I have only a hypothesis here, having not done any research or read Preact's source code. But my guess is that Preact likely "ticks" asynchronously similarly to Hart and Vue such that its shortcomings in DOM manipulation are made up for by batching updates. It would be interesting to run some different tests and see if there are different results in different types of situations.

#### Svelte

The comparison to Svelte is worth discussing with some depth because Svelte is less a framework and more a language, which makes its approach extremely exciting. Because Svelte is a non-virtual-DOM-based system that purports to shift the work that React and Vue do in the browser over to a compile step, we might have expected its "surgical" updates to be even more efficient than we saw in our test.

Of course, we can make a pretty obvious guess as to why Svelte performed better than Hart at pure Render Efficiency. In this test, both libraries had to re-render thousands of items multiple times. During this process, all of Hart's optimizations were disabled but it still had to engage the process of building a virtual DOM and diffing before it could engage in DOM manipulation. Svelte, on the other hand, was able to forego this step and could likely jump to real DOM manipulations much more quickly. The good news for Hart here is that this is an extreme edge case and it still did _really_ well (best of the virtual-DOM class). In the real world, things should be working a lot more like the Internal Optimization test because you will not manually be disabling Hart's optimizations.

My guess as to why Svelte didn't perform even better at Internal Optimization is that, while Svelte trades a dependency package for compiled output, runtime performance can't be compiled away and Svelte's compiled output is likely not optimized as well as Hart and Vue for DOM-intensive tasks. While Svelte is correct that virtual DOM diffing can eat into frame budget and tax a garbage collector, Svelte's performance here may indicate that its lack of a virtual DOM actually necessitates more reflows and repaints _under certain circumstances._

Further tests would be a good idea here as well since these results do not imply that Svelte is always slower than Hart in one type of case and faster than Hart in another. They simply show that when given a list of 10k items, Svelte is less optimized for removing half of them, re-sorting the remainder, adding the other half back in, and then re-sorting again, when these updates are all triggered in a single run loop.
