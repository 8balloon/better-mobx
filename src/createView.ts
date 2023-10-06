import { observer as mobxReactLiteObserver } from 'mobx-react-lite';
import { memo as reactMemo } from 'react';

export function createView(
  ...params: Parameters<typeof mobxReactLiteObserver>
) {
  return reactMemo(mobxReactLiteObserver(...params));
}
