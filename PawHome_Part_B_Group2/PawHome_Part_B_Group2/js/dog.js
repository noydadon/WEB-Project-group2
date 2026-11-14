/* =========================================================
   dog.js  (dog.html?id=...)
   One generic page for every dog. It shows:
   - the dog's details and the compatibility check (adopters)
   - the adoption request form, or instead of it:
     a login button (guest), the request status (already sent),
     edit / delete buttons (the dog's publisher), or a closed notice
   - similar dogs
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const v = window.PawHomeValidation;
    const { LABELS } = window.PawHomeData;
    const user = ui.initPage();

    const dogId = ui.getParam("id");
    const content = document.getElementById("dogContent");
    const panel = document.getElementById("requestPanel");
    const similarSection = document.getElementById("similarSection");
    const similarDogs = document.getElementById("similarDogs");

    const MESSAGE_MIN = 20;
    // request statuses that still block sending a new request for the same dog
    const ACTIVE_STATUSES = ["pending", "approved", "adopted"];
    // the only allowed values of the contact time field (checked again by the server)
    const CONTACT_TIMES = ["morning", "afternoon", "evening"];
    const MESSAGE_MAX = 500;

    function showNotFound(text) {
        document.title = "הכלב לא נמצא | PawHome";
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon" aria-hidden="true">🔎</div>
                <h1>הכלב לא נמצא</h1>
                <p>${ui.escapeHtml(text)}</p>
                <a class="btn btn-primary" href="dogs.html">לחיפוש כלבים</a>
            </div>`;
    }

    /* ---------- dog details ---------- */

    function yesNo(value) {
        return value ? "כן" : "לא";
    }

    function matchNotice(dog) {
        if (!user) {
            return `<div class="notice notice-info"><h3>בדיקת התאמה לבית שלך</h3>
                <p style="margin:0"><a href="signup.html?type=adopter">הירשמו כמאמצים</a> כדי לראות אם ${ui.escapeHtml(dog.name)} מתאים/ה לבית שלכם.</p></div>`;
        }
        if (user.type !== "adopter" || dog.match.unknown) return "";
        if (dog.match.isMatch) {
            return `<div class="notice notice-match"><h3>✓ מתאים לבית שלך</h3>
                <p style="margin:0">לפי פרטי הבית שמסרת, לא נמצאו נקודות שדורשות בדיקה.</p></div>`;
        }
        const items = dog.match.reasons.map((reason) => `<li>${ui.escapeHtml(reason)}</li>`).join("");
        return `<div class="notice notice-note"><h3>שים לב לפני שליחת בקשה</h3>
            <ul>${items}</ul>
            <p style="margin:0.5rem 0 0">זו המלצה בלבד. אפשר עדיין לשלוח בקשה ולהסביר למפרסם איך תתאימו את הבית.</p></div>`;
    }

    function renderDog(data) {
        const dog = data.dog;
        document.title = `${dog.name} | PawHome`;
        const publisher = data.publisher
            ? `${ui.escapeHtml(data.publisher.name)} (${LABELS.publisherKind[data.publisher.kind] || ""}), ${ui.escapeHtml(data.publisher.city)}`
            : "";

        content.innerHTML = `
            <article class="dog-layout fade-in">
                <div class="dog-photo">
                    <img src="${ui.escapeHtml(dog.image)}" alt="${ui.escapeHtml(dog.name)}, ${ui.escapeHtml(dog.breed || "כלב לאימוץ")}">
                </div>
                <div>
                    <div class="dog-title">
                        <h1>${ui.escapeHtml(dog.name)}</h1>
                        ${ui.statusTag(dog.status, "dog")}
                    </div>
                    <table class="details-table">
                        <caption class="visually-hidden">פרטי הכלב</caption>
                        <tbody>
                            <tr><th scope="row">גיל</th><td>${ui.formatAge(dog.age)}</td></tr>
                            <tr><th scope="row">מין</th><td>${LABELS.gender[dog.gender]}</td></tr>
                            <tr><th scope="row">גודל</th><td>${LABELS.size[dog.size]}</td></tr>
                            <tr><th scope="row">גזע</th><td>${ui.escapeHtml(dog.breed || "לא צוין")}</td></tr>
                            <tr><th scope="row">רמת אנרגיה</th><td>${LABELS.energy[dog.energy]}</td></tr>
                            <tr><th scope="row">עיר</th><td>${ui.escapeHtml(dog.city)}</td></tr>
                            <tr><th scope="row">מסתדר עם ילדים</th><td>${yesNo(dog.goodWithKids)}</td></tr>
                            <tr><th scope="row">מסתדר עם כלבים</th><td>${yesNo(dog.goodWithDogs)}</td></tr>
                            <tr><th scope="row">זקוק לחצר</th><td>${yesNo(dog.needsYard)}</td></tr>
                        </tbody>
                    </table>
                    ${matchNotice(dog)}
                    <p>${ui.escapeHtml(dog.description)}</p>
                    <p class="publisher-line">מפרסם: ${publisher}<br>פורסם ב־${ui.formatDate(dog.createdAt)}</p>
                </div>
            </article>`;
    }

    /* ---------- request panel: what to show instead of / with the form ---------- */

    function renderPanel(data) {
        const dog = data.dog;
        panel.hidden = false;

        if (data.isOwner) {
            panel.innerHTML = `
                <div class="card">
                    <h2 id="requestTitle">ניהול המודעה</h2>
                    <p>${ownerStatusText(dog, data.pendingCount)}</p>
                    <div class="form-actions">
                        <a class="btn btn-primary" href="dog-form.html?id=${encodeURIComponent(dog.id)}">עריכה</a>
                        <button class="btn btn-danger-outline" type="button" id="deleteDog">מחיקת המודעה</button>
                        <a class="btn btn-outline" href="publisher.html">לניהול המודעות</a>
                    </div>
                </div>`;
            document.getElementById("deleteDog").addEventListener("click", () => deleteDog(dog));
            return;
        }

        // An adopter who already has an active request sees its status instead of the form
        if (data.myRequest && ACTIVE_STATUSES.includes(data.myRequest.status)) {
            renderExistingRequest(data.myRequest);
            return;
        }

        if (dog.status === "inProcess") {
            panel.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" aria-hidden="true">🤝</div>
                    <h2 id="requestTitle">${ui.escapeHtml(dog.name)} בתהליך אימוץ</h2>
                    <p>המפרסם אישר בקשה של מאמץ אחר והם בשלב ההיכרות, ולכן המודעה לא מקבלת כרגע בקשות חדשות. אם האימוץ לא יצא לפועל, המודעה תחזור להיות זמינה.</p>
                    <a class="btn btn-outline" href="dogs.html">לכלבים זמינים</a>
                </div>`;
            return;
        }

        if (dog.status !== "available") {
            panel.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" aria-hidden="true">🏠</div>
                    <h2 id="requestTitle">${ui.escapeHtml(dog.name)} כבר מצא/ה בית</h2>
                    <p>המודעה סגורה לפניות נוספות. אולי אחד הכלבים הדומים יתאים לכם.</p>
                </div>`;
            return;
        }

        if (!user) {
            const back = encodeURIComponent(`dog.html?id=${dog.id}`);
            panel.innerHTML = `
                <div class="card">
                    <h2 id="requestTitle">רוצים לאמץ את ${ui.escapeHtml(dog.name)}?</h2>
                    <p>כדי לשלוח בקשת אימוץ צריך להתחבר. אחרי ההתחברות תחזרו ישירות לעמוד הזה.</p>
                    <div class="form-actions">
                        <a class="btn btn-primary" href="login.html?returnTo=${back}">התחברות לשליחת בקשה</a>
                        <a class="btn btn-outline" href="signup.html?type=adopter">הרשמה כמאמצים</a>
                    </div>
                </div>`;
            return;
        }

        if (user.type === "publisher") {
            panel.innerHTML = `<div class="notice notice-info"><h2 id="requestTitle" style="font-size:1.1rem">צפייה בלבד</h2>
                <p style="margin:0">שליחת בקשות אימוץ זמינה למשתמשים מסוג מאמץ.</p></div>`;
            return;
        }

        renderRequestForm(dog);
    }

    function ownerStatusText(dog, pendingCount) {
        if (dog.status === "available") {
            return `התקבלו <strong>${pendingCount}</strong> בקשות שממתינות לתשובה. את הבקשות מאשרים בעמוד ניהול המודעות.`;
        }
        if (dog.status === "inProcess") {
            return `המודעה בתהליך אימוץ ו־${pendingCount} בקשות נוספות ממתינות. לאחר הפגישה עדכנו בעמוד ניהול המודעות אם האימוץ הושלם או שהמודעה חוזרת להיות זמינה.`;
        }
        return "האימוץ הושלם והמודעה סגורה לפניות.";
    }

    function renderExistingRequest(request) {
        const isPending = request.status === "pending";
        panel.innerHTML = `
            <div class="card">
                <h2 id="requestTitle">הבקשה שלך</h2>
                <p>שלחת בקשה ב־${ui.formatDate(request.createdAt)}. סטטוס: ${ui.statusTag(request.status)}</p>
                <p>${isPending ? "המפרסם יעדכן אותך כאן ובעמוד הבקשות שלך." : "פרטי הקשר של המפרסם מופיעים בעמוד הבקשות שלך."}</p>
                <a class="btn btn-outline" href="my-requests.html">לעמוד הבקשות שלי</a>
            </div>`;
    }

    /* ---------- the adoption request form ---------- */

    function renderRequestForm(dog) {
        panel.innerHTML = `
            <form id="requestForm" class="card" novalidate>
                <h2 id="requestTitle">שליחת בקשת אימוץ ל${ui.escapeHtml(dog.name)}</h2>
                <p id="requestMessage" class="form-message" role="alert"></p>
                <div class="form-field">
                    <label for="requestText">הודעה למפרסם</label>
                    <textarea id="requestText" maxlength="${MESSAGE_MAX + 50}" placeholder="ספרו קצת על עצמכם, על הבית ולמה ${ui.escapeHtml(dog.name)} מתאים/ה לכם"></textarea>
                    <p class="char-counter too-short" id="requestCounter" aria-live="polite">0 / ${MESSAGE_MAX} (לפחות ${MESSAGE_MIN})</p>
                    <p class="field-error" id="requestTextError"></p>
                </div>
                <fieldset class="choice-group">
                    <legend>זמן נוח ליצירת קשר</legend>
                    <div class="choice-row">
                        <label class="choice-pill"><input type="radio" name="contactTime" value="morning"><span>בוקר (8:00 עד 12:00)</span></label>
                        <label class="choice-pill"><input type="radio" name="contactTime" value="afternoon"><span>צהריים (12:00 עד 16:00)</span></label>
                        <label class="choice-pill"><input type="radio" name="contactTime" value="evening"><span>ערב (16:00 עד 20:00)</span></label>
                    </div>
                    <p class="field-hint">חובה לבחור אחת משלוש האפשרויות.</p>
                    <p class="field-error" id="contactTimeError"></p>
                </fieldset>
                <p class="field-hint">פרטי הקשר שלך יועברו למפרסם רק אם יאשר את הבקשה.</p>
                <button class="btn btn-primary" type="submit" id="sendRequest">שליחת בקשה</button>
            </form>`;

        const form = document.getElementById("requestForm");
        const text = document.getElementById("requestText");
        const counter = document.getElementById("requestCounter");
        const message = document.getElementById("requestMessage");
        const sendButton = document.getElementById("sendRequest");
        const firstTime = form.querySelector('input[name="contactTime"]');

        const validateText = () => v.rules.textLength(text.value, MESSAGE_MIN, MESSAGE_MAX, "ההודעה");

        // Live character counter: shows how many characters are left or still missing
        text.addEventListener("input", () => {
            const length = text.value.trim().length;
            counter.textContent = `${length} / ${MESSAGE_MAX}` + (length < MESSAGE_MIN ? ` (חסרים עוד ${MESSAGE_MIN - length})` : "");
            counter.classList.toggle("too-short", length < MESSAGE_MIN);
            counter.classList.toggle("too-long", length > MESSAGE_MAX);
        });
        v.liveValidate(text, validateText);
        form.querySelectorAll('input[name="contactTime"]').forEach((radio) => {
            radio.addEventListener("change", () => v.clearFieldError(radio));
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            ui.hideFormMessage(message);
            const contactTime = window.PawHomeForms.radioValue(form, "contactTime");
            const valid = v.validateAll([
                { field: text, validate: validateText },
                { field: firstTime, validate: () => v.rules.oneOf(contactTime, CONTACT_TIMES, "זמן נוח ליצירת קשר") }
            ]);
            if (!valid) return;

            ui.setLoading(sendButton, true, "שולחים...");
            try {
                await api.sendRequest(dog.id, text.value, contactTime);
                showSentMessage(dog);
                ui.toast(`הבקשה ל${dog.name} נשלחה!`, "success");
            } catch (error) {
                ui.setLoading(sendButton, false);
                handleSendError(error, dog, message);
            }
        });
    }

    // After a successful request the form is replaced by a success message
    function showSentMessage(dog) {
        panel.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon" aria-hidden="true">💌</div>
                <h2 id="requestTitle">הבקשה נשלחה בהצלחה</h2>
                <p>הבקשה ל${ui.escapeHtml(dog.name)} נמצאת עכשיו בסטטוס "ממתינה". כשהמפרסם יאשר אותה, יופיעו בעמוד הבקשות שלך הטלפון והמייל שלו.</p>
                <a class="btn btn-primary" href="my-requests.html">לעמוד הבקשות שלי</a>
                <a class="btn btn-outline" href="dogs.html">להמשך החיפוש</a>
            </div>`;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleSendError(error, dog, message) {
        if (error.code === "DOG_CLOSED") {
            const link = `dogs.html?size=${dog.size}&city=${encodeURIComponent(dog.city)}`;
            ui.showFormMessage(message, error.message, "error");
            message.insertAdjacentHTML("beforeend", ` <a href="${link}">לכלבים דומים</a>`);
        } else if (error.code === "DOG_IN_PROCESS") {
            ui.showFormMessage(message, error.message, "error");
            message.insertAdjacentHTML("beforeend", ` <a href="dogs.html">לכלבים זמינים</a>`);
        } else if (error.code === "DUPLICATE") {
            ui.showFormMessage(message, error.message, "error");
            message.insertAdjacentHTML("beforeend", ` <a href="my-requests.html">לעמוד הבקשות שלי</a>`);
        } else if (error.code === "NOT_LOGGED_IN") {
            window.location.href = `login.html?returnTo=${encodeURIComponent("dog.html?id=" + dog.id)}`;
        } else {
            ui.showFormMessage(message, error.message, "error");
        }
    }

    /* ---------- owner actions ---------- */

    async function deleteDog(dog) {
        const ok = await ui.confirmDialog({
            title: `למחוק את המודעה של ${dog.name}?`,
            text: "המודעה תימחק לצמיתות, ובקשות שממתינות לתשובה יידחו.",
            confirmText: "מחיקה", danger: true
        });
        if (!ok) return;
        try {
            await api.deleteDog(dog.id);
            ui.setFlash(`המודעה של ${dog.name} נמחקה.`, "success");
            window.location.href = "publisher.html";
        } catch (error) {
            ui.toast(error.message, "error");
        }
    }

    /* ---------- similar dogs ---------- */

    function renderSimilar(dogs) {
        if (dogs.length === 0) return;
        similarDogs.innerHTML = dogs.map((dog, index) => ui.dogCard(dog, index)).join("");
        similarSection.hidden = false;
    }

    /* ---------- load ---------- */

    // "Back" returns to the same search (with its filters) when the user came from there
    if (document.referrer.includes("dogs.html")) {
        document.getElementById("backLink").href = document.referrer;
    }

    if (!dogId) {
        showNotFound("לא נבחר כלב. חזרו לעמוד החיפוש ובחרו כלב מהרשימה.");
        return;
    }

    api.getDog(dogId)
        .then((data) => {
            renderDog(data);
            renderPanel(data);
            if (!data.isOwner) api.getSimilarDogs(dogId, 3).then(renderSimilar);
        })
        .catch((error) => showNotFound(error.message));
});
