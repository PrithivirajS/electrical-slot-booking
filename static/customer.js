function openCustomerModal(){
    document.getElementById("customerModal").style.display = "block";
}

function closeModal(){
    document.getElementById("customerModal").style.display = "none";
}

// ✅ Mobile validation
function isValidMobile(mobile){
    return /^[6-9]\d{9}$/.test(mobile);
}

function saveCustomer(){

    let data = {
        id: document.getElementById("cust_id").value,
        full_name: document.getElementById("full_name").value,
        mobile: document.getElementById("mobile").value,
        email: document.getElementById("email").value,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        postal: document.getElementById("postal").value,
        landmark: document.getElementById("landmark").value,
        lat: document.getElementById("lat").value,
        lng: document.getElementById("lng").value
    };

    if(!isValidMobile(data.mobile)){
        alert("Invalid Mobile Number");
        return;
    }

    fetch("/add-customer", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        alert("Saved");
        location.reload();
    });
}

// ✅ Live location
function getLocation(){
    navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById("lat").value = pos.coords.latitude;
        document.getElementById("lng").value = pos.coords.longitude;
        alert("Location Captured");
    });
}


window.onload = function(){
    loadCustomers();
}

function loadCustomers(){

    fetch("/get-customers")
    .then(res => res.json())
    .then(data => {

        let table = document.getElementById("customerTable");
        table.innerHTML = "";

        data.forEach(c => {

            let row = `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.mobile}</td>
                    <td>${c.email}</td>
                    <td>${c.city}</td>
                    <td>
                        <button onclick="deleteCustomer(${c.id})">Delete</button>
                    </td>
                </tr>
            `;

            table.innerHTML += row;
        });
    });
}


function deleteCustomer(id){
    fetch("/delete-customer", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({id:id})
    })
    .then(()=> location.reload());
}

function editCustomer(id, name, mobile, email, city){

    openCustomerModal();

    document.getElementById("cust_id").value = id;
    document.getElementById("full_name").value = name;
    document.getElementById("mobile").value = mobile;
    document.getElementById("email").value = email;
    document.getElementById("city").value = city;
}

document.getElementById("searchCustomer").addEventListener("keyup", function(){

    let q = this.value;

    fetch("/customers?search=" + q)
    .then(res => res.text())
    .then(html => {
        document.open();
        document.write(html);
        document.close();
    });

});