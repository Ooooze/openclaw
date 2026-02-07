import { BrowserWindow } from "electron";

export async function createMainWindow(params: {
  preloadPath: string;
  rendererIndex: string;
}): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 900,
    minHeight: 600,

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
