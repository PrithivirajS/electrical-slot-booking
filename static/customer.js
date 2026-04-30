// ✅ OPEN MODAL
function openCustomerModal() {
    document.getElementById("customerModal").style.display = "flex";

    // reset form
    document.getElementById("cust_id").value = "";
    document.getElementById("full_name").value = "";
    document.getElementById("mobile").value = "";
    document.getElementById("email").value = "";
    document.getElementById("address").value = "";
    document.getElementById("city").value = "";
}

// ✅ CLOSE MODAL
function closeModal() {
    document.getElementById("customerModal").style.display = "none";
}

// ✅ MOBILE VALIDATION
function isValidMobile(mobile) {
    return /^[6-9]\d{9}$/.test(mobile);
}

// ✅ SAVE CUSTOMER (ADD / UPDATE)
function saveCustomer() {

    let data = {
        id: document.getElementById("cust_id").value,
        name: document.getElementById("full_name").value,
        mobile: document.getElementById("mobile").value,
        email: document.getElementById("email").value,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value
    };

    // validation
    if (!data.name || !data.mobile) {
        alert("Name and Mobile are required");
        return;
    }

    if (!isValidMobile(data.mobile)) {
        alert("Invalid Mobile Number");
        return;
    }

    fetch("/add-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        alert("Customer saved successfully");
        location.reload();
    })
    .catch(err => {
        console.error(err);
        alert("Error saving customer");
    });
}

// ✅ DELETE CUSTOMER
function deleteCustomer(id) {

    if (!confirm("Are you sure you want to delete this customer?")) return;

    fetch("/delete-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    })
    .then(() => location.reload())
    .catch(err => console.error(err));
}

// ✅ EDIT CUSTOMER
function editCustomer(id, name, mobile, email, city) {

    openCustomerModal();

    document.getElementById("cust_id").value = id;
    document.getElementById("full_name").value = name;
    document.getElementById("mobile").value = mobile;
    document.getElementById("email").value = email;
    document.getElementById("city").value = city;
}

// ✅ SEARCH (LIVE FILTER WITHOUT PAGE RELOAD)
const searchInput = document.getElementById("searchCustomer");

if (searchInput) {
    searchInput.addEventListener("keyup", function () {

        let value = this.value.toLowerCase();
        let rows = document.querySelectorAll(".list-row");

        rows.forEach(row => {
            let text = row.innerText.toLowerCase();
            row.style.display = text.includes(value) ? "grid" : "none";
        });
    });
}

// ✅ CLOSE MODAL ON OUTSIDE CLICK
window.onclick = function (event) {
    let modal = document.getElementById("customerModal");
    if (event.target === modal) {
        closeModal();
    }
};