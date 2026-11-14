/* =========================================================
   forms.js
   Field groups that appear in more than one form
   (sign up and profile), written once to avoid duplicate code:
   - personal details: name, email, phone, city
   - adopter home details: home type, kids, dogs, hours away
   - publisher type
   ========================================================= */

(function () {
    "use strict";

    const v = window.PawHomeValidation;

    // Value of the checked radio button in a group ("" if none is checked)
    function radioValue(form, name) {
        const checked = form.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : "";
    }

    function setRadio(form, name, value) {
        const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
        if (input) input.checked = true;
    }

    // First radio of a group: the element used to show the group's error
    function firstRadio(form, name) {
        return form.querySelector(`input[name="${name}"]`);
    }

    /* ---------- personal details ---------- */

    function personalFields(form) {
        return {
            name: form.querySelector("#fullName"),
            email: form.querySelector("#email"),
            phone: form.querySelector("#phone"),
            city: form.querySelector("#city")
        };
    }

    function personalChecks(form) {
        const f = personalFields(form);
        return [
            { field: f.name, validate: () => v.rules.fullName(f.name.value) },
            { field: f.email, validate: () => v.rules.email(f.email.value) },
            { field: f.phone, validate: () => v.rules.phone(f.phone.value) },
            { field: f.city, validate: () => v.rules.select(f.city.value, "עיר") }
        ];
    }

    function readPersonal(form) {
        const f = personalFields(form);
        return {
            name: f.name.value.trim(),
            email: f.email.value.trim(),
            phone: v.normalizePhone(f.phone.value),
            city: f.city.value
        };
    }

    function fillPersonal(form, user) {
        const f = personalFields(form);
        f.name.value = user.name;
        f.email.value = user.email;
        f.phone.value = user.phone;
        f.city.value = user.city;
    }

    /* ---------- adopter home details ---------- */

    const HOME_GROUPS = [
        { name: "homeType", label: "סוג מגורים" },
        { name: "hasKids", label: "האם יש ילדים בבית" },
        { name: "hasDogs", label: "האם יש כלב נוסף בבית" },
        { name: "hoursAway", label: "כמה שעות ביום הבית ריק" }
    ];

    function homeChecks(form) {
        return HOME_GROUPS.map((group) => ({
            field: firstRadio(form, group.name),
            validate: () => v.rules.select(radioValue(form, group.name), group.label)
        }));
    }

    function readHome(form) {
        return {
            homeType: radioValue(form, "homeType"),
            hasKids: radioValue(form, "hasKids") === "yes",
            hasDogs: radioValue(form, "hasDogs") === "yes",
            hoursAway: radioValue(form, "hoursAway")
        };
    }

    function fillHome(form, home) {
        if (!home) return;
        setRadio(form, "homeType", home.homeType);
        setRadio(form, "hasKids", home.hasKids ? "yes" : "no");
        setRadio(form, "hasDogs", home.hasDogs ? "yes" : "no");
        setRadio(form, "hoursAway", home.hoursAway);
    }

    /* ---------- publisher type ---------- */

    function publisherChecks(form) {
        return [{
            field: firstRadio(form, "publisherKind"),
            validate: () => v.rules.select(radioValue(form, "publisherKind"), "סוג מפרסם")
        }];
    }

    // Live validation for the personal fields and clearing radio errors on change
    function attachLiveValidation(form) {
        personalChecks(form).forEach((check) => v.liveValidate(check.field, check.validate));
        form.querySelectorAll('input[type="radio"]').forEach((radio) => {
            radio.addEventListener("change", () => v.clearFieldError(radio));
        });
    }

    window.PawHomeForms = {
        radioValue, setRadio, firstRadio,
        personalChecks, readPersonal, fillPersonal,
        homeChecks, readHome, fillHome, publisherChecks, attachLiveValidation
    };
})();
