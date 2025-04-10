document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const phone = document.getElementById('phone').value;
  const doctor = document.getElementById('doctor').value;
  const date = document.getElementById('date').value;

  const db = window.firebaseDB;
  const appointmentsRef = window.firebaseRef(db, 'appointments');

  const newAppointment = {
    name,
    phone,
    doctor,
    date,
    timestamp: Date.now(),
    status: 'waiting'
  };

  await window.firebasePush(appointmentsRef, newAppointment);

  document.getElementById('confirmation').innerHTML = `
    Appointment booked successfully!<br>
    <a href="tracker.html" class="track-link">👉 Track Your Queue</a>
  `;
  document.getElementById('confirmation').classList.remove('hidden');
  document.getElementById('bookingForm').reset();
});

let refreshInterval;

async function trackQueue(auto = false) {
  const userPhone = document.getElementById('trackPhone').value;
  if (!auto && !userPhone) {
    alert('Please enter your phone number');
    return;
  }

  const db = window.firebaseDB;
  const snapshot = await window.firebaseGet(window.firebaseChild(window.firebaseRef(db), 'appointments'));

  if (!snapshot.exists()) {
    alert('No appointments found.');
    return;
  }

  const appointments = [];
  snapshot.forEach(child => {
    appointments.push({ id: child.key, ...child.val() });
  });

  appointments.sort((a, b) => a.timestamp - b.timestamp);
  const userIndex = appointments.findIndex(a => a.phone === userPhone);
  if (userIndex === -1) {
    alert('Phone number not found in queue.');
    return;
  }

  // Calculate avg consultation time
  let defaultConsultTime = 5 * 60 * 1000;
  let appointedTimes = [];

  for (let i = 0; i < appointments.length; i++) {
    const appt = appointments[i];
    if (appt.status === 'appointed' && appt.startTime && appt.endTime) {
      appointedTimes.push(appt.endTime - appt.startTime);
    }
  }

  let avgTime = appointedTimes.length > 0
    ? appointedTimes.reduce((a, b) => a + b, 0) / appointedTimes.length
    : defaultConsultTime;

  const tbody = document.querySelector('#queueTable tbody');
  tbody.innerHTML = '';

  const start = Math.max(0, userIndex - 10);
  const end = Math.min(appointments.length, userIndex + 11);

  for (let i = start; i < end; i++) {
    const a = appointments[i];
    const isUser = i === userIndex;
    const tr = document.createElement('tr');

    const nameCell = `<td class="${!isUser ? 'blurred-text' : ''}">${a.name}</td>`;
    const estTime = Math.ceil(avgTime * i / 60000);

    tr.innerHTML = `
      <td>${i + 1}</td>
      ${nameCell}
      <td>${a.doctor}</td>
      <td>~${estTime} mins</td>
    `;

    if (a.status === 'appointed') {
      tr.classList.add('appointed-row');
    }

    tbody.appendChild(tr);
  }

  document.getElementById('queueResult').classList.remove('hidden');

  if (!auto && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const hospitalLat = 26.2755;
      const hospitalLng = 83.9557;

      const distance = getDistanceFromLatLonInKm(lat, lng, hospitalLat, hospitalLng);
      const travelTime = Math.round((distance / 30) * 60);

      document.getElementById('etaFromLocation').textContent = `~${travelTime} mins`;

      const mapsURL = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`;
      document.getElementById('getDirectionsBtn').onclick = () => {
        window.open(mapsURL, '_blank');
      };
    });
  }

  if (!refreshInterval) {
    refreshInterval = setInterval(() => trackQueue(true), 10000);
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
