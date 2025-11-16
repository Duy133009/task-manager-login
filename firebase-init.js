// Firebase Initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Make available globally
window.firebaseApp = initializeApp;
window.firebaseAuth = getAuth;
window.GoogleAuthProvider = GoogleAuthProvider;

