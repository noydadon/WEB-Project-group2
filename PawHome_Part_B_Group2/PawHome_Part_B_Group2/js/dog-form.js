/* =========================================================
   dog-form.js  (dog-form.html, dog-form.html?id=...) - publishers only
   Publishes a new dog, or edits an existing one.
   - validates every field
   - shows a preview of the chosen photo and shrinks it before saving
   - live character counter for the description
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const ui = window.PawHomeUI;
    const api = window.PawHomeApi;
    const v = window.PawHomeValidation;
    const forms = window.PawHomeForms;
    const user = ui.initPage();
    if (!ui.requireRole(user, ["publisher"])) return;

    const editId = ui.getParam("id");
    const form = document.getElementById("dogForm");
    const message = document.getElementById("dogFormMessage");
    const submitButton = document.getElementById("dogSubmit");
    const imageInput = document.getElementById("dogImage");
    const preview = document.getElementById("imagePreview");
    const description = document.getElementById("dogDescription");
    const counter = document.getElementById("descriptionCounter");

    const f = {
        name: document.getElementById("dogName"),
        age: document.getElementById("dogAge"),
        size: document.getElementById("dogSize"),
        city: document.getElementById("dogCity"),
        breed: document.getElementById("dogBreed")
    };

    let imageData = null;        // the photo after resizing (data URL)
    let existingDog = null;      // in edit mode

    ui.fillCitySelect(f.city, false);

    /* ---------- validation ---------- */

    const RADIO_GROUPS = [
        { name: "dogGender", label: "מין" },
        { name: "dogEnergy", label: "רמת אנרגיה" },
        { name: "goodWithKids", label: "האם מסתדר עם ילדים" },
        { name: "goodWithDogs", label: "האם מסתדר עם כלבים" },
        { name: "needsYard", label: "האם זקוק לחצר" }
    ];

    const validateDescription = () => v.rules.textLength(description.value, 20, 1000, "התיאור");

    function allChecks() {
        const checks = [
            { field: f.name, validate: () => v.rules.dogName(f.name.value) },
            { field: f.age, validate: () => v.rules.dogAge(f.age.value) },
            { field: f.size, validate: () => v.rules.select(f.size.value, "גודל") },
            { field: f.city, validate: () => v.rules.select(f.city.value, "עיר") },
            { field: f.breed, validate: () => v.rules.breed(f.breed.value) }
        ];
        RADIO_GROUPS.forEach((group) => checks.push({
            field: forms.firstRadio(form, group.name),
            validate: () => v.rules.select(forms.radioValue(form, group.name), group.label)
        }));
        checks.push({
            field: imageInput,
            // a new dog must have a photo; when editing, the existing photo is kept
            validate: () => (imageData || existingDog ? "" : "יש להעלות תמונה של הכלב.")
        });
        checks.push({ field: description, validate: validateDescription });
        return checks;
    }

    allChecks().slice(0, 5).forEach((check) => v.liveValidate(check.field, check.validate));
    v.liveValidate(description, validateDescription);
    form.querySelectorAll('input[type="radio"]').forEach((radio) => {
        radio.addEventListener("change", () => v.clearFieldError(radio));
    });
    f.size.addEventListener("change", () => v.setFieldError(f.size, v.rules.select(f.size.value, "גודל")));
    f.city.addEventListener("change", () => v.setFieldError(f.city, v.rules.select(f.city.value, "עיר")));

    /* ---------- description counter ---------- */

    function updateCounter() {
        const length = description.value.trim().length;
        counter.textContent = `${length} / 1000` + (length < 20 ? ` (חסרים עוד ${20 - length})` : "");
        counter.classList.toggle("too-short", length < 20);
    }
    description.addEventListener("input", updateCounter);

    /* ---------- photo: check, preview and resize ---------- */

    function showPreview(src) {
        preview.innerHTML = `<img src="${src}" alt="תצוגה מקדימה של תמונת הכלב">`;
    }

    // Crops and shrinks the photo to 640x480 so it does not fill the browser storage
    function resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("לא הצלחנו לקרוא את הקובץ."));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error("הקובץ אינו תמונה תקינה."));
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 640;
                    canvas.height = 480;
                    const scale = Math.max(640 / img.width, 480 / img.height);
                    const w = img.width * scale;
                    const h = img.height * scale;
                    canvas.getContext("2d").drawImage(img, (640 - w) / 2, (480 - h) / 2, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Back to the photo the dog had before this change (or no photo for a new dog)
    function resetImage() {
        imageData = null;
        if (existingDog) showPreview(existingDog.image);
        else preview.textContent = "עדיין לא נבחרה תמונה";
    }

    imageInput.addEventListener("change", async () => {
        const file = imageInput.files[0];
        if (!file) return;                     // the picker was cancelled: keep the current photo

        const error = v.rules.imageFile(file, !existingDog);
        v.setFieldError(imageInput, error);
        if (error) {
            imageInput.value = "";
            resetImage();                      // an invalid file must not leave an older photo behind
            return;
        }
        try {
            imageData = await resizeImage(file);
            showPreview(imageData);
        } catch (readError) {
            v.setFieldError(imageInput, readError.message);
            imageInput.value = "";
            resetImage();
        }
    });

    /* ---------- edit mode ---------- */

    function fillForm(dog) {
        f.name.value = dog.name;
        f.age.value = dog.age;
        f.size.value = dog.size;
        f.city.value = dog.city;
        f.breed.value = dog.breed || "";
        forms.setRadio(form, "dogGender", dog.gender);
        forms.setRadio(form, "dogEnergy", dog.energy);
        forms.setRadio(form, "goodWithKids", dog.goodWithKids ? "yes" : "no");
        forms.setRadio(form, "goodWithDogs", dog.goodWithDogs ? "yes" : "no");
        forms.setRadio(form, "needsYard", dog.needsYard ? "yes" : "no");
        description.value = dog.description;
        showPreview(dog.image);
        updateCounter();
    }

    if (editId) {
        document.getElementById("formTitle").textContent = "עריכת פרטי כלב";
        submitButton.textContent = "שמירת השינויים";
        api.getDog(editId)
            .then((data) => {
                if (!data.isOwner) {
                    form.innerHTML = `<div class="empty-state"><h2>אין הרשאה</h2><p>אפשר לערוך רק כלבים שפרסמת בעצמך.</p><a class="btn btn-primary" href="publisher.html">לניהול המודעות</a></div>`;
                    return;
                }
                existingDog = data.dog;
                document.getElementById("formSubtitle").textContent = `עורכים את המודעה של ${existingDog.name}. התמונה הקיימת תישמר אם לא תבחרו תמונה חדשה.`;
                fillForm(existingDog);
            })
            .catch((error) => {
                form.innerHTML = `<div class="empty-state"><h2>הכלב לא נמצא</h2><p>${ui.escapeHtml(error.message)}</p><a class="btn btn-primary" href="publisher.html">לניהול המודעות</a></div>`;
            });
    }

    /* ---------- submit ---------- */

    function readDog() {
        return {
            name: f.name.value.trim(),
            age: Number(f.age.value),
            gender: forms.radioValue(form, "dogGender"),
            size: f.size.value,
            breed: f.breed.value.trim(),
            city: f.city.value,
            energy: forms.radioValue(form, "dogEnergy"),
            goodWithKids: forms.radioValue(form, "goodWithKids") === "yes",
            goodWithDogs: forms.radioValue(form, "goodWithDogs") === "yes",
            needsYard: forms.radioValue(form, "needsYard") === "yes",
            description: description.value.trim(),
            image: imageData || (existingDog ? existingDog.image : "")
        };
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        ui.hideFormMessage(message);
        if (!v.validateAll(allChecks())) {
            ui.showFormMessage(message, "חלק מהשדות חסרים או שגויים. הפרטים מסומנים באדום.", "error");
            return;
        }

        ui.setLoading(submitButton, true, "שומרים...");
        try {
            const saved = existingDog ? await api.updateDog(existingDog.id, readDog()) : await api.createDog(readDog());
            ui.setFlash(existingDog ? "השינויים נשמרו." : `${saved.name} פורסם/ה! המודעה מופיעה עכשיו בחיפוש.`, "success");
            window.location.href = `dog.html?id=${encodeURIComponent(saved.id)}`;
        } catch (error) {
            ui.setLoading(submitButton, false);
            ui.showFormMessage(message, error.message, "error");
        }
    });

    updateCounter();
});
