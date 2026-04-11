import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AlertWithId, calculateDistance } from './alerts';

/**
 * Start tracking volunteer location via watchPosition every 5 minutes
 */
export function startVolunteerTracking(userId: string): () => void {
  let watchId: number | null = null;
  let lastUpdateTime = 0;
  const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms

  if (!navigator.geolocation) {
    console.error('Geolocation not supported');
    return () => {};
  }

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const now = Date.now();
      // Only update if 5 minutes have passed
      if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            lastLocationUpdate: serverTimestamp(),
          });
          lastUpdateTime = now;
        } catch (error) {
          console.error('Failed to update volunteer location:', error);
        }
      }
    },
    (error) => {
      console.error('Geolocation error:', error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    }
  );

  // Return unwatch function
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}

/**
 * Get current user location as a promise
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export interface NearbyVolunteer {
  id: string;
  name: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  distance: number; // in meters
}

/**
 * Get nearby available volunteers sorted by distance
 */
export function subscribeToNearbyVolunteers(
  victimLat: number,
  victimLng: number,
  radiusKm: number = 2,
  callback: (volunteers: NearbyVolunteer[]) => void
): () => void {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'volunteer'),
    where('availableForRescue', '==', true)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const volunteers: NearbyVolunteer[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      if (data.latitude && data.longitude) {
        const distanceKm = calculateDistance(
          victimLat,
          victimLng,
          data.latitude,
          data.longitude
        );

        if (distanceKm <= radiusKm) {
          volunteers.push({
            id: doc.id,
            name: data.name,
            phoneNumber: data.phoneNumber,
            latitude: data.latitude,
            longitude: data.longitude,
            distance: distanceKm * 1000, // Convert to meters
          });
        }
      }
    });

    // Sort by distance
    volunteers.sort((a, b) => a.distance - b.distance);
    callback(volunteers);
  });

  return unsubscribe;
}

/**
 * Reverse geocode coordinates to get city name
 * Uses OpenStreetMap Nominatim API (free, no key required)
 */
export async function getCityFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) throw new Error('Reverse geocoding failed');

    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown Location';
  }
}
