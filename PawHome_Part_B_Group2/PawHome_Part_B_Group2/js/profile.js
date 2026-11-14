/* =========================================================
   profile.js  (profile.html) - any logged-in user
   - edit personal details (and home details / publisher type)
   - change the password
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const v = window.PawHomeValidation;
    const forms = window.PawHomeForms;
    const user = ui.initPage();
    if (!ui.requireRole(user)) return;

    const profileForm = document.getElementById("profileForm");
    const profileMessage = document.getElementById("profileMessage");
    const profileButton = document.getElementById("profileButton");
    const isAdopter = user.type === "adopter";

    /* ---------- personal details ---------- */

    document.getElementById("roleBadge").textContent = isAdopter ? "מאמץ/ת" : "מפרסם";
    document.getElementById("adopterFields").hidden = !isAdopter;
    document.getElementById("publisherFields").hidden = isAdopter;
    ui.fillCitySelect(document.getElementById("city"), false);

    forms.fillPersonal(profileForm, user);
    if (isAdopter) {
        forms.fillHome(profileForm, user.home);
    } else {
        forms.setRadio(profileForm, "publisherKind", user.publisherKind);
    }
    forms.attachLiveValidation(profileForm);

    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        ui.hideFormMessage(profileMessage);
        const checks = forms.personalChecks(profileForm)
            .concat(isAdopter ? forms.homeChecks(profileForm) : forms.publisherChecks(profileForm));
        if (!v.validateAll(checks)) return;

        const data = forms.readPersonal(profileForm);
        if (isAdopter) data.home = forms.readHome(profileForm);
        else data.publisherKind = forms.radioValue(profileForm, "publisherKind");

        ui.setLoading(profileButton, true, "שומרים...");
        try {
            const updated = await api.updateProfile(data);
            document.getElementById("navUserName").textContent = updated.name;
            ui.showFormMessage(profileMessage, isAdopter
                ? "הפרטים נשמרו. בדיקת ההתאמה בחיפוש מתעדכנת לפי פרטי הבית החדשים."
                : "הפרטים נשמרו.", "success");
            ui.toast("הפרופיל עודכן.", "success");
        } catch (error) {
            if (error.code === "EMAIL_TAKEN") v.setFieldError(document.getElementById("email"), error.message);
            ui.showFormMessage(profileMessage, error.message, "error");
        } finally {
            ui.setLoading(profileButton, false);
        }
    });

    /* ---------- change password ---------- */

    const passwordForm = document.getElementById("passwordForm");
    const passwordMessage = document.getElementById("passwordMessage");
    const passwordButton = document.getElementById("passwordButton");
    const current = document.getElementById("currentPassword");
    const next = document.getElementById("newPassword");
    const confirmField = document.getElementById("confirmNewPassword");

    v.liveValidate(next, () => v.rules.password(next.value));
    v.liveValidate(confirmField, () => v.rules.confirmPassword(confirmField.value, next.value));

    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        ui.hideFormMessage(passwordMessage);
        const valid = v.validateAll([
            { field: current, validate: () => v.rules.required(current.value, "את הסיסמה הנוכחית") },
            { field: next, validate: () => v.rules.password(next.value) },
            { field: confirmField, validate: () => v.rules.confirmPassword(confirmField.value, next.value) }
        ]);
        if (!valid) return;

        ui.setLoading(passwordButton, true, "מעדכנים...");
        try {
            await api.changePassword(current.value, next.value);
            passwordForm.reset();
            [current, next, confirmField].forEach((field) => v.clearFieldError(field));
            ui.showFormMessage(passwordMessage, "הסיסמה עודכנה. בהתחברות הבאה יש להשתמש בסיסמה החדשה.", "success");
        } catch (error) {
            if (error.code === "BAD_PASSWORD") v.setFieldError(current, error.message);
            if (error.code === "SAME_PASSWORD") v.setFieldError(next, error.message);
            ui.showFormMessage(passwordMessage, error.message, "error");
        } finally {
            ui.setLoading(passwordButton, false);
        }
    });
});
