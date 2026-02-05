import { registerPlugin } from '@capacitor/core';

import type { CodemirrorPlugin } from './definitions';

const Codemirror = registerPlugin<CodemirrorPlugin>('Codemirror', {
  web: () => import('./web').then((m) => new m.CodemirrorWeb()),
});

export * from './definitions';
export { Codemirror };
