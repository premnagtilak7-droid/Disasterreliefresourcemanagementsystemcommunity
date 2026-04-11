import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserRole } from "@/components/AuthSystem";

export interface UserDocument {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: ReturnType<typeof serverTimestamp>;
}

/**
 * Register a new user with Firebase Auth and create their Firestore document
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<UserDocument> {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const { uid } = userCredential.user;

    // Create user document in Firestore
    const userDoc: UserDocument = {
      uid,
      email,
      name,
      role,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", uid), userDoc);
    console.log("USER REGISTERED SUCCESSFULLY");

    // If registering as volunteer, also add to volunteers collection
    if (role === "volunteer") {
      await setDoc(doc(db, "volunteers", uid), {
        uid,
        email,
        name,
        status: "active",
        createdAt: serverTimestamp(),
      });
    }

    return userDoc;
  } catch (error: unknown) {
    console.error("Error registering user:", error);
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    throw new Error(errorMessage);
  }
}

/**
 * Sign in an existing user and fetch their role from Firestore
 */
export async function loginUser(
  email: string,
  password: string
): Promise<UserDocument> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const { uid } = userCredential.user;

    // Fetch user document from Firestore
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error("User profile not found. Please contact support.");
    }

    const userData = userDocSnap.data() as UserDocument;
    console.log("USER LOGGED IN SUCCESSFULLY");
    return userData;
  } catch (error: unknown) {
    console.error("Error logging in:", error);
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    throw new Error(errorMessage);
  }
}

/**
 * Sign out the current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    console.log("USER LOGGED OUT SUCCESSFULLY");
  } catch (error) {
    console.error("Error logging out:", error);
    throw new Error("Failed to log out.");
  }
}

/**
 * Get current Firebase Auth user
 */
export function getCurrentAuthUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get user document by UID
 */
export async function getUserByUid(uid: string): Promise<UserDocument | null> {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return null;
    }

    return userDocSnap.data() as UserDocument;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Get count of users by role
 */
export async function getUserCountByRole(role: UserRole): Promise<number> {
  try {
    const q = query(collection(db, "users"), where("role", "==", role));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

/**
 * Get total user count
 */
export async function getTotalUserCount(): Promise<number> {
  try {
    const q = query(collection(db, "users"));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch {
    return 0;
  }
}
