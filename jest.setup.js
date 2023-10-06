// fail tests if console method invoked
[/**"log", /**/ 'warn', 'error'].forEach((methodName) => {
  const calls = [];
  console[methodName] = (...args) =>
    calls.push({
      args,
      stack: Error()
        .stack.split('\n')
        .map((str) => str.trim()),
    });
  afterAll(() => {
    if (calls.length) {
      throw Error(
        `console.${methodName} was called! details: "` +
          JSON.stringify(calls, null, 2),
      );
    }
  });
});
