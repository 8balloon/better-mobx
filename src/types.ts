export type Json =
  | null
  | boolean
  | number
  | string
  | Array<Json>
  | { [key: string]: Json };

export type StoreModuleShape = {
  [key: string]: Json | Function; // not using more-specific (...args: any[]) => any , as that (for some reason) makes observables the "any" type
};
