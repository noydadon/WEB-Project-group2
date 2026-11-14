/* =========================================================
   login.js  (login.html)
   Validates the login form, logs in through the simulated
   server and sends the user to the main service:
   adopter -> search page, publisher -> dashboard,
   or back to the page they came from (?returnTo=).
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const v = window.PawHomeValidation;
    const user = ui.initPage();

    // Only allow local pages in returnTo (never redirect to another site)
    function safeReturnTo() {
        const target = ui.getParam("returnTo");
        return target && /^[a-z-]+\.html(\?[\w=&%-]*)?$/i.test(target) ? target : null;
    }

    // A user who is already logged in does not need this page
    if (user) {
        window.location.replace(safeReturnTo() || ui.homeForRole(user));
        return;
    }

    const form = document.getElementById("loginForm");
    const email = document.getElementById("loginEmail");
    const password = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    const button = document.getElementById("loginButton");

    v.liveValidate(email, () => v.rules.email(email.value));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        ui.hideFormMessage(message);

        const valid = v.validateAll([
            { field: email, validate: () => v.rules.email(email.value) },
            { field: password, validate: () => v.rules.required(password.value, "סיסמה") }
        ]);
        if (!valid) return;

        ui.setLoading(button, true, "מתחברים...");
        try {
            const loggedIn = await api.login(email.value, password.value);
            ui.setFlash(`שלום ${loggedIn.name}, התחברת בהצלחה!`, "success");
            window.location.href = safeReturnTo() || ui.homeForRole(loggedIn);
        } catch (error) {
            ui.setLoading(button, false);
            ui.showFormMessage(message, error.message, "error");
            password.value = "";
            password.focus();
        }
    });

    // Demo accounts: fill the form with one click
    document.querySelectorAll("[data-demo-email]").forEach((demoButton) => {
        demoButton.addEventListener("click", () => {
            email.value = demoButton.dataset.demoEmail;
            password.value = demoButton.dataset.demoPassword;
            v.clearFieldError(email);
            v.clearFieldError(password);
            button.focus();
            ui.toast("הפרטים מולאו. לחצו על \"התחברות\".", "info");
        });
    });
});
