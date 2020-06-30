TODO:
  - [x] Do we like the API where effects are injected into props?
  - [x] How do we want to enforce adding IDs so we don't forget to add them?
  - [x] Need a useCallback equivalent
  - [x] Need to allow providing a prop comparison func, and document it.
  - [x] Experiment: Can we localize state via refs and apps within apps?
        - So it looks like we CAN mount an app inside another app and we CAN pass props down to it.
        - Is there a way to pass children to a subapp fragment?
          - Do the unmounters work? Yes.
  - [x] Based on this experiment ^^ can we provide a prefab convenience fragment for this?
  - Unsatisfactory pieces of UI
        - [ ] I don't like having to wrap components in the fragment function.
        - [ ] Can observables not be forced to return objects?
  - [ ] Need to generate TS types for user API
  - Need to document...
    - [x] New effect API
  - Need to test...
    - [ ] New effect API
    - [ ] Document fragments
    - [ ] fragment vs fragment.optim vs fragment.subapp
  - [ ] Update any packages needing updating.
  - [ ] Benchmark against latest libs.
  - [ ] Create a production build



