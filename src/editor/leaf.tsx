import type { ComponentType } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useEditorLeafReady } from '../base/modules/editor/react';

/** Wrap actual destination components, never the root or an Outlet layout. */
export function editorLeaf(Component: ComponentType) {
  return function EditorLeaf() {
    const key = useRouterState({select: state => state.location.href + JSON.stringify(state.location.state)});
    useEditorLeafReady(key);
    return <Component />;
  };
}
