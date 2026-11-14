/* =========================================================
   requests.js  (my-requests.html) - adopters only
   - lists the adopter's requests with their status
   - tabs filter the list without reloading the page
   - a pending request can be cancelled
   - an approved request shows the publisher's contact details
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const { LABELS } = window.PawHomeData;
    const user = ui.initPage();
    if (!ui.requireRole(user, ["adopter"])) return;

    const list = document.getElementById("requestList");
    const tabs = document.querySelectorAll(".tab[data-filter]");
    let requests = [];
    let currentFilter = "all";

    // Tabs group several statuses together
    const FILTER_GROUPS = {
        pending: ["pending"],
        approved: ["approved", "adopted"],
        closed: ["declined", "cancelled", "notCompleted"]
    };

    function matchesFilter(request, filter) {
        return filter === "all" || FILTER_GROUPS[filter].includes(request.status);
    }

    function updateCounts() {
        ["all", "pending", "approved", "closed"].forEach((filter) => {
            const count = requests.filter((r) => matchesFilter(r, filter)).length;
            document.querySelector(`[data-count="${filter}"]`).textContent = count;
        });
    }

    function contactBox(request) {
        const c = request.publisherContact;
        if (!c) return "";
        const title = request.status === "adopted"
            ? `האימוץ הושלם! פרטי הקשר של ${ui.escapeHtml(c.name)}:`
            : `הבקשה אושרה ו${ui.escapeHtml(request.dog ? request.dog.name : "הכלב")} בתהליך אימוץ. פרטי הקשר של ${ui.escapeHtml(c.name)}:`;
        return `
            <div class="contact-box">
                <p><strong>${title}</strong></p>
                <p>טלפון: <a href="tel:${ui.escapeHtml(c.phone)}">${ui.escapeHtml(c.phone)}</a></p>
                <p>דואר אלקטרוני: <a href="mailto:${ui.escapeHtml(c.email)}">${ui.escapeHtml(c.email)}</a></p>
                <p>${request.status === "adopted" ? "מאחלים לכם הרבה שנים טובות ביחד!" : "צרו קשר כדי לתאם פגישת היכרות. לאחר הפגישה המפרסם יעדכן אם האימוץ הושלם."}</p>
            </div>`;
    }

    function requestCard(request, index) {
        const dog = request.dog;
        const dogLink = dog ? `dog.html?id=${encodeURIComponent(dog.id)}` : "#";
        const image = dog ? `<a href="${dogLink}"><img src="${ui.escapeHtml(dog.image)}" alt="${ui.escapeHtml(dog.name)}"></a>` : "";
        const title = dog ? `<a href="${dogLink}">${ui.escapeHtml(dog.name)}</a>` : "מודעה שנמחקה";
        return `
            <article class="request-card" data-id="${request.id}" style="animation-delay:${Math.min(index, 8) * 50}ms">
                ${image}
                <div>
                    <div class="request-head">
                        <h3>${title}</h3>
                        ${ui.statusTag(request.status)}
                    </div>
                    <p class="request-meta">נשלחה ב־${ui.formatDate(request.createdAt)} · ${ui.escapeHtml(request.publisherName)} · זמן נוח: ${LABELS.contactTime[request.contactTime]}</p>
                    <p class="request-message">${ui.escapeHtml(request.message)}</p>
                    ${contactBox(request)}
                    ${request.status === "pending" ? `<button class="btn btn-danger-outline btn-small" type="button" data-cancel="${request.id}">ביטול הבקשה</button>` : ""}
                    ${request.status === "declined" ? `<p class="field-hint">הבקשה לא אושרה. <a href="dogs.html">לחיפוש כלבים נוספים</a></p>` : ""}
                    ${request.status === "notCompleted" ? `<p class="field-hint">האימוץ לא יצא לפועל והמודעה חזרה להיות זמינה. <a href="dogs.html">לחיפוש כלבים נוספים</a></p>` : ""}
                </div>
            </article>`;
    }

    function emptyState() {
        const texts = {
            all: ["עוד לא שלחת בקשות אימוץ", "מצאו כלב שמתאים לבית שלכם ושלחו בקשה מעמוד הכלב."],
            pending: ["אין בקשות שממתינות לתשובה", "כל הבקשות שלך כבר טופלו."],
            approved: ["עוד אין בקשות שאושרו", "כשמפרסם יאשר בקשה, פרטי הקשר שלו יופיעו כאן."],
            closed: ["אין בקשות שנסגרו", "כאן יופיעו בקשות שנדחו, שביטלת או שהאימוץ בהן לא יצא לפועל."]
        }[currentFilter];
        return `
            <div class="empty-state">
                <div class="empty-icon" aria-hidden="true">📭</div>
                <h2>${texts[0]}</h2>
                <p>${texts[1]}</p>
                <a class="btn btn-primary" href="dogs.html">לחיפוש כלבים</a>
            </div>`;
    }

    function render() {
        const visible = requests.filter((r) => matchesFilter(r, currentFilter));
        list.innerHTML = visible.length ? visible.map(requestCard).join("") : emptyState();
        updateCounts();
    }

    // Tabs: change the filter and re-render the list (DOM only, no page reload)
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            currentFilter = tab.dataset.filter;
            tabs.forEach((t) => {
                t.classList.toggle("active", t === tab);
                t.setAttribute("aria-selected", String(t === tab));
            });
            render();
        });
    });

    // One listener for all cancel buttons (event delegation)
    list.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-cancel]");
        if (!button) return;
        const request = requests.find((r) => r.id === button.dataset.cancel);
        const dogName = request && request.dog ? request.dog.name : "הכלב";
        const ok = await ui.confirmDialog({
            title: `לבטל את הבקשה ל${dogName}?`,
            text: "המפרסם לא יראה יותר את הבקשה. אפשר לשלוח בקשה חדשה בהמשך.",
            confirmText: "ביטול הבקשה", danger: true
        });
        if (!ok) return;

        ui.setLoading(button, true, "מבטלים...");
        try {
            await api.cancelRequest(request.id);
            request.status = "cancelled";
            render();
            ui.toast(`הבקשה ל${dogName} בוטלה.`, "success");
        } catch (error) {
            ui.setLoading(button, false);
            ui.toast(error.message, "error");
        }
    });

    api.getMyRequests()
        .then((data) => {
            requests = data;
            render();
        })
        .catch((error) => {
            list.innerHTML = `<div class="empty-state"><h2>אירעה שגיאה</h2><p>${ui.escapeHtml(error.message)}</p></div>`;
        });
});
