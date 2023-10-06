export type Json =
  | null
  | boolean
  | number
  | string
  | Array<Json>
  | { [key: string]: Json };

export type StoreModuleShape = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [key: string]: Json | Function; // not using more-specific (...args: any[]) => any , as that (for some reason) makes observables the "any" type
};
