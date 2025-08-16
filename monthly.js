import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC2GJ2B6zpaw6RVlIcpSIWO1XeUiuDDKnM",
  authDomain: "selfimprovementda.firebaseapp.com",
  projectId: "selfimprovementda",
  storageBucket: "selfimprovementda.firebasestorage.app",
  messagingSenderId: "227863604727",
  appId: "1:227863604727:web:30b6a7067957ca6f13d2f2"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserEmail = "";
const monthlyGoalList = [
  "Read 1 book",
  "Do 2000 push-ups",
  "Run 50 km",
  "Do 100 pull-ups",
  "Meditate 20 days",
  "Write journal 15 times",
  "Cook 10 healthy meals",
  "No sugar for 15 days",
  "Learn 10 new words daily",
  "Do 30 min workout daily"
];
const GOALS_PER_MONTH = 5;

// Helpers
function getCurrentMonthKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}`;
}

// Logout
window.logout = () => signOut(auth);

// Auth check
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserEmail = user.email;
    document.getElementById("monthlyPage").style.display = "block";
    document.getElementById("monthlyMonthTitle").innerText = `Monthly Challenge: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    await loadMonthlyGoals();
  } else {
    window.location.href = "index.html";
  }
});

// Load or generate goals
async function loadMonthlyGoals() {
  const monthKey = getCurrentMonthKey();
  const monthlyRef = collection(db, "monthlyGoals");

  const q = query(monthlyRef, where("monthKey", "==", monthKey));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    const shuffled = monthlyGoalList.sort(() => 0.5 - Math.random());
    const goalsToAdd = shuffled.slice(0, GOALS_PER_MONTH);

    for (let goalText of goalsToAdd) {
      await addDoc(monthlyRef, {
        text: goalText,
        monthKey: monthKey,
        completedBy: "",
        createdAt: Date.now()
      });
    }
    return loadMonthlyGoals();
  }

  displayGoals(snapshot.docs);
}

// Display goals
function displayGoals(goalDocs) {
  const container = document.getElementById("monthlyGoalsContainer");
  container.innerHTML = "";

  let myCompleted = 0;
  let broCompleted = 0;

  goalDocs.forEach((docSnap) => {
    const goal = docSnap.data();

    // Container
    const goalDiv = document.createElement("div");
    goalDiv.classList.add("monthly-goal-card");

    const contentWrapper = document.createElement("div");
    contentWrapper.style.display = "flex";
    contentWrapper.style.justifyContent = "space-between";
    contentWrapper.style.alignItems = "center";
    contentWrapper.style.width = "100%";

    const goalText = document.createElement("p");
    goalText.textContent = goal.text;
    contentWrapper.appendChild(goalText);

    const completedBtn = document.createElement("button");
    completedBtn.textContent = goal.completedBy ? "Completed ✅" : "Mark Completed";
    completedBtn.disabled = !!goal
