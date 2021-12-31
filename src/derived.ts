import { disableWarning } from "./warningUtils";

disableWarning((str) =>
  str.includes(
    `invoking a computedFn from outside an reactive context won't be memoized, unless keepAlive is set`
  )
);

import { computedFn, observable as mobxObservable } from "./libraryImports";

export function derived<T extends { [key: string]: (...args: any[]) => any }>(
  derivedDef: T
): T {
  Object.entries(derivedDef).forEach(([fieldName, derivationFn]) => {
    (derivedDef as Record<string, (...args: any[]) => any>)[fieldName] =
      computedFn(derivationFn);
  });
  return mobxObservable(derivedDef);
}
