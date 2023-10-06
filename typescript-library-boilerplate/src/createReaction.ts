import { reaction as mobxCreateReaction } from 'mobx';

export function createReaction(def: () => (() => void) | void) {
  let andThen = () => {};
  const dispose = mobxCreateReaction(
    () => {
      andThen = def() || (() => {});
    },
    () => andThen(),
    { fireImmediately: true },
  );

  return () => dispose();
}
