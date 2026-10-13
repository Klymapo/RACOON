function versionParts(version) {
  return String(version || '0').replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function isNewer(candidate, current) {
  const left = versionParts(candidate);
  const right = versionParts(current);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] || 0) !== (right[index] || 0)) return (left[index] || 0) > (right[index] || 0);
  }
  return false;
}

export async function checkPublishedVersion({fetch = globalThis.fetch, currentVersion = '0.0.0', now = Date.now} = {}) {
  try {
    const stamp = typeof now === 'function' ? now() : now;
    const response = await fetch(`/version.json?check=${stamp}`, {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return {available: isNewer(payload.version, currentVersion), version: payload.version || currentVersion, changes: Array.isArray(payload.changes) ? payload.changes : [], error: false};
  } catch {
    return {available: false, version: currentVersion, changes: [], error: true};
  }
}

export function activateWaitingWorker(registration, windowLike = globalThis.window) {
  if (!registration?.waiting) return false;
  let reloaded = false;
  const onControllerChange = () => {
    if (reloaded) return;
    reloaded = true;
    windowLike?.location?.reload?.();
  };
  windowLike?.addEventListener?.('controllerchange', onControllerChange, {once: true});
  registration.waiting.postMessage({type: 'SKIP_WAITING'});
  return true;
}

export async function registerPwa({navigator = globalThis.navigator, window = globalThis.window, fetch = globalThis.fetch, currentVersion = '0.0.0', onUpdate = () => {}} = {}) {
  const serviceWorker = navigator?.serviceWorker;
  const registration = serviceWorker?.register ? await serviceWorker.register('/sw.js') : null;
  const checkNow = async () => {
    const result = await checkPublishedVersion({fetch, currentVersion});
    if (result.available) onUpdate(result);
    return result;
  };
  window?.addEventListener?.('focus', checkNow);
  registration?.addEventListener?.('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener?.('statechange', () => {
      if (worker.state === 'installed' && serviceWorker.controller) onUpdate({available: true, version: currentVersion, changes: [], waiting: registration.waiting});
    });
  });
  await checkNow();
  return {registration, checkNow, applyUpdate: () => activateWaitingWorker(registration, window)};
}
