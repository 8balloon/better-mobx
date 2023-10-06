import { computedFn as mobxComputedFn } from 'mobx-utils';

export function createMaterialization(
  ...params: Parameters<typeof mobxComputedFn>
) {
  return mobxComputedFn(...params);
}
