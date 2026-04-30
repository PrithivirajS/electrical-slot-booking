function el(id){
    return document.getElementById(id);
}

// function toggleSidebar(){
//     const sidebar = el("sidebar");
//     const main = el("main");

//     sidebar.classList.toggle("collapsed");
//     main.classList.toggle("expanded");
// }

// function toggleSidebar(){
//     const sidebar = el("sidebar");
//     const main = el("main");
//     const overlay = el("overlay");

//     sidebar.classList.toggle("collapsed");
//     main.classList.toggle("expanded");
//     overlay.classList.toggle("show");
// }

// function toggleSidebar(){
//     const sidebar = document.getElementById("sidebar");
//     const overlay = document.getElementById("overlay");

//     sidebar.classList.toggle("collapsed");
//     overlay.classList.toggle("show");
// }

function toggleSidebar(){
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
}

/* close when clicking overlay */
document.getElementById("overlay").addEventListener("click", toggleSidebar);

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