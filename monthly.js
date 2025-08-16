import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config (use your existing config)
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

// Goals list (randomly choose from)
const goalList = [
  "Read 1 book",
  "Do 2000 push-ups",
  "Run 50 km",
  "Do 100 pull-ups",
  "Meditate daily",
  "Write journal every day",
  "No sugar for a week",
  "Learn 10 new words daily",
  "Sleep 8 hours daily",
  "No phone 1 hour daily"
];

// Randomly pick 5 goals
let monthlyGoals = [];
while (monthlyGoals.length < 5) {
  const rand = goalList[Math.floor(Math.random()*goalList.length)];
  if(!monthlyGoals.includes(rand)) monthlyGoals.push(rand);
}

// Auth state
onAuthStateChanged(auth, (user)=>{
  if(user){
    currentUserEmail = user.email;
    loadGoals();
  } else {
    window.location.href = "index.html"; // redirect if not logged in
  }
});

// Logout
window.logout = function(){
  signOut(auth);
};

// Load goals
function loadGoals(){
  const goalsContainer = document.getElementById("goalsContainer");
  goalsContainer.innerHTML = "";

  monthlyGoals.forEach(async (goal)=>{
    const docRef = await addDoc(collection(db, "monthlyGoals"), {
      text: goal,
      completedBy: "", // will store who completed first
      createdAt: Date.now()
    });

    const li = document.createElement("div");
    li.classList.add("goal-card");
    li.setAttribute("id", docRef.id);

    const p = document.createElement("p");
    p.textContent = goal;

    const btn = document.createElement("button");
    btn.textContent = "Completed";
    btn.onclick = async ()=>{
      if(confirm("Are you sure you want to mark this goal as completed? This cannot be undone.")){
        const goalDoc = doc(db, "monthlyGoals", docRef.id);
        await updateDoc(goalDoc, {completedBy: currentUserEmail});
      }
    };

    li.appendChild(p);
    li.appendChild(btn);
    goalsContainer.appendChild(li);
  });

  setupRealtimeListener();
}

// Realtime listener for updates
function setupRealtimeListener(){
  const q = query(collection(db,"monthlyGoals"));
  onSnapshot(q,(snapshot)=>{
    let completedCountMy = 0;
    let completedCountBro = 0;
    let leaderboardArray = [];

    snapshot.forEach((docSnap)=>{
      const data = docSnap.data();
      const card = document.getElementById(docSnap.id);
      if(card){
        if(data.completedBy){
          card.querySelector("button").disabled = true;
          card.querySelector("button").textContent = "Completed by "+data.completedBy;
        }
      }

      // count progress
      if(data.completedBy===currentUserEmail) completedCountMy++;
      else if(data.completedBy) completedCountBro++;

      // leaderboard
      if(data.completedBy) leaderboardArray.push({goal:data.text,user:data.completedBy, time:data.createdAt});
    });

    // update progress bars
    const myProgress = document.getElementById("myProgress");
    const broProgress = document.getElementById("broProgress");
    const total = monthlyGoals.length;
    myProgress.style.width = ((completedCountMy/total)*100)+"%";
    broProgress.style.width = ((completedCountBro/total)*100)+"%";

    // update leaderboard
    const lb = document.getElementById("leaderboard");
    lb.innerHTML = "";
    leaderboardArray.forEach(item=>{
      const li = document.createElement("li");
      li.textContent = item.user+" completed: "+item.goal;
      lb.appendChild(li);
    });
  });
           }
