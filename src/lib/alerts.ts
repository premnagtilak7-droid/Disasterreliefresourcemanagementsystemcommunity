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
  getDocs,
  getDoc,
  deleteDoc
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
 * Subscribe to ALL alerts in real-time (for victim status page to see solved status instantly)
 * @param callback - Function called with updated alerts array
 * @returns Unsubscribe function
 */
export function subscribeToAllAlerts(
  callback: (alerts: AlertWithId[]) => void
): () => void {
  const alertsRef = collection(db, "alerts");

  const unsubscribe = onSnapshot(alertsRef, (snapshot) => {
    const alerts: AlertWithId[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SOSAlertDocument;
      alerts.push({ id: docSnap.id, ...data });
    });
    // Sort by createdAt descending (newest first)
    alerts.sort((a, b) => {
      const aTime = a.createdAt ? (a.createdAt as unknown as { seconds: number }).seconds : 0;
      const bTime = b.createdAt ? (b.createdAt as unknown as { seconds: number }).seconds : 0;
      return bTime - aTime;
    });
    callback(alerts);
  });

  return unsubscribe;
}

/**
 * Mark an alert as solved (for volunteer dashboard)
 * @param alertId - The document ID of the alert to mark as solved
 * @param resolverId - The UID of the volunteer resolving the alert
 */
export async function markAlertAsSolved(alertId: string, resolverId?: string): Promise<void> {
  try {
    const alertRef = doc(db, "alerts", alertId);
    await updateDoc(alertRef, {
      status: "solved",
      resolvedAt: serverTimestamp(),
      ...(resolverId && { resolverId }),
    });
    console.log("ALERT MARKED AS SOLVED");
  } catch (error) {
    console.error("Error marking alert as solved:", error);
    throw new Error("Failed to mark alert as solved.");
  }
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
 * Complete a mission and move it to rescue history
 * This archives the alert for the volunteer's portfolio and updates volunteer stats
 * 
 * DUAL-UPDATE LOGIC:
 * 1. Update Alert Document status to 'solved'
 * 2. Update Volunteer Profile (totalRescues, peopleHelped)
 * 3. Add record to rescueHistory sub-collection under volunteer UID
 */
export async function completeAndArchiveMission(
  alertId: string,
  volunteerId: string,
  volunteerName: string
): Promise<void> {
  try {
    // 1. Get the current alert data
    const alertRef = doc(db, "alerts", alertId);
    const alertSnapshot = await getDoc(alertRef);
    
    if (!alertSnapshot.exists()) {
      throw new Error("Alert not found");
    }
    
    const alertData = alertSnapshot.data();
    
    // Calculate people helped from alert data
    const peopleHelped = alertData.peopleCount ? parseInt(alertData.peopleCount) : 1;
    
    // 2. Update alert status to 'solved'
    await updateDoc(alertRef, {
      status: "solved",
      resolverId: volunteerId,
      resolverName: volunteerName,
      resolvedAt: serverTimestamp(),
    });
    
    // 3. Update or create volunteer profile in 'volunteers' collection
    const volunteerRef = doc(db, "volunteers", volunteerId);
    const volunteerSnapshot = await getDoc(volunteerRef);
    
    if (volunteerSnapshot.exists()) {
      // Increment existing stats
      const currentData = volunteerSnapshot.data();
      await updateDoc(volunteerRef, {
        totalRescues: (currentData.totalRescues || 0) + 1,
        peopleHelped: (currentData.peopleHelped || 0) + peopleHelped,
        lastRescueAt: serverTimestamp(),
      });
    } else {
      // Create new volunteer profile
      const { setDoc } = await import('firebase/firestore');
      await setDoc(volunteerRef, {
        name: volunteerName,
        totalRescues: 1,
        peopleHelped: peopleHelped,
        joinedAt: serverTimestamp(),
        lastRescueAt: serverTimestamp(),
      });
    }
    
    // 4. Add to volunteer's rescueHistory sub-collection
    await addDoc(collection(db, "volunteers", volunteerId, "rescueHistory"), {
      alertId: alertId,
      victimName: alertData.name || 'Unknown',
      victimPhone: alertData.phone || null,
      emergencyType: alertData.emergencyType || 'General',
      description: alertData.description || null,
      location: alertData.location || null,
      latitude: alertData.latitude || null,
      longitude: alertData.longitude || null,
      imageUrl: alertData.imageUrl || alertData.photoURL || null,
      peopleHelped: peopleHelped,
      resolvedAt: serverTimestamp(),
      visionAnalysis: alertData.visionAnalysis || null,
    });
    
    // 5. Also add to global rescue history collection for querying
    await addDoc(collection(db, "rescueHistory"), {
      ...alertData,
      status: "solved",
      resolverId: volunteerId,
      resolverName: volunteerName,
      resolvedAt: serverTimestamp(),
      originalAlertId: alertId,
    });
    
    console.log("MISSION COMPLETED AND ARCHIVED SUCCESSFULLY");
  } catch (error) {
    console.error("Error completing mission:", error);
    throw new Error("Failed to complete mission.");
  }
}

/**
 * Get volunteer profile stats
 */
export interface VolunteerProfile {
  name: string;
  totalRescues: number;
  peopleHelped: number;
  joinedAt?: ReturnType<typeof serverTimestamp>;
  lastRescueAt?: ReturnType<typeof serverTimestamp>;
}

export async function getVolunteerProfile(volunteerId: string): Promise<VolunteerProfile | null> {
  try {
    const volunteerRef = doc(db, "volunteers", volunteerId);
    const snapshot = await getDoc(volunteerRef);
    
    if (snapshot.exists()) {
      return snapshot.data() as VolunteerProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching volunteer profile:", error);
    return null;
  }
}

/**
 * Subscribe to volunteer's rescue history sub-collection in real-time
 */
export interface VolunteerRescueRecord {
  id: string;
  alertId: string;
  victimName: string;
  victimPhone?: string;
  emergencyType: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  peopleHelped: number;
  resolvedAt: ReturnType<typeof serverTimestamp>;
}

export function subscribeToVolunteerRescueHistory(
  volunteerId: string,
  callback: (history: VolunteerRescueRecord[]) => void
): () => void {
  const historyRef = collection(db, "volunteers", volunteerId, "rescueHistory");
  
  const unsubscribe = onSnapshot(historyRef, (snapshot) => {
    const history: VolunteerRescueRecord[] = [];
    snapshot.forEach((docSnap) => {
      history.push({ id: docSnap.id, ...docSnap.data() } as VolunteerRescueRecord);
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
 * Subscribe to volunteer profile stats in real-time
 */
export function subscribeToVolunteerProfile(
  volunteerId: string,
  callback: (profile: VolunteerProfile | null) => void
): () => void {
  const volunteerRef = doc(db, "volunteers", volunteerId);
  
  const unsubscribe = onSnapshot(volunteerRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as VolunteerProfile);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
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
