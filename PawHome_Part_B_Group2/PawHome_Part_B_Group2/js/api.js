/* =========================================================
   api.js
   A simulated server for Part B.
   Every function here stands for a future HTTP request to the
   Express server of Part C (for example searchDogs = GET /dogs,
   sendRequest = POST /dogs/:id/requests).
   For now the "database" is kept in localStorage and every
   call returns a Promise with a short delay, so the pages
   already work the same way they will with a real server.
   ========================================================= */

(function () {
    "use strict";

    const DB_KEY = "pawhome_db_v2";          // the simulated database
    const SESSION_KEY = "pawhome_session";   // simulates the login cookie
    const FAKE_DELAY_MS = 350;               // simulated network time

    const { USERS, DOGS, REQUESTS } = window.PawHomeData;
    const { checkMatch, getAgeGroup } = window.PawHomeMatch;

    /* ---------- errors returned by the "server" ---------- */

    class ApiError extends Error {
        constructor(code, message) {
            super(message);
            this.code = code;
        }
    }

    /* ---------- low level storage ---------- */

    function seedDatabase() {
        const db = {
            users: JSON.parse(JSON.stringify(USERS)),
            dogs: JSON.parse(JSON.stringify(DOGS)),
            requests: JSON.parse(JSON.stringify(REQUESTS)),
            nextId: 100
        };
        saveDb(db);
        return db;
    }

    function loadDb() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            return raw ? JSON.parse(raw) : seedDatabase();
        } catch (error) {
            // Corrupted data: start again from the demo data
            return seedDatabase();
        }
    }

    function saveDb(db) {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        } catch (error) {
            throw new ApiError("STORAGE_FULL", "אין מספיק מקום לשמירת הנתונים בדפדפן. נסו תמונה קטנה יותר.");
        }
    }

    function newId(db, prefix) {
        db.nextId += 1;
        return prefix + db.nextId;
    }

    // Wraps a result in a Promise with a delay, like a real network request
    function respond(work) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve(work());
                } catch (error) {
                    reject(error);
                }
            }, FAKE_DELAY_MS);
        });
    }

    /* ---------- session (in Part C: a cookie set by the server) ---------- */

    function getSessionUserId() {
        try {
            return localStorage.getItem(SESSION_KEY);
        } catch (error) {
            return null;
        }
    }

    // Synchronous on purpose: every page needs it immediately to build the header
    function getCurrentUser() {
        const userId = getSessionUserId();
        if (!userId) return null;
        const user = loadDb().users.find((u) => u.id === userId);
        return user ? publicUser(user) : null;
    }

    function requireUser(db, type) {
        const user = db.users.find((u) => u.id === getSessionUserId());
        if (!user) {
            throw new ApiError("NOT_LOGGED_IN", "יש להתחבר כדי לבצע פעולה זו.");
        }
        if (type && user.type !== type) {
            throw new ApiError("FORBIDDEN", "אין לך הרשאה לבצע פעולה זו.");
        }
        return user;
    }

    // Never send the password back to the client
    function publicUser(user) {
        const copy = Object.assign({}, user);
        delete copy.password;
        return copy;
    }

    function contactDetails(user) {
        return user ? { name: user.name, phone: user.phone, email: user.email } : null;
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    /* ---------- authentication ---------- */

    function login(email, password) {
        return respond(() => {
            const db = loadDb();
            const user = db.users.find((u) => u.email === normalizeEmail(email) && u.password === password);
            if (!user) {
                // One general message, so we do not reveal which part was wrong
                throw new ApiError("BAD_CREDENTIALS", "הדואר האלקטרוני או הסיסמה שגויים.");
            }
            localStorage.setItem(SESSION_KEY, user.id);
            return publicUser(user);
        });
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
    }

    function register(data) {
        return respond(() => {
            const db = loadDb();
            const email = normalizeEmail(data.email);
            if (db.users.some((u) => u.email === email)) {
                throw new ApiError("EMAIL_TAKEN", "כתובת הדואר האלקטרוני כבר רשומה במערכת.");
            }
            const user = {
                id: newId(db, "u"),
                type: data.type,
                name: data.name.trim(),
                email: email,
                phone: data.phone,
                city: data.city,
                password: data.password
            };
            if (data.type === "adopter") {
                user.home = data.home;
            } else {
                user.publisherKind = data.publisherKind;
            }
            db.users.push(user);
            saveDb(db);
            localStorage.setItem(SESSION_KEY, user.id);   // log in right after sign up
            return publicUser(user);
        });
    }

    function updateProfile(data) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db);
            const email = normalizeEmail(data.email);
            if (db.users.some((u) => u.email === email && u.id !== user.id)) {
                throw new ApiError("EMAIL_TAKEN", "כתובת הדואר האלקטרוני כבר רשומה למשתמש אחר.");
            }
            user.name = data.name.trim();
            user.email = email;
            user.phone = data.phone;
            user.city = data.city;
            if (user.type === "adopter" && data.home) user.home = data.home;
            if (user.type === "publisher" && data.publisherKind) user.publisherKind = data.publisherKind;
            saveDb(db);
            return publicUser(user);
        });
    }

    function changePassword(currentPassword, newPassword) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db);
            if (user.password !== currentPassword) {
                throw new ApiError("BAD_PASSWORD", "הסיסמה הנוכחית שגויה.");
            }
            if (currentPassword === newPassword) {
                throw new ApiError("SAME_PASSWORD", "הסיסמה החדשה זהה לסיסמה הנוכחית.");
            }
            user.password = newPassword;
            saveDb(db);
            return true;
        });
    }

    /* ---------- dogs ---------- */

    // Only these fields come from the dog form. id, status, publisherId and createdAt
    // are set by the server only, so a client cannot change them
    const DOG_FIELDS = ["name", "age", "gender", "size", "breed", "city", "energy",
                        "goodWithKids", "goodWithDogs", "needsYard", "description", "image"];

    function pickDogFields(data) {
        const result = {};
        DOG_FIELDS.forEach((key) => {
            if (data && key in data) result[key] = data[key];
        });
        return result;
    }

    // Adds the compatibility result for the logged-in adopter (if any)
    function withMatch(dog, viewer) {
        const home = viewer && viewer.type === "adopter" ? viewer.home : null;
        return Object.assign({}, dog, { match: checkMatch(dog, home) });
    }

    /**
     * Simulates GET /dogs?city=&size=&age=&gender=&kids=&dogs=&apartment=&sort=
     * Only available dogs are returned. Values that are not in the allowed
     * lists are ignored, exactly as the server will do in Part C.
     */
    function searchDogs(filters) {
        return respond(() => {
            const db = loadDb();
            const viewer = db.users.find((u) => u.id === getSessionUserId()) || null;
            const f = filters || {};
            const allowed = (value, list) => (list.includes(value) ? value : "");

            const city = window.PawHomeData.CITIES.includes(f.city) ? f.city : "";
            const sizes = (f.sizes || []).filter((s) => ["small", "medium", "large"].includes(s));
            const ages = (f.ages || []).filter((a) => ["puppy", "young", "adult", "senior"].includes(a));
            const gender = allowed(f.gender, ["male", "female"]);

            let results = db.dogs
                .filter((dog) => dog.status === "available")
                .filter((dog) => !city || dog.city === city)
                .filter((dog) => sizes.length === 0 || sizes.includes(dog.size))
                .filter((dog) => ages.length === 0 || ages.includes(getAgeGroup(dog.age)))
                .filter((dog) => !gender || dog.gender === gender)
                .filter((dog) => !f.kids || dog.goodWithKids)
                .filter((dog) => !f.dogs || dog.goodWithDogs)
                .filter((dog) => !f.apartment || !dog.needsYard)
                .map((dog) => withMatch(dog, viewer));

            const sort = allowed(f.sort, ["match", "newest", "oldest", "ageAsc"]) || "match";
            results.sort((a, b) => {
                if (sort === "match") {
                    // matching dogs first, then by fewer problems, then newest
                    const diff = a.match.reasons.length - b.match.reasons.length;
                    return diff !== 0 ? diff : b.createdAt.localeCompare(a.createdAt);
                }
                if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
                if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
                return a.age - b.age;
            });
            return results;
        });
    }

    // Dogs that have been waiting the longest (home page)
    function getLongestWaiting(count) {
        return respond(() => loadDb().dogs
            .filter((dog) => dog.status === "available")
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .slice(0, count));
    }

    /**
     * Simulates GET /dogs/:id
     * Returns the dog, public publisher details (no phone or email),
     * the viewer's own request for this dog and, for the owner, the request count.
     */
    function getDog(dogId) {
        return respond(() => {
            const db = loadDb();
            const dog = db.dogs.find((d) => d.id === dogId);
            if (!dog) {
                throw new ApiError("NOT_FOUND", "הכלב המבוקש לא נמצא. ייתכן שהמודעה נמחקה.");
            }
            const viewer = db.users.find((u) => u.id === getSessionUserId()) || null;
            const publisher = db.users.find((u) => u.id === dog.publisherId);
            const dogRequests = db.requests.filter((r) => r.dogId === dog.id);
            const myRequest = viewer && viewer.type === "adopter"
                ? dogRequests.filter((r) => r.adopterId === viewer.id && r.status !== "cancelled")
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null
                : null;

            return {
                dog: withMatch(dog, viewer),
                publisher: publisher ? { name: publisher.name, kind: publisher.publisherKind, city: publisher.city } : null,
                isOwner: Boolean(viewer && viewer.id === dog.publisherId),
                myRequest: myRequest,
                pendingCount: dogRequests.filter((r) => r.status === "pending").length
            };
        });
    }

    function getSimilarDogs(dogId, count) {
        return respond(() => {
            const db = loadDb();
            const dog = db.dogs.find((d) => d.id === dogId);
            if (!dog) return [];
            return db.dogs
                .filter((d) => d.id !== dogId && d.status === "available" && d.size === dog.size)
                .sort((a, b) => (b.city === dog.city) - (a.city === dog.city))
                .slice(0, count);
        });
    }

    function createDog(data) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "publisher");
            const dog = Object.assign(pickDogFields(data), {
                id: newId(db, "d"),
                publisherId: user.id,
                status: "available",
                createdAt: new Date().toISOString()
            });
            db.dogs.push(dog);
            saveDb(db);
            return dog;
        });
    }

    function updateDog(dogId, data) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "publisher");
            const dog = db.dogs.find((d) => d.id === dogId);
            if (!dog) throw new ApiError("NOT_FOUND", "הכלב המבוקש לא נמצא.");
            if (dog.publisherId !== user.id) throw new ApiError("FORBIDDEN", "אפשר לערוך רק כלבים שפרסמת בעצמך.");
            Object.assign(dog, pickDogFields(data));   // allowed fields only
            saveDb(db);
            return dog;
        });
    }

    function deleteDog(dogId) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "publisher");
            const dog = db.dogs.find((d) => d.id === dogId);
            if (!dog) throw new ApiError("NOT_FOUND", "הכלב המבוקש לא נמצא.");
            if (dog.publisherId !== user.id) throw new ApiError("FORBIDDEN", "אפשר למחוק רק כלבים שפרסמת בעצמך.");
            db.dogs = db.dogs.filter((d) => d.id !== dogId);
            // Pending requests for a deleted dog are declined (Part A, page 5),
            // and an approved request that was still in process did not end in adoption
            db.requests.forEach((r) => {
                if (r.dogId === dogId && r.status === "pending") r.status = "declined";
                if (r.dogId === dogId && r.status === "approved") r.status = "notCompleted";
            });
            saveDb(db);
            return true;
        });
    }

    /* ---------- adoption requests ---------- */

    /**
     * Simulates POST /dogs/:id/requests
     * Repeats the checks the server must do even if the browser already did them.
     */
    function sendRequest(dogId, message, contactTime) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "adopter");
            const dog = db.dogs.find((d) => d.id === dogId);
            if (!dog) throw new ApiError("NOT_FOUND", "הכלב המבוקש לא נמצא.");
            if (dog.status === "inProcess") {
                throw new ApiError("DOG_IN_PROCESS", `${dog.name} נמצא/ת כרגע בתהליך אימוץ, ולכן המודעה לא מקבלת בקשות חדשות. אם התהליך לא יושלם, המודעה תחזור להיות זמינה.`);
            }
            if (dog.status !== "available") {
                throw new ApiError("DOG_CLOSED", `מצטערים, ${dog.name} כבר מצא/ה בית והמודעה סגורה לפניות.`);
            }
            const duplicate = db.requests.some((r) => r.dogId === dogId && r.adopterId === user.id && r.status === "pending");
            if (duplicate) {
                throw new ApiError("DUPLICATE", "כבר שלחת בקשה לכלב הזה, והיא ממתינה לתשובה.");
            }
            const text = String(message || "").trim();
            if (text.length < 20 || text.length > 500) {
                throw new ApiError("INVALID", "ההודעה צריכה להכיל בין 20 ל־500 תווים.");
            }
            if (!["morning", "afternoon", "evening"].includes(contactTime)) {
                throw new ApiError("INVALID", "יש לבחור זמן נוח ליצירת קשר.");
            }
            const request = {
                id: newId(db, "r"), dogId: dogId, adopterId: user.id, status: "pending",
                message: text, contactTime: contactTime, createdAt: new Date().toISOString()
            };
            db.requests.push(request);
            saveDb(db);
            return request;
        });
    }

    // Simulates GET /my-requests (adopter)
    function getMyRequests() {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "adopter");
            return db.requests
                .filter((r) => r.adopterId === user.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((r) => {
                    const dog = db.dogs.find((d) => d.id === r.dogId);
                    const publisher = dog ? db.users.find((u) => u.id === dog.publisherId) : null;
                    return Object.assign({}, r, {
                        dog: dog ? { id: dog.id, name: dog.name, image: dog.image, city: dog.city } : null,
                        // contact details are revealed only after approval
                        publisherContact: ["approved", "adopted"].includes(r.status) ? contactDetails(publisher) : null,
                        publisherName: publisher ? publisher.name : ""
                    });
                });
        });
    }

    function cancelRequest(requestId) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "adopter");
            const request = db.requests.find((r) => r.id === requestId && r.adopterId === user.id);
            if (!request) throw new ApiError("NOT_FOUND", "הבקשה לא נמצאה.");
            if (request.status !== "pending") throw new ApiError("INVALID", "אפשר לבטל רק בקשה שממתינה לתשובה.");
            request.status = "cancelled";
            saveDb(db);
            return request;
        });
    }

    // Simulates GET /publisher (dashboard data)
    function getPublisherDashboard() {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "publisher");
            const myDogs = db.dogs.filter((d) => d.publisherId === user.id);
            const myDogIds = myDogs.map((d) => d.id);
            const myRequests = db.requests.filter((r) => myDogIds.includes(r.dogId));

            const pending = myRequests
                .filter((r) => r.status === "pending")
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((r) => {
                    const adopter = db.users.find((u) => u.id === r.adopterId);
                    const dog = myDogs.find((d) => d.id === r.dogId);
                    return Object.assign({}, r, {
                        dogName: dog ? dog.name : "",
                        // while the dog is in process, other requests wait and cannot be approved
                        onHold: dog ? dog.status === "inProcess" : false,
                        // home details are shared before approval; phone and email are not
                        adopter: adopter ? { name: adopter.name, city: adopter.city, home: adopter.home } : null,
                        match: adopter ? checkMatch(dog, adopter.home) : null
                    });
                });

            const dogs = myDogs
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((dog) => {
                    const approved = myRequests.find((r) => r.dogId === dog.id && ["approved", "adopted"].includes(r.status));
                    const adopter = approved ? db.users.find((u) => u.id === approved.adopterId) : null;
                    return Object.assign({}, dog, {
                        pendingCount: myRequests.filter((r) => r.dogId === dog.id && r.status === "pending").length,
                        adopterContact: contactDetails(adopter)
                    });
                });

            return {
                publisherName: user.name,
                stats: {
                    available: myDogs.filter((d) => d.status === "available").length,
                    pending: pending.length,
                    inProcess: myDogs.filter((d) => d.status === "inProcess").length,
                    closed: myDogs.filter((d) => d.status === "closed").length
                },
                pending: pending,
                dogs: dogs
            };
        });
    }

    /**
     * Simulates POST /requests/:id/approve
     * Approving does not mean the adoption happened (it happens outside the site),
     * so the dog moves to "inProcess": it stops receiving new requests, the
     * contact details are revealed, and the other pending requests are kept
     * on hold in case the adoption does not work out.
     */
    function approveRequest(requestId) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "publisher");
            const request = db.requests.find((r) => r.id === requestId);
            const dog = request ? db.dogs.find((d) => d.id === request.dogId) : null;
            if (!request || !dog) throw new ApiError("NOT_FOUND", "הבקשה לא נמצאה.");
            if (dog.publisherId !== user.id) throw new ApiError("FORBIDDEN", "אפשר לאשר רק בקשות לכלבים שלך.");
            if (request.status !== "pending") throw new ApiError("INVALID", "הבקשה כבר טופלה.");
            if (dog.status !== "available") {
                throw new ApiError("IN_PROCESS", `${dog.name} כבר בתהליך אימוץ עם מאמץ אחר. אפשר לאשר בקשה נוספת רק אם התהליך לא יושלם.`);
            }

            request.status = "approved";
            dog.status = "inProcess";
            saveDb(db);
            const adopter = db.users.find((u) => u.id === request.adopterId);
            const onHold = db.requests.filter((r) => r.dogId === dog.id && r.status === "pending").length;
            return { dogName: dog.name, onHoldCount: onHold, adopterContact: contactDetails(adopter) };
        });
    }

    // Shared checks for the two actions that end the "inProcess" stage
    function findDogInProcess(db, dogId) {
        const user = requireUser(db, "publisher");
        const dog = db.dogs.find((d) => d.id === dogId);
        if (!dog) throw new ApiError("NOT_FOUND", "הכלב המבוקש לא נמצא.");
        if (dog.publisherId !== user.id) throw new ApiError("FORBIDDEN", "אפשר לעדכן רק כלבים שפרסמת בעצמך.");
        if (dog.status !== "inProcess") throw new ApiError("INVALID", "הכלב אינו בתהליך אימוץ.");
        const approved = db.requests.find((r) => r.dogId === dogId && r.status === "approved");
        return { dog, approved };
    }

    /**
     * Simulates POST /dogs/:id/complete
     * After the meeting the adoption happened: the dog is marked as adopted,
     * the approved request is completed and the requests on hold are declined.
     */
    function completeAdoption(dogId) {
        return respond(() => {
            const db = loadDb();
            const { dog, approved } = findDogInProcess(db, dogId);
            dog.status = "closed";
            if (approved) approved.status = "adopted";
            let declinedCount = 0;
            db.requests.forEach((r) => {
                if (r.dogId === dogId && r.status === "pending") {
                    r.status = "declined";
                    declinedCount += 1;
                }
            });
            saveDb(db);
            return { dogName: dog.name, declinedCount: declinedCount };
        });
    }

    /**
     * Simulates POST /dogs/:id/reopen
     * The adoption did not happen: the listing is available again, the approved
     * request is marked "not completed", and the requests on hold can be approved.
     */
    function reopenDog(dogId) {
        return respond(() => {
            const db = loadDb();
            const { dog, approved } = findDogInProcess(db, dogId);
            dog.status = "available";
            if (approved) approved.status = "notCompleted";
            saveDb(db);
            const waiting = db.requests.filter((r) => r.dogId === dogId && r.status === "pending").length;
            return { dogName: dog.name, waitingCount: waiting };
        });
    }

    function declineRequest(requestId) {
        return respond(() => {
            const db = loadDb();
            const user = requireUser(db, "publisher");
            const request = db.requests.find((r) => r.id === requestId);
            const dog = request ? db.dogs.find((d) => d.id === request.dogId) : null;
            if (!request || !dog) throw new ApiError("NOT_FOUND", "הבקשה לא נמצאה.");
            if (dog.publisherId !== user.id) throw new ApiError("FORBIDDEN", "אפשר לדחות רק בקשות לכלבים שלך.");
            if (request.status !== "pending") throw new ApiError("INVALID", "הבקשה כבר טופלה.");
            request.status = "declined";
            saveDb(db);
            return true;
        });
    }

    /* ---------- demo helpers ---------- */

    // Lets the person testing the site go back to the original demo data
    function resetDemoData() {
        localStorage.removeItem(DB_KEY);
        localStorage.removeItem(SESSION_KEY);
        seedDatabase();
    }

    window.PawHomeApi = {
        ApiError,
        getCurrentUser, login, logout, register, updateProfile, changePassword,
        searchDogs, getLongestWaiting, getDog, getSimilarDogs, createDog, updateDog, deleteDog,
        sendRequest, getMyRequests, cancelRequest, getPublisherDashboard, approveRequest, declineRequest,
        completeAdoption, reopenDog,
        resetDemoData
    };
})();
