import { addValueSettersWhereNoExist } from './addSetters';

describe('addValueSettersWhereNoExist', () => {
  it('adds setter where it does not exist', () => {
    const o = { a: 2 };
    const withSetters = addValueSettersWhereNoExist(o);
    expect(withSetters.setA).toBeInstanceOf(Function);
  });
  it('respects original setter', () => {
    const o = {
      a: 2,
      setA(v: number) {
        o.a = v * 2;
      },
    };
    const originalSetter = o.setA;
    const withSetters = addValueSettersWhereNoExist(o);
    expect(withSetters.setA).toBe(originalSetter);
    o.setA(2);
    expect(o.a).toBe(4);
  });
  it('does not define a setter for a custom setter', () => {
    const o = {
      a: 2,
      setA(v: number) {
        o.a = v * 2;
      },
    };
    const withSetters = addValueSettersWhereNoExist(o);
    //@ts-expect-error - intentionally testing for this
    expect(withSetters.setSetA).toBeUndefined();
  });
  it("defines a setter that throws errors for accessor property with no 'set' func", () => {
    const o = {
      a: 2,
      get doubleA() {
        return o.a * 2;
      },
    };
    const withSetters = addValueSettersWhereNoExist(o);
    expect(() => withSetters.setDoubleA(12321)).toThrow();
  });
  it('respects custom setter for property with get() func defined', () => {
    const o = {
      a: 2,
      get doubleA() {
        return o.a * 2;
      },
      setDoubleA(v: number) {
        o.a = v / 2;
      },
    };
    const withSetters = addValueSettersWhereNoExist(o);
    withSetters.setDoubleA(6);
    expect(withSetters.a).toEqual(3);
  });
});
