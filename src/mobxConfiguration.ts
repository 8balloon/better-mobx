import { configure } from "mobx";

configure({
  enforceActions: "never", // we're flexible

  // these restrictions _may_ help with learning, but they make everything else cumbersome
  computedRequiresReaction: false,
  observableRequiresReaction: false,

  // We're not going to yell at users for unnecessarily wrapping components with `createView`
  reactionRequiresObservable: false,

  // We lose the original error if this is on
  disableErrorBoundaries: false,

  // If a user is using custom property descriptors, probably a good idea to yell at them
  safeDescriptors: true,

  // Prevents wonkiness if being used with other libraries that use mobx
  isolateGlobalState: true,
});
