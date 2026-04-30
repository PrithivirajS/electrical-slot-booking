function el(id){
    return document.getElementById(id);
}

/* ================= LOAD DASHBOARD ================= */
function loadDashboard(){

    fetch('/admin/data')
    .then(res => res.json())
    .then(data => {

        /* ===== KPI VALUES ===== */
        el("total").innerText = data.total ?? 0;
        el("confirmed").innerText = data.confirmed ?? 0;
        el("pending").innerText = data.pending ?? 0;
        el("completed").innerText = data.completed ?? 0;

        /* ===== BOOKINGS LIST ===== */
        let html = "";

        if (data.bookings && data.bookings.length > 0){

            data.bookings.forEach(b => {

                let statusClass = (b.status || "").toLowerCase();

                html += `
                <div class="booking-item">
                    <div>
                        <strong>${b.time}</strong><br>
                        <span>${b.name}</span>
                    </div>

                    <span class="status ${statusClass}">
                        ${b.status}
                    </span>
                </div>
                `;
            });

        } else {
            html = `<div class="no-data">No bookings today</div>`;
        }

        el("bookingList").innerHTML = html;

    })
    .catch(err => {
        console.error("Dashboard Load Error:", err);
    });
}

/* ================= AUTO REFRESH (OPTIONAL) ================= */
function autoRefresh(){
    setInterval(loadDashboard, 30000); // every 30 sec
}

/* ================= INIT ================= */
window.onload = function(){
    loadDashboard();
    autoRefresh();  // remove if not needed
};