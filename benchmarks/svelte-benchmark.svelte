<script>
  import Nested from "./svelte-nested.svelte"
  export let largeArr
  export let smallArr
  export let finish
  const emptyArr = []

  let activeArr = emptyArr

  function runBenchmark() {
    activeArr = largeArr
    activeArr = smallArr
    activeArr = largeArr
    finish()
  }

  runBenchmark()
</script>

<ul>
  {#each activeArr as item}
    <Nested item={item}/>
  {/each}
</ul>
