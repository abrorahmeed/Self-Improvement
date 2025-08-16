import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction, collection, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ===== Firebase (same project) ===== */
const firebaseConfig = {
  apiKey: "AIzaSyC2GJ2B6zpaw6RVlIcpSIWO1XeUiuDDKnM",
  authDomain: "selfimprovementda.firebaseapp.com",
  projectId: "selfimprovementda",
  storageBucket: "selfimprovementda.firebasestorage.app",
  messagingSenderId: "227863604727",
  appId: "1:227863604727:web:30b6a7067957ca6f13d2f2"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===== Always Dark Mode ===== */
document.body.classList.add("dark-mode");

/* ===== Helpers ===== */
function getMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // e.g., 2025-08
}
function endOfMonthDate(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function fmtDate(d) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/* ===== Task Pool (system picks 3 at random each month if none set) ===== */
const TASK_POOL = [
  { id: "book1", title: "Read 1 book", target: 1, unit: "book", step: 1 },
  { id: "pushups2k", title: "Do 2,000 push-ups", target: 2000, unit: "reps", step: 10 },
  { id: "run50k", title: "Run 50 km", target: 50, unit: "km", step: 1 },
  { id: "meditate600", title: "Meditate 600 minutes", target: 600, unit: "min", step: 5 },
  { id: "water20", title: "Drink 2L water for 20 days", target: 20, unit: "days", step: 1 },
  { id: "steps150k", title: "Walk 150,000 steps", target: 150000, unit: "steps", step: 500 },
  { id: "coding20h", title: "Code for 20 hours", target: 1200, unit: "min", step: 10 },
  { id: "journaling20", title: "Journal for 20 days", target: 20, unit: "days", step: 1 },
];

/* ===== DOM ===== */
const monthTitle = document.getElementById("monthTitle");
const statusPill = document.getElementById("statusPill");
const deadlineText = document.getElementById("deadlineText");
const tasksList = document.getElementById("tasksList");
const yourProgress = document.getElementById("yourProgress");
const leaderboard = document.getElementById("leaderboard");

window.logout = () => signOut(auth);

/* ===== Auth Gate ===== */
let currentUser = null;
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // send to main login if not authenticated
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await initMonthly();
});

/* ===== Initialize Monthly Challenge ===== */
async function initMonthly() {
  const key = getMonthKey();
  monthTitle.textContent = `Monthly Challenge — ${fmtMonthTitle(new Date())}`;

  const challengeRef = doc(db, "monthlyGoals", key);
  const snap = await getDoc(challengeRef);

  if (!snap.exists()) {
    // Create challenge for this month (first visitor creates it)
    const tasks = pickRandomTasks(TASK_POOL, 3);
    const endsAt = endOfMonthDate();

    await setDoc(challengeRef, {
      monthKey: key,
      createdAt: Date.now(),
      endsAt: endsAt.getTime(),
      tasks,                 // array of {id, title, target, unit, step}
      winnerEmail: null,
      winnerAt: null
    });
  }

  // Subscribe to challenge doc & progress/leaderboard
  subscribeChallenge(challengeRef);
  subscribeLeaderboard(challengeRef);
  ensureUserProgressDoc();
}

function fmtMonthTitle(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); // e.g., August 2025
}

function pickRandomTasks(pool, count) {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/* ===== Subscriptions ===== */
function subscribeChallenge(challengeRef) {
  onSnapshot(challengeRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();

    // Header status
    const end = new Date(data.endsAt);
    deadlineText.textContent = `Complete by ${fmtDate(end)} • First finisher wins 🏆`;
    statusPill.textContent = data.winnerEmail
      ? `Winner: ${data.winnerEmail}`
      : `Open until ${fmtDate(end)}`;

    // Render tasks UI
    renderTasks(data.tasks);
    // Render "your" progress area based on current snapshot + your progress
    renderYourProgress(data.tasks);
  });
}

function subscribeLeaderboard(challengeRef) {
  const progressCol = collection(challengeRef, "progress");
  onSnapshot(progressCol, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    // Sort: completed first by completedAt asc, then by totalPercent desc
    items.sort((a, b) => {
      if (!!a.completed !== !!b.completed) return a.completed ? -1 : 1;
      if (a.completed && b.completed) return (a.completedAt || 0) - (b.completedAt || 0);
      return (b.totalPercent || 0) - (a.totalPercent || 0);
    });
    renderLeaderboard(items);
  });
}

/* ===== Rendering ===== */
function renderTasks(tasks) {
  tasksList.innerHTML = "";
  tasks.forEach((t) => {
    const li = document.createElement("li");

    const left = document.createElement("div");
    left.style.flex = "1";
    left.innerHTML = `<strong>${t.title}</strong><br><span class="muted">Target: ${t.target} ${t.unit}</span>`;

    const right = document.createElement("div");
    right.className = "actions row";
    right.innerHTML = `
      <button class="mini" data-step="${t.step}" data-id="${t.id}">+${t.step}</button>
      <button class="mini" data-step="${t.step * 5}" data-id="${t.id}">+${t.step * 5}</button>
      <button class="mini" data-step="-${t.step}" data-id="${t.id}">-${t.step}</button>
    `;

    li.appendChild(left);
    li.appendChild(right);
    tasksList.appendChild(li);
  });

  // Attach handlers
  tasksList.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const taskId = btn.getAttribute("data-id");
      const delta = parseInt(btn.getAttribute("data-step"), 10);
      incrementProgress(taskId, delta);
    });
  });
}

