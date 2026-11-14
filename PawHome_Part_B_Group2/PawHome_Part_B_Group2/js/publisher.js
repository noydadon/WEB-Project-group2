/* =========================================================
   publisher.js  (publisher.html) - publishers only
   - summary boxes (available dogs, pending requests, adopted)
   - pending requests table with approve / decline
     (approving moves the dog to "in adoption process"; other requests wait)
   - dogs in process: "adoption completed" or "did not happen" (back to available)
   - the publisher's dogs, with a filter by status
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const { LABELS } = window.PawHomeData;
    const user = ui.initPage();
    if (!ui.requireRole(user, ["publisher"])) return;

    const pendingArea = document.getElementById("pendingArea");
    const myDogs = document.getElementById("myDogs");
    const dogTabs = document.querySelectorAll("[data-dog-filter]");
    let dashboard = null;
    let dogFilter = "all";

    /* ---------- summary ---------- */

    function renderStats() {
        document.getElementById("publisherName").textContent = dashboard.publisherName;
        document.getElementById("statAvailable").textContent = dashboard.stats.available;
        document.getElementById("statPending").textContent = dashboard.stats.pending;
        document.getElementById("statInProcess").textContent = dashboard.stats.inProcess;
        document.getElementById("statClosed").textContent = dashboard.stats.closed;
    }

    /* ---------- pending requests ---------- */

    function homeText(adopter) {
        if (!adopter || !adopter.home) return "";
        const h = adopter.home;
        return `${LABELS.homeType[h.homeType]}, ${h.hasKids ? "יש ילדים" : "אין ילדים"}, ${h.hasDogs ? "יש כלב נוסף" : "אין כלב נוסף"}, בחוץ ${LABELS.hoursAway[h.hoursAway]}`;
    }

    function renderPending() {
        if (dashboard.pending.length === 0) {
            pendingArea.innerHTML = `
                <div class="empty-state" style="margin-bottom:2rem">
                    <div class="empty-icon" aria-hidden="true">✅</div>
                    <h3>אין בקשות שממתינות לתשובה</h3>
                    <p>בקשות חדשות יופיעו כאן ברגע שיישלחו.</p>
                </div>`;
            return;
        }
        const rows = dashboard.pending.map((r) => `
            <tr data-id="${r.id}">
                <td data-label="כלב"><a href="dog.html?id=${encodeURIComponent(r.dogId)}">${ui.escapeHtml(r.dogName)}</a></td>
                <td data-label="מבקש/ת">${ui.escapeHtml(r.adopter ? r.adopter.name : "")}<br><small>${ui.escapeHtml(r.adopter ? r.adopter.city : "")}</small></td>
                <td data-label="פרטי הבית">${ui.escapeHtml(homeText(r.adopter))}<br>${ui.matchBadge(r.match)}</td>
                <td data-label="הודעה">${ui.escapeHtml(r.message)}</td>
                <td data-label="זמן נוח">${LABELS.contactTime[r.contactTime]}</td>
                <td data-label="פעולות" class="actions">
                    <button class="btn btn-success btn-small" type="button" data-approve="${r.id}" ${r.onHold ? "disabled" : ""}>אישור</button>
                    <button class="btn btn-danger-outline btn-small" type="button" data-decline="${r.id}">דחייה</button>
                    ${r.onHold ? `<span class="hold-note">ממתינה: ${ui.escapeHtml(r.dogName)} בתהליך אימוץ עם מאמץ אחר</span>` : ""}
                </td>
            </tr>`).join("");
        pendingArea.innerHTML = `
            <div class="table-wrap">
                <table class="data-table">
                    <caption class="visually-hidden">בקשות אימוץ שממתינות לתשובה</caption>
                    <thead><tr><th scope="col">כלב</th><th scope="col">מבקש/ת</th><th scope="col">פרטי הבית</th><th scope="col">הודעה</th><th scope="col">זמן נוח</th><th scope="col">פעולות</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    /* ---------- my dogs ---------- */

    function contactLines(contact) {
        return `<p><a href="tel:${ui.escapeHtml(contact.phone)}">${ui.escapeHtml(contact.phone)}</a></p>
                <p><a href="mailto:${ui.escapeHtml(contact.email)}">${ui.escapeHtml(contact.email)}</a></p>`;
    }

    // In process: the contact details of the approved adopter and the two ways to finish the stage
    function processBox(dog) {
        const c = dog.adopterContact;
        return `
            <div class="process-box">
                <p><strong>בתהליך אימוץ עם ${ui.escapeHtml(c ? c.name : "")}</strong></p>
                ${c ? contactLines(c) : ""}
                <p class="field-hint">${dog.pendingCount ? `${dog.pendingCount} בקשות נוספות ממתינות למקרה שהאימוץ לא יתבצע.` : "אין בקשות נוספות שממתינות."}</p>
                <div class="process-actions">
                    <button class="btn btn-success btn-small" type="button" data-complete="${dog.id}">האימוץ הושלם</button>
                    <button class="btn btn-outline btn-small" type="button" data-reopen="${dog.id}">לא יצא לפועל: החזרה לזמינות</button>
                </div>
            </div>`;
    }

    function statusLine(dog) {
        if (dog.status === "available") return `${dog.pendingCount} בקשות ממתינות`;
        if (dog.status === "inProcess") return "לא מקבל בקשות חדשות כרגע";
        return "סגור לפניות";
    }

    function dogBox(dog, index) {
        let extra = "";
        if (dog.status === "inProcess") {
            extra = processBox(dog);
        } else if (dog.status === "closed" && dog.adopterContact) {
            extra = `<div class="contact-box"><p><strong>אומץ על ידי ${ui.escapeHtml(dog.adopterContact.name)}</strong></p>${contactLines(dog.adopterContact)}</div>`;
        }
        return `
            <article class="manage-dog" style="animation-delay:${Math.min(index, 8) * 50}ms">
                <a href="dog.html?id=${encodeURIComponent(dog.id)}"><img src="${ui.escapeHtml(dog.image)}" alt="${ui.escapeHtml(dog.name)}"></a>
                <div class="body">
                    <div class="request-head"><h3>${ui.escapeHtml(dog.name)}</h3>${ui.statusTag(dog.status, "dog")}</div>
                    <p class="request-meta" style="margin:0">${ui.formatAge(dog.age)} · ${ui.escapeHtml(dog.city)} · ${statusLine(dog)}</p>
                    ${extra}
                    <div class="actions">
                        <a class="btn btn-outline btn-small" href="dog-form.html?id=${encodeURIComponent(dog.id)}">עריכה</a>
                        <button class="btn btn-danger-outline btn-small" type="button" data-delete="${dog.id}">מחיקה</button>
                    </div>
                </div>
            </article>`;
    }

    function renderDogs() {
        const visible = dashboard.dogs.filter((d) => dogFilter === "all" || d.status === dogFilter);
        if (visible.length === 0) {
            myDogs.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <div class="empty-icon" aria-hidden="true">🐶</div>
                    <h3>${dashboard.dogs.length === 0 ? "עוד לא פרסמת כלבים" : "אין כלבים בקטגוריה הזו"}</h3>
                    <p>כלב שתפרסמו יופיע כאן ובתוצאות החיפוש של המאמצים.</p>
                    <a class="btn btn-primary" href="dog-form.html">פרסום כלב חדש</a>
                </div>`;
            return;
        }
        myDogs.innerHTML = visible.map(dogBox).join("");
    }

    function renderAll() {
        renderStats();
        renderPending();
        renderDogs();
    }

    async function reload() {
        dashboard = await api.getPublisherDashboard();
        renderAll();
    }

    /* ---------- actions (event delegation) ---------- */

    pendingArea.addEventListener("click", async (event) => {
        const approveButton = event.target.closest("[data-approve]");
        const declineButton = event.target.closest("[data-decline]");
        if (!approveButton && !declineButton) return;

        const id = (approveButton || declineButton).dataset.approve || (approveButton || declineButton).dataset.decline;
        const request = dashboard.pending.find((r) => r.id === id);
        const others = dashboard.pending.filter((r) => r.dogId === request.dogId && r.id !== id).length;
        const adopterName = request.adopter ? request.adopter.name : "";

        if (approveButton) {
            const ok = await ui.confirmDialog({
                title: `לאשר את הבקשה של ${adopterName}?`,
                text: `${request.dogName} יעבור/תעבור לסטטוס "בתהליך אימוץ" והמודעה לא תקבל בקשות חדשות. פרטי הקשר יועברו לשני הצדדים לתיאום פגישה.` + (others ? ` ${others} בקשות נוספות לכלב הזה יישארו בהמתנה, למקרה שהאימוץ לא יתבצע.` : ""),
                confirmText: "אישור הבקשה"
            });
            if (!ok) return;
            ui.setLoading(approveButton, true, "מאשרים...");
            try {
                const result = await api.approveRequest(id);
                await reload();
                ui.toast(`הבקשה אושרה ו${result.dogName} בתהליך אימוץ. הטלפון של ${adopterName}: ${result.adopterContact.phone}`, "success");
            } catch (error) {
                ui.setLoading(approveButton, false);
                ui.toast(error.message, "error");
            }
        } else {
            const ok = await ui.confirmDialog({
                title: `לדחות את הבקשה של ${adopterName}?`,
                text: `${request.dogName} יישאר/תישאר זמין/ה לבקשות אחרות.`,
                confirmText: "דחיית הבקשה", danger: true
            });
            if (!ok) return;
            ui.setLoading(declineButton, true, "דוחים...");
            try {
                await api.declineRequest(id);
                const row = pendingArea.querySelector(`tr[data-id="${id}"]`);
                if (row) row.classList.add("row-removing");
                setTimeout(reload, 350);
                ui.toast("הבקשה נדחתה.", "info");
            } catch (error) {
                ui.setLoading(declineButton, false);
                ui.toast(error.message, "error");
            }
        }
    });

    // Ends the "in process" stage: completed adoption, or back to available
    async function finishProcess(button, completed) {
        const dog = dashboard.dogs.find((d) => d.id === (button.dataset.complete || button.dataset.reopen));
        const ok = await ui.confirmDialog(completed
            ? {
                title: `האימוץ של ${dog.name} הושלם?`,
                text: "הכלב יסומן כמאומץ והמודעה תיסגר." + (dog.pendingCount ? ` ${dog.pendingCount} בקשות שחיכו יידחו.` : ""),
                confirmText: "כן, האימוץ הושלם"
            }
            : {
                title: `להחזיר את ${dog.name} לזמינות?`,
                text: "הבקשה שאושרה תסומן כ\"האימוץ לא יצא לפועל\", המודעה תחזור לחיפוש ותוכלו לאשר בקשה אחרת.",
                confirmText: "החזרה לזמינות"
            });
        if (!ok) return;
        ui.setLoading(button, true, "מעדכנים...");
        try {
            if (completed) {
                await api.completeAdoption(dog.id);
                await reload();
                ui.toast(`איזה כיף! ${dog.name} מצא/ה בית.`, "success");
            } else {
                const result = await api.reopenDog(dog.id);
                await reload();
                ui.toast(`${dog.name} זמין/ה שוב.` + (result.waitingCount ? ` ${result.waitingCount} בקשות ממתינות לתשובה.` : ""), "info");
            }
        } catch (error) {
            ui.setLoading(button, false);
            ui.toast(error.message, "error");
        }
    }

    myDogs.addEventListener("click", async (event) => {
        const completeButton = event.target.closest("[data-complete]");
        const reopenButton = event.target.closest("[data-reopen]");
        if (completeButton || reopenButton) {
            finishProcess(completeButton || reopenButton, Boolean(completeButton));
            return;
        }
        const button = event.target.closest("[data-delete]");
        if (!button) return;
        const dog = dashboard.dogs.find((d) => d.id === button.dataset.delete);
        const ok = await ui.confirmDialog({
            title: `למחוק את המודעה של ${dog.name}?`,
            text: "המודעה תימחק לצמיתות, ובקשות שממתינות לתשובה יידחו.",
            confirmText: "מחיקה", danger: true
        });
        if (!ok) return;
        try {
            await api.deleteDog(dog.id);
            await reload();
            ui.toast(`המודעה של ${dog.name} נמחקה.`, "success");
        } catch (error) {
            ui.toast(error.message, "error");
        }
    });

    dogTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            dogFilter = tab.dataset.dogFilter;
            dogTabs.forEach((t) => {
                t.classList.toggle("active", t === tab);
                t.setAttribute("aria-selected", String(t === tab));
            });
            renderDogs();
        });
    });

    reload().catch((error) => {
        pendingArea.innerHTML = `<div class="empty-state"><h2>אירעה שגיאה</h2><p>${ui.escapeHtml(error.message)}</p></div>`;
    });
});
