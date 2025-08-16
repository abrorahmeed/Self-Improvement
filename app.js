import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ==== Firebase config ====
const firebaseConfig = {
  apiKey: "AIzaSyC2GJ2B6zpaw6RVlIcpSIWO1XeUiuDDKnM",
  authDomain: "selfimprovementda.firebaseapp.com",
  projectId: "selfimprovementda",
  storageBucket: "selfimprovementda.firebasestorage.app",
  messagingSenderId: "227863604727",
  appId: "1:227863604727:web:30b6a7067957ca6f13d2f2"
};

// ==== Init Firebase ====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserEmail = "";

// ==== Login ====
window.login = function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      document.getElementById("loginStatus").innerText = "";
    })
    .catch((error) => {
      document.getElementById("loginStatus").innerText = error.message;
    });
};

// ==== Logout ====
window.logout = function() {
  signOut(auth);
};

// ==== Auth state change ====
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserEmail = user.email;
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadTasks();
  } else {
    document.getElementById("loginPage").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});

// ==== Add task ====
// (keeps 'completed: false' for backward compatibility; it's no longer used)
window.addTask = async function () {
  const taskText = document.getElementById("newTask").value;
  if (taskText.trim() === "") return;
  await addDoc(collection(db, "tasks"), {
    text: taskText,
    completed: false, // legacy field, not used by UI anymore
    owner: currentUserEmail,
    createdAt: Date.now()
  });
  document.getElementById("newTask").value = "";
};

// ==== Load tasks ====
function loadTasks() {
  const q = query(collection(db, "tasks"));
  onSnapshot(q, (snapshot) => {
    const myTasksList = document.getElementById("myTasks");
    const broTasksList = document.getElementById("broTasks");
    myTasksList.innerHTML = "";
    broTasksList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const li = document.createElement("li");

      // Task text
      const span = document.createElement("span");
      span.textContent = task.text;

      // NEW: clicking a task asks to confirm and then deletes it
      span.onclick = () => markDoneAndDelete(docSnap.id);

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.innerHTML = "✏️";
      editBtn.classList.add("task-btn");
      editBtn.onclick = () => editTask(docSnap.id, task.text);

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.classList.add("task-btn");
      delBtn.onclick = () => deleteTask(docSnap.id);

      li.appendChild(span);

      if (task.owner === currentUserEmail) {
        li.appendChild(editBtn);
        li.appendChild(delBtn);
        myTasksList.appendChild(li);
      } else {
        broTasksList.appendChild(li);
      }
    });
  });
}

// ==== NEW: Mark done -> delete ====
async function markDoneAndDelete(id) {
  if (confirm("Mark this task as done? It will be deleted.")) {
    await deleteDoc(doc(db, "tasks", id));
  }
}

// ==== Edit task ====
async function editTask(id, currentText) {
  const newText = prompt("Edit your task:", currentText);
  if (newText && newText.trim() !== "") {
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, { text: newText.trim() });
  }
}

async function markDoneAndDelete(id) {
  await deleteDoc(doc(db, "tasks", id));
}

// ==== Dark mode toggle ====
const modeToggle = document.getElementById("modeToggle");

// Load saved mode from localStorage
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  modeToggle.textContent = "☀️ Light Mode";
}

modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
    modeToggle.textContent = "☀️ Light Mode";
  } else {
    localStorage.setItem("theme", "light");
    modeToggle.textContent = "🌙 Dark Mode";
  }
});
