import { observer as mobxReactLiteObserver } from "mobx-react-lite";

export function createView(
  ...params: Parameters<typeof mobxReactLiteObserver>
) {
  return mobxReactLiteObserver(...params);
}
