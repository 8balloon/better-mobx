/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Merge } from 'type-fest';
import { asRecord } from './asRecord';
import { type StoreModuleShape } from './types';

function getSetterName(fieldName: string) {
  return 'set' + fieldName.slice(0, 1).toUpperCase() + fieldName.slice(1);
}
function hasGetterButNoSetter(key: string, observableBase: StoreModuleShape) {
  const { get, set } =
    Object.getOwnPropertyDescriptor(observableBase, key) || {};
  return get instanceof Function && set === undefined;
}

// mutates in-place
export function addValueSettersWhereNoExist<T extends StoreModuleShape>(
  obj: T,
) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] instanceof Function) {
      return; // not adding anything for functions
    }
    if (getSetterName(key) in obj) {
      return; // do not override custom setters.
      // If they define a field with a setter's name + a non-function value, TypeScript will punish them,
      // as their resultant type will include FunctionType & ValueType for the field
    }
    const setterName = getSetterName(key);
    if (hasGetterButNoSetter(key, obj)) {
      asRecord(obj)[setterName] = function () {
        throw Error(
          `property "${key}" has a "get" function defined but no "set" function, so we have no way of setting the value using auto-generated setter`,
        );
      };
    } else {
      asRecord(obj)[setterName] = function (value: any) {
        asRecord(obj)[key] = value;
      };
    }
  });

  return obj as unknown as Merge<
    {
      [Key in keyof T as T[Key] extends (...args: any[]) => any
        ? never // not adding anything for functions
        : `set${Capitalize<string & Key>}`]: (value: T[Key]) => void;
    },
    T
  >;
}
