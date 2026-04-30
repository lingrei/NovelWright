"use client";

/**
 * Browser notification helper for long-running Write sessions.
 * Asks for permission on first call, fires notification when tab is hidden,
 * focuses the tab on click.
 *
 * Silently no-ops if the browser doesn't support Notifications API or the
 * user has denied permission.
 */

const STORAGE_KEY = "novelwright-notifications-asked";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function getPermissionState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Ask for permission. Idempotent — if already granted/denied, returns the existing state.
 * Stores a flag so we don't re-prompt every page load.
 */
export async function requestPermissionIfNeeded(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const current = Notification.permission as NotificationPermissionState;
  if (current !== "default") return current;

  const alreadyAsked = localStorage.getItem(STORAGE_KEY) === "1";
  if (alreadyAsked) return current;

  try {
    const result = await Notification.requestPermission();
    localStorage.setItem(STORAGE_KEY, "1");
    return result as NotificationPermissionState;
  } catch {
    return "denied";
  }
}

interface NotifyOptions {
  title: string;
  body: string;
  /** Only fire if the tab is hidden. Default true (don't notify if user is watching). */
  onlyIfHidden?: boolean;
  /** When clicked, focuses this window. */
  focusOnClick?: boolean;
}

export function notify(opts: NotifyOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (opts.onlyIfHidden !== false && document.visibilityState === "visible") return;

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: "/favicon.ico",
      tag: "novelwright-write",
    });
    if (opts.focusOnClick !== false) {
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  } catch (err) {
    // Notification API can throw on older browsers / in some contexts. Swallow silently.
    console.warn("[notifications] notify failed:", err);
  }
}
