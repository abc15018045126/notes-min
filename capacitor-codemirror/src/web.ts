import { WebPlugin } from '@capacitor/core';

import type { CodemirrorPlugin } from './definitions';

export class CodemirrorWeb extends WebPlugin implements CodemirrorPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }

  async start(options: {
    path: string;
    title?: string;
    content?: string;
    theme?: 'dark' | 'light';
    fontSize?: number;
    autoSave?: boolean;
    showLineNumbers?: boolean;
    readOnly?: boolean;
    language?: string;
  }): Promise<void> {
    console.log('Codemirror start called on web', options);
    // On web, we could potentially open a modal or navigate to a new page,
    // but for now we'll just log it.
  }
}
