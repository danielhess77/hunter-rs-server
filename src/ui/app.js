const button = document.getElementById("scanButton");
const status = document.getElementById("status");

button.addEventListener("click", () => {

    status.textContent = "Scanning...";

    console.log("Hunter scan requested.");

});