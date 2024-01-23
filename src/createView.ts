import { observer as mobxReactLiteObserver } from 'mobx-react-lite';
import { MemoExoticComponent, memo as reactMemo } from 'react';

export function createView<
  ComponentType extends
    | React.FunctionComponent<any>
    | React.ForwardRefRenderFunction<any, any>,
>(
  Component: ComponentType,
): MemoExoticComponent<ComponentType & { displayName: string }> {
  return reactMemo(mobxReactLiteObserver(Component));
}
