/* =========================================================
   search.js  (dogs.html) - the main service
   - reads the filters (also from the address, e.g. ?city=&size=)
   - updates the results immediately when a filter changes
   - shows the active filters as chips that can be removed
   - shows a clear empty state when nothing matches
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const { LABELS } = window.PawHomeData;
    const user = ui.initPage();

    const form = document.getElementById("filtersForm");
    const citySelect = document.getElementById("filterCity");
    const sortSelect = document.getElementById("sortSelect");
    const results = document.getElementById("results");
    const resultsCount = document.getElementById("resultsCount");
    const activeFilters = document.getElementById("activeFilters");
    const filtersPanel = document.getElementById("filtersPanel");
    const filtersToggle = document.getElementById("filtersToggle");

    ui.fillCitySelect(citySelect, true);

    // Publishers do not have home details, so "best match" sorting is not relevant for them
    if (!user || user.type !== "adopter") {
        sortSelect.querySelector('option[value="match"]').textContent = "מומלץ";
    }

    /* ---------- reading and writing the filters ---------- */

    function checkedValues(name) {
        return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
    }

    function readFilters() {
        const gender = form.querySelector('input[name="gender"]:checked');
        return {
            city: citySelect.value,
            sizes: checkedValues("size"),
            ages: checkedValues("age"),
            gender: gender ? gender.value : "",
            kids: form.kids.checked,
            dogs: form.dogs.checked,
            apartment: form.apartment.checked,
            sort: sortSelect.value
        };
    }

    // Fills the form from the address, so a search can be shared or reloaded
    function applyParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("city")) citySelect.value = params.get("city");
        params.getAll("size").forEach((size) => {
            const input = form.querySelector(`input[name="size"][value="${size}"]`);
            if (input) input.checked = true;
        });
        params.getAll("age").forEach((age) => {
            const input = form.querySelector(`input[name="age"][value="${age}"]`);
            if (input) input.checked = true;
        });
        const gender = form.querySelector(`input[name="gender"][value="${params.get("gender") || ""}"]`);
        if (gender) gender.checked = true;
        ["kids", "dogs", "apartment"].forEach((name) => {
            form[name].checked = params.get(name) === "1";
        });
        if (params.get("sort")) sortSelect.value = params.get("sort");
    }

    function updateAddress(filters) {
        const params = new URLSearchParams();
        if (filters.city) params.set("city", filters.city);
        filters.sizes.forEach((s) => params.append("size", s));
        filters.ages.forEach((a) => params.append("age", a));
        if (filters.gender) params.set("gender", filters.gender);
        ["kids", "dogs", "apartment"].forEach((name) => { if (filters[name]) params.set(name, "1"); });
        if (filters.sort !== "match") params.set("sort", filters.sort);
        const query = params.toString();
        history.replaceState(null, "", "dogs.html" + (query ? "?" + query : ""));
    }

    /* ---------- active filter chips ---------- */

    // Each chip knows how to remove its own filter
    function buildChips(filters) {
        const chips = [];
        if (filters.city) chips.push({ text: filters.city, clear: () => { citySelect.value = ""; } });
        filters.sizes.forEach((s) => chips.push({ text: LABELS.size[s], clear: () => uncheck("size", s) }));
        filters.ages.forEach((a) => chips.push({ text: LABELS.ageGroup[a], clear: () => uncheck("age", a) }));
        if (filters.gender) chips.push({ text: LABELS.gender[filters.gender], clear: () => { form.querySelector('input[name="gender"][value=""]').checked = true; } });
        if (filters.kids) chips.push({ text: "מסתדר עם ילדים", clear: () => { form.kids.checked = false; } });
        if (filters.dogs) chips.push({ text: "מסתדר עם כלבים", clear: () => { form.dogs.checked = false; } });
        if (filters.apartment) chips.push({ text: "מתאים לדירה", clear: () => { form.apartment.checked = false; } });
        return chips;
    }

    function uncheck(name, value) {
        const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
        if (input) input.checked = false;
    }

    function renderChips(chips) {
        activeFilters.innerHTML = "";
        chips.forEach((chip) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "filter-chip";
            button.setAttribute("aria-label", `הסרת הסינון ${chip.text}`);
            button.innerHTML = `${ui.escapeHtml(chip.text)} <span aria-hidden="true">✕</span>`;
            button.addEventListener("click", () => {
                chip.clear();
                runSearch();
            });
            activeFilters.appendChild(button);
        });
        filtersToggle.textContent = chips.length ? `סינון (${chips.length} פעילים)` : "סינון";
    }

    /* ---------- results ---------- */

    function renderEmpty() {
        results.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon" aria-hidden="true">🐾</div>
                <h2>לא נמצאו כלבים שמתאימים לסינון</h2>
                <p>נסו להסיר חלק מהמסננים, למשל לבחור "כל הערים" או גודל נוסף. כלבים חדשים מתפרסמים כל הזמן.</p>
                <button class="btn btn-primary" type="button" id="broadenSearch">הרחבת החיפוש</button>
            </div>`;
        document.getElementById("broadenSearch").addEventListener("click", () => {
            form.reset();
            runSearch();
            citySelect.focus();
        });
    }

    function countText(count) {
        return count === 1 ? "נמצא כלב אחד" : `נמצאו ${count} כלבים`;
    }

    let searchCounter = 0;   // ignores answers of older searches that arrive late

    async function runSearch() {
        const filters = readFilters();
        const thisSearch = ++searchCounter;
        updateAddress(filters);
        renderChips(buildChips(filters));
        results.setAttribute("aria-busy", "true");
        resultsCount.textContent = "מחפשים...";

        try {
            const dogs = await api.searchDogs(filters);
            if (thisSearch !== searchCounter) return;
            resultsCount.textContent = countText(dogs.length);
            if (dogs.length === 0) {
                renderEmpty();
            } else {
                results.innerHTML = dogs.map((dog, index) => ui.dogCard(dog, index)).join("");
            }
        } catch (error) {
            resultsCount.textContent = "";
            results.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h2>אירעה שגיאה</h2><p>${ui.escapeHtml(error.message)}</p></div>`;
        } finally {
            results.removeAttribute("aria-busy");
        }
    }

    /* ---------- events ---------- */

    // Every change in the filters updates the results right away
    form.addEventListener("change", runSearch);
    sortSelect.addEventListener("change", runSearch);

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        runSearch();
        // on a phone, close the panel and show the results
        if (window.matchMedia("(max-width: 991px)").matches) {
            filtersPanel.classList.add("collapsed");
            filtersToggle.setAttribute("aria-expanded", "false");
            results.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    // "reset" clears the form first, then we search again
    form.addEventListener("reset", () => {
        setTimeout(() => {
            runSearch();
            ui.toast("הסינון אופס. מוצגים כל הכלבים הזמינים.", "info");
        }, 0);
    });

    filtersToggle.addEventListener("click", () => {
        const collapsed = filtersPanel.classList.toggle("collapsed");
        filtersToggle.setAttribute("aria-expanded", String(!collapsed));
    });

    applyParams();
    runSearch();
});
