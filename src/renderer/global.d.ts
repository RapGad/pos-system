export {};

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
