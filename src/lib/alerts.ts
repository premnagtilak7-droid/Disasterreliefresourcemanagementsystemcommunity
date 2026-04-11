import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getCountFromServer,
  getDocs 
} from "firebase/firestore";
import { db } from "./firebase";
import { triageAndUpdateAlert } from "./gemini";

export interface SOSAlert {
  name: string;
  phone: string;
  location: string;
  emergencyType: string;
  description: string;
  latitude?: number;
  longitude?: number;
  photoURL?: string | null;
  visionAnalysis?: {
    severity: number;
    primaryNeed: string;
    description: string;
    isFalseAlarm?: boolean;
  };
}

export interface SOSAlertDocument extends SOSAlert {
  status: "pending" | "acknowledged" | "resolved";
  createdAt: ReturnType<typeof serverTimestamp>;
  photoURL?: string | null;
  visionAnalysis?: {
    severity: number;
    primaryNeed: string;
    description: string;
    urgentDetails?: string;
    isFalseAlarm?: boolean;
    falseAlarmReason?: string;
  };
}

/**
 * Submits an SOS alert to the Firestore 'alerts' collection
 * @param alertData - The SOS alert data to submit
 * @returns The document ID of the created alert
 */
export async function submitSOS(alertData: SOSAlert): Promise<string> {
  try {
    const alertDocument: SOSAlertDocument = {
      ...alertData,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "alerts"), alertDocument);
    console.log("DATA SENT SUCCESSFULLY");
    
    // Trigger AI triage in background
    triageAndUpdateAlert(docRef.id, alertData.emergencyType, alertData.description);
    
    return docRef.id;
  } catch (error) {
    console.error("Error submitting SOS alert:", error);
    throw new Error("Failed to submit SOS alert. Please try again.");
  }
}

/**
 * Submit emergency one-tap SOS alert with GPS coordinates
 * No form required - immediate submission
 */
export async function submitEmergencySOS(
  userId: string,
  userName: string,
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const alertDocument = {
      name: userName,
      phone: "Emergency SOS",
      location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      emergencyType: "Urgent",
      description: "Emergency SOS - Immediate assistance required",
      latitude,
      longitude,
      status: "pending" as const,
      type: "Urgent",
      userId,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "alerts"), alertDocument);
    console.log("EMERGENCY SOS SENT SUCCESSFULLY");
    
    // Trigger AI triage in background
    triageAndUpdateAlert(docRef.id, "Urgent", "Emergency SOS - Immediate assistance required");
    
    return docRef.id;
  } catch (error) {
    console.error("Error submitting emergency SOS:", error);
    throw new Error("Failed to send emergency SOS. Please try again.");
  }
}

/**
 * Test Firebase connection by sending a random test document
 * @returns The document ID of the test document
 */
export async function testFirebaseConnection(): Promise<string> {
  try {
    const testDoc = {
      testId: `test_${Math.random().toString(36).substring(7)}`,
      message: "Firebase connection test",
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "alerts"), testDoc);
    console.log("DATA SENT SUCCESSFULLY");
    return docRef.id;
  } catch (error) {
    console.error("Error testing Firebase connection:", error);
    throw new Error("Failed to connect to Firebase.");
  }
}

/**
 * Extended alert document with ID for fetched data
 */
export interface AlertWithId extends SOSAlertDocument {
  id: string;
  resolverName?: string;
  resolverId?: string;
  resolvedAt?: ReturnType<typeof serverTimestamp>;
}

export interface RescueHistoryItem extends AlertWithId {
  originalAlertId: string;
}

/**
 * Subscribe to volunteer's rescue history in real-time
 */
export function subscribeToRescueHistory(
  volunteerId: string,
  callback: (history: RescueHistoryItem[]) => void
): () => void {
  const q = query(
    collection(db, "rescueHistory"),
    where("resolverId", "==", volunteerId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const history: RescueHistoryItem[] = [];
    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data(),
      } as RescueHistoryItem);
    });
    // Sort by resolvedAt descending (most recent first)
    history.sort((a, b) => {
      const aTime = a.resolvedAt ? (a.resolvedAt as unknown as { seconds: number }).seconds : 0;
      const bTime = b.resolvedAt ? (b.resolvedAt as unknown as { seconds: number }).seconds : 0;
      return bTime - aTime;
    });
    callback(history);
  });

  return unsubscribe;
}

/**
 * Subscribe to pending alerts in real-time
 * @param callback - Function called with updated alerts array
 * @returns Unsubscribe function
 */
export function subscribeToPendingAlerts(
  callback: (alerts: AlertWithId[]) => void
): () => void {
  const q = query(
    collection(db, "alerts"),
    where("status", "==", "pending")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const alerts: AlertWithId[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SOSAlertDocument;
      alerts.push({ id: docSnap.id, ...data });
    });
    callback(alerts);
  });

  return unsubscribe;
}

/**
 * Get count of pending alerts
 * @returns Count of pending requests
 */
export async function getPendingAlertsCount(): Promise<number> {
  const q = query(
    collection(db, "alerts"),
    where("status", "==", "pending")
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

/**
 * Get count of active volunteers (placeholder - returns from volunteers collection if exists)
 * For now returns a static number since volunteers collection may not exist
 */
export async function getActiveVolunteersCount(): Promise<number> {
  try {
    const q = query(collection(db, "volunteers"));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch {
    return 0; // Collection doesn't exist yet
  }
}

/**
 * Resolve an alert by updating its status
 * @param alertId - The document ID of the alert to resolve
 * @param resolverId - The UID of the volunteer/admin resolving the alert
 */
export async function resolveAlert(alertId: string, resolverId?: string): Promise<void> {
  try {
    const alertRef = doc(db, "alerts", alertId);
    await updateDoc(alertRef, {
      status: "resolved",
      resolvedAt: serverTimestamp(),
      ...(resolverId && { resolverId }),
    });
    console.log("ALERT RESOLVED SUCCESSFULLY");
  } catch (error) {
    console.error("Error resolving alert:", error);
    throw new Error("Failed to resolve alert.");
  }
}

/**
 * Get count of alerts resolved by a specific volunteer
 */
export async function getResolvedCountByVolunteer(volunteerId: string): Promise<number> {
  try {
    const q = query(
      collection(db, "alerts"),
      where("status", "==", "resolved"),
      where("resolverId", "==", volunteerId)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

/**
 * Calculate distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
