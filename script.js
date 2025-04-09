document.getElementById('bookingForm').addEventListener('submit', function(e) {
    e.preventDefault();
  
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const doctor = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
  
    const appointment = {
      name,
      phone,
      doctor,
      date,
      timestamp: new Date().toISOString()
    };
  
    const db = window.firebaseDB;
    const ref = window.firebaseRef;
    const push = window.firebasePush;
  
    push(ref(db, 'appointments'), appointment)
      .then(() => {
        document.getElementById('confirmation').classList.remove('hidden');
        document.getElementById('confirmation').innerText = "Appointment booked successfully!";
        document.getElementById('bookingForm').reset();
      })
      .catch((error) => {
        alert("Error booking appointment: " + error.message);
      });
  });

  function trackQueue() {
    const phoneToTrack = document.getElementById("trackPhone").value.trim();
  
    const db = window.firebaseDB;
    const ref = window.firebaseRef;
    const dbRef = ref(db, "appointments");
  
    // Import get function from firebase
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ get, child }) => {
      get(dbRef).then((snapshot) => {
        const data = [];
        snapshot.forEach(childSnap => {
          data.push(childSnap.val());
        });
  
        // Sort by timestamp
        data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
        const index = data.findIndex(app => app.phone === phoneToTrack);
        const resultDiv = document.getElementById("queueResult");
  
        if (index === -1) {
          resultDiv.innerHTML = "<p style='color:red;'>No appointment found for this phone.</p>";
        } else {
          const ahead = index;
          const waitTime = ahead * 5; // assume 5 mins per person
          const currentServing = data[0]?.name || "Not started yet";
  
          resultDiv.innerHTML = `
            <table border="1" style="width: 100%; text-align: center;">
              <tr><th colspan="2">📋 Your Queue Details</th></tr>
              <tr><td>Your Position</td><td>${index + 1}</td></tr>
              <tr><td>People Ahead</td><td>${ahead}</td></tr>
              <tr><td>Estimated Wait Time</td><td>${waitTime} minutes</td></tr>
              <tr><td>Currently Being Served</td><td>${currentServing}</td></tr>
            </table>
          `;
  
          estimateTravelTime(); // Call ETA function
        }
      }).catch((error) => {
        alert("Error fetching queue: " + error.message);
      });
    });
  }
  

  function estimateTravelTime() {
    const etaDiv = document.getElementById("etaFromLocation");
  
    if (!navigator.geolocation) {
      etaDiv.innerText = "Geolocation not supported.";
      return;
    }
  
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
  
      const hospitalAddress = "aiims delhi"; // Your hospital address
      const apiKey = "AIzaSyCTsaQuspjMbLjPqITuSKLLHG-Bi2HOmNg"; // Replace with your own key
      const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${lat},${lng}&destinations=${encodeURIComponent(hospitalAddress)}&key=${apiKey}`;
  
      const proxyURL = `https://api.allorigins.win/get?url=${encodeURIComponent(distanceMatrixUrl)}`;
  
      fetch(proxyURL)
        .then(res => res.json())
        .then(result => {
          const response = JSON.parse(result.contents);
  
          if (response.rows && response.rows[0].elements[0].status === "OK") {
            const duration = response.rows[0].elements[0].duration.text;
            etaDiv.innerText = `🕒 Estimated travel time: ${duration}`;
          } else {
            etaDiv.innerText = "Could not estimate travel time.";
          }
        })
        .catch(err => {
          console.warn("CORS or API error:", err);
          etaDiv.innerText = "Could not fetch ETA. Showing directions only.";
        })
        .finally(() => {
          // Always show the Get Directions button
          const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(hospitalAddress)}`;
          document.getElementById("getDirectionsBtn").onclick = () => {
            window.open(mapsLink, "_blank");
          };
        });
  
    }, () => {
      etaDiv.innerText = "Location permission denied.";
    });
  }
  
  
  