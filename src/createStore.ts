/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  observable as mobxObservable,
  runInAction as mobxRunInAction,
  _isComputingDerivation as mobxIsComputingDerivation,
  makeObservable as mobxMakeObservable,
} from 'mobx';
import { type StoreModuleShape } from './types';
import { addValueSettersWhereNoExist } from './addSetters';
import { createMaterialization } from './createMaterialization';

export function createStore<T extends StoreModuleShape>(observableBase: T) {
  const hasHadSettersAdded = addValueSettersWhereNoExist(observableBase); // mutates in-place
  const annotations: Record<string, any> = {};

  Object.keys(hasHadSettersAdded).forEach((key) => {
    const { value } =
      Object.getOwnPropertyDescriptor(hasHadSettersAdded, key) || {};
    if (value === undefined) {
      return;
    }
    annotations[key] = mobxObservable;
    if (value instanceof Function) {
      const asMaterialization = createMaterialization(value);
      const asAction = (...args: any[]) => {
        let result;
        mobxRunInAction(() => {
          result = asMaterialization(...args);
        });
        return result;
      };
      (hasHadSettersAdded as any)[key] = (...args: any[]) => {
        if (mobxIsComputingDerivation()) {
          return asMaterialization(...args);
        } else {
          return asAction(...args);
        }
      };
    }
  });

  const hasBeenMadeObservable = mobxMakeObservable(
    hasHadSettersAdded,
    annotations,
  ); // mutates in-place
  return hasBeenMadeObservable;
}
