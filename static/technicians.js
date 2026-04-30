const modal = document.getElementById("techModal");
const form = document.getElementById("techForm");

// ================= SEARCH =================
document.getElementById("searchTech").addEventListener("keyup", function () {
    let value = this.value.toLowerCase();
    document.querySelectorAll("#techTable tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(value) ? "" : "none";
    });
});

// ================= INPUT RESTRICTIONS =================
// Allow only numbers
function allowOnlyNumbers(input){
    input.value = input.value.replace(/\D/g,'');
}

// Apply to fields after load
window.addEventListener("DOMContentLoaded", () => {
    if(form.phone1){
        form.phone1.addEventListener("input", ()=>allowOnlyNumbers(form.phone1));
    }
    if(form.phone2){
        form.phone2.addEventListener("input", ()=>allowOnlyNumbers(form.phone2));
    }
    if(form.pincode){
        form.pincode.addEventListener("input", ()=>allowOnlyNumbers(form.pincode));
    }
});

// ================= OPEN =================
function openModal(data=null){
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    if(data){
        document.getElementById("modalTitle").innerText = "Edit Technician";

        for(let key in data){
            if(form[key]) form[key].value = data[key];
        }
    } else {
        form.reset();
        document.getElementById("modalTitle").innerText = "Add Technician";
    }
}

// ================= CLOSE =================
function closeModal(){
    modal.style.display = "none";
    document.body.style.overflow = "auto";
}

// CLICK OUTSIDE
modal.addEventListener("click", e=>{
    if(e.target === modal) closeModal();
});

// ESC CLOSE
document.addEventListener("keydown", e=>{
    if(e.key === "Escape") closeModal();
});

// ================= VALIDATION =================
function validateForm(){

    let first = form.first_name?.value.trim();
    let last = form.last_name?.value.trim();
    let phone1 = form.phone1?.value.trim();
    let phone2 = form.phone2?.value.trim();
    let pincode = form.pincode?.value.trim();

    let proofType = form.proof_type?.value;
    let idNumber = form.id_number?.value.trim();
    let proofFile = form.proof_file?.files[0];

    if(!first || !last){
        showToast("First & Last name are required");
        return false;
    }

    if(!/^\d{10}$/.test(phone1)){
        showToast("Phone 1 must be exactly 10 digits");
        return false;
    }

    if(phone2 && !/^\d{10}$/.test(phone2)){
        showToast("Phone 2 must be 10 digits");
        return false;
    }

    if(pincode && !/^\d{6}$/.test(pincode)){
        showToast("Pincode must be 6 digits");
        return false;
    }

    // 🔥 PROOF VALIDATION
    if(!proofType){
        showToast("Select proof type");
        return false;
    }

    if(!idNumber){
        showToast("Enter ID number");
        return false;
    }

    if(!proofFile){
        showToast("Upload proof document");
        return false;
    }

    // PDF check
    if(proofFile.type !== "application/pdf"){
        showToast("Only PDF file allowed");
        return false;
    }

    return true;
}

// ================= SAVE =================
function saveTechnician(){

    if(!validateForm()) return;

    let data = new FormData(form);

    fetch("/add_technician",{
        method:"POST",
        body:data
    })
    .then(r=>r.json())
    .then(d=>{
        if(d.status==="success"){
            showToast("Saved successfully");
            closeModal();
            setTimeout(()=>location.reload(),700);
        } else {
            showToast(d.error || "Error saving data");
        }
    });
}

// ================= EDIT =================
function editTech(id){
    fetch(`/get-technician/${id}`)
    .then(r=>r.json())
    .then(data=>{
        openModal(data);
    });
}

// ================= DELETE =================
function deleteTech(id){
    if(!confirm("Delete technician?")) return;

    fetch("/delete-technician",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id})
    }).then(()=>{
        showToast("Deleted");
        setTimeout(()=>location.reload(),500);
    });
}

// ================= TOAST =================
function showToast(msg){
    let t = document.getElementById("toast");
    t.innerText = msg;
    t.style.display = "block";

    setTimeout(()=>{
        t.style.display="none";
    },2000);
}

function getLocation(){

    if (!navigator.geolocation) {
        showToast("Geolocation not supported");
        return;
    }

    showToast("Fetching location...");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            let lat = position.coords.latitude;
            let lng = position.coords.longitude;

            document.getElementById("latitude").value = lat.toFixed(6);
            document.getElementById("longitude").value = lng.toFixed(6);

            showToast("Location captured");
        },
        (error) => {
            console.log(error);

            if (error.code === 1) {
                showToast("Permission denied");
            } else if (error.code === 2) {
                showToast("Location unavailable");
            } else {
                showToast("Error getting location");
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}