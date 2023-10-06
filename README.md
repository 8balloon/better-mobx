# r2v

TODO:
Improve naming in documentation
Make everything useMemo
Use `type-fest`.`merge` for `null` overrides 

## Vue for React

r2v is a Vue-like global state management solution for React.

The idea is that when you call a method on a store object that updates state, relevant views update. (Sounds simple, right?)

### Example

When the button is clicked, the count display will update automatically (even though it lives in a completely separate component). No hooks, props, or context are required.

```tsx
import { createStore, createView } from 'r2v'

// the store, CountDisplay, IncrementButton, and Counter are all free to be moved to e.g., different files
const store = createStore({
  count: 0,
})
const IncrementButton = createView(() => (
  <button onClick={() => store.setCount(store.count + 1)}>increment</button>
))
const CountDisplay = createView(() => (
  <div className="myFancyClassName">{store.count}</div>
))
const Counter = createView(() => (
  <div>
    <CountDisplay />
    <IncrementButton />
  </div>
))
```

The above could also be written like this:

```tsx
const store = createStore({
  count: 0,
  increment() {
    store.setCount(store.count + 1)
  },
})
const IncrementButton = createView(() => (
  <button onClick={store.increment}>increment</button>
))
```

Or even like this:

```tsx
const store = createStore({
  count: 0,
  increment() {
    store.count++
  },
})
const IncrementButton = createView(() => (
  <button onClick={store.increment}>increment</button>
))
```

The important part is that all store updates happen inside methods on the store object. If you try to update store outside of a method, like this:

```tsx
const store = createStore({
  count: 0,
})
const IncrementButton = createView(() => (
  <button onClick={() => storecount++}>increment</button>
))
```

...r2v will throw an error. This is to ensure that all store object mutations are encapsulated in methods. (This makes logging really nice, explained in the logging section, below.)

## Core API

### createView

A React function component wrapped in `createView()` will update whenever any `createStore` field (or subfield) it references *while rendering* updates. (So remember: fields referenced in effects or callbacks will not trigger updates.)

It is highly recommended that you wrap all of your applications' custom components in `createView`, including the root component. Wrapping the root component will ensure that the UI always updates when store changes, even if you forget to wrap your other components in `createView`. However, performance will be better if you wrap each custom component in `createView` -- if you don't, they will rerender when their nearest parent `createView` component updates, which is less efficient.

### createStore

`createStore`s are objects for storing and updating application store. They work like this:

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
    const users = await fetch(...)

    // Setters like `setUsers` are created automatically for non-function fields.
    // Executing `store.users = users` would not be allowed here, because this method is not synchronous,
    // so there's no way for r2v to tell that store is being mutated from inside a method unless a method
    // (like `setUsers`, in this case) is called.
    store.setUsers(users)
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

createStore is logged in Redux devtools if it's installed. If you want your store objects to have names in Redux devtools so you can uniquely identify them, you can provide a `name` argument in your store definition, like so:

```tsx
const store = store('counterStore', {
  count: 0,
  increment() {
    store.setCount(store.count + 1)
  },
})
export const counterStore = store
```

#### Methods

Functions included in store definitions are automatically transformed into `Method`s. Setter `Method`s are also automatically generated for any field on a store object that are 

`Method`s have 3 defining features:

1. They are the ONLY way to modify store
2. They are ONLY allowed to modify store synchronously
3. They also provide the functionality of `createMaterialization` functions (described below)

Every time you call an `Method` that updates store, r2v triggers rerenders on all `createView`s that reference any updated fields/subfields.

`Method`s are free to read from and modify store on any store object.

One important thing to note: `Method`s may call other `Method`s, and `createStore`s will not update until the outermost `Method` has finished being (synchronously) executed. So: this will cause 2 renders: `myObs.setFirstName('Ethan'); myObs.setLastName('Clark');`, but this will only cause 1 render (even though it calls two other `Method`s): `myObs.setNames(first: string, last: string) { store.setFirstName(first); store.setLastName(last) }`

#### Advanced trick: "box"-ing

Although data that lives in store should behave like normal JavaScript objects, `r2v` does crazy stuff to it (like wrapping all fields in `Proxy`s, recursively). If you're optimizing performance and want to "box" an object to prevent it from being transformed into "smart" store (for the sake of performance or any othe reason), you can "box" data by wrapping it in a function, like this:

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
Here, `createView`s and `createReactions` will update when the giant object is set to a new value, but won't update to changes on subfields of the giant object.

Note: if you change the value of a function like this example, any non-original function will behave like a normal function -- not a r2v `Method`. This meants it will not be allowed to update `createStore` fields, and it will not function as a `createMaterialization` (described below).

