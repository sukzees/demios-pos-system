export {};

declare global {
  interface Window {
    electronAPI?: {
      printSilent: (html: string, printerName?: string) => Promise<{ success: boolean; error?: string }>;
      isElectron: boolean;
    };
  }
}
