"use client";

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Show a local notification. Prefers the service worker's `showNotification`
 * (works when the page is not focused / on mobile). Falls back to `new Notification`.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  options: { url?: string; tag?: string; category?: string } = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;

  const tag = options.tag ?? (options.category ? `carlocation-${options.category}` : "carlocation-default");

  const baseOptions: NotificationOptions = {
    body,
    icon: "/icons/icon.svg",
    tag,
    data: options.url ? { url: options.url } : undefined,
  };

  // Prefer service-worker-based notification (survives page-hide on mobile)
  const reg = await registerServiceWorker();
  if (reg) {
    try {
      await reg.showNotification(title, baseOptions);
      return;
    } catch (err) {
      console.warn("SW showNotification failed, falling back:", err);
    }
  }

  // Fallback to the Notification constructor
  try {
    const n = new Notification(title, baseOptions);
    if (options.url) {
      n.onclick = () => {
        window.focus();
        window.location.href = options.url!;
        n.close();
      };
    }
  } catch (err) {
    console.error("Failed to show notification:", err);
  }
}

/**
 * Register the service worker (memoized — safe to call multiple times).
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        return reg;
      })
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
        swRegistrationPromise = null;
        return null;
      });
  }
  return swRegistrationPromise;
}
