import { syncAuth } from './slices/authSlice';

export const remoteRefreshEvents = [
  'account-changed',
  'learning-data-changed',
  'focus',
];
const events = [
  ...remoteRefreshEvents,
  'admin-data-changed',
  'notifications-changed',
  'local-storage-sync',
  'storage',
];
const subscribers = new Map(events.map((event) => [event, new Set()]));

export function subscribeToStoreEvents(eventNames, listener) {
  eventNames.forEach((name) => subscribers.get(name).add(listener));
  return () =>
    eventNames.forEach((name) => subscribers.get(name).delete(listener));
}

export function registerStoreListeners(store) {
  const handle = (event) => {
    store.dispatch(syncAuth());
    subscribers.get(event.type).forEach((listener) => listener());
  };
  events.forEach((event) => window.addEventListener(event, handle));
  return () =>
    events.forEach((event) => window.removeEventListener(event, handle));
}
