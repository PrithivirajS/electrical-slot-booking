function el(id){
    return document.getElementById(id);
}

function loadProfile(){
    if(!el("initial")) return;

    fetch('/admin/profile')
    .then(r=>r.json())
    .then(d=>{
        let i = d.name
            .split(" ")
            .map(x=>x[0])
            .join('')
            .substring(0,2)
            .toUpperCase();

        el("initial").innerText = i;
    });
}

function liveClock(){
    setInterval(()=>{
        if(el("liveTime")){
            el("liveTime").innerText = new Date().toLocaleTimeString();
        }
    },1000);
}

window.onload = function(){
    loadProfile();
    liveClock();
};

document.addEventListener("DOMContentLoaded", function(){

    const btn = document.getElementById("profileBtn");
    const dropdown = document.getElementById("profileDropdown");

    if(btn){
        btn.addEventListener("click", function(e){
            e.stopPropagation();
            dropdown.classList.toggle("show");
        });
    }

    document.addEventListener("click", function(){
        dropdown.classList.remove("show");
    });

});