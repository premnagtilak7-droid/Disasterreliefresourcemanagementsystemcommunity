import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface SOSAlert {
  name: string;
  phone: string;
  location: string;
  emergencyType: string;
  description: string;
  latitude?: number;
  longitude?: number;
}

export interface SOSAlertDocument extends SOSAlert {
  status: "pending" | "acknowledged" | "resolved";
  createdAt: ReturnType<typeof serverTimestamp>;
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
    return docRef.id;
  } catch (error) {
    console.error("Error submitting SOS alert:", error);
    throw new Error("Failed to submit SOS alert. Please try again.");
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
