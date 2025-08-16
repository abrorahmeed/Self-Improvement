import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
const GOALS_PER_MONTH = 5; // number of random goals per month

function getCurrentMonthKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}`; // e.g., "2025-8"
}

// Logout function
window.logout = function() {
  signOut(auth);
};

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserEmail = user.email;
    document.getElementById("monthlyPage").style.display = "block";
    document.getElementById("monthlyMonthTitle").innerText = `Monthly Challenge: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    await loadMonthlyGoals();
  } else {
    window.location.href = "index.html"; // redirect to main page if not logged in
  }
});

// Load or generate monthly goals
async function loadMonthlyGoals() {
  const monthKey = getCurrentMonthKey();
  const monthlyRef = collection(db, "monthlyGoals");

  // Check if goals already exist for this month
  const q = query(monthlyRef, where("monthKey", "==", monthKey));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Generate new goals
    const shuffled = monthlyGoalList.sort(() => 0.5 - Math.random());
    const goalsToAdd = shuffled.slice(0, GOALS_PER_MONTH);

    for (let goalText of goalsToAdd) {
      await addDoc(monthlyRef, {
        text: goalText,
        monthKey: monthKey,
        completedBy: "",  // empty until someone completes
        createdAt: Date.now()
      });
    }
    // Reload after creating
    return loadMonthlyGoals();
  }

  // Display goals
  displayGoals(snapshot.docs);
}

// Display goals in DOM
function displayGoals(goalDocs) {
  const container = document.getElementById("monthlyGoalsContainer");
  container.innerHTML = ""; // clear previous

  let myCompleted = 0;
  let broCompleted = 0;

  goalDocs.forEach((docSnap) => {
    const goal = docSnap.data();
    const goalDiv = document.createElement("div");
    goalDiv.classList.add("monthly-goal-card");

    const goalText = document.createElement("p");
    goalText.textContent = goal.text;
    goalDiv.appendChild(goalText);

    const completedBtn = document.createElement("button");
    completedBtn.textContent = goal.completedBy ? "Completed ✅" : "Mark Completed";
    completedBtn.disabled = !!goal.completedBy;

    completedBtn.onclick = async () => {
      if (confirm("Are you sure you want to mark this goal as completed? This cannot be undone.")) {
        await updateDoc(doc(db, "monthlyGoals", docSnap.id), { completedBy: currentUserEmail });
        loadMonthlyGoals(); // refresh display
      }
    };

    goalDiv.appendChild(completedBtn);
    container.appendChild(goalDiv);

    // Count completed
    if (goal.completedBy === currentUserEmail) myCompleted++;
    if (goal.completedBy && goal.completedBy !== currentUserEmail) broCompleted++;
  });

  // Update progress bars
  const myPercent = Math.round((myCompleted / GOALS_PER_MONTH) * 100);
  const broPercent = Math.round((broCompleted / GOALS_PER_MONTH) * 100);

  document.getElementById("myProgress").innerText = `My Completion: ${myPercent}%`;
  document.getElementById("broProgress").innerText = `Brother's Completion: ${broPercent}%`;

  // Leaderboard
  const leaderboard = document.getElementById("leaderboard");
  leaderboard.innerHTML = "";
  // Sort by completion time
  const completedGoals = goalDocs.filter(g => g.data().completedBy);
  completedGoals.sort((a, b) => a.data().createdAt - b.data().createdAt);

  completedGoals.forEach((g, index) => {
    const item = document.createElement("p");
    item.textContent = `${index + 1}. ${g.data().completedBy} -> ${g.data().text}`;
    leaderboard.appendChild(item);
  });
}
