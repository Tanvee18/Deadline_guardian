import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, googleProvider } from "../lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // 1. Check if onboarding preferences exist
        const prefRef = doc(db, "user_preferences", firebaseUser.uid);
        try {
          const prefSnap = await getDoc(prefRef);
          setOnboarded(prefSnap.exists());
        } catch (e) {
          console.error("Error reading user preferences:", e);
          setOnboarded(false);
        }

        // 2. Ensure user document exists in 'users' collection
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "Developer User",
              email: firebaseUser.email,
              created_at: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error("Error updating user table:", e);
        }
      } else {
        setUser(null);
        setOnboarded(false);
        setGoogleToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // Sign in using popup (shows automatic mock selector in emulator, and standard Google login in production)
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        const token = credential.accessToken;
        setGoogleToken(token);
        // Save access token to user table for backend calls during current session
        await setDoc(doc(db, "users", result.user.uid), {
          google_access_token: token,
          updated_at: new Date().toISOString()
        }, { merge: true });
      }
      return result.user;
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    } finally {
      setUser(null);
      setOnboarded(false);
      setGoogleToken(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    onboarded,
    googleToken,
    loginWithGoogle,
    logout,
    setOnboarded
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
