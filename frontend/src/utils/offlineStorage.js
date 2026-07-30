/**
 * offlineStorage.js
 * Offline-first caching, queuing, and background sync manager for LETOHFA Booking.
 */

const BOOKINGS_CACHE_KEY = 'letohfa_cached_bookings';
const OFFLINE_QUEUE_KEY  = 'letohfa_offline_queue';

/**
 * Cache current bookings from MongoDB Atlas to localStorage
 */
export const saveCachedBookings = (bookings) => {
  try {
    if (Array.isArray(bookings)) {
      localStorage.setItem(BOOKINGS_CACHE_KEY, JSON.stringify(bookings));
    }
  } catch (e) {
    console.warn('Failed to cache bookings locally:', e);
  }
};

/**
 * Get cached bookings from localStorage
 */
export const getCachedBookings = () => {
  try {
    const data = localStorage.getItem(BOOKINGS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Get pending offline bookings queue
 */
export const getOfflinePendingQueue = () => {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Add a new booking to the offline pending queue
 */
export const addOfflineBooking = (bookingData) => {
  try {
    const queue = getOfflinePendingQueue();
    const tempBooking = {
      ...bookingData,
      _id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isOfflinePending: true,
      createdAt: new Date().toISOString(),
    };
    queue.push(tempBooking);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

    // Also update cached bookings so calendar immediately reflects the block offline
    const cached = getCachedBookings();
    cached.push(tempBooking);
    saveCachedBookings(cached);

    return tempBooking;
  } catch (e) {
    console.error('Failed to add offline booking:', e);
    return null;
  }
};

/**
 * Clear the offline queue
 */
export const clearOfflinePendingQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

/**
 * Sync offline pending queue to MongoDB Atlas when back online
 */
export const syncOfflineBookings = async (axiosInstance, toast) => {
  const queue = getOfflinePendingQueue();
  if (!queue || queue.length === 0) return 0;

  let syncedCount = 0;
  const remainingQueue = [];

  for (const item of queue) {
    try {
      // Strip temporary offline IDs and flags before sending to backend
      const { _id, isOfflinePending, ...payload } = item;
      await axiosInstance.post('/api/bookings', payload);
      syncedCount++;
    } catch (err) {
      console.error('Failed to sync offline item:', item, err);
      remainingQueue.push(item);
    }
  }

  if (remainingQueue.length > 0) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } else {
    clearOfflinePendingQueue();
  }

  if (syncedCount > 0 && toast) {
    toast.success(`📶 Auto-Synced ${syncedCount} offline booking(s) to cloud!`);
  }

  return syncedCount;
};
