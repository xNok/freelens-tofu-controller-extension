# Bolt's Journal

## 2025-05-18 - Schwartzian Transform vs React.useMemo for MobX Observables

**Learning:** Instantiating `new Date(...)` inside `Array.prototype.sort()` comparators creates $O(N \log N)$ date object instances and string parsings on every render. Using `useMemo` on MobX observable store properties (like `eventStore.contextItems`) breaks reactivity because MobX observable arrays keep stable object identity across mutations (`Object.is` reference equality returns true).

**Action:** Perform Schwartzian transform ($O(N)$ timestamp extraction map before sorting) directly within the render function without `useMemo`. This achieves $O(N)$ date object instantiations (a >90% reduction) while preserving MobX's fine-grained reactive subscriptions.
