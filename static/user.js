// UTIL
function el(id){ return document.getElementById(id); }

// OPEN MODAL (ADD)
function openUserModal(){
    el("modalTitle").innerText = "Add User";
    el("user_id").value = "";

    el("userModal").style.display = "flex";
    document.body.style.overflow = "hidden"; // lock scroll
}

// OPEN MODAL (EDIT)
function editUser(id, name, email, phone, role){
    el("modalTitle").innerText = "Edit User";

    el("user_id").value = id;
    el("user_name").value = name;
    el("user_email").value = email;
    el("user_phone").value = phone;
    el("user_role").value = role;

    el("userModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

// CLOSE MODAL
function closeUserModal(){
    el("userModal").style.display = "none";
    document.body.style.overflow = "auto";

    // reset
    ["user_id","user_name","user_email","user_phone","user_password"].forEach(id => el(id).value = "");
    el("user_role").value = "user";
}

// OUTSIDE CLICK
window.onclick = function(e){
    if(e.target === el("userModal")){
        closeUserModal();
    }
};

// ESC CLOSE
document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){
        closeUserModal();
    }
});

// DELETE
function deleteUser(id){
    if(!confirm("Delete user?")) return;

    fetch("/delete-user",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id})
    }).then(()=>{
        showToast("User deleted");
        setTimeout(()=>location.reload(),800);
    });
}

// SAVE (ADD + UPDATE READY)
function saveUser(){

    const id = el("user_id").value;
    const name = el("user_name").value.trim();
    const email = el("user_email").value.trim();
    const phone = el("user_phone").value.trim();
    const password = el("user_password").value;
    const role = el("user_role").value;

    if(!name || !email || !phone){
        showToast("Required fields missing", true);
        return;
    }

    if(!/^[0-9]{10}$/.test(phone)){
        showToast("Phone must be 10 digits", true);
        return;
    }

    fetch("/add-user", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ id, name, email, phone, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "success"){
            showToast("Saved successfully");
            closeUserModal();
            setTimeout(()=>location.reload(),800);
        } else {
            showToast(data.error || "Error", true);
        }
    });
}

// TOAST
function showToast(msg, isError=false){
    const t = el("toast");
    t.innerText = msg;
    t.className = "toast show " + (isError ? "error":"");
    setTimeout(()=> t.className = "toast", 2500);
}