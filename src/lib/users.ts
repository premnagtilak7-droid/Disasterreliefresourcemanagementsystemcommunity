import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
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
  photoURL?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  availableForRescue?: boolean;
  lastLocationUpdate?: ReturnType<typeof serverTimestamp>;
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
    
    // Handle specific Firebase Auth error codes
    const firebaseError = error as { code?: string; message?: string };
    
    if (firebaseError.code === 'auth/invalid-credential') {
      throw new Error("Invalid email or password. Please check your credentials and try again.");
    }
    
    if (firebaseError.code === 'auth/user-not-found') {
      throw new Error("No account found with this email. Please sign up first.");
    }
    
    if (firebaseError.code === 'auth/wrong-password') {
      throw new Error("Incorrect password. Please try again or reset your password.");
    }
    
    if (firebaseError.code === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. Please try again later or reset your password.");
    }
    
    if (firebaseError.code === 'auth/user-disabled') {
      throw new Error("This account has been disabled. Please contact support.");
    }
    
    if (firebaseError.code === 'auth/invalid-email') {
      throw new Error("Invalid email address format.");
    }
    
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    throw new Error(errorMessage);
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(role: UserRole = 'victim'): Promise<UserDocument> {
  console.log("[v0] Starting Google sign-in with role:", role);
  console.log("[v0] Auth domain:", auth.app.options.authDomain);
  
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  
  return signInWithPopup(auth, provider)
    .then(async (result) => {
      console.log("[v0] Google sign-in successful, user:", result.user.email);
      const { uid, email, displayName, photoURL } = result.user;

      // Check if user already exists in Firestore
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        console.log("[v0] Existing user found in Firestore");
        return userDocSnap.data() as UserDocument;
      }

      // Create new user document with photoURL
      console.log("[v0] Creating new user document for:", displayName);
      const userDoc: UserDocument = {
        uid,
        email: email || '',
        name: displayName || 'User',
        role,
        photoURL: photoURL || '',
        createdAt: serverTimestamp(),
      };

      await setDoc(userDocRef, userDoc);
      console.log("[v0] GOOGLE USER REGISTERED SUCCESSFULLY");

      // If registering as volunteer, also add to volunteers collection
      if (role === "volunteer") {
        await setDoc(doc(db, "volunteers", uid), {
          uid,
          email: email || '',
          name: displayName || 'User',
          photoURL: photoURL || '',
          status: "active",
          createdAt: serverTimestamp(),
        });
      }

      return userDoc;
    })
    .catch((error) => {
      // Detailed error logging for debugging
      console.error("[v0] Google sign-in error code:", error.code);
      console.error("[v0] Google sign-in error message:", error.message);
      console.error("[v0] Full error object:", error);
      
      // Check for specific error types
      if (error.code === 'auth/unauthorized-domain') {
        console.error("[v0] UNAUTHORIZED DOMAIN - Add this domain to Firebase Console > Authentication > Settings > Authorized domains");
        console.error("[v0] Current domain:", window.location.hostname);
        throw new Error(`Domain not authorized: ${window.location.hostname}. Add it to Firebase Console > Authentication > Authorized domains`);
      }
      
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled');
      }
      
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      throw new Error(error.message || "Google sign-in failed");
    });
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    console.log("[v0] Attempting to send password reset email to:", email);
    
    // Configure action code settings for the reset email
    const actionCodeSettings = {
      url: window.location.origin + '/login',
      handleCodeInApp: false,
    };
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    console.log("[v0] PASSWORD RESET EMAIL SENT SUCCESSFULLY to:", email);
  } catch (error: unknown) {
    console.error("[v0] Error sending reset email:", error);
    
    const firebaseError = error as { code?: string; message?: string };
    console.error("[v0] Firebase error code:", firebaseError.code);
    
    // Handle specific Firebase Auth error codes
    if (firebaseError.code === 'auth/user-not-found') {
      // For security, we still show success message but log the issue
      console.log("[v0] No user found with this email, but showing success for security");
      return; // Don't throw error - show success message anyway for security
    }
    
    if (firebaseError.code === 'auth/invalid-email') {
      throw new Error("Invalid email address format. Please check and try again.");
    }
    
    if (firebaseError.code === 'auth/too-many-requests') {
      throw new Error("Too many password reset attempts. Please try again later.");
    }
    
    if (firebaseError.code === 'auth/network-request-failed') {
      throw new Error("Network error. Please check your internet connection and try again.");
    }
    
    if (firebaseError.code === 'auth/invalid-api-key') {
      throw new Error("Configuration error. Please contact support.");
    }
    
    const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
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