async function renderYourProgress(tasks) {
  const key = getMonthKey();
  const progressRef = doc(db, "monthlyGoals", key, "progress", currentUser.uid);
  const snap = await getDoc(progressRef);
  const prog = snap.exists() ? snap.data() : { taskProgress: {} };

  yourProgress.innerHTML = "";
  let totalPercent = 0;

  tasks.forEach((t) => {
    const cur = Math.max(0, Math.min(t.target, Number(prog.taskProgress?.[t.id] || 0)));
    const pct = Math.round((cur / t.target) * 100) || 0;
    totalPercent += pct;

    const wrap = document.createElement("div");
    wrap.style.marginBottom = "12px";
    wrap.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div><strong>${t.title}</strong></div>
        <div class="muted">${cur}/${t.target} ${t.unit} • ${pct}%</div>
      </div>
      <div class="progress"><div class="bar" style="width:${pct}%;"></div></div>
    `;
    yourProgress.appendChild(wrap);
  });

  if (tasks.length) {
    const avg = Math.round(totalPercent / tasks.length);
    const sumDiv = document.createElement("div");
    sumDiv.className = "muted";
    sumDiv.style.marginTop = "8px";
    sumDiv.textContent = `Overall progress: ${avg}%`;
    yourProgress.appendChild(sumDiv);
  }
}

function renderLeaderboard(items) {
  leaderboard.innerHTML = "";
  if (!items.length) {
    leaderboard.innerHTML = `<div class="muted">No one joined yet. Be the first!</div>`;
    return;
  }

  items.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "leader-row" + (p.completed ? " win" : "");
    const name = p.email || "Anonymous";
    const percent = Math.round(p.totalPercent || 0);

    const left = document.createElement("div");
    left.innerHTML = `<strong>${idx + 1}. ${name}</strong>`;

    const right = document.createElement("div");
    right.className = "muted";
    right.textContent = p.completed
      ? `Completed at ${new Date(p.completedAt).toLocaleString()}`
      : `${percent}%`;

    row.appendChild(left);
    row.appendChild(right);
    leaderboard.appendChild(row);
  });
}

/* ===== Progress Logic ===== */
async function ensureUserProgressDoc() {
  const key = getMonthKey();
  const ref = doc(db, "monthlyGoals", key, "progress", currentUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: currentUser.email || "",
      displayName: currentUser.displayName || "",
      taskProgress: {}, // { [taskId]: number }
      totalPercent: 0,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
}

async function incrementProgress(taskId, delta) {
  const key = getMonthKey();
  const challengeRef = doc(db, "monthlyGoals", key);
  const userProgRef = doc(db, "monthlyGoals", key, "progress", currentUser.uid);

  await runTransaction(db, async (tx) => {
    const challengeSnap = await tx.get(challengeRef);
    const userSnap = await tx.get(userProgRef);
    if (!challengeSnap.exists()) throw new Error("Challenge not found");

    const challenge = challengeSnap.data();
    const tasks = challenge.tasks || [];
    const targetById = Object.fromEntries(tasks.map(t => [t.id, t.target]));

    const data = userSnap.exists() ? userSnap.data() : {
      email: currentUser.email || "",
      displayName: currentUser.displayName || "",
      taskProgress: {},
      totalPercent: 0,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const cur = Number(data.taskProgress?.[taskId] || 0);
    const target = Number(targetById[taskId] || 0);
    if (!target) return; // invalid taskId for this month

    // Update single task progress clamped to [0, target]
    const next = Math.max(0, Math.min(target, cur + delta));
    data.taskProgress = { ...(data.taskProgress || {}), [taskId]: next };

    // Recompute total percentage (average across tasks)
    let totalPct = 0;
    tasks.forEach(t => {
      const v = Number(data.taskProgress[t.id] || 0);
      totalPct += (v / t.target) * 100;
    });
    const avgPct = Math.round(totalPct / (tasks.length || 1));
    data.totalPercent = avgPct;
    data.updatedAt = Date.now();

    // Check completion
    const completedNow = tasks.every(t => Number(data.taskProgress[t.id] || 0) >= Number(t.target));
    if (completedNow && !data.completed) {
      data.completed = true;
      data.completedAt = Date.now();

      // Try to set winner if none yet
      const curWinner = challenge.winnerEmail || null;
      if (!curWinner) {
        tx.update(challengeRef, {
          winnerEmail: currentUser.email || "Unknown",
          winnerAt: Date.now()
        });
      }
    }

    if (userSnap.exists()) {
      tx.update(userProgRef, data);
    } else {
      tx.set(userProgRef, data);
    }
  });

  // Refresh your progress UI (reads latest values)
  const challengeSnap = await getDoc(doc(db, "monthlyGoals", key));
  if (challengeSnap.exists()) {
    renderYourProgress(challengeSnap.data().tasks || []);
  }
}
