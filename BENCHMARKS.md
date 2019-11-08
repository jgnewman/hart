# Hart Informal Benchmarks

To help you understand what kind of performance Hart delivers, I've put together some informal benchmarks that you can read and run yourself by cloning this repo, installing dependencies, and running `yarn benchmark`.

The test pits Hart against the following popular frameworks:

- React
- Vue
- Svelte
- Preact

Each framework is asked to perform the following tasks over 10 iterations using the most optimized out-of-the-box structure for each framework and then average the mean time over all iterations. The tasks are:

- Given 2 arrays (a larger array of 10k numbers and a smaller array of 5k numbers) populated via the following algorithm: `largeArr.push(i); i % 2 === 0 && smallArr[i % 3 === 0 ? 'unshift' : 'push'](i);`...
  - Set up an app designed to respond to an array of numbers where each number represents an html list item to be rendered by the app, then...
    - Render an empty `ul`,
    - Recalculate the app using the large array,
    - Recalculate the app using the small array,
    - Recalculate the app using the large array
  - Iterate/end

These tasks are designed to force the framework to add, remove, and sort HTML based on selections from a 10k-item set, which are some of the most DOM-intensive tasks a framework needs to accomplish. Performance will therefore be based on the framework's ability to optimize internal data calculations and minimize reflows/repaints of the DOM.

> Note that some frameworks provide additional ability to manually optimize applications. For example, React provides the `shouldComponentUpdate` function, allowing you to determine the conditions for recalculating a given component. These types of optimizations were left out of our benchmarks because what we are looking for here is purely a measure of the framework's out-of-the-box algorithms that don't rely on a given engineer's cleverness.

Here is how our frameworks stack up (smaller is better):

```
Hart v0.0.1            0.4205 seconds   ■■■■■■■■■■■■■■
Vue v2.6.10            0.5195 seconds   ■■■■■■■■■■■■■■■■■
Svelte v3.12.11        0.5540 seconds   ■■■■■■■■■■■■■■■■■■
Preact v8.5.2          0.6064 seconds   ■■■■■■■■■■■■■■■■■■■■
React v16.10.2         1.0596 seconds   ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

Environment: 2015 MacBook Pro (16GB RAM, 2.7GHz Intel Core i5, Chrome 78)
```

### Interpretation

Although these benchmarks aren't scientifically rigorous, they do provide a roughly accurate picture of how well Hart performs relative to the other frameworks in our sample. Excitingly, it out-performs all of them by more than what we might expect to be within the margin of error.

Unsurprisingly, the frameworks that take the most actions behind the scenes are also the slowest performers. What is perhaps more enlightening is the fact that Svelte 3 is out-performed by both Hart and Vue.

The comparison to Svelte is worth discussing with some depth because Svelte is less a framework and more a language, which makes its approach extremely exciting. Because Svelte is a non-virtual-DOM-based system that purports to shift the work that React and Vue do in the browser over to a compile step, we might have expected its "surgical" updates to be largely more efficient than we saw in our test.

My guess as to why Svelte didn't perform better is that, while Svelte trades a dependency package for compiled output, runtime performance can't be compiled away and Svelte's compiled output is likely not optimized as well as Hart and Vue for DOM-intensive tasks. While Svelte is correct that virtual DOM diffing _can_ eat into frame budget and tax a garbage collector, Svelte's performance here may indicate that its lack of a virtual DOM necessitates more reflows and repaints _under certain circumstances._

Further tests would probably be a good idea since these results should not be taken to mean that Svelte is always slower than Hart. These results simply mean that when given a list of 10k items, Svelte is less optimized for removing half of them and re-sorting the remainder, then adding the other half back in and re-sorting again.
