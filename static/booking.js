// ================= GLOBAL =================
let currentStart = 0;
let debounceTimer = null;
let custDebounce = null;

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

    loadDates();

    // ✅ Clean initial state
    document.getElementById("techDetails").innerHTML = "";
    document.getElementById("customerPreview").style.display = "none";

    // ================= TECH SEARCH =================
    let techSearch = document.getElementById("techSearch");
    let techResults = document.getElementById("techResults");

    techSearch.addEventListener("input", function () {

        let q = this.value.trim();
        clearTimeout(debounceTimer);

        if (!q || q.length < 2) {
            techResults.innerHTML = "";
            return;
        }

        techResults.innerHTML = "⏳ Searching...";

        debounceTimer = setTimeout(() => {

            fetch(`/search-tech?q=${q}`)
            .then(res => res.json())
            .then(data => {

                techResults.innerHTML = "";

                if (!data.length) {
                    techResults.innerHTML = "❌ No technician found";
                    return;
                }

                data.forEach(t => {
                    techResults.innerHTML += `
                        <div class="tech-item" onclick="selectTech(${t.id}, '${t.name}', '${t.phone}')">
                            ${t.name} - ${t.phone}
                        </div>
                    `;
                });

            });

        }, 300);
    });

    // ================= CUSTOMER SEARCH =================
    let custSearch = document.getElementById("customerSearch");
    let custResults = document.getElementById("customerResults");

    custSearch.addEventListener("input", function () {

        let q = this.value.trim();
        clearTimeout(custDebounce);

        if (!q || q.length < 2) {
            custResults.innerHTML = "";
            return;
        }

        custResults.innerHTML = "⏳ Searching...";

        custDebounce = setTimeout(() => {

            fetch(`/get-customers`)
            .then(res => res.json())
            .then(data => {

                custResults.innerHTML = "";

                let filtered = data.filter(c =>
                    c.name.toLowerCase().includes(q.toLowerCase()) ||
                    c.mobile.includes(q)
                );

                if (!filtered.length) {
                    custResults.innerHTML = "❌ No customer found";
                    return;
                }

                filtered.forEach(c => {
                    custResults.innerHTML += `
                        <div class="tech-item" onclick="selectCustomer('${c.name}','${c.mobile}','${c.email}','${c.city}')">
                            ${c.name} - ${c.mobile}
                        </div>
                    `;
                });

            });

        }, 300);
    });

});

// ================= DATE =================
// function loadDates(offset = 0) {
//     currentStart += offset;

//     fetch(`/get-dates?start=${currentStart}`)
//     .then(res => res.json())
//     .then(days => {

//         let container = document.getElementById("dateContainer");
//         container.innerHTML = "";

//         days.forEach(d => {
//             container.innerHTML += `
//                 <button class="date-btn" onclick="loadSlots('${d}', this)">
//                     ${d}
//                 </button>
//             `;
//         });

//         document.querySelector(".date-btn")?.click();
//     });
// }

function loadDates(offset = 0) {
    currentStart += offset;

    fetch(`/get-dates?start=${currentStart}`)
    .then(res => res.json())
    .then(days => {

        let container = document.getElementById("dateContainer");
        container.innerHTML = "";

        let today = new Date().toISOString().split("T")[0];

        days.forEach((d, i) => {

            let dateObj = new Date(d);
            let day = dateObj.toLocaleDateString("en-US", { weekday: 'short' });
            let dateNum = dateObj.getDate();

            let label = "";
            if (i === 0) label = "Today";
            else if (i === 1) label = "Tomorrow";

            container.innerHTML += `
                <div class="date-card"
                     onclick="selectDate('${d}', this)">
                    <small>${label || day}</small>
                    <strong>${dateNum}</strong>
                </div>
            `;
        });

        document.querySelector(".date-card")?.click();
    });
}

function selectDate(date, el) {

    document.getElementById("booking_date").value = date;

    document.querySelectorAll(".date-card").forEach(d => d.classList.remove("active"));
    el.classList.add("active");

    generateSlots(date);
}

// ================= SLOT =================
function loadSlots(date, btn) {

    document.getElementById("booking_date").value = date;

    document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    generateSlots(date);
}

// function generateSlots(date) {

//     let container = document.getElementById("slotsContainer");
//     container.innerHTML = "";

//     let sections = {
//         "Morning": [9, 12],
//         "Afternoon": [12, 17],
//         "Evening": [17, 21]
//     };

//     fetch(`/get-booked-slots?date=${date}`)
//     .then(res => res.json())
//     .then(booked => {

//         let slotId = 1;

//         for (let section in sections) {

//             let [start, end] = sections[section];
//             let html = `<h4>${section}</h4><div class="slots">`;

//             for (let h = start; h < end; h++) {

//                 let time = `${format(h)} - ${format(h+1)}`;
//                 let disabled = booked.includes(slotId);

//                 html += `
//                     <div class="slot ${disabled ? 'disabled' : ''}"
//                         onclick="selectSlot(this, ${slotId}, '${date}', '${time}')">
//                         ${time}
//                     </div>
//                 `;

//                 slotId++;
//             }

//             html += `</div>`;
//             container.innerHTML += html;
//         }

//         // ✅ Auto-select first slot
//         setTimeout(() => {
//             let first = document.querySelector(".slot:not(.disabled)");
//             if (first) first.click();
//         }, 200);

