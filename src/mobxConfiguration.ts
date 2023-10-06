import { configure } from "mobx";

type MobxConfig = Parameters<typeof configure>[0];

const defaultConfig: MobxConfig = {
  enforceActions: "always", // so we can always track what happens in redux devtools

  // these restrictions _may_ help with learning, but they make everything else cumbersome
  computedRequiresReaction: false,
  observableRequiresReaction: false,

  // We're not going to yell at users for unnecessarily wrapping components with `createView`
  reactionRequiresObservable: false,

  // Stack traces are never worth sacrificing
  disableErrorBoundaries: true,

  // If a user is using custom property descriptors, probably a good idea to yell at them.
  safeDescriptors: true,

  // We can reconsider this (perhaps via overrideMobxConfig, below) if necessary
  isolateGlobalState: true,
};

configure(defaultConfig);

// export function overrideMobxConfig(params: MobxConfig) {
//   configure({
//     ...defaultConfig,
//     ...params,
//   });
// }
