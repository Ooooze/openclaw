import { BrowserWindow } from "electron";

export async function createMainWindow(params: {
  preloadPath: string;
  rendererIndex: string;
}): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0f14",
    webPreferences: {
      preload: params.preloadPath,
      sandbox: true,
      contextIsolation: true,
    },
  });

  await win.loadFile(params.rendererIndex);

  return win;
}
