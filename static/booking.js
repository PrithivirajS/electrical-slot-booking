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

//     let techId = document.getElementById("technician_id").value;

//     let url = techId
//         ? `/get-tech-booked-slots?date=${date}&tech_id=${techId}`
//         : `/get-slots?date=${date}`;

//     fetch(url)
//     .then(res => res.json())
//     .then(data => {

//         let html = `<div class="slots">`;

//         data.forEach(s => {

//             // ✅ Correct disable logic
//             let isDisabled = techId ? s.is_full : s.booked;

//             let statusText = isDisabled ? "Full" : "Available";
//             let statusClass = isDisabled ? "full" : "available";

//             html += `
//                 <div class="slot-card ${isDisabled ? 'disabled' : ''}"
//                      onclick="${isDisabled ? '' : `selectSlot(this, ${s.id}, '${date}', '${s.time}')`}">

//                     <div class="time">${s.time}</div>

//                     <span class="slot-status ${statusClass}">
//                         ${statusText}
//                     </span>

//                 </div>
//             `;
//         });

//         html += `</div>`;
//         container.innerHTML = html;

//         // auto select first available
//         let first = document.querySelector(".slot-card:not(.disabled)");
//         if (first) first.click();
//     });
// }

// function generateSlots(date) {

//     let container = document.getElementById("slotsContainer");
//     container.innerHTML = "";

//     let techId = document.getElementById("technician_id").value;

//     if (!techId) {
//         container.innerHTML = "<p>Select technician to view slots</p>";
//         return;
//     }

//     fetch(`/get-tech-slots?date=${date}&tech_id=${techId}`)
//     .then(res => res.json())
//     .then(data => {

//         let html = `<div class="slots">`;

//         data.forEach(s => {

//             let isDisabled = s.is_full;

//             let statusText = isDisabled ? "Full" : "Available";
//             let statusClass = isDisabled ? "full" : "available";

//             html += `
//                 <div class="slot-card ${isDisabled ? 'disabled' : ''}"
//                      onclick="${isDisabled ? '' : `selectSlot(this, ${s.id}, '${date}', '${s.time}')`}">

//                     <div class="time">${s.time}</div>

//                     <span class="slot-status ${statusClass}">
//                         ${statusText}
//                     </span>

//                 </div>
//             `;
//         });
//         html += `</div>`;
//         container.innerHTML = html;
//     });
// }

// function generateSlots(date) {

//     let container = document.getElementById("slotsContainer");
//     container.innerHTML = "";

//     let techId = document.getElementById("technician_id").value;

//     fetch(`/get-slots?date=${date}&tech_id=${techId}`)
//     .then(res => res.json())
//     .then(slots => {

//         let html = `<div class="slots">`;

//         slots.forEach(s => {

//             html += `
//                 <div class="slot-card ${s.booked ? 'disabled' : ''}"
//                     onclick="${s.booked ? '' : `selectSlot(this, ${s.id}, '${date}', '${s.time}')`}">

//                     <div class="time">${s.time}</div>

//                     <span class="slot-status ${s.booked ? 'full' : 'available'}">
//                         ${s.booked ? 'Full' : 'Available'}
//                     </span>

//                 </div>
//             `;
//         });

//         html += `</div>`;
//         container.innerHTML = html;

//     });
// }

// function generateSlots(date) {

//     let container = document.getElementById("slotsContainer");
//     container.innerHTML = "";

//     let techId = document.getElementById("technician_id").value;

//     fetch(`/get-slots?date=${date}&tech_id=${techId}`)
//     .then(res => res.json())
//     .then(slots => {

//         let morning = [];
//         let afternoon = [];
//         let evening = [];

//         // ✅ GROUPING LOGIC
//         slots.forEach(s => {

//             let hour = parseInt(s.time.split(":")[0]);

//             if (hour < 12) {
//                 morning.push(s);
//             } else if (hour < 17) {
//                 afternoon.push(s);
//             } else {
//                 evening.push(s);
//             }
//         });

//         // ✅ BUILD SECTION FUNCTION
//         function buildSection(title, data) {

//             if (data.length === 0) return "";

//             let html = `<div class="slot-section">
//                             <h4>${title}</h4>
//                             <div class="slots">`;

//             data.forEach(s => {

//                 html += `
//                     <div class="slot-card ${s.booked ? 'disabled' : ''}"
//                         onclick="${s.booked ? '' : `selectSlot(this, ${s.id}, '${date}', '${s.time}')`}">

//                         <div class="time">${s.time}</div>

//                         <span class="slot-status ${s.booked ? 'full' : 'available'}">
//                             ${s.booked ? 'Full' : 'Available'}
//                         </span>

//                     </div>
//                 `;
//             });

//             html += `</div></div>`;
//             return html;
//         }

//         // ✅ FINAL UI
//         container.innerHTML =
//             buildSection("Morning", morning) +
//             buildSection("Afternoon", afternoon) +
//             buildSection("Evening", evening);

//     });
// }

