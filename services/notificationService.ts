
import { AppSettings } from '../types';

/**
 * Notification Service
 * Manages browser Push Notification permissions and local alerts.
 */

export const notificationService = {
  /**
   * Request permission from the browser
   */
  requestPermission: async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  },

  /**
   * Check current permission status
   */
  getPermissionStatus: (): NotificationPermission => {
    return 'Notification' in window ? Notification.permission : 'denied';
  },

  /**
   * Show a local notification (standard browser alert)
   */
  showLocalNotification: async (title: string, options: NotificationOptions = {}) => {
    const permission = Notification.permission;
    
    if (permission !== 'granted') return;

    // Default options for PingSpace aesthetics
    // Fixed: Cast defaultOptions to any to allow properties like 'vibrate' and 'badge' 
    // which are valid for ServiceWorker.showNotification but often missing in standard NotificationOptions TS definitions.
    const defaultOptions: any = {
      icon: 'https://ui-avatars.com/api/?name=PS&background=ff1744&color=fff&size=192',
      badge: 'https://ui-avatars.com/api/?name=PS&background=ff1744&color=fff&size=96',
      vibrate: [200, 100, 200],
      ...options
    };

    // If app is in background, use Service Worker to show notification
    if (document.visibilityState === 'hidden') {
      const registration = await navigator.serviceWorker.ready;
      return registration.showNotification(title, defaultOptions);
    }

    // If app is in foreground, standard Notification is fine
    return new Notification(title, defaultOptions);
  }
};
