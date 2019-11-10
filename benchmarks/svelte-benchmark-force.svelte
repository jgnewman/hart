<script>
  import Nested from "./svelte-nested.svelte"
  export let largeArr
  export let smallArr
  export let finish
  const emptyArr = []

  let activeArr = emptyArr

  function runBenchmark(count=0) {
    setTimeout(() => {
      count += 1
      if (count === 1 || count === 3) {
        activeArr = largeArr
        runBenchmark(count)
      } else if (count === 2) {
        activeArr = smallArr
        runBenchmark(count)
      } else {
        finish()
      }
    }, 0)
  }

  runBenchmark()
</script>

<ul>
  {#each activeArr as item}
    <Nested item={item}/>
  {/each}
</ul>
