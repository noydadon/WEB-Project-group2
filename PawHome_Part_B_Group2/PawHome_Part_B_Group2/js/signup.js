/* =========================================================
   signup.js  (signup.html)
   Sign up in two steps (shorter forms, easier to fill):
   1. choose a user type (adopter or publisher)
   2. details: the form shows only the fields of that type
   After a successful sign up the user is logged in and sent
   to the main service of their type.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const v = window.PawHomeValidation;
    const forms = window.PawHomeForms;
    const user = ui.initPage();

    if (user) {
        window.location.replace(ui.homeForRole(user));
        return;
    }

    const form = document.getElementById("signupForm");
    const stepType = document.getElementById("stepType");
    const stepDetails = document.getElementById("stepDetails");
    const stepperType = document.getElementById("stepperType");
    const stepperDetails = document.getElementById("stepperDetails");
    const adopterFields = document.getElementById("adopterFields");
    const publisherFields = document.getElementById("publisherFields");
    const detailsTitle = document.getElementById("stepDetailsTitle");
    const nameLabel = form.querySelector('label[for="fullName"]');
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const terms = document.getElementById("terms");
    const message = document.getElementById("signupMessage");
    const submitButton = document.getElementById("signupButton");

    ui.fillCitySelect(document.getElementById("city"), false);
    forms.attachLiveValidation(form);
    v.liveValidate(password, () => v.rules.password(password.value));
    v.liveValidate(confirmPassword, () => v.rules.confirmPassword(confirmPassword.value, password.value));
    terms.addEventListener("change", () => v.clearFieldError(terms));

    function selectedType() {
        return forms.radioValue(form, "userType");
    }

    // Moves between the two steps and shows only the relevant fieldset
    function showStep(step) {
        const isDetails = step === "details";
        stepType.hidden = isDetails;
        stepDetails.hidden = !isDetails;
        stepperType.className = isDetails ? "done" : "current";
        stepperDetails.className = isDetails ? "current" : "";

        if (isDetails) {
            const isAdopter = selectedType() === "adopter";
            adopterFields.hidden = !isAdopter;
            publisherFields.hidden = isAdopter;
            detailsTitle.textContent = isAdopter ? "פרטי המאמץ/ת" : "פרטי המפרסם";
            nameLabel.textContent = isAdopter ? "שם מלא" : "שם מלא או שם העמותה";
            document.getElementById("fullName").focus();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Step 1 -> step 2
    document.getElementById("toDetails").addEventListener("click", () => {
        const typeInput = forms.firstRadio(form, "userType");
        const error = v.rules.select(selectedType(), "סוג משתמש");
        v.setFieldError(typeInput, error);
        if (!error) showStep("details");
    });

    form.querySelectorAll('input[name="userType"]').forEach((radio) => {
        radio.addEventListener("change", () => v.clearFieldError(radio));
    });

    document.getElementById("backToType").addEventListener("click", () => showStep("type"));

    // A link such as signup.html?type=publisher selects the type in advance
    const typeFromLink = ui.getParam("type");
    if (typeFromLink === "adopter" || typeFromLink === "publisher") {
        forms.setRadio(form, "userType", typeFromLink);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        ui.hideFormMessage(message);
        const type = selectedType();

        const checks = forms.personalChecks(form).concat([
            { field: password, validate: () => v.rules.password(password.value) },
            { field: confirmPassword, validate: () => v.rules.confirmPassword(confirmPassword.value, password.value) }
        ]);
        checks.push(...(type === "adopter" ? forms.homeChecks(form) : forms.publisherChecks(form)));
        checks.push({ field: terms, validate: () => (terms.checked ? "" : "יש לאשר את התנאים כדי להירשם.") });

        if (!v.validateAll(checks)) {
            ui.showFormMessage(message, "חלק מהשדות חסרים או שגויים. הפרטים מסומנים באדום.", "error");
            return;
        }

        const data = Object.assign(forms.readPersonal(form), { type: type, password: password.value });
        if (type === "adopter") {
            data.home = forms.readHome(form);
        } else {
            data.publisherKind = forms.radioValue(form, "publisherKind");
        }

        ui.setLoading(submitButton, true, "יוצרים חשבון...");
        try {
            const newUser = await api.register(data);
            ui.setFlash(
                newUser.type === "adopter"
                    ? `ברוך/ה הבא/ה ${newUser.name}! עכשיו לכל כלב מוצגת בדיקת התאמה לבית שלך.`
                    : `ברוך/ה הבא/ה ${newUser.name}! אפשר לפרסם את הכלב הראשון.`,
                "success");
            window.location.href = ui.homeForRole(newUser);
        } catch (error) {
            ui.setLoading(submitButton, false);
            if (error.code === "EMAIL_TAKEN") {
                v.setFieldError(document.getElementById("email"), error.message);
                ui.showFormMessage(message, "כתובת הדואר האלקטרוני כבר רשומה. אפשר להתחבר בעמוד ההתחברות.", "error");
            } else {
                ui.showFormMessage(message, error.message, "error");
            }
        }
    });
});
