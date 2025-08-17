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
let currentUserUID = "";

// ==== Login (only if login elements exist) ====
window.login = function () {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  if (!emailEl || !passwordEl) return; // not on login page

  const email = emailEl.value;
  const password = passwordEl.value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      document.getElementById("loginStatus").innerText = "";
    })
    .catch((error) => {
      document.getElementById("loginStatus").innerText = error.message;
    });
};

// ==== Logout (global) ====
window.logout = function () {
  signOut(auth).then(() => {
    localStorage.removeItem("userUID");
    localStorage.removeItem("userEmail");
  });
};

// ==== Auth state change ====
onAuthStateChanged(auth, (user) => {
  const loginPage = document.getElementById("loginPage");
  const dashboard = document.getElementById("dashboard");

  if (user) {
    currentUserEmail = user.email;
    currentUserUID = user.uid;

    // ✅ Save user in localStorage for other pages
    localStorage.setItem("userUID", currentUserUID);
    localStorage.setItem("userEmail", currentUserEmail);

    if (loginPage) loginPage.style.display = "none";
    if (dashboard) dashboard.style.display = "block";

    // Only load tasks if daily page is open
    if (document.getElementById("myTasks")) {
      loadTasks();
    }
  } else {
    if (loginPage) loginPage.style.display = "block";
    if (dashboard) dashboard.style.display = "none";
  }
});

// ==== Add task (only works if daily page exists) ====
window.addTask = async function () {
  const newTaskInput = document.getElementById("newTask");
  if (!newTaskInput) return; // not on daily page

  const taskText = newTaskInput.value;
  if (taskText.trim() === "") return;

  // ✅ Use UID as owner
  await addDoc(collection(db, "tasks"), {
    text: taskText,
    owner: currentUserUID,
    email: currentUserEmail,
    createdAt: Date.now()
  });

  newTaskInput.value = "";
};

// ==== Load tasks (daily page only) ====
function loadTasks() {
  const myTasksList = document.getElementById("myTasks");
  const broTasksList = document.getElementById("broTasks");

  if (!myTasksList || !broTasksList) return; // not on daily page

  const q = query(collection(db, "tasks"));
  onSnapshot(q, (snapshot) => {
    myTasksList.innerHTML = "";
    broTasksList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const li = document.createElement("li");

      // Task text (click = instantly delete)
      const span = document.createElement("span");
      span.textContent = task.text;
      span.onclick = () => markDoneAndDelete(docSnap.id);

      // If it's mine → allow edit/delete
      if (task.owner === currentUserUID) {
        const editBtn = document.createElement("button");
        editBtn.innerHTML = "✏️";
        editBtn.classList.add("task-btn");
        editBtn.onclick = () => editTask(docSnap.id, task.text);

        const delBtn = document.createElement("button");
        delBtn.innerHTML = "🗑️";
        delBtn.classList.add("task-btn");
        delBtn.onclick = () => deleteTask(docSnap.id);

        li.appendChild(span);
        li.appendChild(editBtn);
        li.appendChild(delBtn);
        myTasksList.appendChild(li);
      } else {
        li.appendChild(span);
        broTasksList.appendChild(li);
      }
    });
  });
}

// ==== Mark done -> delete instantly ====
async function markDoneAndDelete(id) {
  await deleteDoc(doc(db, "tasks", id));
}

// ==== Edit task ====
async function editTask(id, currentText) {
  const newText = prompt("Edit your task:", currentText);
  if (newText && newText.trim() !== "") {
    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, { text: newText.trim() });
  }
}

// ==== Delete task ====
async function deleteTask(id) {
  if (confirm("Delete this task?")) {
    await deleteDoc(doc(db, "tasks", id));
  }
}
