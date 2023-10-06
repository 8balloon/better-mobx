# r2v

TODO:
Improve naming in documentation
Make everything useMemo
Use `type-fest`.`merge` for `null` overrides 

## Vue for React

r2v is a Vue-like state management solution for React.

The idea is that when you call a method on a state object that updates state, relevant views update. (Sounds simple, right?)

`React.useMemo` got you down? r2v is here to help!

### Example

When the button is clicked, the count display will update automatically (even though it lives in a completely separate component). No hooks, props, or context are required.

```tsx
import { State, View } from 'r2v'

// the state, CountDisplay, IncrementButton, and Counter are all free to be moved to e.g., different files
const state = State({
  count: 0,
})
const IncrementButton = View(() => (
  <button onClick={() => state.setCount(state.count + 1)}>increment</button>
))
const CountDisplay = View(() => (
  <div className="myFancyClassName">{state.count}</div>
))
const Counter = View(() => (
  <div>
    <CountDisplay />
    <IncrementButton />
  </div>
))
```

The above could also be written like this:

```tsx
const state = State({
  count: 0,
  increment() {
    state.setCount(state.count + 1)
  },
})
const IncrementButton = View(() => (
  <button onClick={state.increment}>increment</button>
))
```

Or even like this:

```tsx
const state = State({
  count: 0,
  increment() {
    state.count++
  },
})
const IncrementButton = View(() => (
  <button onClick={state.increment}>increment</button>
))
```

The important part is that all state updates happen inside methods on the state object. If you try to update state outside of a method, like this:

```tsx
const state = State({
  count: 0,
})
const IncrementButton = View(() => (
  <button onClick={() => statecount++}>increment</button>
))
```

...r2v will throw an error. This is to ensure that all state object mutations are encapsulated in methods. (This makes logging really nice, explained in the logging section, below.)

## Core API

### View

A React function component wrapped in `View()` will update whenever any `State` field (or subfield) it references *while rendering* updates. (So remember: fields referenced in effects or callbacks will not trigger updates.)

It is highly recommended that you wrap all of your applications' custom components in `View`, including the root component. Wrapping the root component will ensure that the UI always updates when state changes, even if you forget to wrap your other components in `View`. However, performance will be better if you wrap each custom component in `View` -- if you don't, they will rerender when their nearest parent `View` component updates, which is less efficient.

### State

`State`s are objects for storing and updating application state. They work like this:

```tsx
const state = State({
  users: [] as Array<User>,

  setUserName(userId: string, newName: string) {
    const user = state.users.find(u => u.id === userId)
    if (user) {
      user.fullName = newName
      return true
    }
    return false
  },

  async fetchUsers(userIds) {
    const users = await fetch(...)

    // Setters like `setUsers` are created automatically for non-function fields.
    // Executing `state.users = users` would not be allowed here, because this method is not synchronous,
    // so there's no way for r2v to tell that state is being mutated from inside a method unless a method
    // (like `setUsers`, in this case) is called.
    state.setUsers(users)
  },
})

export const UserTable = View(() => (
  <div>
    <div>Total users: ${state.users.length}</div>
   <table>
      { state.users.map(user => (
        <tr key={user.id}>
          <td>{user.id}</td>
          <td>{user.fullName}</td>
        </tr>
      ))}
    </table>
    <button onClick={() => state.fetchUsers(state.users.map(u => u.id))}>
      Refresh
    </button>
  </div>
))
```

State is logged in Redux devtools if it's installed. If you want your state objects to have names in Redux devtools so you can uniquely identify them, you can provide a `name` argument in your state definition, like so:

```tsx
const state = state('counterState', {
  count: 0,
  increment() {
    state.setCount(state.count + 1)
  },
})
export const counterState = state
```

#### Methods

Functions included in state definitions are automatically transformed into `Method`s. Setter `Method`s are also automatically generated for any field on a state object that are 

`Method`s have 3 defining features:

1. They are the ONLY way to modify state
2. They are ONLY allowed to modify state synchronously
3. They also provide the functionality of `Materialization` functions (described below)

Every time you call an `Method` that updates state, r2v triggers rerenders on all `View`s that reference any updated fields/subfields.

`Method`s are free to read from and modify state on any state object.

One important thing to note: `Method`s may call other `Method`s, and `State`s will not update until the outermost `Method` has finished being (synchronously) executed. So: this will cause 2 renders: `myObs.setFirstName('Ethan'); myObs.setLastName('Clark');`, but this will only cause 1 render (even though it calls two other `Method`s): `myObs.setNames(first: string, last: string) { state.setFirstName(first); state.setLastName(last) }`

#### Advanced trick: "box"-ing

Although data that lives in state should behave like normal JavaScript objects, `r2v` does crazy stuff to it (like wrapping all fields in `Proxy`s, recursively). If you're optimizing performance and want to "box" an object to prevent it from being transformed into "smart" state (for the sake of performance or any othe reason), you can "box" data by wrapping it in a function, like this:

