# r2v

TODO:
Make everything useMemo

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

  // these do the same thing
  incrementV1() {
    store.count++
  },
  incrementV2() {
    store.setCount(store.count + 1) // the `setCount` method is generated automatically, and is type-safe
  },
})
const IncrementButton = createView(() => {
  
  return (
    
    <button onClick={() => {
      // these all do the same thing
      store.setCount(store.count + 1) // the `setCount` method is generated automatically, and is type-safe
      store.incrementV1()
      store.incrementV2()
      store.count++
    }}>count is {store.count}. click to increment by 4</button>
  )
})
```

The important part is that you pull values when from within the component. This won't work:

```tsx
const store = createStore({
  count: 0,
})
let storeCount = store.count;
const IncrementButton = createView(() => (
  <button onClick={() => storecount++}>increment</button>
))
```

## Core API

### createView

A React function component wrapped in `createView()` will update whenever any store field (or subfield) it references *while rendering* updates. (So remember: fields referenced in effects or callbacks will not trigger updates.)

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

#### Methods

Functions included in store definitions can be used as store methods.

Setter methods are automatically generated for all root-level fields on an object that aren't functions themselves.

It's recommended to use methods as much as possible to mutate stores. The main reason is that mutations that occur during method execution are synchronously batched, as illustrated here:

```ts
const store = createStore({
  count: 0,
  incrementTwice() {
    store.count++
    store.count++
  },
  async incrementAsynchronouslySoBatchingDoesNotWork() {
    await new Promise(r => setTimeout(r), 1000)
    store.count++
    store.count++
  },
})

const Counter = createView(() => <div>{store.count}</div>)

// these calls will cause Counter to rerender twice
store.count++
store.count++

// this call will only cause Counter to rerender once because mutation is occurring via a store method
store.incrementTwice();
```

#### Advanced trick: "box"-ing

Although data that lives in store should behave like normal JavaScript objects, `r2v` does crazy stuff to it (like wrapping all fields in `Proxy`s, recursively). If you're optimizing performance and want to "box" an object to prevent it from being transformed into "smart" state (for the sake of performance or any other reason), you can "box" data by wrapping it in a function, like this:

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
Here, views and reactions will update when the giant object is set to a new value, but won't update to changes on subfields of the giant object.

Note: if you change the value of a function like this example, any mutation done to any store by the non-original function will not be batched like normal store methods do, and it will not function as a materialized field (described below).

#### Setter methods

As previously mentioned, r2v auto-generates setter methods for you. They are automatically generated for all non-function fields. So, if you define `const myStore = createStore({ abc: 123 })`, `myStore.setAbc` will be automatically defined and always-available.

If you define your own setter method for a field, r2v will respect the method you define, and will not override it. If for some reason you want to prevent a setter from being generated, define it as `null`, like so:

```tsx
const store = createStore({
  x: 2,
  setX: null,
})
```

Doing so will cause r2v to leave it alone. The type of the field will also be `null`.

#### IMPORTANT

You must ONLY pull values out of stores from WITHIN Views and createReactions for the Views and createReactions to update when the stores update.

So this will work:
```tsx
const clickCounts = createStore({
  clicks: 0
})
const ClickCounter = createView(() => (
  <div onClick={() => clickCounts.setClicks(clickCounts.clicks + 1)}>{clickCounts.clicks}</div>
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

Store methods function as materializations when they are called during the render of React components. This means they automatically do fancy caching; they won't re-run unless either parameters passed to them change, or a store value they reference changes. Here's an example:

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

// This component will always display the `user`'s latest field values,
// but caching will ensure it is still very efficient.
// In this case, it references `userStore.user(userId)` twice,
// but the calculations that return the correct value are only run once due to caching.
const User = createView(() => (<div>User ${userStore.user(userId).fullName} (id: ${userStore.user(userId).id})</div>))
```

You can create materializations outside of stores with `createMaterialization`. Materializations (and store methods) are free to reference both stores and other materializations, like so:
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

Do not use `try/catch` within store methods or materializations. Errors here can break views and reactions.

(For this reason, TypeScript's "strict" mode is highly encouraged.)

#### IMPORTANT

The same rule about store store holds with createMaterialization store: you must ONLY call `createMaterialization` functions from WITHIN Views and createReactions for the Views and createReactions to update when createMaterialization store updates.

### createReaction

#### API: createReaction(def: () => (void | (nonReactiveFollowup: () => void))): stop(): void

If you want to "push" values from an createView into something else as they update, you can use a reaction to do so.

Reactions run immediately when created, and then every time any value referenced in a reaction updates, the reaction will rerun.

If your reaction callback returns a function, that function will be called immediately after the reaction completes, and any stores or materializations referenced by this function will not trigger re-runs when they change.

Creating a reaction returns a `stop()` function, which will prevent the reaction from rerunning.

## gotchas

### referencing stores or materializations outside of views and reactions

This is mentioned above, but worth repeating: if you pull fields off of a store or call a materialization function _outside_ of a view or reaction, and then use those fields _inside_ a view or reaction, the view/reaction *will not update* when those fields change. You should *only* pull values from stores/materializations *inside* of views and reactions.
