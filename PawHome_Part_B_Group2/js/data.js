/* =========================================================
   data.js
   Demo (seed) data for Part B.
   There is no server or database yet, so these objects play
   the role of the MySQL tables described in Part A:
   users, dogs and adoption_requests.
   On the first visit they are copied to localStorage by api.js.
   In Part C this file is replaced by real database tables.
   ========================================================= */

(function () {
    "use strict";

    // Fixed lists used by every form (no free text for these fields)
    const CITIES = [
        "באר שבע", "אופקים", "עומר", "להבים", "מיתר",
        "אשדוד", "ראשון לציון", "תל אביב", "ירושלים", "חיפה"
    ];

    const LABELS = {
        size: { small: "קטן", medium: "בינוני", large: "גדול" },
        gender: { male: "זכר", female: "נקבה" },
        energy: { low: "נמוכה", medium: "בינונית", high: "גבוהה" },
        homeType: { apartment: "דירה", house: "בית עם חצר" },
        hoursAway: { upTo4: "עד 4 שעות", "4to8": "4 עד 8 שעות", over8: "יותר מ־8 שעות" },
        contactTime: { morning: "בוקר", afternoon: "צהריים", evening: "ערב" },
        publisherKind: { org: "עמותה", private: "אדם פרטי" },
        requestStatus: { pending: "ממתינה", approved: "אושרה, בתהליך אימוץ", adopted: "האימוץ הושלם",
                         notCompleted: "האימוץ לא יצא לפועל", declined: "נדחתה", cancelled: "בוטלה" },
        // available: open for requests; inProcess: a request was approved and the sides are meeting;
        // closed: the adoption was completed (shown as "אומץ")
        dogStatus: { available: "זמין לאימוץ", inProcess: "בתהליך אימוץ", closed: "אומץ" },
        ageGroup: { puppy: "גור", young: "צעיר", adult: "בוגר", senior: "מבוגר" }
    };

    // users: adopters and publishers share one table, user_type tells them apart
    const USERS = [
        { id: "u1", type: "publisher", name: "עמותת חבר על ארבע", publisherKind: "org",
          email: "friends4@pawhome.co.il", phone: "0521234567", city: "באר שבע", password: "Paws1234" },
        { id: "u2", type: "publisher", name: "כלבי הנגב", publisherKind: "org",
          email: "negev@pawhome.co.il", phone: "0532345678", city: "אופקים", password: "Negev1234" },
        { id: "u3", type: "publisher", name: "דנה לוי", publisherKind: "private",
          email: "dana.levi@pawhome.co.il", phone: "0544567890", city: "תל אביב", password: "Dana1234" },

        { id: "u4", type: "adopter", name: "יעל כהן", email: "adopter@pawhome.co.il", phone: "0501112233",
          city: "באר שבע", password: "Adopt1234",
          home: { homeType: "apartment", hasKids: false, hasDogs: false, hoursAway: "4to8" } },
        { id: "u5", type: "adopter", name: "דני כץ", email: "dani.katz@pawhome.co.il", phone: "0522223344",
          city: "עומר", password: "Dani1234",
          home: { homeType: "house", hasKids: true, hasDogs: false, hoursAway: "upTo4" } },
        { id: "u6", type: "adopter", name: "מאיה לוי", email: "maya.levi@pawhome.co.il", phone: "0533334455",
          city: "אופקים", password: "Maya1234",
          home: { homeType: "house", hasKids: true, hasDogs: true, hoursAway: "over8" } },
        { id: "u7", type: "adopter", name: "רוני אלון", email: "roni.alon@pawhome.co.il", phone: "0544445566",
          city: "תל אביב", password: "Roni1234",
          home: { homeType: "apartment", hasKids: false, hasDogs: false, hoursAway: "4to8" } },
        { id: "u8", type: "adopter", name: "עומר ברק", email: "omer.barak@pawhome.co.il", phone: "0555556677",
          city: "חיפה", password: "Omer1234",
          home: { homeType: "apartment", hasKids: true, hasDogs: false, hoursAway: "upTo4" } }
    ];

    // Helper for readable seed dates (days before today)
    function daysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString();
    }

    // dogs: every listing belongs to one publisher (publisherId)
    const DOGS = [
        { id: "d1", name: "לולה", image: "images/dogs/lola.jpg", age: 2, gender: "female", size: "medium",
          breed: "מעורבת לברדור", city: "באר שבע", energy: "medium", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u1", status: "available", createdAt: daysAgo(64),
          description: "לולה נמצאה ליד מתנ\"ס בשכונה ד' לפני כחצי שנה. היא חברותית, אוהבת ילדים ומסתדרת היטב בטיולים ברצועה. מחוסנת ומעוקרת." },
        { id: "d2", name: "מקס", image: "images/dogs/max.jpg", age: 5, gender: "male", size: "large",
          breed: "לברדור", city: "עומר", energy: "low", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u1", status: "available", createdAt: daysAgo(40),
          description: "מקס הוא לברדור רגוע ומתוק שאוהב לישון ליד הדלת ולחכות לבני הבית. מתאים גם לדירה, כל עוד יש לו שני טיולים ביום." },
        { id: "d3", name: "רקס", image: "images/dogs/rex.jpg", age: 4, gender: "male", size: "large",
          breed: "מעורב רועים", city: "אופקים", energy: "high", goodWithKids: true, goodWithDogs: false,
          needsYard: true, publisherId: "u2", status: "available", createdAt: daysAgo(90),
          description: "רקס חכם, נאמן ומלא אנרגיה. הוא צריך חצר ומשפחה שאוהבת ריצות וטיולים ארוכים. מעדיף להיות הכלב היחיד בבית." },
        { id: "d4", name: "פתית", image: "images/dogs/ptit.jpg", age: 1, gender: "male", size: "small",
          breed: "מעורב טרייר", city: "תל אביב", energy: "medium", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "available", createdAt: daysAgo(12),
          description: "פתית הוא כלב קטן עם חיוך גדול. הוא אוהב אנשים, כלבים וכל מי שמוכן לזרוק לו כדור." },
        { id: "d5", name: "ארצ'י", image: "images/dogs/archie.jpg", age: 3, gender: "male", size: "medium",
          breed: "מעורב", city: "ירושלים", energy: "medium", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u2", status: "available", createdAt: daysAgo(33),
          description: "ארצ'י סקרן ושמח, אוהב שלג, ים ובעיקר ליטופים. הולך יפה ברצועה ויודע את הפקודות הבסיסיות." },
        { id: "d6", name: "בל", image: "images/dogs/bell.jpg", age: 6, gender: "female", size: "medium",
          breed: "מעורבת", city: "חיפה", energy: "low", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u2", status: "available", createdAt: daysAgo(120),
          description: "בל רגועה ועדינה, מחפשת בית שקט עם ספה טובה. היא נמצאת אצלנו הכי הרבה זמן ומחכה למשפחה." },
        { id: "d7", name: "ג'ינג'י", image: "images/dogs/ginger.jpg", age: 2, gender: "male", size: "medium",
          breed: "מעורב", city: "אשדוד", energy: "high", goodWithKids: true, goodWithDogs: true,
          needsYard: true, publisherId: "u1", status: "inProcess", createdAt: daysAgo(21),
          description: "ג'ינג'י אוהב לחפור בחול ולרוץ על החוף. מתאים למשפחה פעילה עם חצר." },
        { id: "d8", name: "גלקסי", image: "images/dogs/galaxy.jpg", age: 2, gender: "female", size: "medium",
          breed: "מעורבת פיטבול", city: "באר שבע", energy: "medium", goodWithKids: false, goodWithDogs: true,
          needsYard: false, publisherId: "u1", status: "available", createdAt: daysAgo(55),
          description: "גלקסי נאמנה ומחוברת מאוד לאנשים שלה. מתאימה לבית בלי ילדים קטנים." },
        { id: "d9", name: "טופי", image: "images/dogs/toffee.jpg", age: 8, gender: "female", size: "small",
          breed: "שיצו", city: "ראשון לציון", energy: "low", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "available", createdAt: daysAgo(80),
          description: "טופי היא גברת קטנה ורגועה שאוהבת ליטופים וטיולים קצרים. מתאימה מאוד לדירה." },
        { id: "d10", name: "ג'ורג'", image: "images/dogs/george.jpg", age: 1, gender: "male", size: "small",
          breed: "קוקאפו", city: "תל אביב", energy: "high", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "available", createdAt: daysAgo(6),
          description: "ג'ורג' צעיר, שובב ומתולתל. לומד מהר ואוהב משחקי חשיבה." },
        { id: "d11", name: "סנדי", image: "images/dogs/sandy.jpg", age: 4, gender: "female", size: "large",
          breed: "לברדור", city: "מיתר", energy: "medium", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u1", status: "available", createdAt: daysAgo(47),
          description: "סנדי אוהבת טיולים בטבע ומים. היא כלבה מחונכת שמתאימה למשפחה עם ילדים." },
        { id: "d12", name: "באדי", image: "images/dogs/buddy.jpg", age: 0, gender: "male", size: "medium",
          breed: "מעורב לברדור", city: "להבים", energy: "high", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u2", status: "available", createdAt: daysAgo(3),
          description: "באדי הוא גור בן ארבעה חודשים, מחוסן ומוכן לבית חדש. הוא צריך משפחה עם זמן ללמד אותו." },
        { id: "d13", name: "בלאקי", image: "images/dogs/blacky.jpg", age: 7, gender: "male", size: "large",
          breed: "לברדור", city: "ראשון לציון", energy: "low", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "closed", createdAt: daysAgo(150),
          description: "בלאקי מצא בית חם. תודה לכל מי שפנה!" },
        { id: "d14", name: "ג'ואי", image: "images/dogs/joey.jpg", age: 5, gender: "male", size: "medium",
          breed: "ביגל", city: "באר שבע", energy: "high", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u1", status: "available", createdAt: daysAgo(28),
          description: "ג'ואי הוא ביגל עם אף מצוין וסקרנות אינסופית. צריך הרבה טיולים ותשומת לב." },
        { id: "d15", name: "פיפ", image: "images/dogs/pip.jpg", age: 3, gender: "female", size: "small",
          breed: "ג'ק ראסל", city: "עומר", energy: "high", goodWithKids: false, goodWithDogs: true,
          needsYard: true, publisherId: "u1", status: "available", createdAt: daysAgo(17),
          description: "פיפ קטנה אבל עם מנוע גדול. היא צריכה חצר ומשפחה פעילה בלי ילדים קטנים." },
        { id: "d16", name: "שלגי", image: "images/dogs/snowy.jpg", age: 9, gender: "female", size: "small",
          breed: "מלטז", city: "ירושלים", energy: "low", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u2", status: "available", createdAt: daysAgo(110),
          description: "שלגי מבוגרת, שקטה ומלאת אהבה. מחפשת בית רגוע לשנים הבאות." },
        { id: "d17", name: "לונה", image: "images/dogs/luna.jpg", age: 2, gender: "female", size: "large",
          breed: "מעורבת האסקי", city: "חיפה", energy: "high", goodWithKids: true, goodWithDogs: true,
          needsYard: true, publisherId: "u2", status: "available", createdAt: daysAgo(38),
          description: "לונה יפהפייה ואנרגטית. היא צריכה חצר גדולה והרבה פעילות יומית." },
        { id: "d18", name: "דבש", image: "images/dogs/honey.jpg", age: 0, gender: "female", size: "medium",
          breed: "גולדן רטריבר", city: "תל אביב", energy: "medium", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "available", createdAt: daysAgo(9),
          description: "דבש היא גורה מתוקה ורגועה יחסית לגילה. מסתדרת עם כולם." },
        { id: "d19", name: "צ'יף", image: "images/dogs/chief.jpg", age: 6, gender: "male", size: "large",
          breed: "רועה גרמני", city: "אופקים", energy: "medium", goodWithKids: true, goodWithDogs: false,
          needsYard: true, publisherId: "u2", status: "available", createdAt: daysAgo(75),
          description: "צ'יף שומר נאמן ומחונך היטב. מעדיף להיות הכלב היחיד בבית עם חצר." },
        { id: "d20", name: "וופל", image: "images/dogs/waffle.jpg", age: 4, gender: "male", size: "small",
          breed: "תחש", city: "אשדוד", energy: "medium", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u1", status: "closed", createdAt: daysAgo(70),
          description: "וופל אומץ ונמצא בבית חדש ואוהב." },
        { id: "d21", name: "סקיי", image: "images/dogs/sky.jpg", age: 0, gender: "female", size: "medium",
          breed: "בורדר קולי", city: "להבים", energy: "high", goodWithKids: true, goodWithDogs: true,
          needsYard: true, publisherId: "u2", status: "available", createdAt: daysAgo(5),
          description: "סקיי גורה חכמה במיוחד שצריכה הרבה גירוי ופעילות. מתאימה למשפחה עם חצר." },
        { id: "d22", name: "פיצי", image: "images/dogs/pitzi.jpg", age: 3, gender: "male", size: "small",
          breed: "צ'יוואווה", city: "תל אביב", energy: "medium", goodWithKids: false, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "available", createdAt: daysAgo(25),
          description: "פיצי קטן ואמיץ. מתאים לבית בלי ילדים קטנים ועם הרבה תשומת לב." },
        { id: "d23", name: "רוקי", image: "images/dogs/rocky.jpg", age: 5, gender: "male", size: "large",
          breed: "בוקסר", city: "באר שבע", energy: "high", goodWithKids: true, goodWithDogs: false,
          needsYard: true, publisherId: "u1", status: "available", createdAt: daysAgo(60),
          description: "רוקי אוהב לשחק ולהשתולל. צריך חצר ומעדיף להיות הכלב היחיד." },
        { id: "d24", name: "בובה", image: "images/dogs/buba.jpg", age: 4, gender: "female", size: "small",
          breed: "פאג", city: "ראשון לציון", energy: "low", goodWithKids: true, goodWithDogs: true,
          needsYard: false, publisherId: "u3", status: "available", createdAt: daysAgo(44),
          description: "בובה מצחיקה, רגועה ואוהבת לנחור על הספה. מושלמת לדירה." },
        { id: "d25", name: "נלה", image: "images/dogs/nala.jpg", age: 3, gender: "female", size: "medium",
          breed: "מעורבת אמסטף", city: "באר שבע", energy: "medium", goodWithKids: true, goodWithDogs: false,
          needsYard: false, publisherId: "u1", status: "inProcess", createdAt: daysAgo(36),
          description: "נלה מתוקה ומחוברת לאנשים. מעדיפה להיות הכלבה היחידה בבית." }
    ];

    // adoption_requests: links an adopter to a dog, with a status
    const REQUESTS = [
        { id: "r1", dogId: "d1", adopterId: "u5", status: "pending", contactTime: "evening", createdAt: daysAgo(4),
          message: "יש לנו בית עם חצר בעומר ושני ילדים שמחכים לכלבה. נשמח להכיר את לולה." },
        { id: "r2", dogId: "d1", adopterId: "u8", status: "pending", contactTime: "morning", createdAt: daysAgo(2),
          message: "אנחנו משפחה בחיפה, עובדים חלקית מהבית ומחפשים כלבה חברותית לילדים." },
        { id: "r3", dogId: "d3", adopterId: "u6", status: "pending", contactTime: "afternoon", createdAt: daysAgo(6),
          message: "גדלנו עם כלבי רועים, יש לנו חצר גדולה באופקים ואנחנו אוהבים לרוץ." },
        { id: "r4", dogId: "d14", adopterId: "u4", status: "pending", contactTime: "evening", createdAt: daysAgo(1),
          message: "אני סטודנטית בבאר שבע, עובדת חלקית מהבית ואוהבת טיולים ארוכים בערב." },
        { id: "r5", dogId: "d20", adopterId: "u4", status: "adopted", contactTime: "morning", createdAt: daysAgo(30),
          message: "מחפשת כלב קטן לדירה, יש לי זמן וסבלנות ללמד אותו." },
        { id: "r6", dogId: "d19", adopterId: "u4", status: "declined", contactTime: "afternoon", createdAt: daysAgo(20),
          message: "אשמח להכיר את צ'יף, אני אוהבת כלבים גדולים." },
        { id: "r7", dogId: "d13", adopterId: "u7", status: "adopted", contactTime: "evening", createdAt: daysAgo(45),
          message: "מחפש כלב רגוע לדירה בתל אביב, עובד רוב הזמן מהבית." },
        { id: "r8", dogId: "d23", adopterId: "u5", status: "pending", contactTime: "evening", createdAt: daysAgo(3),
          message: "יש לנו חצר גדולה ואנחנו משפחה פעילה מאוד. רוקי נראה מושלם בשבילנו." },
        // Ginger: one request approved (in process), another one waits in case it does not work out
        { id: "r9", dogId: "d7", adopterId: "u6", status: "approved", contactTime: "afternoon", createdAt: daysAgo(8),
          message: "יש לנו חצר גדולה באופקים ואנחנו יוצאים לים כל שבוע. ג'ינג'י ירגיש אצלנו בבית." },
        { id: "r10", dogId: "d7", adopterId: "u8", status: "pending", contactTime: "evening", createdAt: daysAgo(5),
          message: "אנחנו משפחה פעילה בחיפה עם גינה משותפת גדולה, ונשמח להכיר את ג'ינג'י." },
        // Nala: the demo adopter's request was approved, the meeting has not happened yet
        { id: "r11", dogId: "d25", adopterId: "u4", status: "approved", contactTime: "evening", createdAt: daysAgo(7),
          message: "אני גרה לבד בדירה בבאר שבע, בלי כלבים נוספים, ויש לי זמן לטיולים ארוכים בערב." }
    ];

    // Expose the seed data under one global namespace
    window.PawHomeData = { CITIES, LABELS, USERS, DOGS, REQUESTS };
})();
