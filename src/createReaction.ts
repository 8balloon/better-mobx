import { reaction as mobxcreateReaction } from "mobx";

export function createReaction(def: () => (() => void) | void) {
  let andThen = () => {};
  const dispose = mobxcreateReaction(
    () => {
      andThen = def() || (() => {});
    },
    () => andThen(),
    { fireImmediately: true }
  );

  return {
    stop() {
      dispose();
    },
  };
}
