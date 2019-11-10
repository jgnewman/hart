# Hart Informal Benchmarks

To help you understand what kind of performance Hart delivers, I've put together some informal benchmarks that you can read and run yourself by cloning this repo, installing dependencies, and running `yarn benchmark`.

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
Hart v0.0.1            0.3226 seconds   ■■■■■■■■■■■
Vue v2.6.10            0.4719 seconds   ■■■■■■■■■■■■■■■■
Preact v8.5.2          0.5149 seconds   ■■■■■■■■■■■■■■■■■
Svelte v3.12.11        0.5919 seconds   ■■■■■■■■■■■■■■■■■■■■
React v16.10.2         0.7877 seconds   ■■■■■■■■■■■■■■■■■■■■■■■■■■
```

**Render Efficiency**
```
Hart v0.0.1            1.2949 seconds   ■■■■■■■■■■■■■
Svelte v3.12.11        1.3275 seconds   ■■■■■■■■■■■■■
Vue v2.6.10            1.5219 seconds   ■■■■■■■■■■■■■■■
React v16.10.2         1.6705 seconds   ■■■■■■■■■■■■■■■■■
Preact v8.5.2          1.7856 seconds   ■■■■■■■■■■■■■■■■■■
```

Tests were performed on a Lenovo X1 Carbon running Ubuntu 18.04.3 (16GB Ram, 2.7GHz Intel Core i7, Brave 0.62)

### Interpretation

Although these benchmarks aren't scientifically rigorous, they do provide a roughly accurate picture of how well Hart performs relative to the other frameworks in our sample. Excitingly, it significantly out-performs all of them when it comes to internal optimizations, and it stands neck-and-neck with Svelte for the Render Efficiency test (the difference there is within the margin of error as sometimes Svelte comes in slightly faster).

Unsurprisingly, React is consistently among the slowest performers, probably because it performs the most actions behind the scenes. Every option and feature provided by a framework will necessarily reduce its performance due to the additional data calculations and conditional checks they require. There are, however, two other more interesting points that merit discussion:

1. Preact was the worst performer when it came to pure render efficiency but was middle of the road best when it came to Internal Optimizations.
2. Svelte 3 is out-performed by Hart, Preact, and Vue when it comes to Internal Optimizations but is roughly tied for first place with Hart when it comes to Render Efficiency.

#### Preact

I have only a hypothesis here, having not done any research or read Preact's source code. But my guess is that Preact likely "ticks" similarly to Hart and Vue. In other words, even though its DOM updating algorithms could probably be better, it likely does not update the DOM immediately upon every update but instead queues and batches updates in some way.

#### Svelte

The comparison to Svelte is worth discussing with some depth because Svelte is less a framework and more a language, which makes its approach extremely exciting. Because Svelte is a non-virtual-DOM-based system that purports to shift the work that React and Vue do in the browser over to a compile step, we might have expected its "surgical" updates to be even more efficient than we saw in our test.

What is invisible in the numbers is that, under slightly different circumstances, Svelte consistently out-performs Hart in Render Efficiency. When Svelte's `<li>`s are written into the top-level component (as opposed to being built from a nested component), its numbers come in closer to `1.0853s` compared to the `1.3275s` we see here and Hart's `1.2949s`. Svelte appears to lose efficiency, however, when we introduce nested components. Hart's performance, on the other hand, remains static regardless of whether or not the `<li>` is built from a nested component. Further tests are required to determine what sort of progressive efficiency loss can be expected as a Svelte app scales.

My guess as to why Svelte didn't perform better at Internal Optimization is that, while Svelte trades a dependency package for compiled output, runtime performance can't be compiled away and Svelte's compiled output is likely not optimized as well as Hart and Vue for DOM-intensive tasks. While Svelte is correct that virtual DOM diffing can eat into frame budget and tax a garbage collector, Svelte's performance here may indicate that its lack of a virtual DOM actually necessitates more reflows and repaints _under certain circumstances._

Further tests would be a good idea here as well since these results do not imply that Svelte is always slower than Hart. They simply show that when given a list of 10k items, Svelte is less optimized for removing half of them, re-sorting the remainder, adding the other half back in, and then re-sorting again, when these updates are all triggered in a single run loop.
