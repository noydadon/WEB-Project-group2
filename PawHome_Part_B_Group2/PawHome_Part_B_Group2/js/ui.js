/* =========================================================
   ui.js
   Shared behavior for every page:
   - shows the right navigation links for guest / adopter / publisher
   - mobile menu, log out, "show password" buttons
   - toast messages, confirmation dialog, loading buttons
   - helpers for building dog cards and status tags
   Loaded on every page after data.js, match.js and api.js.
   ========================================================= */

(function () {
    "use strict";

    const api = window.PawHomeApi;
    const { LABELS } = window.PawHomeData;
    const FLASH_KEY = "pawhome_flash";

    /* ---------- safe text ---------- */

    // Escapes user text before it is placed inside HTML (prevents broken pages / XSS)
    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
    }

    function formatAge(age) {
        if (age === 0) return "גור (עד שנה)";
        if (age === 1) return "שנה";
        if (age === 2) return "שנתיים";
        return `${age} שנים`;
    }

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    /* ---------- header and navigation ---------- */

    function getRole(user) {
        return user ? user.type : "guest";
    }

    // Every element with data-show="guest adopter ..." is shown only to those roles
    function applyRoleVisibility(role) {
        document.querySelectorAll("[data-show]").forEach((element) => {
            const roles = element.dataset.show.split(" ");
            element.hidden = !roles.includes(role);
        });
    }

    function markActiveLink() {
        const current = window.location.pathname.split("/").pop() || "index.html";
        document.querySelectorAll(".main-nav a").forEach((link) => {
            const target = link.getAttribute("href").split("?")[0];
            const isActive = target === current;
            link.classList.toggle("active", isActive);
            if (isActive) link.setAttribute("aria-current", "page");
        });
    }

    function setupMobileMenu() {
        const toggle = document.querySelector(".menu-toggle");
        const nav = document.getElementById("mainNav");
        if (!toggle || !nav) return;
        toggle.addEventListener("click", () => {
            const open = nav.classList.toggle("open");
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "סגירת התפריט" : "פתיחת התפריט");
        });
    }

    function setupLogout() {
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", () => {
                api.logout();
                setFlash("התנתקת בהצלחה. נשמח לראות אותך שוב!", "success");
                window.location.href = "index.html";
            });
        });
    }

    function setupHeader() {
        const user = api.getCurrentUser();
        applyRoleVisibility(getRole(user));
        const nameSlot = document.getElementById("navUserName");
        if (nameSlot && user) nameSlot.textContent = user.name;
        markActiveLink();
        setupMobileMenu();
        setupLogout();
        return user;
    }

    /* ---------- page access ---------- */

    // The page that a user sees right after logging in: the main service
    function homeForRole(user) {
        return user && user.type === "publisher" ? "publisher.html" : "dogs.html";
    }

    /**
     * Protects pages that need a logged-in user of a certain type.
     * A guest is sent to the login page and brought back afterwards.
     */
    function requireRole(user, roles) {
        if (!user) {
            const back = encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search);
            setFlash("יש להתחבר כדי להיכנס לעמוד הזה.", "info");
            window.location.replace(`login.html?returnTo=${back}`);
            return false;
        }
        if (roles && !roles.includes(user.type)) {
            showAccessDenied();
            return false;
        }
        return true;
    }

    function showAccessDenied() {
        const main = document.querySelector("main");
        if (!main) return;
        main.innerHTML = `
            <section class="container page-section">
                <div class="empty-state">
                    <div class="empty-icon" aria-hidden="true">🔒</div>
                    <h1>אין לך הרשאה לעמוד הזה</h1>
                    <p>העמוד מיועד לסוג משתמש אחר. אפשר לחזור לדף הבית ולהמשיך משם.</p>
                    <a class="btn btn-primary" href="index.html">חזרה לדף הבית</a>
                </div>
            </section>`;
    }

    /* ---------- messages ---------- */

    function ensureToastArea() {
        let area = document.getElementById("toastArea");
        if (!area) {
            area = document.createElement("div");
            area.id = "toastArea";
            area.className = "toast-area";
            area.setAttribute("aria-live", "polite");
            document.body.appendChild(area);
        }
        return area;
    }

    /**
     * Shows a short message in the corner of the screen.
     * type: success | error | info
     */
    function toast(message, type) {
        const area = ensureToastArea();
        const item = document.createElement("div");
        item.className = `toast toast-${type || "info"}`;
        item.setAttribute("role", type === "error" ? "alert" : "status");
        const icon = { success: "✓", error: "!", info: "i" }[type || "info"];
        item.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><span>${escapeHtml(message)}</span>`;
        area.appendChild(item);
        setTimeout(() => item.classList.add("leaving"), 3800);
        setTimeout(() => item.remove(), 4300);
    }

    // A message that is shown on the next page (after a redirect)
    function setFlash(message, type) {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
    }

    function showFlash() {
        const raw = sessionStorage.getItem(FLASH_KEY);
        if (!raw) return;
        sessionStorage.removeItem(FLASH_KEY);
        try {
            const flash = JSON.parse(raw);
            toast(flash.message, flash.type);
        } catch (error) { /* ignore broken value */ }
    }

    /**
     * A styled confirmation dialog (instead of the browser's confirm()).
     * Returns a Promise that resolves to true (confirmed) or false.
     */
    function confirmDialog({ title, text, confirmText, danger }) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
                <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                    <h2 id="modalTitle">${escapeHtml(title)}</h2>
                    <p>${escapeHtml(text)}</p>
                    <div class="modal-actions">
                        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-answer="yes">${escapeHtml(confirmText || "אישור")}</button>
                        <button type="button" class="btn btn-outline" data-answer="no">ביטול</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const yesButton = overlay.querySelector('[data-answer="yes"]');
            yesButton.focus();

            function close(answer) {
                overlay.classList.add("closing");
                document.removeEventListener("keydown", onKey);
                setTimeout(() => overlay.remove(), 180);
                resolve(answer);
            }
            function onKey(event) {
                if (event.key === "Escape") close(false);
            }
            overlay.addEventListener("click", (event) => {
                if (event.target === overlay) close(false);
                const button = event.target.closest("[data-answer]");
                if (button) close(button.dataset.answer === "yes");
            });
            document.addEventListener("keydown", onKey);
        });
    }

    // Disables a button and shows a spinner while waiting for the "server"
    function setLoading(button, isLoading, loadingText) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.classList.add("is-loading");
            button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHtml(loadingText || "רגע...")}`;
        } else {
            button.disabled = false;
            button.classList.remove("is-loading");
            if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
        }
    }

    // Shows a message box inside a form (for errors that come from the server)
    function showFormMessage(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = `form-message show ${type}`;
        if (type === "error") {
            element.classList.remove("shake");
            void element.offsetWidth;          // restart the animation
            element.classList.add("shake");
        }
    }

    function hideFormMessage(element) {
        if (!element) return;
        element.textContent = "";
        element.className = "form-message";
    }

    /* ---------- "show password" buttons ---------- */

    function setupPasswordToggles() {
        document.querySelectorAll(".toggle-password").forEach((button) => {
            button.addEventListener("click", () => {
                const input = document.getElementById(button.dataset.target);
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                button.textContent = show ? "הסתרה" : "הצגה";
                button.setAttribute("aria-label", show ? "הסתרת הסיסמה" : "הצגת הסיסמה");
                button.setAttribute("aria-pressed", String(show));
            });
        });
    }

    /* ---------- shared pieces of HTML ---------- */

    function statusTag(status, kind) {
        const label = kind === "dog" ? LABELS.dogStatus[status] : LABELS.requestStatus[status];
        return `<span class="tag status-${status}">${escapeHtml(label)}</span>`;
    }

    function matchBadge(match) {
        if (!match || match.unknown) return "";
        if (match.isMatch) return `<span class="tag tag-match">מתאים לך</span>`;
        return `<span class="tag tag-note" title="${escapeHtml(match.reasons.join(". "))}">שים לב: ${match.reasons.length === 1 ? "נקודה אחת לבדיקה" : match.reasons.length + " נקודות לבדיקה"}</span>`;
    }

    function traitTags(dog) {
        const tags = [`<span class="tag">${LABELS.size[dog.size]}</span>`];
        if (dog.goodWithKids) tags.push(`<span class="tag">מסתדר/ת עם ילדים</span>`);
        if (!dog.needsYard) tags.push(`<span class="tag">מתאים/ה לדירה</span>`);
        if (dog.energy === "high") tags.push(`<span class="tag">אנרגטי/ת</span>`);
        return tags.join("");
    }

    /**
     * Builds the HTML of one dog card. Used on the home page and the search page.
     * index is used to stagger the entrance animation.
     */
    function dogCard(dog, index) {
        return `
            <article class="dog-card fade-in" style="--delay:${Math.min(index || 0, 8) * 60}ms">
                <a class="dog-card-link" href="dog.html?id=${encodeURIComponent(dog.id)}" aria-label="פרטים על ${escapeHtml(dog.name)}">
                    <div class="dog-card-image">
                        <img src="${escapeHtml(dog.image)}" alt="${escapeHtml(dog.name)}, ${escapeHtml(dog.breed || "כלב לאימוץ")}" loading="lazy">
                    </div>
                    <div class="dog-card-body">
                        <h3>${escapeHtml(dog.name)}</h3>
                        <p class="dog-card-meta">${formatAge(dog.age)} · ${escapeHtml(LABELS.gender[dog.gender])} · ${escapeHtml(dog.city)}</p>
                        <div class="tag-row">${traitTags(dog)}</div>
                        ${dog.match ? `<div class="tag-row">${matchBadge(dog.match)}</div>` : ""}
                        <span class="btn btn-outline btn-small dog-card-cta">לפרטים</span>
                    </div>
                </a>
            </article>`;
    }

    function fillCitySelect(select, includeAll) {
        const options = window.PawHomeData.CITIES.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`);
        select.innerHTML = (includeAll ? `<option value="">כל הערים</option>` : `<option value="">בחירת עיר</option>`) + options.join("");
    }

    /* ---------- footer ---------- */

    function setupFooter() {
        const year = document.getElementById("footerYear");
        if (year) year.textContent = new Date().getFullYear();
        const reset = document.getElementById("resetDemo");
        if (reset) {
            reset.addEventListener("click", async () => {
                const ok = await confirmDialog({
                    title: "איפוס נתוני ההדגמה",
                    text: "כל השינויים שביצעת (משתמשים, כלבים ובקשות) יימחקו והאתר יחזור לנתונים המקוריים.",
                    confirmText: "איפוס", danger: true
                });
                if (!ok) return;
                api.resetDemoData();
                setFlash("נתוני ההדגמה אופסו.", "success");
                window.location.href = "index.html";
            });
        }
    }

    // Runs on every page
    function initPage() {
        const user = setupHeader();
        setupFooter();
        setupPasswordToggles();
        showFlash();
        return user;
    }

    window.PawHomeUI = {
        escapeHtml, formatDate, formatAge, getParam, initPage, homeForRole, requireRole,
        toast, setFlash, confirmDialog, setLoading, showFormMessage, hideFormMessage,
        statusTag, matchBadge, traitTags, dogCard, fillCitySelect
    };
})();