//     });
// }


function generateSlots(date) {

    let container = document.getElementById("slotsContainer");
    container.innerHTML = "";

    let sections = {
        "Morning": [9, 12],
        "Afternoon": [12, 17],
        "Evening": [17, 21]
    };

    fetch(`/get-booked-slots?date=${date}`)
    .then(res => res.json())
    .then(booked => {

        let slotId = 1;

        for (let section in sections) {

            let [start, end] = sections[section];

            let html = `<div class="slot-section"><h4>${section}</h4><div class="slots">`;

            for (let h = start; h < end; h++) {

                let time = `${format(h)} - ${format(h+1)}`;
                let isBooked = booked.includes(slotId);

                // 🔥 OPTIONAL: Random "few left" demo (replace with real logic later)
                let status = "";
                if (!isBooked && Math.random() < 0.3) {
                    status = `<div class="slot-status few">Few left</div>`;
                }

                if (isBooked) {
                    status = `<div class="slot-status full">Full</div>`;
                }

                html += `
                    <div class="slot-card ${isBooked ? 'disabled' : ''}"
                        onclick="selectSlot(this, ${slotId}, '${date}', '${time}')">
                        <span>${time}</span>
                        ${status}
                    </div>
                `;

                slotId++;
            }

            html += `</div></div>`;
            container.innerHTML += html;
        }
    });
}

function format(h) {
    let ampm = h >= 12 ? "PM" : "AM";
    let hour = h > 12 ? h - 12 : h;
    return `${hour}:00 ${ampm}`;
}

function selectSlot(el, id, date, time) {

    if (el.classList.contains("disabled")) return;

    document.querySelectorAll(".slot").forEach(s => s.classList.remove("active-slot"));
    el.classList.add("active-slot");

    document.getElementById("slot_id").value = id;
    document.getElementById("selectedSlot").innerText = `${date} | ${time}`;

    // 🔥 IMPORTANT FIX
    document.getElementById("selectedTime").value = time;
}

// ================= TECH =================
function selectTech(id, name, phone) {

    if (!name || name.length < 2) return;

    document.getElementById("technician_id").value = id;
    document.getElementById("techSearch").value = name;

    document.getElementById("techDetails").innerHTML = `
        <div class="tech-profile">
            <div class="tech-avatar">${name.charAt(0)}</div>
            <div>
                <h4>${name}</h4>
                <p>${phone || "-"}</p>
            </div>
        </div>
    `;

    checkBookingReady(); // ✅ ADD
}


function selectCustomer(name, phone, email, city) {

    let preview = document.getElementById("customerPreview");

    preview.style.display = "flex";

    preview.innerHTML = `
        <div class="tech-avatar">${name.charAt(0)}</div>
        <div>
            <h4>${name}</h4>
            <p>📞 ${phone}</p>
            <p>📧 ${email || "-"}</p>
            <p>📍 ${city || "-"}</p>
        </div>
    `;

    document.getElementById("customerResults").innerHTML = "";
    document.getElementById("customerSearch").value = name;

    document.getElementById("cust_name").value = name;
    document.getElementById("cust_phone").value = phone;
    document.getElementById("cust_email").value = email;
    document.getElementById("cust_city").value = city;

    checkBookingReady(); // ✅ ADD
}

function clearCustomer() {

    document.getElementById("customerSearch").value = "";
    document.getElementById("customerResults").innerHTML = "";

    let preview = document.getElementById("customerPreview");
    preview.style.display = "none";
    preview.innerHTML = "";

    // 🔥 CLEAR DATA
    document.getElementById("cust_name").value = "";
    document.getElementById("cust_phone").value = "";
    document.getElementById("cust_email").value = "";
    document.getElementById("cust_city").value = "";

    checkBookingReady();
}

function clearTechnician() {

    document.getElementById("techSearch").value = "";
    document.getElementById("techResults").innerHTML = "";
    document.getElementById("techDropdown").value = "";

    document.getElementById("technician_id").value = "";

    let techDetails = document.getElementById("techDetails");
    techDetails.innerHTML = "";
}

function editCustomer() {

    document.getElementById("customerForm").style.display = "block";
    document.getElementById("customerPreview").style.display = "none";

    // optional: clear search
    document.getElementById("customerSearch").value = "";
}

// Live update
["cust_name","cust_phone","cust_email","cust_city"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateCustomerPreview);
});

// ================= FORM =================
function submitForm(form) {

    if (!form.slot_id.value) {
        alert("Select slot");
        return false;
    }

    navigator.geolocation.getCurrentPosition(function(pos) {
        form.latitude.value = pos.coords.latitude;
        form.longitude.value = pos.coords.longitude;
        form.submit();
    });

    return false;
}

function checkBookingReady() {

    let slot = document.getElementById("slot_id").value;
    let tech = document.getElementById("technician_id").value;
    let cust = document.getElementById("cust_name").value;

    let btn = document.getElementById("bookBtn");

    if (slot && tech && cust) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
}

window.onload = function () {

    const params = new URLSearchParams(window.location.search);

    if (params.get("success")) {

        let toast = document.getElementById("toast");

        toast.style.display = "block";

        setTimeout(() => {
            toast.style.opacity = "1";
        }, 100);

        setTimeout(() => {
            toast.style.opacity = "0";
        }, 3000);
    }
};

