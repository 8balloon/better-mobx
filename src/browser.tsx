import React from 'react';
import { createStore, createReaction, createView } from './index';
import { render } from 'react-dom';

const createStore1 = () =>
  createStore({
    a: 2,
    breakerEnabled: false as boolean,
    break() {
      throw new Error('Yolo!');
    },
  });

const createStore2 = (store1: ReturnType<typeof createStore1>) => {
  const store2 = createStore({
    b: 3,
    c: 4,
    double() {
      store2.b = store2.b * 2;
    },
    quadruple() {
      store2.double();
      store2.double();
    },
    doubleB() {
      return store2.b * 2;
    },
    product() {
      return store1.a * store2.b;
    },
    incrementBy(amt: number) {
      store2.b += amt;
    },
  });
  return store2;
};

const createAnonStore = () =>
  createStore({
    d: 5,
  });

const createStores = () => {
  const store1 = createStore1();
  const store2 = createStore2(store1);
  const anonStore = createAnonStore();

  createReaction(() => {
    console.log('a/b:', store1.a, store2.b);
  });

  store1.setA(123);
  store2.setB(456);

  return {
    store1,
    store2,
    anonStore,
  };
};
type Stores = ReturnType<typeof createStores>;
type StoreProps<Props = {}> = Props & { stores: Stores };

const InternalComponentTest = createView(
  ({ stores: { anonStore } }: StoreProps) => {
    console.log('internal is rendering...');
    return (
      <div onClick={() => anonStore.setD(anonStore.d + 1)}>
        Hello from internal component. {anonStore.d}
      </div>
    );
  },
);

const MyComponent = createView(({ stores }: StoreProps) => {
  const { store1, store2 } = stores;
  console.log('Outer is rendering.');
  const { a } = store1;
  return (
    <div>
      Hello
      <div onClick={() => store1.setA(a + 1)}>store1.a: {store1.a}</div>
      <div onClick={() => store2.setB(store2.b + 2)}>store2.b: {store2.b}</div>
      <div onClick={() => store2.double()}>double: {store2.doubleB()}</div>
      <div onClick={() => store2.quadruple()}>quadruple</div>
      <InternalComponentTest stores={stores} />
      <div onClick={() => store1.a++}>Direct increment</div>
      <div onClick={() => store1.setBreakerEnabled(true)}>Breaker...</div>
      {store1.breakerEnabled && store1.break()}
      <div>Product: {store2.product()}</div>
      <div onClick={() => store2.incrementBy(3)}>increment by 3</div>
    </div>
  );
});

window.onload = () => {
  const globalStores = createStores();
  render(
    <MyComponent stores={globalStores} />,
    document.getElementById('root'),
  );
};

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// (window as any).foo = foo  // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572

// console.log('Method "foo" was added to the window object. You can try it yourself by just entering "await foo()"')
