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
    paymentStatus: "unpaid",
    status: 'waiting'
  };

  await window.firebasePush(appointmentsRef, newAppointment);

  // ✅ Only generate invoice after booking
  const formData = {
    name,
    phone,
    doctor,
    date,
    fee: "200",
    paid: false,
    trackingLink: `https://yourdomain.com/track.html?phone=${phone}`
  };

  generateAndDownloadPDF(formData); // generates + downloads invoice

  document.getElementById('confirmation').innerHTML = `
    Appointment booked successfully!<br>
    <a href="tracker.html" class="track-link">👉 Track Your Queue</a>
  `;
  document.getElementById('confirmation').classList.remove('hidden');
  document.getElementById('bookingForm').reset();
});

// ✅ PDF Generator
async function generateAndDownloadPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("🩺 SmartQueue Hospital", 20, 20);
  doc.setFontSize(10);
  doc.text("Address: 123 Health St, Salempur, UP", 20, 26);
  doc.text("Contact: +91-1234567890 | GST: 29ABCDE1234F2Z5", 20, 32);

  doc.setFontSize(14);
  doc.text("🧾 Appointment Invoice", 20, 45);

  doc.setFontSize(12);
  doc.text(`Name: ${data.name}`, 20, 55);
  doc.text(`Phone: ${data.phone}`, 20, 62);
  doc.text(`Doctor: ${data.doctor}`, 20, 69);
  doc.text(`Date: ${data.date}`, 20, 76);

  doc.text("--------------------------------------------------", 20, 82);
  doc.text("Payment Details:", 20, 89);
  doc.text(`Fee: ₹${data.fee}`, 20, 96);
  doc.text(`Status: ${data.paid ? "Paid ✅" : "To be Paid ❌"}`, 20, 103);

  doc.text("--------------------------------------------------", 20, 109);
  doc.text("Track Appointment:", 20, 116);
  doc.text(data.trackingLink, 20, 123);

  doc.save("invoice.pdf");

  return doc.output("blob"); // for WhatsApp upload later
}
async function uploadPDFToDrive(pdfBlob, filename) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];

      try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbzSRg-nCbpNvMNTIrLsVwlIAnnbPT78s0Boj824CgQ9/dev', {
          method: 'POST',
          body: new URLSearchParams({
            file: base64Data,
            mimeType: 'application/pdf',
            filename: filename
          })
        });        

        const link = await response.text();
        resolve(link);
      } catch (err) {
        console.error('Upload failed:', err);
        reject(err);
      }
    };
    reader.readAsDataURL(pdfBlob);
  });
}

// ✅ Queue Tracker
function trackQueue(auto = false) {
  const userPhone = document.getElementById('trackPhone')?.value;
  if (!auto && !userPhone) {
    alert('Please enter your phone number');
    return;
  }

  const db = window.firebaseDB;
  window.firebaseGet(window.firebaseChild(window.firebaseRef(db), 'appointments'))
    .then(snapshot => {
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

      let defaultConsultTime = 5 * 60 * 1000;
      let appointedTimes = appointments
        .filter(a => a.status === 'appointed' && a.startTime && a.endTime)
        .map(a => a.endTime - a.startTime);

      let avgTime = appointedTimes.length > 0
        ? appointedTimes.reduce((a, b) => a + b, 0) / appointedTimes.length
        : defaultConsultTime;

      const tbody = document.querySelector('#queueTable tbody');
      if (!tbody) return;
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

      document.getElementById('queueResult')?.classList.remove('hidden');

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

      if (!trackQueue.refreshInterval) {
        trackQueue.refreshInterval = setInterval(() => trackQueue(true), 10000);
      }
    })
    .catch(error => {
      console.error("Error loading queue:", error);
    });
}

window.addEventListener("beforeunload", () => {
  if (trackQueue.refreshInterval) {
    clearInterval(trackQueue.refreshInterval);
  }
});

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
