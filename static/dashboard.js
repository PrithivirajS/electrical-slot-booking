// ============================
// DASHBOARD DATA
// ============================
function loadDashboard() {
    fetch('/admin/data')
    .then(res => res.json())
    .then(data => {

        document.getElementById("total").innerText = data.total;
        document.getElementById("confirmed").innerText = data.confirmed;
        document.getElementById("pending").innerText = data.pending;

        let html = "";

        data.bookings.forEach(b => {
            html += `
            <div class="booking">
                <strong>${b.time}</strong> - ${b.name}
                <span class="status ${b.status.toLowerCase()}">${b.status}</span>
            </div>
            `;
        });

        document.getElementById("bookingList").innerHTML = html;
    });
}

// ============================
// PROFILE DATA
// ============================
function loadProfile() {
    fetch('/admin/profile')
    .then(res => res.json())
    .then(data => {

        document.getElementById("username").innerText = data.name;
        document.getElementById("email").innerText = data.email;

        let names = data.name.split(" ");
        let initials = names.length > 1
            ? names[0][0] + names[1][0]
            : names[0][0];

        initials = initials.toUpperCase();

        if (data.image) {
            document.getElementById("profileBtn").innerHTML =
                `<img src="/static/uploads/${data.image}" class="profile-img">`;
        } else {
            document.getElementById("initial").innerText = initials;
        }
    });
}

// ============================
// DROPDOWN
// ============================
const btn = document.getElementById("profileBtn");
const dropdown = document.getElementById("profileDropdown");

if (btn) {
    btn.onclick = () => {
        dropdown.style.display =
            dropdown.style.display === "block" ? "none" : "block";
    };
}

window.onclick = function(e) {
    if (!e.target.closest('.profile-container')) {
        dropdown.style.display = "none";
    }
};

// ============================
// INIT
// ============================
loadDashboard();
loadProfile();

// ============================
// SLOT BOOKING UI (FINAL FIX)
// ============================

let selectedSlot = null;

// Format time
function formatTime(hour) {
    let ampm = hour >= 12 ? "PM" : "AM";
    let h = hour % 12;
    if (h === 0) h = 12;
    return h + ":00 " + ampm;
}

// Generate slots
// function generateSlots(date) {

//     console.log("Generating slots for:", date);

//     document.getElementById("morningSlots").innerHTML = "";
//     document.getElementById("afternoonSlots").innerHTML = "";
//     document.getElementById("eveningSlots").innerHTML = "";

//     for (let hour = 9; hour < 21; hour++) {

//         let start = formatTime(hour);
//         let end = formatTime(hour + 1);

//         let slotText = `${start} - ${end}`;

//         let btn = document.createElement("button");
//         btn.className = "slot-btn";
//         btn.innerText = slotText;

//         btn.onclick = function () {

//             if (selectedSlot) selectedSlot.classList.remove("selected");

//             btn.classList.add("selected");
//             selectedSlot = btn;

//             document.getElementById("slot_id").value = slotText;
//             document.getElementById("booking_date").value = date;
//         };

//         // Grouping
//         if (hour < 12) {
//             document.getElementById("morningSlots").appendChild(btn);
//         } else if (hour < 17) {
//             document.getElementById("afternoonSlots").appendChild(btn);
//         } else {
//             document.getElementById("eveningSlots").appendChild(btn);
//         }
//     }
// }

function generateSlots(date) {

    fetch(`/get-booked-slots?date=${date}`)
    .then(res => res.json())
    .then(bookedSlots => {

        document.getElementById("morningSlots").innerHTML = "";
        document.getElementById("afternoonSlots").innerHTML = "";
        document.getElementById("eveningSlots").innerHTML = "";

        for (let hour = 9; hour < 21; hour++) {

            let start = formatTime(hour);
            let end = formatTime(hour + 1);

            let slotText = `${start} - ${end}`;

            let btn = document.createElement("button");
            btn.className = "slot-btn";
            btn.innerText = slotText;

            // 🚫 DISABLE BOOKED SLOT
            if (bookedSlots.includes(slotText)) {
                btn.classList.add("disabled");
                btn.disabled = true;
            }

            btn.onclick = function () {

                if (btn.classList.contains("disabled")) return;

                if (selectedSlot) selectedSlot.classList.remove("selected");

                btn.classList.add("selected");
                selectedSlot = btn;

                document.getElementById("slot_id").value = hour;
                document.getElementById("booking_date").value = date;

                document.getElementById("selectedSlotText").innerText = slotText;

                startTimer(300); // 5 mins
            };

            if (hour < 12) {
                document.getElementById("morningSlots").appendChild(btn);
            } else if (hour < 17) {
                document.getElementById("afternoonSlots").appendChild(btn);
            } else {
                document.getElementById("eveningSlots").appendChild(btn);
            }
        }
    });
}

// Date select
// function selectDate(el, date) {

