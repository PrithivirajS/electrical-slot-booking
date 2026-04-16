    // SAFE ELEMENT GETTER
    function el(id) {
        return document.getElementById(id);
    }

    // ============================
    // DASHBOARD DATA
    // ============================
    function loadDashboard() {
        if (!el("total")) return;

        fetch('/admin/data')
        .then(res => res.json())
        .then(data => {
            el("total").innerText = data.total || 0;
            el("confirmed").innerText = data.confirmed || 0;
            el("pending").innerText = data.pending || 0;

            let html = "";
            data.bookings.forEach(b => {
                html += `
                <div class="booking">
                    <strong>${b.time}</strong> - ${b.name}
                    <span class="status ${b.status.toLowerCase()}">${b.status}</span>
                </div>`;
            });

            if (el("bookingList")) {
                el("bookingList").innerHTML = html;
            }
        });
    }

    // ============================
    // PROFILE
    // ============================
    function loadProfile() {
        if (!el("initial")) return;

        fetch('/admin/profile')
        .then(res => res.json())
        .then(data => {
            let names = data.name.split(" ");
            let initials = names.length > 1
                ? names[0][0] + names[1][0]
                : names[0][0];

            el("initial").innerText = initials.toUpperCase();
        });
    }

    // ============================
    // INIT (ONLY ONE)
    // ============================
    window.onload = function () {
        loadDashboard();
        loadProfile();
        liveClock();

        const first = document.querySelector(".calendar-day");
        if (first) first.click();
    };

    // ============================
    // PROFILE DROPDOWN
    // ============================
    document.addEventListener("click", function(e) {
        const btn = el("profileBtn");
        const dropdown = el("profileDropdown");

        if (!btn || !dropdown) return;

        if (btn.contains(e.target)) {
            dropdown.style.display =
                dropdown.style.display === "block" ? "none" : "block";
        } else {
            dropdown.style.display = "none";
        }
    });

    // ============================
    // SLOT BOOKING
    // ============================
    let selectedSlot = null;

    function formatTime(hour) {
        let ampm = hour >= 12 ? "PM" : "AM";
        let h = hour % 12 || 12;
        return h + ":00 " + ampm;
    }

    function generateSlots(date) {
        fetch(`/get-booked-slots?date=${date}`)
        .then(res => res.json())
        .then(bookedSlots => {

            ["morningSlots","afternoonSlots","eveningSlots"].forEach(id => {
                if (el(id)) el(id).innerHTML = "";
            });

            for (let hour = 9; hour < 21; hour++) {
                let slotText = `${formatTime(hour)} - ${formatTime(hour+1)}`;
                let btn = document.createElement("button");

                btn.className = "slot-btn";
                btn.innerText = slotText;

                if (bookedSlots.includes(slotText)) {
                    btn.classList.add("disabled");
                    btn.disabled = true;
                }

                btn.onclick = function () {
                    if (btn.classList.contains("disabled")) return;

                    if (selectedSlot) selectedSlot.classList.remove("selected");

                    btn.classList.add("selected");
                    selectedSlot = btn;

                    if (el("slot_id")) el("slot_id").value = hour;
                    if (el("booking_date")) el("booking_date").value = date;
                    if (el("selectedSlotText")) el("selectedSlotText").innerText = slotText;

                    startTimer(300);
                };

                if (hour < 12 && el("morningSlots")) el("morningSlots").appendChild(btn);
                else if (hour < 17 && el("afternoonSlots")) el("afternoonSlots").appendChild(btn);
                else if (el("eveningSlots")) el("eveningSlots").appendChild(btn);
            }
        });
    }

    // ============================
    // TIMER
    // ============================
    let timerInterval;

    function startTimer(seconds) {
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            let min = Math.floor(seconds / 60);
            let sec = seconds % 60;

            if (el("timer")) {
                el("timer").innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
            }

            if (seconds <= 0) {
                clearInterval(timerInterval);
                alert("⏰ Slot expired!");
            }

            seconds--;
        }, 1000);
    }

    // ============================
    // TECHNICIAN MODULE
    // ============================
    function addTechnician() {

        let form = document.getElementById("techForm");  // ✅ FIXED ORDER
        let formData = new FormData(form);

        fetch("/add_technician", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                closeModal();
                showSuccessPopup();
            } else {
                alert(data.error);
            }
        });
    }

    // ============================
    // USER MODULE
    // ============================
    function openUserModal() {
        el("userModal").style.display = "block";
    }

    function closeUserModal() {
        el("userModal").style.display = "none";
    }

    function editUser(id, name, email, phone, role) {
        el("user_id").value = id;
        el("user_name").value = name;
        el("user_email").value = email;
        el("user_phone").value = phone;
        el("user_role").value = role;

        openUserModal();
    }

    function saveUser() {
        let id = el("user_id").value;

        let data = {
            id,
            name: el("user_name").value,
            email: el("user_email").value,
            phone: el("user_phone").value,
            role: el("user_role").value
        };

        fetch(id ? "/update-user" : "/add-user", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                closeUserModal();
                showSuccessPopup();
            } else {
                alert(data.error);
            }
        });
    }

    function deleteUser(id) {
        if (!confirm("Delete user?")) return;

        fetch("/delete-user", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({id})
        })
        .then(() => location.reload());
    }

    // ============================
    // SUCCESS POPUP
    // ============================
    function showSuccessPopup() {
        if (el("successPopup")) {
            el("successPopup").style.display = "block";
        }
    }

    function closeSuccessPopup() {
        if (el("successPopup")) {
            el("successPopup").style.display = "none";
        }
        location.reload();
    }

    // ================= BOOKING =================
    let selectedDiv = null;

    function selectSlot(elm, id, date, time) {

        if (selectedDiv) {
            selectedDiv.classList.remove("active-slot");
        }

        elm.classList.add("active-slot");
        selectedDiv = elm;

        el("slot_id").value = id;
        el("selectedSlot").innerText = date + " " + time;
    }

    function handleBooking(form) {

        if (!form.slot_id.value) {
            alert("Please select slot");
            return false;
        }

        navigator.geolocation.getCurrentPosition(function(position) {
            form.latitude.value = position.coords.latitude;
            form.longitude.value = position.coords.longitude;
            form.submit();
        });

        return false;
    }

    function loadDashboard() {
        if (!el("total")) return;

        document.getElementById("skeleton").style.display = "flex";
        document.getElementById("realContent").style.display = "none";

        fetch('/admin/data')
        .then(res => res.json())
        .then(data => {

            setTimeout(() => {  // smooth effect
                document.getElementById("skeleton").style.display = "none";
                document.getElementById("realContent").style.display = "block";

                el("total").innerText = data.total || 0;
                el("confirmed").innerText = data.confirmed || 0;
                el("pending").innerText = data.pending || 0;
            }, 800);
        });
    }

    function liveClock(){
        setInterval(() => {
            let now = new Date();
            document.getElementById("liveTime").innerText =
                now.toLocaleTimeString();
        }, 1000);
    }

    function el(id) {
        return document.getElementById(id);
    }

    /* ================= PROFILE ================= */
    function loadProfile() {
        if (!el("initial")) return;

        fetch('/admin/profile')
        .then(res => res.json())
        .then(data => {

            let names = data.name.split(" ");
            let initials = names.map(n => n[0]).join('').substring(0,2).toUpperCase();

            el("initial").innerText = initials;

            if(el("profileInitial")){
                el("profileInitial").innerText = initials;
            }
        });
    }

    /* ================= DASHBOARD ================= */
    function loadDashboard() {
        if (!el("total")) return;

        if(el("skeleton")){
            el("skeleton").style.display = "flex";
            el("realContent").style.display = "none";
        }

        fetch('/admin/data')
        .then(res => res.json())
        .then(data => {

            setTimeout(() => {

                if(el("skeleton")){
                    el("skeleton").style.display = "none";
                    el("realContent").style.display = "block";
                }

                el("total").innerText = data.total || 0;
                el("confirmed").innerText = data.confirmed || 0;
                el("pending").innerText = data.pending || 0;

            }, 800);
        });
    }

    /* ================= CLOCK ================= */
    function liveClock(){
        setInterval(() => {
            let now = new Date();
            if(el("liveTime")){
                el("liveTime").innerText = now.toLocaleTimeString();
            }
        }, 1000);
    }

    /* ================= SESSION ================= */
    function setSessionTime(){
        let now = new Date();
        if(el("sessionTime")){
            el("sessionTime").innerText = now.toLocaleTimeString();
        }
    }

    /* ================= DROPDOWN ================= */
    document.addEventListener("click", function(e) {
        const btn = el("profileBtn");
        const dropdown = el("profileDropdown");

        if (!btn || !dropdown) return;

        if (btn.contains(e.target)) {
            dropdown.classList.toggle("show");
        } else {
            dropdown.classList.remove("show");
        }
    });

    /* ================= INIT ================= */
    window.onload = function () {
        loadDashboard();
        loadProfile();
        liveClock();
        setSessionTime();
    };