```tsx
const state = State('boxExample', {
  giantObjectBox: () => someGiantObject,
  getGiantObject() {
    return this.giantObjectBox()
  },
  setGiantObject(newGiantObject: GiantObjectType) {
    this.giantObjectBox = () => newGiantObject
  },
})
```
Here, `View`s and `Reactions` will update when the giant object is set to a new value, but won't update to changes on subfields of the giant object.

Note: if you change the value of a function like this example, any non-original function will behave like a normal function -- not a r2v `Method`. This meants it will not be allowed to update `State` fields, and it will not function as a `Materialization` (described below).

#### Setter methods

r2v auto-generates setter `Method`s for you. They are automatically generated for all non-function fields. So, if you define `const myObs = View('myViewName', { abc: 123 })`, `myObs.setAbc` will be automatically defined and always-available.

If you define your own setter `Method` for a field, r2v will respect the `Method` you define, and will not override it. If for some reason you want to prevent a setter from being generated, define it as `null`, like so:

```tsx
const state = State({
  x: 2,
  setX: null,
})
```

If you define the setter as `null`, r2v will leave it as such. Doing so will also set the type of `setX` to `null & Function`, which means that TypeScript will yell at you if you try to use it, as that value doesn't make sense from a type perspective.

#### IMPORTANT

You must ONLY pull values out of states from WITHIN Views and Reactions for the Views and Reactions to update when the states update.

So this will work:
```tsx
const clickCounts = State('myObs', {
  clicks: 0
})
const ClickCounter = View(() => (
  <div onClick={() => myObs.setClicks(myObs.clicks + 1)}>{myObs.clicks}</div>
))
```

And this will not work:
```tsx
const clickCounts = State('myObs', {
  clicks: 0
})
const { clicks, setClicks } = clickCounts
const ClickCounter = View(() => (
  <div onClick={() => setClicks(clicks + 1)}>{clicks}</div>
))
```

[Mobx has a great breakdown of this idea](https://mobx.js.org/understanding-reactivity.html) if you are interested.

### Materialization

`Method`s function as `Materialization` functions when used as such. `Materialization` functions cache Materialization state, allowing you to avoid expensive recalculations. They work like this:

```tsx
const state = State('userState', {
  users: [] as Array<User>,

  // r2v stores the result of this after it's called once,
  // and only ever recalculates it if `state.users` changes,
  // which makes it very efficient
  activeUsers() {
    return state.users.filter(u => !u.deactivated)
  },
  // the result of calls to this method will be cached by `id`, automatically,
  // updating the same as the above case
  user(id: string) {
    return state.users.find(u => u.id === id) || null
  }
})
export const userState = state
```

`Materialization` function results behave the same as `state` state fields, so this component will always display the `user`'s latest field values, even after those values change:

```tsx
// the logic inside the definition passed to `Materialization` above will only execute once in the rendering of this,
// and will only execute once when either `userId` changes or that user's `fullName` or `id` changes.
const User = View(() => (<div>User ${userState.user(userId).fullName} (id: ${userState.user(userId).id})</div>))
```

`Materialization` functions are free to reference both obervable state and other `Materialization` function state, like so:
```tsx
import { State, Materialization } from 'r2v'

const userState = State('userState', {
  users: [] as Array<User>,
  user(id: string) {
    return userState.users.find(u => u.id === id) || null
  },
})
const activeUsersState = State('activeUsersState', {
  activeUsers() {
    return userState.users.filter(u => !u.deactivated)
  },
})

// the results of this `Materialization` will be cached by `id`, automatically,
const activeUser = Materialization((id: string) => activeUsersState.activeUsers().find(u => u.id === id) || null)
```

#### IMPORTANT

Do not use `try/catch` within a `Materialization` function. Errors here can break `Views` and `Reaction`s.

For this reason, TypeScript's "strict" mode is highly encouraged.

#### IMPORTANT

The same rule about state state holds with Materialization state: you must ONLY call `Materialization` functions from WITHIN Views and Reactions for the Views and Reactions to update when Materialization state updates.

### Reaction

#### API: Reaction(def: () => (void | (nonReactiveFollowup: () => void))): function stop(): void

If you want to "push" values from an View into something else as they update, you can use `Reaction` to do so.

`Reaction`s run immediately when reacted, and then every time any value referenced in a `Reaction` updates, `Reaction` will rerun.

Your `Reaction` definition may return a function, if you wish. This function will be called immediately after the `Reaction` completes, and any `state` values referenced by this function will not trigger `Reaction` re-runs when they change.

Creating a `Reaction` returns a `stop()` function, which can be called to stop the Reaction from running.

## Logging

r2v logs everything in [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en), if available.

## gotchas

### dereferencing `State` or `Materialization` fields outside of `View`s or `Reaction`s

This is mentioned above, but worth repeating: if you pull fields off of an `state` _outside_ of an `View` or `Reaction`, and then use those fields _inside_ an `View` or `Reaction`, the `View/Reaction` *will not update* when those fields change on the `state` object. You should *only* dereference fields you want to "listen" to *inside* of `View`s or `Reaction`s.
