export async function registerServiceWorker(): Promise<ServiceWorkerContainer | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      { scope: '/' }
    );
    console.log('✓ Service Worker registered');
    return registration;
  } catch (error) {
    console.error('Failed to register Service Worker:', error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('✓ Service Worker unregistered');
  } catch (error) {
    console.error('Failed to unregister Service Worker:', error);
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
