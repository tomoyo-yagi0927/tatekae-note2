const DEVELOPMENT_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const APP_CACHE_PREFIX = "tatekae-note-";
const RELOAD_MARKER = "tatekae-note-sw-cleanup-reloaded";

function isDevelopmentEnvironment() {
  return DEVELOPMENT_HOSTNAMES.has(window.location.hostname);
}

function isAppServiceWorker(registration) {
  const worker = registration.active || registration.waiting || registration.installing;

  if (!worker) {
    return false;
  }

  try {
    const scriptUrl = new URL(worker.scriptURL);
    return scriptUrl.origin === window.location.origin
      && scriptUrl.pathname.endsWith("/sw.js");
  } catch (error) {
    return false;
  }
}

async function unregisterServiceWorker(registration) {
  await Promise.race([
    registration.unregister(),
    new Promise((resolve) => window.setTimeout(resolve, 1000))
  ]);
}

async function removeDevelopmentServiceWorker() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const appRegistrations = registrations.filter(isAppServiceWorker);
  const wasControllingPage = Boolean(navigator.serviceWorker.controller);

  await Promise.all(appRegistrations.map(unregisterServiceWorker));

  const cacheNames = await caches.keys();
  const appCacheNames = cacheNames.filter((name) => name.startsWith(APP_CACHE_PREFIX));
  await Promise.all(appCacheNames.map((name) => caches.delete(name)));

  if (wasControllingPage && sessionStorage.getItem(RELOAD_MARKER) !== "1") {
    sessionStorage.setItem(RELOAD_MARKER, "1");
    window.location.reload();
    return true;
  }

  sessionStorage.removeItem(RELOAD_MARKER);
  return false;
}

export async function initializeServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (isDevelopmentEnvironment()) {
    try {
      return await removeDevelopmentServiceWorker();
    } catch (error) {
      console.warn("Development Service Worker cleanup failed", error);
      return false;
    }
  }

  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Service Worker registration failed", error);
  });
  return false;
}