#### Setter methods

r2v auto-generates setter `Method`s for you. They are automatically generated for all non-function fields. So, if you define `const myObs = createView('myViewName', { abc: 123 })`, `myObs.setAbc` will be automatically defined and always-available.

If you define your own setter `Method` for a field, r2v will respect the `Method` you define, and will not override it. If for some reason you want to prevent a setter from being generated, define it as `null`, like so:

```tsx
const store = createStore({
  x: 2,
  setX: null,
})
```

If you define the setter as `null`, r2v will leave it as such. Doing so will also set the type of `setX` to `null & Function`, which means that TypeScript will yell at you if you try to use it, as that value doesn't make sense from a type perspective.

#### IMPORTANT

You must ONLY pull values out of stores from WITHIN Views and createReactions for the Views and createReactions to update when the stores update.

So this will work:
```tsx
const clickCounts = createStore({
  clicks: 0
})
const ClickCounter = createView(() => (
  <div onClick={() => myObs.setClicks(myObs.clicks + 1)}>{myObs.clicks}</div>
))
```

And this will not work:
```tsx
const clickCounts = createStore({
  clicks: 0
})
const { clicks, setClicks } = clickCounts
const ClickCounter = createView(() => (
  <div onClick={() => setClicks(clicks + 1)}>{clicks}</div>
))
```

[Mobx has a great breakdown of this idea](https://mobx.js.org/understanding-reactivity.html) if you are interested.

### createMaterialization

`Method`s function as `createMaterialization` functions when used as such. `createMaterialization` functions cache createMaterialization store, allowing you to avoid expensive recalculations. They work like this:

```tsx
const store = createStore({
  users: [] as Array<User>,

  // r2v stores the result of this after it's called once,
  // and only ever recalculates it if `store.users` changes,
  // which makes it very efficient
  activeUsers() {
    return store.users.filter(u => !u.deactivated)
  },
  // the result of calls to this method will be cached by `id`, automatically,
  // updating the same as the above case
  user(id: string) {
    return store.users.find(u => u.id === id) || null
  }
})
export const userStore = store
```

`createMaterialization` function results behave the same as `store` store fields, so this component will always display the `user`'s latest field values, even after those values change:

```tsx
// the logic inside the definition passed to `createMaterialization` above will only execute once in the rendering of this,
// and will only execute once when either `userId` changes or that user's `fullName` or `id` changes.
const User = createView(() => (<div>User ${userStore.user(userId).fullName} (id: ${userStore.user(userId).id})</div>))
```

`createMaterialization` functions are free to reference both obervable store and other `createMaterialization` function store, like so:
```tsx
import { createStore, createMaterialization } from 'r2v'

const userStore = createStore({
  users: [] as Array<User>,
  user(id: string) {
    return userStore.users.find(u => u.id === id) || null
  },
})
const activeUsersStore = createStore({
  activeUsers() {
    return userStore.users.filter(u => !u.deactivated)
  },
})

// the results of this `createMaterialization` will be cached by `id`, automatically,
const activeUser = createMaterialization((id: string) => activeUsersStore.activeUsers().find(u => u.id === id) || null)
```

#### IMPORTANT

Do not use `try/catch` within a `createMaterialization` function. Errors here can break `Views` and `createReaction`s.

For this reason, TypeScript's "strict" mode is highly encouraged.

#### IMPORTANT

The same rule about store store holds with createMaterialization store: you must ONLY call `createMaterialization` functions from WITHIN Views and createReactions for the Views and createReactions to update when createMaterialization store updates.

### createReaction

#### API: createReaction(def: () => (void | (nonReactiveFollowup: () => void))): function stop(): void

If you want to "push" values from an createView into something else as they update, you can use `createReaction` to do so.

`createReaction`s run immediately when reacted, and then every time any value referenced in a `createReaction` updates, `createReaction` will rerun.

Your `createReaction` definition may return a function, if you wish. This function will be called immediately after the `createReaction` completes, and any `store` values referenced by this function will not trigger `createReaction` re-runs when they change.

Creating a `createReaction` returns a `stop()` function, which can be called to stop the createReaction from running.

## Logging

r2v logs everything in [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en), if available.

## gotchas

### dereferencing `createStore` or `createMaterialization` fields outside of `createView`s or `createReaction`s

This is mentioned above, but worth repeating: if you pull fields off of an `store` _outside_ of an `createView` or `createReaction`, and then use those fields _inside_ an `createView` or `createReaction`, the `createView/createReaction` *will not update* when those fields change on the `store` object. You should *only* dereference fields you want to "listen" to *inside* of `createView`s or `createReaction`s.
