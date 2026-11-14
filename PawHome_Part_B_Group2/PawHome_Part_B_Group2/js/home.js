/* =========================================================
   home.js  (index.html)
   - quick search: sends the chosen city and size to the search page
   - loads the four dogs that have been waiting the longest
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    ui.initPage();

    const quickForm = document.getElementById("quickSearch");
    const citySelect = document.getElementById("quickCity");
    const sizeSelect = document.getElementById("quickSize");
    const waitingDogs = document.getElementById("waitingDogs");
    const availableCount = document.getElementById("availableCount");

    ui.fillCitySelect(citySelect, true);

    // Quick search: build the address of the search page with the selected filters
    quickForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (citySelect.value) params.set("city", citySelect.value);
        if (sizeSelect.value) params.set("size", sizeSelect.value);
        const query = params.toString();
        window.location.href = "dogs.html" + (query ? "?" + query : "");
    });

    // Longest waiting dogs
    api.getLongestWaiting(4)
        .then((dogs) => {
            waitingDogs.innerHTML = dogs.map((dog, index) => ui.dogCard(dog, index)).join("");
        })
        .catch(() => {
            waitingDogs.innerHTML = `<p class="loading-block">לא הצלחנו לטעון את הכלבים כרגע.</p>`;
        });

    // Live number of dogs that are waiting for a home
    api.searchDogs({})
        .then((dogs) => {
            availableCount.textContent = dogs.length;
        })
        .catch(() => {
            // without a real number it is better not to show the badge at all
            availableCount.closest(".hero-badge").hidden = true;
        });
});
