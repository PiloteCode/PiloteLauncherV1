import { BrowserWindow } from 'electron';

/**
 * Frameless-window helpers. The renderer drives the custom 44px title bar via the
 * `app:minimize` / `app:toggleMaximize` / `app:close` IPC channels, which delegate
 * here. All helpers act on the most relevant window (the one that sent the IPC, or
 * the focused/first window as a fallback).
 */

/** The window that should receive main->renderer events (focused, else first). */
export function targetWindow(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  const all = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  return all[0] ?? null;
}

export function minimizeWindow(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) win.minimize();
}

export function toggleMaximizeWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
}

export function closeWindow(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed()) win.close();
}

/** Broadcast an event payload to every live renderer on the given channel. */
export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}
