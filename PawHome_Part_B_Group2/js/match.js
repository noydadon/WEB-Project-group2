/* =========================================================
   match.js
   The compatibility check from Part A (section 2c).
   Compares an adopter's home details with a dog using
   four simple rules. Pure functions: no DOM, no storage,
   so the same logic can move to the server in Part C.
   ========================================================= */

(function () {
    "use strict";

    // Each rule: when does it apply, and which message to show
    const MATCH_RULES = [
        {
            id: "yard",
            applies: (dog, home) => dog.needsYard && home.homeType === "apartment",
            message: "הכלב זקוק לחצר, ואת/ה גר/ה בדירה"
        },
        {
            id: "kids",
            applies: (dog, home) => !dog.goodWithKids && home.hasKids,
            message: "הכלב אינו מסתדר עם ילדים, ויש ילדים בבית"
        },
        {
            id: "dogs",
            applies: (dog, home) => !dog.goodWithDogs && home.hasDogs,
            message: "הכלב אינו מסתדר עם כלבים אחרים, ויש כלב נוסף בבית"
        },
        {
            id: "energy",
            applies: (dog, home) => dog.energy === "high" && home.hoursAway === "over8",
            message: "הכלב אנרגטי וזקוק להרבה פעילות, ואת/ה מחוץ לבית יותר מ־8 שעות ביום"
        }
    ];

    /**
     * Checks one dog against one adopter home.
     * @param {Object} dog  - a dog object from the dogs table
     * @param {Object} home - { homeType, hasKids, hasDogs, hoursAway }
     * @returns {{ isMatch: boolean, reasons: string[] }}
     *          isMatch is true when no rule applies; reasons lists the problems found.
     */
    function checkMatch(dog, home) {
        // Without home details (guest or publisher) there is nothing to compare
        if (!dog || !home) {
            return { isMatch: false, reasons: [], unknown: true };
        }

        const reasons = MATCH_RULES
            .filter((rule) => rule.applies(dog, home))
            .map((rule) => rule.message);

        return { isMatch: reasons.length === 0, reasons: reasons, unknown: false };
    }

    /**
     * Converts an age in years to the age groups used by the search filter.
     */
    function getAgeGroup(age) {
        if (age < 1) return "puppy";
        if (age <= 3) return "young";
        if (age <= 7) return "adult";
        return "senior";
    }

    window.PawHomeMatch = { checkMatch, getAgeGroup, MATCH_RULES };
})();
