export interface CodemirrorPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
  start(options: {
    path: string;
    title?: string;
    content?: string;
    theme?: 'dark' | 'light';
    fontSize?: number;
    autoSave?: boolean;
    showLineNumbers?: boolean;
    readOnly?: boolean;
    language?: string;
  }): Promise<void>;
}