function generateSlots(date) {

    let container = document.getElementById("slotsContainer");
    container.innerHTML = "";

    let techId = document.getElementById("technician_id").value;

    fetch(`/get-slots?date=${date}&tech_id=${techId}`)
    .then(res => res.json())
    .then(slots => {

        let groups = {
            "Morning": [],
            "Afternoon": [],
            "Evening": []
        };

        slots.forEach(s => {

            // extract starting hour safely
            let hour = parseInt(s.time.split(":")[0]);

            // 🔥 FIX for 12 → 01 issue (PM wrap)
            if (s.time.includes("01:00") && !s.time.includes("09:00") && !s.time.includes("10:00") && !s.time.includes("11:00")) {
                hour = 13;
            }
            if (s.time.includes("02:00")) hour = 14;
            if (s.time.includes("03:00")) hour = 15;
            if (s.time.includes("04:00")) hour = 16;
            if (s.time.includes("05:00")) hour = 17;
            if (s.time.includes("06:00")) hour = 18;
            if (s.time.includes("07:00")) hour = 19;
            if (s.time.includes("08:00")) hour = 20;

            // ✅ grouping
            if (hour >= 9 && hour < 12) {
                groups["Morning"].push(s);
            } 
            else if (hour >= 12 && hour < 16) {
                groups["Afternoon"].push(s);
            } 
            else if (hour >= 16 && hour <= 21) {
                groups["Evening"].push(s);
            }

        });

        let html = "";

        Object.keys(groups).forEach(section => {

            if (groups[section].length === 0) return;

            html += `
                <div class="slot-section">
                    <h4>${section}</h4>

                    <!-- 🔥 IMPORTANT -->
                    <div class="slots">
            `;

            groups[section].forEach(s => {

                html += `
                    <div class="slot-card ${s.booked ? 'disabled' : ''}"
                        onclick="${s.booked ? '' : `selectSlot(this, ${s.id}, '${date}', '${s.time}')`}">

                        <div class="time">${s.time}</div>

                        <span class="slot-status ${s.booked ? 'full' : 'available'}">
                            ${s.booked ? 'Full' : 'Available'}
                        </span>

                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // auto select
        let first = document.querySelector(".slot-card:not(.disabled)");
        if (first) first.click();
    });
}

function format(h) {
    let ampm = h >= 12 ? "PM" : "AM";
    let hour = h > 12 ? h - 12 : h;
    return `${hour}:00 ${ampm}`;
}

function selectSlot(el, id, date, time) {

    if (el.classList.contains("disabled")) return;

    document.querySelectorAll(".slot-card").forEach(s => s.classList.remove("active"));
    el.classList.add("active");

    document.getElementById("slot_id").value = id;
    document.getElementById("selectedSlot").innerText = `${date} | ${time}`;

    // 🔥 IMPORTANT FIX
    // document.getElementById("selected_time").value = time;
    document.getElementById("selectedTime").value = time;
}

// ================= TECH =================

// function selectTech(id, name, phone) {

//     document.getElementById("technician_id").value = id;
//     document.getElementById("techSearch").value = name;

//     document.getElementById("techDetails").innerHTML = `
//         <div class="tech-profile">
//             <div class="tech-avatar">${name.charAt(0)}</div>
//             <div>
//                 <h4>${name}</h4>
//                 <p>${phone || "-"}</p>
//             </div>
//         </div>
//     `;

//     // 🔥 IMPORTANT: reload slots
//     let date = document.getElementById("booking_date").value;
//     if (date) generateSlots(date);
// }

function selectTech(id, name, phone) {

    document.getElementById("technician_id").value = id;
    document.getElementById("techSearch").value = name;

    document.getElementById("techDetails").innerHTML = `
        <div class="tech-profile">
            <div class="tech-avatar">${name.charAt(0)}</div>
            <div>
                <h4>${name}</h4>
                <p>${phone}</p>
            </div>
        </div>
    `;

    // ✅ Reload slots WITH technician
    let date = document.getElementById("booking_date").value;
    if (date) generateSlots(date);
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

// function clearTechnician() {

//     document.getElementById("techSearch").value = "";
//     document.getElementById("techResults").innerHTML = "";
//     document.getElementById("techDropdown").value = "";

//     document.getElementById("technician_id").value = "";

//     let techDetails = document.getElementById("techDetails");
//     techDetails.innerHTML = "";
// }

// function clearTechnician() {

//     document.getElementById("technician_id").value = "";
//     document.getElementById("techSearch").value = "";

//     document.getElementById("techDetails").innerHTML = "";

//     // 🔥 Reset slots (important)
//     let date = document.getElementById("booking_date").value;
//     if (date) generateSlots(date);
// }

function clearTechnician() {

    document.getElementById("technician_id").value = "";
    document.getElementById("techSearch").value = "";
    document.getElementById("techDetails").innerHTML = "";

    let date = document.getElementById("booking_date").value;

    // 🔴 Disable all slots again
    if (date) generateSlots(date);
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

    if (!form.technician_id.value) {
        alert("Select technician");
        return false;
    }

    if (!form.name.value) {
        alert("Select customer");
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
