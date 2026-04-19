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


function generateSlots(date) {

    let container = document.getElementById("slotsContainer");
    container.innerHTML = "";

    let techId = document.getElementById("technician_id").value;

    fetch(`/get-booked-slots?date=${date}&technician_id=${techId || ""}`)
    .then(res => res.json())
    .then(slots => {

        let html = `<div class="slots">`;

        slots.forEach(s => {

            // 🔥 Disable logic
            let isDisabled = !techId || (s.booked >= s.capacity);

            let status = "";
            if (s.booked >= s.capacity) {
                status = `<div class="slot-status full">Full</div>`;
            } else if (s.capacity - s.booked <= 1) {
                status = `<div class="slot-status few">Few left</div>`;
            }

            html += `
                <div class="slot ${isDisabled ? 'disabled' : ''}"
                    onclick="selectSlot(this, ${s.id}, '${date}', '${s.time}')">
                    ${s.time}
                    ${status}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Auto select
        if (techId) {
            let first = document.querySelector(".slot:not(.disabled)");
            if (first) first.click();
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
    // document.getElementById("selected_time").value = time;
    document.getElementById("selectedTime").value = time;
}

// ================= TECH =================

function selectTech(id, name, phone) {

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

    // 🔥 IMPORTANT: reload slots
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

