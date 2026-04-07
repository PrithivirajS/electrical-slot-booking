let selectedSlot = null;
let countdownInterval = null;

// LOAD SLOTS
function loadSlots(date, btn) {

    document.getElementById("booking_date").value = date;

    document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    generateSlots(date);
}

// GENERATE SLOTS (1 HOUR)
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

            let html = `<h4>${section}</h4><div class="slots">`;

            for (let h = start; h < end; h++) {

                let time = `${format(h)} - ${format(h+1)}`;

                let disabled = booked.includes(slotId);

                html += `
                    <div class="slot ${disabled ? 'disabled' : ''}"
                        onclick="selectSlot(this, ${slotId}, '${date}', '${time}', ${h})">
                        ${time}
                    </div>
                `;

                slotId++;
            }

            html += `</div>`;
            container.innerHTML += html;
        }

    });
}

// FORMAT TIME
function format(h) {
    let ampm = h >= 12 ? "PM" : "AM";
    let hour = h > 12 ? h - 12 : h;
    return `${hour}:00 ${ampm}`;
}

// SELECT SLOT
function selectSlot(el, id, date, time, hour) {

    if (el.classList.contains("disabled")) return;

    document.querySelectorAll(".slot").forEach(s => s.classList.remove("active-slot"));

    el.classList.add("active-slot");

    selectedSlot = {id, date, hour};

    document.getElementById("slot_id").value = id;
    document.getElementById("selectedSlot").innerText = `${date} | ${time}`;

    startCountdown(hour);
}

// COUNTDOWN
function startCountdown(hour) {

    clearInterval(countdownInterval);

    function update() {

        let now = new Date();
        let target = new Date();

        target.setHours(hour, 0, 0, 0);

        let diff = target - now;

        if (diff <= 0) {
            document.getElementById("timer").innerText = "Expired";
            return;
        }

        let min = Math.floor(diff / 60000);
        let sec = Math.floor((diff % 60000) / 1000);

        document.getElementById("timer").innerText = `${min}m ${sec}s`;
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

// SUBMIT
function submitForm(form) {

    if (!form.slot_id.value) {
        alert("Select slot first");
        return false;
    }

    navigator.geolocation.getCurrentPosition(function(pos) {
        form.latitude.value = pos.coords.latitude;
        form.longitude.value = pos.coords.longitude;
        form.submit();
    });

    return false;
}

// AUTO LOAD TODAY
window.onload = () => {
    document.querySelector(".date-btn").click();
};

el.style.transform = "scale(0.95)";
setTimeout(() => {
    el.style.transform = "scale(1)";
}, 100);