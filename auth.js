import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxf-nLMbKxq392qVtfF8BYSOi0ZqvdgWQ",
  authDomain: "matrixflowai.firebaseapp.com",
  projectId: "matrixflowai",
  storageBucket: "matrixflowai.firebasestorage.app",
  messagingSenderId: "159438327689",
  appId: "1:159438327689:web:a484896dea10d8e2689b58",
  measurementId: "G-PTL1Z3ZM5D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const friendlyError = (code) => {
  const map = {
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Use a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/unauthorized-domain": "This domain is not authorized in Firebase yet."
  };
  return map[code] || "Something went wrong. Please try again.";
};

const messageBox = document.getElementById("authMessage");
function showMessage(text, ok=false) {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = ok ? "auth-message success" : "auth-message error";
  messageBox.hidden = false;
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = signupForm.querySelector("button[type=submit]");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password !== confirm) {
      showMessage("Passwords do not match.");
      return;
    }

    button.disabled = true;
    button.textContent = "Creating account...";
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      showMessage(friendlyError(err.code));
      button.disabled = false;
      button.textContent = "Create Account →";
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = loginForm.querySelector("button[type=submit]");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    button.disabled = true;
    button.textContent = "Signing in...";
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      showMessage(friendlyError(err.code));
      button.disabled = false;
      button.textContent = "Sign In →";
    }
  });
}

const resetBtn = document.getElementById("resetPassword");
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) {
      showMessage("Enter your email first, then tap Forgot password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Password reset email sent. Check your inbox.", true);
    } catch (err) {
      showMessage(friendlyError(err.code));
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

if (document.body.dataset.protected === "true") {
  onAuthStateChanged(auth, (user) => {
    const gate = document.getElementById("authGate");
    const appContent = document.getElementById("appContent");
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    const emailEl = document.getElementById("userEmail");
    if (emailEl) emailEl.textContent = user.email || "Signed-in user";
    if (gate) {
      gate.hidden = true;
      gate.style.display = "none";
      gate.remove();
    }
    if (appContent) {
      appContent.hidden = false;
      appContent.style.display = "block";
    }
  });
}

if (document.body.dataset.redirectIfSignedIn === "true") {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "dashboard.html";
  });
}