//     console.log("Date clicked:", date);

//     document.querySelectorAll(".date-card").forEach(d => d.classList.remove("active"));
//     el.classList.add("active");

//     generateSlots(date);
// }

function selectDate(el, date, label) {

    document.querySelectorAll(".calendar-day").forEach(d => d.classList.remove("active"));
    el.classList.add("active");

    document.getElementById("selectedDateText").innerText = label;

    generateSlots(date);
}

// Auto load
window.onload = function () {

    console.log("Page loaded");

    const first = document.querySelector(".calendar-day");

    if (first) {
        first.click();
    } else {
        console.error("Date tabs not found");
    }
};


let timerInterval;

function startTimer(seconds) {

    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        let min = Math.floor(seconds / 60);
        let sec = seconds % 60;

        document.getElementById("timer").innerText =
            `${min}:${sec < 10 ? '0' : ''}${sec}`;

        if (seconds <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Slot expired! Please reselect.");
        }

        seconds--;
    }, 1000);
}

navigator.geolocation.getCurrentPosition(function(pos) {
    document.getElementById("latitude").value = pos.coords.latitude;
    document.getElementById("longitude").value = pos.coords.longitude;

    document.getElementById("map").innerHTML =
        `Lat: ${pos.coords.latitude} <br> Long: ${pos.coords.longitude}`;
});


setInterval(() => {

    const active = document.querySelector(".calendar-day.active");

    if (active) {
        active.click();
    }

}, 30000);

function showDistance(userLat, userLng, techLat, techLng) {

    let service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix({
        origins: [{lat: userLat, lng: userLng}],
        destinations: [{lat: techLat, lng: techLng}],
        travelMode: 'DRIVING'
    }, function(response) {

        let data = response.rows[0].elements[0];

        document.getElementById("travelInfo").innerText =
            data.distance.text + " | " + data.duration.text;
    });
}

function updateDistance(userLat, userLng) {

    fetch("/get-tech-location")
    .then(res => res.json())
    .then(data => {

        if (!data) return;

        showDistance(userLat, userLng, data.lat, data.lng);
    });
}

function openRoleModal() {
    document.getElementById("roleModal").style.display = "block";
}

function closeRoleModal() {
    document.getElementById("roleModal").style.display = "none";
}

function goUser() {
    window.location.href = "/users";
}

function goTech() {
    window.location.href = "/technicians";
}

function addTechnician() {

    let formData = new FormData(form);
    let form = document.getElementById("techForm");

    formData.append("name", document.getElementById("name").value);
    formData.append("guardian", document.getElementById("guardian").value);
    formData.append("phone1", document.getElementById("phone1").value);
    formData.append("phone2", document.getElementById("phone2").value);

    formData.append("flat", document.getElementById("flat").value);
    formData.append("street", document.getElementById("street").value);
    formData.append("post", document.getElementById("post").value);
    formData.append("taluk", document.getElementById("taluk").value);
    formData.append("district", document.getElementById("district").value);
    formData.append("pincode", document.getElementById("pincode").value);

    formData.append("education", document.getElementById("education").value);
    formData.append("experience", document.getElementById("experience").value);

    formData.append("govtType", document.getElementById("govtType").value);
    formData.append("govtNumber", document.getElementById("govtNumber").value);

    formData.append("rating", document.getElementById("rating").value);
    formData.append("review", document.getElementById("review").value);

    // FILES
    let resume = document.getElementById("resume").files[0];
    let photo = document.getElementById("photo").files[0];

    if (resume) formData.append("resume", resume);
    if (photo) formData.append("photo", photo);

    fetch("/add_technician", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);

        if (data.status === "success") {
            closeModal();        // close form
            showSuccessPopup();  // show popup
        } else {
            alert(data.error);
        }
    });
}

function showSuccessPopup() {
    document.getElementById("successPopup").style.display = "block";
}

function closeSuccessPopup() {
    document.getElementById("successPopup").style.display = "none";
    location.reload(); // optional refresh
}

function editTech(id) {
    fetch(`/get-technician/${id}`)
    .then(res => res.json())
    .then(data => {

        openModal();

        document.querySelector('[name="name"]').value = data.name;
        document.querySelector('[name="phone1"]').value = data.phone1;
        document.querySelector('[name="street"]').value = data.street;

        document.getElementById("techForm").dataset.id = id;
    });
}

function deleteTech(id) {

    if (!confirm("Are you sure?")) return;

    fetch("/delete-technician", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({id: id})
    })
    .then(() => location.reload());
}

function handleBooking(form) {

    if (!form.slot_id.value) {
        alert("Please select slot");
        return false;
    }

    navigator.geolocation.getCurrentPosition(function(position) {
        form.latitude.value = position.coords.latitude;
        form.longitude.value = position.coords.longitude;

        form.removeAttribute("onsubmit"); // ✅ allow normal submit
        form.submit();
    });

    return false;
}