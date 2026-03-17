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

btn.onclick = () => {
    dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
};

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
// UPDATE USER
// ============================
function updateUser(id) {

    let phone = document.getElementById("phone" + id).value;
    let role = document.getElementById("role" + id).value;

    fetch('/update-user', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: id,
            phone: phone,
            role: role
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("User updated successfully");
    });
}


// ============================
// DELETE USER
// ============================
function deleteUser(id) {

    if (!confirm("Are you sure to delete this user?")) return;

    fetch('/delete-user', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: id })
    })
    .then(res => res.json())
    .then(data => {
        alert("User deleted");
        location.reload();
    });
}

function editUser(id) {

    // Show inputs
    document.getElementById("phoneText" + id).style.display = "none";
    document.getElementById("roleText" + id).style.display = "none";

    document.getElementById("phoneInput" + id).style.display = "inline";
    document.getElementById("roleInput" + id).style.display = "inline";

    // Toggle buttons
    document.getElementById("editBtn" + id).style.display = "none";
    document.getElementById("saveBtn" + id).style.display = "inline";
    document.getElementById("cancelBtn" + id).style.display = "inline";
}

function saveUser(id) {

    let phone = document.getElementById("phoneInput" + id).value;
    let role = document.getElementById("roleInput" + id).value;

    fetch('/update-user', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: id,
            phone: phone,
            role: role
        })
    })
    .then(res => res.json())
    .then(data => {

        // Update UI
        document.getElementById("phoneText" + id).innerText = phone;
        document.getElementById("roleText" + id).innerText = role;

        cancelEdit(id);

        alert("Updated successfully");
    });
}

function cancelEdit(id) {

    // Hide inputs
    document.getElementById("phoneInput" + id).style.display = "none";
    document.getElementById("roleInput" + id).style.display = "none";

    // Show text
    document.getElementById("phoneText" + id).style.display = "inline";
    document.getElementById("roleText" + id).style.display = "inline";

    // Toggle buttons
    document.getElementById("editBtn" + id).style.display = "inline";
    document.getElementById("saveBtn" + id).style.display = "none";
    document.getElementById("cancelBtn" + id).style.display = "none";
}

// ============================
// MODAL CONTROL
// ============================
function openModal() {
    document.getElementById("userModal").style.display = "block";
}

function closeModal() {
    document.getElementById("userModal").style.display = "none";
}


// ============================
// ADD USER
// ============================
function addUser() {

    let name = document.getElementById("newName").value;
    let email = document.getElementById("newEmail").value;
    let phone = document.getElementById("newPhone").value;
    let role = document.getElementById("newRole").value;

    fetch('/add-user', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            email: email,
            phone: phone,
            role: role
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("User added successfully");
        location.reload();
    });
}