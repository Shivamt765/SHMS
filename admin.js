import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfWDsgmlHNNxL2g9I2vFUr5b6y5b7F6OA",
    authDomain: "smartqueue-c729f.firebaseapp.com",
    databaseURL: "https://smartqueue-c729f-default-rtdb.firebaseio.com",
    projectId: "smartqueue-c729f",
    storageBucket: "smartqueue-c729f.appspot.com",
    messagingSenderId: "908324761850",
    appId: "1:908324761850:web:3b1e1eb86eec9c41ccd943"
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function loadAdminData() {
  const dbRef = ref(db, "appointments");

  get(dbRef).then(snapshot => {
    const tbody = document.querySelector("#adminTable tbody");
    tbody.innerHTML = "";

    snapshot.forEach(child => {
      const data = child.val();
      const key = child.key;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.phone}</td>
        <td>${data.doctor}</td>
        <td>${data.status || "pending"}</td>
        <td>
          ${data.status !== "appointed" ? `<button onclick="markAppointed('${key}')">Appointed ✅</button>` : "✔️"}
        </td>
      `;

      tbody.appendChild(row);
    });
  });
}

window.markAppointed = function (key) {
  const updateRef = ref(db, `appointments/${key}`);
  update(updateRef, {
    status: "appointed",
    statusUpdatedAt: new Date().toISOString()
  }).then(() => {
    alert("Marked as appointed");
    loadAdminData();
  });
};

window.onload = loadAdminData;
