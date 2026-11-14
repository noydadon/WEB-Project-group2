/* =========================================================
   validation.js
   Validation rules for every field in the site, plus helpers
   that show and clear the error message next to a field.
   Each rule returns "" when the value is valid, or a clear
   Hebrew error message when it is not.
   ========================================================= */

(function () {
    "use strict";

    const NAME_PATTERN = /^[A-Za-zא-ת][A-Za-zא-ת '"\-.]*$/;
    const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

    // Removes spaces and dashes so "052-123 4567" becomes "0521234567"
    function normalizePhone(value) {
        return String(value || "").replace(/[\s-]/g, "");
    }

    const rules = {
        required(value, label) {
            return String(value || "").trim() === "" ? `יש למלא ${label}.` : "";
        },

        fullName(value) {
            const v = String(value || "").trim();
            if (!v) return "יש למלא שם מלא.";
            if (v.length < 2) return "השם צריך להכיל לפחות 2 תווים.";
            if (v.length > 40) return "השם יכול להכיל עד 40 תווים.";
            if (!NAME_PATTERN.test(v)) return "השם יכול להכיל אותיות בעברית או באנגלית, רווחים ומקף בלבד.";
            return "";
        },

        email(value) {
            const v = String(value || "").trim();
            if (!v) return "יש למלא כתובת דואר אלקטרוני.";
            if (/[^\x00-\x7F]/.test(v)) return "כתובת הדואר האלקטרוני צריכה להיות באותיות אנגליות.";
            if (v.length > 60) return "כתובת הדואר האלקטרוני ארוכה מדי.";
            if (!EMAIL_PATTERN.test(v)) return "כתובת הדואר האלקטרוני אינה תקינה (לדוגמה: name@example.com).";
            return "";
        },

        phone(value) {
            const v = normalizePhone(value);
            if (!v) return "יש למלא מספר טלפון נייד.";
            if (!/^\d+$/.test(v)) return "מספר הטלפון יכול להכיל ספרות בלבד.";
            if (v.length !== 10) return "מספר טלפון נייד צריך להכיל 10 ספרות.";
            if (!v.startsWith("05")) return "מספר טלפון נייד צריך להתחיל ב־05.";
            return "";
        },

        password(value) {
            const v = String(value || "");
            if (!v) return "יש למלא סיסמה.";
            if (/\s/.test(v)) return "הסיסמה לא יכולה להכיל רווחים.";
            if (v.length < 8) return "הסיסמה צריכה להכיל לפחות 8 תווים.";
            if (v.length > 20) return "הסיסמה יכולה להכיל עד 20 תווים.";
            if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "הסיסמה צריכה להכיל לפחות אות אחת באנגלית וספרה אחת.";
            return "";
        },

        confirmPassword(value, original) {
            if (!value) return "יש להקליד שוב את הסיסמה.";
            return value !== original ? "הסיסמאות אינן תואמות." : "";
        },

        select(value, label) {
            return value ? "" : `יש לבחור ${label}.`;
        },

        // The value must be one of a fixed list (e.g. contact time: morning / afternoon / evening)
        oneOf(value, allowed, label) {
            if (!value) return `יש לבחור ${label}.`;
            return allowed.includes(value) ? "" : `הערך שנבחר עבור ${label} אינו חוקי.`;
        },

        dogName(value) {
            const v = String(value || "").trim();
            if (!v) return "יש למלא את שם הכלב.";
            if (v.length < 2 || v.length > 20) return "שם הכלב צריך להכיל בין 2 ל־20 תווים.";
            if (!NAME_PATTERN.test(v)) return "שם הכלב יכול להכיל אותיות בעברית או באנגלית בלבד.";
            return "";
        },

        breed(value) {
            const v = String(value || "").trim();
            if (!v) return "";   // optional field
            if (v.length > 30) return "הגזע יכול להכיל עד 30 תווים.";
            if (!NAME_PATTERN.test(v)) return "הגזע יכול להכיל אותיות בעברית או באנגלית בלבד.";
            return "";
        },

        dogAge(value) {
            if (String(value).trim() === "") return "יש למלא את גיל הכלב.";
            const n = Number(value);
            if (!Number.isInteger(n)) return "יש להזין גיל בשנים שלמות (גור עד שנה: 0).";
            if (n < 0 || n > 20) return "הגיל צריך להיות בין 0 ל־20.";
            return "";
        },

        textLength(value, min, max, label) {
            const length = String(value || "").trim().length;
            if (length === 0) return `יש למלא ${label}.`;
            if (length < min) return `${label} צריך להכיל לפחות ${min} תווים (כרגע ${length}).`;
            if (length > max) return `${label} יכול להכיל עד ${max} תווים.`;
            return "";
        },

        imageFile(file, isRequired) {
            if (!file) return isRequired ? "יש להעלות תמונה של הכלב." : "";
            if (!["image/jpeg", "image/png"].includes(file.type)) return "אפשר להעלות תמונה בפורמט JPG או PNG בלבד.";
            if (file.size > 2 * 1024 * 1024) return "גודל התמונה יכול להיות עד 2MB.";
            return "";
        }
    };

    /* ---------- showing errors in the form ---------- */

    // Every field sits inside .form-field together with a <p class="field-error">
    function getErrorElement(field) {
        const wrapper = field.closest(".form-field, .choice-group");
        return wrapper ? wrapper.querySelector(".field-error") : null;
    }

    function setFieldError(field, message) {
        const errorElement = getErrorElement(field);
        const wrapper = field.closest(".form-field, .choice-group");
        if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
        field.setAttribute("aria-invalid", message ? "true" : "false");
        if (errorElement) {
            errorElement.textContent = message;
            if (errorElement.id) field.setAttribute("aria-describedby", errorElement.id);
        }
        if (!message && wrapper) {
            // a field that was checked and is valid gets a green mark
            wrapper.classList.add("is-valid");
        } else if (wrapper) {
            wrapper.classList.remove("is-valid");
        }
    }

    function clearFieldError(field) {
        const wrapper = field.closest(".form-field, .choice-group");
        if (wrapper) wrapper.classList.remove("has-error", "is-valid");
        field.removeAttribute("aria-invalid");
        const errorElement = getErrorElement(field);
        if (errorElement) errorElement.textContent = "";
    }

    /**
     * Runs a list of checks on a form.
     * checks: [{ field: <element>, validate: () => "error or empty" }]
     * Shows every error, focuses the first invalid field and returns true if all are valid.
     */
    function validateAll(checks) {
        let firstInvalid = null;
        checks.forEach((check) => {
            const message = check.validate();
            setFieldError(check.field, message);
            if (message && !firstInvalid) firstInvalid = check.field;
        });
        if (firstInvalid) {
            firstInvalid.focus();
            return false;
        }
        return true;
    }

    /**
     * Validates a field when the user leaves it, and again on every change
     * once an error was shown (so the message disappears as soon as it is fixed).
     */
    function liveValidate(field, validate) {
        field.addEventListener("blur", () => {
            if (String(field.value).trim() !== "") setFieldError(field, validate());
        });
        field.addEventListener("input", () => {
            const wrapper = field.closest(".form-field, .choice-group");
            if (wrapper && wrapper.classList.contains("has-error")) setFieldError(field, validate());
        });
    }

    window.PawHomeValidation = { rules, normalizePhone, setFieldError, clearFieldError, validateAll, liveValidate };
})();
