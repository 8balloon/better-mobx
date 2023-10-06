import { createStore, createReaction } from "./main";

const actionRunner = createStore({
  runInAction(cb: (...args: any[]) => any) {
    cb();
  },
});

// const x = createStore({
//   a: 2,
//   // setA(v: string) {
//   //   console.log({ v });
//   // },
// });
// x.setA("asdf");
// x.setA(2);

test("createStore + createReaction + createMaterialization + createMaterialization referencing createMaterialization", () => {
  let doubleVCalculated = 0;
  let octupleVCalculated = 0;
  const store = createStore({
    v: 2,
    updateV(newValue: number) {
      store.v = newValue;
    },
    doubleV: () => {
      doubleVCalculated++;
      return store.v * 2;
    },
    octupleV() {
      octupleVCalculated++;
      return store.doubleV() * 4;
    },
  });

  const doubleVRunner = jest.fn(() => {
    expect(store.v * 2).toEqual(store.doubleV());
    return store.doubleV();
  });
  createReaction(() => {
    doubleVRunner();
  });

  const octupleVRunner = jest.fn(() => {
    expect(store.v * 8).toEqual(store.octupleV());
    return store.octupleV();
  });
  createReaction(() => {
    octupleVRunner();
  });

  store.updateV(3);

  expect(doubleVRunner).toHaveBeenCalledTimes(2);
  expect(doubleVRunner).toHaveReturnedWith(4);
  expect(doubleVRunner).toHaveReturnedWith(6);
  expect(doubleVCalculated).toEqual(2);

  expect(octupleVRunner).toHaveBeenCalledTimes(2);
  expect(octupleVRunner).toHaveReturnedWith(16);
  expect(octupleVRunner).toHaveReturnedWith(24);
  expect(octupleVCalculated).toEqual(2);
});

test("auto-generated setters", () => {
  const myObs = createStore({
    a: 2,
  });
  expect(myObs.a).toBe(2);
  expect(typeof myObs.setA).toBe("function");
  myObs.setA(3);
  expect(myObs.a).toBe(3);
});

test("custom setters are respected", () => {
  const myObs = createStore({
    a: 2,
    setA(v: number) {
      myObs.a = v * 2;
    },
  });
  expect(myObs.a).toEqual(2);
  myObs.setA(2);
  expect(myObs.a).toEqual(4);
});

test("setters are not generated for custom setters", () => {
  const myObs = createStore({
    a: 2,
    setA(v: number) {
      myObs.a = v * 2;
    },
  });
  expect((myObs as any).setSetA).toBeUndefined();
});

test("runInAction", () => {
  let doubleVCalled = 0;
  const store = createStore({
    v: 2,
    updateV(newValue: number) {
      store.v = newValue;
    },
    doubleV: () => {
      doubleVCalled++;
      return store.v * 2;
    },
  });

  const doubleVRunner = jest.fn(() => {
    expect(store.v * 2).toEqual(store.doubleV());
    return store.doubleV(); // calling doubleV
  });
  createReaction(() => {
    doubleVRunner();
  });

  actionRunner.runInAction(() => {
    store.setV(3);
    store.setV(4);
    store.setV(5);
  });

  expect(doubleVRunner).toHaveBeenCalledTimes(2); // initial, and then after action
  expect(store.doubleV()).toEqual(10);
  expect(doubleVRunner).toHaveBeenCalledTimes(2); // initial, and then after action
  expect(doubleVCalled).toEqual(2);
  // problem: being called outside reactive context -> recomputes, because asComptuedFunction is not used.
});

test("`this` pattern works", () => {
  const store = createStore({
    c: 2,
    doubleC() {
      return store.c * 2;
    },
  });
  expect(store.doubleC()).toEqual(4);
});
test("self-reference pattern works", () => {
  const store = createStore({
    c: 2,
    doubleC() {
      return store.c * 2;
    },
  });
  expect(store.doubleC()).toEqual(4);
});

test("box pattern", () => {
  // // inherently broken
  // const store = createStore({
  //   _z: (() => 123) as () => number,
  //   get z() {
  //     return store._z();
  //   },
  //   set z(v: number) {
  //     store._z = () => v;
  //   },
  // });
  const store = createStore({
    _z: (() => 123) as () => number,
    z() {
      return store._z();
    },
    setZ(v: number) {
      store._z = () => v;
    },
  });
  expect(store.z()).toEqual(123);
  store.setZ(321);
  expect(store.z()).toEqual(321);
});

test("nested field updates", () => {
  const store = createStore({
    a: {
      b: 1,
      c: 2,
    },
  });
  let bRan = 0;
  let cRan = 0;
  createReaction(() => {
    store.a.b;
    bRan++;
  });
  createReaction(() => {
    store.a.c;
    cRan++;
  });
  actionRunner.runInAction(() => {
    store.a.b++;
    store.a.b++;
  });
  expect(bRan).toBe(2);
  expect(cRan).toBe(1);
  expect(store.a.b).toBe(3);
  expect(store.a.c).toBe(2);
  store.a.b++;
  store.a.b++;
  expect(bRan).toBe(4);
  expect(store.a.b).toBe(5);
});
