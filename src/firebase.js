// // src/firebase.js
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "AIzaSyDL9LF-rYowN5V2jWlr5eHWiDltGlfwRz8",
//   authDomain: "placeverse-2a2d4.firebaseapp.com",
//   projectId: "placeverse-2a2d4",
// };

// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);


//mere se phle wala firebase.js

// src/firebase.js
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";

// // Your Firebase config
// const firebaseConfig = {
//   apiKey: "AIzaSyDL9LF-rYowN5V2jWlr5eHWiDltGlfwRz8",
//   authDomain: "placeverse-2a2d4.firebaseapp.com",
//   projectId: "placeverse-2a2d4",
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);

// // Export services
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);


// src/firebase.js



//firebase.js done by mridul gupat
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (from Firebase Console → Project settings)
const firebaseConfig = {
  apiKey: "AIzaSyDL9LF-rYowN5V2jWlr5eHWiDltGlfwRz8",
  authDomain: "placeverse-2a2d4.firebaseapp.com",
  projectId: "placeverse-2a2d4",
  // If you later enable storage, add this:
  // storageBucket: "placeverse-2a2d4.appspot.com",
  // messagingSenderId: "YOUR_MESSAGING_ID",
  // appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
