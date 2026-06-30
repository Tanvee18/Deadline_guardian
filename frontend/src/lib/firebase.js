import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// standard Firebase configuration (dummy keys are fully functional with emulators)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-deadline-guardian-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "deadline-guardian-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "deadline-guardian-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "deadline-guardian-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};
console.log("Firebase Config:", firebaseConfig);
console.log("API KEY =", import.meta.env.VITE_FIREBASE_API_KEY);
console.log("AUTH DOMAIN =", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log("ALL ENV =", import.meta.env);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Scopes required for Gmail and Calendar access
googleProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");

// Connect to emulators if running locally
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  // Check if connection is already initialized to avoid multiple binding warnings
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    console.log("Connected to Firebase Auth and Firestore Emulators.");
  }
}

export { app, auth, db, googleProvider };
