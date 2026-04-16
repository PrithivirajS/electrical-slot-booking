let currentCategory = "All";

document.addEventListener("DOMContentLoaded", () => {
    loadServices();
});

/* LOAD SERVICES */
function loadServices() {

    showSkeleton();

    let search = document.getElementById("searchInput")?.value || "";


    fetch(`/api/services?category=${currentCategory}&search=${search}`)
    .then(res => res.json())
    .then(data => {

        console.log("API DATA:", data);

        let container = document.getElementById("cardsContainer");
        container.innerHTML = "";

        if (!data.length) {
            container.innerHTML = "<p>No services found</p>";
            return;
        }

        data.forEach(s => {
            container.innerHTML += `
                <div class="card">
                    <div class="icon">${s.icon || '⚡'}</div>
                    <h3>${s.name || 'Service'}</h3>
                    <p>${s.description || ''}</p>

                    <div class="meta">
                        ⭐ ${s.rating} | ${s.bookings} booked
                    </div>

                    <div class="bottom">
                        <span>₹${s.price}</span>
                        <button onclick="goBooking(${s.id})">Book Now</button>
                    </div>
                </div>
            `;
        });

    })
    .catch(err => {
        console.error("API ERROR:", err);
    });
}

/* FILTER */
function filterService(category) {
    currentCategory = category;

    document.querySelectorAll(".filters button").forEach(btn => {
        btn.classList.remove("active");
    });

    event.target.classList.add("active");

    loadServices();
}

/* SEARCH */
document.addEventListener("input", function(e){
    if(e.target.id === "searchInput"){
        clearTimeout(window.searchTimer);
        window.searchTimer = setTimeout(loadServices, 400);
    }
});

/* SKELETON */
function showSkeleton(){
    let container = document.getElementById("cardsContainer");
    container.innerHTML = "";

    for(let i=0;i<4;i++){
        container.innerHTML += `
            <div class="card skeleton">
                <div class="sk-box"></div>
                <div class="sk-line"></div>
                <div class="sk-line small"></div>
            </div>
        `;
    }
}

function goBooking(serviceId){
    window.location.href = `/booking?service_id=${serviceId}`;
}
