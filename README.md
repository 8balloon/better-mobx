# r2v

## Vue for React

r2v is a Vue-like state management library for React.

The idea is that when you change a value in a store object, views that use that value update. (Sounds simple, right?)

### Example

When the button is clicked, the count displayed updates. No hooks, props, or context are required:
```tsx
import { createStore, createView } from 'r2v'

// the store and Increment button could live in different files and would work the same
const store = createStore({
  count: 0,

  // these methods the same thing
  incrementExample1() {
    store.count++
  },
  incrementExample2() {
    // the `setCount` method is generated automatically, and is type-safe
    store.setCount(store.count + 1)
  },
})

const IncrementButton = createView(() => (
  <button
    onClick={() => {
      // these all do the same thing
      store.setCount(store.count + 1)
      store.incrementExample1()
      store.incrementExample2()
      store.count++
    }}
  >count is {store.count}. click to increment by 4
  </button>
)
```

There is one main "trick" behind r2v: you must pull values out of stores from *within* views and reactions if you want them to update appropriately. So, this will work:
```tsx
const ClickCounter = createView(() => (
  <div onClick={() => clickStore.setClicks(clickCounts.clicks + 1)}>{clickStore.clicks}</div>
))
```
and this won't:
```tsx
const { clicks, setClicks } = clickStore
const ClickCounter = createView(() => (
  <div onClick={() => setClicks(clicks + 1)}>{clicks}</div>
))
```

(this only matters when you need a value to stay "up-to-date" (like in a view or reaction) -- otherwise this is a non-issue; store values are always "correct" at the point in time that they are referenced.

[Mobx has a great breakdown of this idea](https://mobx.js.org/understanding-reactivity.html).

## Core API

### createView

A React function component wrapped in `createView()` will update whenever any store field (or subfield!) it references *while rendering* updates.

(You can also use props and hooks like you usually do -- they work normally.)

The magic here is that the view will only update if the specific fields + subfields it reads from update. This makes views very performant.

It is recommended that you wrap all of your applications' custom components in `createView`, including the root component.

### createStore

Stores are for storing and updating application state. They work like this:

```tsx
const store = createStore({
  users: [] as Array<User>,

  setUserName(userId: string, newName: string) {
    const user = store.users.find(u => u.id === userId)
    if (user) {
      user.fullName = newName
      return true
    }
    return false
  },

  async fetchUsers(userIds) {
    store.users = await fetch(...)
  },
})

export const UserTable = createView(() => (
  <div>
    <div>Total users: ${store.users.length}</div>
   <table>
      { store.users.map(user => (
        <tr key={user.id}>
          <td>{user.id}</td>
          <td>{user.fullName}</td>
        </tr>
      ))}
    </table>
    <button onClick={() => store.fetchUsers(store.users.map(u => u.id))}>
      Refresh
    </button>
  </div>
))
```

#### Methods

Methods can set values in the store or return values. You can define whatever methods you want, and they should work as you expect.

Setter methods are automatically generated for all non-function fields.

Methods are a nice way to update your stores because r2v waits to update/rerun views and reactions until a method has completed running (unless it's asynchronous). This means you can mutate a bunch of stuff in a single method and cause only a single rerender.

#### Setter methods

As previously mentioned, r2v auto-generates setter methods for you. They are automatically generated for all non-function fields. So, if you define `const myStore = createStore({ abc: 123 })`, `myStore.setAbc` will be automatically defined and always-available.

If you define your own setter method for a field, r2v will respect the method you define, and will not override it. If for some reason you want to prevent a setter from being generated, you can set it to `null`, like so:

```tsx
const store = createStore({
  x: 2,
  setX: null,
})
```

These auto-generated hooks are all typed as you would expect.

#### Getter methods

Getter methods automatically do caching; they won't re-execute unless either parameters passed to them change, or a store value they reference changes. Here's an example:

```tsx
const store = createStore({
  users: [] as Array<User>,

  // r2v stores the result of this after it's called once,
  // and only ever recalculates it if `store.users` changes
  activeUsers() {
    return store.users.filter(u => !u.deactivated)
  },
  // recalculates if the passed `id` value or `store.users` changes
  user(id: string) {
    return store.users.find(u => u.id === id) || null
  }
})
```

#### Advanced trick: "box"-ing

Although store data behaves like normal JavaScript objects, `r2v` does crazy stuff to it (like wrapping all fields in `Proxy`s, recursively). If you're optimizing performance and want to "box" an object to prevent it from being transformed into "smart" state, wrap it in a function, like this:

```tsx
const store = createStore({
  giantObjectBox: () => someGiantObject,
  getGiantObject() {
    return this.giantObjectBox()
  },
  setGiantObject(newGiantObject: GiantObjectType) {
    this.giantObjectBox = () => newGiantObject
  },
})
```

Here, views and reactions that reference the giant object will still update when the giant object is set to a new value, but won't update to changes on subfields of the giant object.

### createReaction

#### API: createReaction(def: () => (void | (nonReactiveFollowup: () => void))): stop(): void

If you want to "push" values from a store into something else as they update, you can use a reaction to do so.

Reactions run immediately when created, and then rerun every time any value referenced is updated.

If your reaction callback returns a function, that function will be called immediately after the reaction completes, and any stores or materializations referenced by that function will not trigger a re-runs when they change.

The `stop()` function that's returned stops the reaction from continuing to run.
