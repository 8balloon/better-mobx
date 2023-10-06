import React from 'react';
import { createStore, createReaction, createView } from './index';
import { render } from 'react-dom';

const store1 = createStore({
  a: 2,
  breakerEnabled: false as boolean,
  break() {
    throw new Error('Yolo!');
  },
});
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
});

const anonStore = createStore({
  d: 5,
});

createReaction(() => {
  console.log('a/b:', store1.a, store2.b);
});

store1.setA(123);
store2.setB(456);

const InternalComponentTest = createView(() => {
  console.log('internal is rendering...');
  return (
    <div onClick={() => anonStore.setD(anonStore.d + 1)}>
      Hello from internal component. {anonStore.d}
    </div>
  );
});

const MyComponent = createView(() => {
  console.log('Outer is rendering.');
  const { a } = store1;
  return (
    <div>
      Hello
      <div onClick={() => store1.setA(a + 1)}>{store1.a}</div>
      <div onClick={() => store2.setB(store2.b + 2)}>{store2.b}</div>
      <div onClick={() => store2.double()}>double: {store2.doubleB()}</div>
      <div onClick={() => store2.quadruple()}>quadruple</div>
      <InternalComponentTest />
      <div onClick={() => store1.a++}>Complainer...</div>
      <div onClick={() => store1.setBreakerEnabled(true)}>Breaker...</div>
      {store1.breakerEnabled && store1.break()}
    </div>
  );
});

window.onload = () => {
  render(<MyComponent />, document.getElementById('root'));
};

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// (window as any).foo = foo  // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572

// console.log('Method "foo" was added to the window object. You can try it yourself by just entering "await foo()"')
