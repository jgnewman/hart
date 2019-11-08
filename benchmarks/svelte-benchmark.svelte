<script>
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
    <li>{item}</li>
  {/each}
</ul>
