import { NextResponse } from "next/server";

// Jours fériés fixes en France (à compléter)
const getFixedHolidays = (year) => {
  return [
    { name: "Jour de l'an", date: `${year}-01-01`, type: "national" },
    { name: "Fête du Travail", date: `${year}-05-01`, type: "national" },
    { name: "Victoire 1945", date: `${year}-05-08`, type: "national" },
    { name: "Fête nationale", date: `${year}-07-14`, type: "national" },
    { name: "Assomption", date: `${year}-08-15`, type: "national" },
    { name: "Toussaint", date: `${year}-11-01`, type: "national" },
    { name: "Armistice 1918", date: `${year}-11-11`, type: "national" },
    { name: "Noël", date: `${year}-12-25`, type: "national" },
  ];
};

// Calculer le lundi de Pâques (algorithme de Conway)
const getEasterMonday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  // Pâques
  const easter = new Date(year, month - 1, day);
  // Lundi de Pâques
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  return `${year}-${String(easterMonday.getMonth() + 1).padStart(2, "0")}-${String(easterMonday.getDate()).padStart(2, "0")}`;
};

// Événements commerciaux récurrents
const getCommercialEvents = (year, month) => {
  const events = [];

  // Fête des Mères (dernier dimanche de mai, sauf si juin)
  if (month === 5) {
    const lastSunday = new Date(year, 5, 0);
    lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay());
    events.push({
      name: "Fête des Mères",
      date: `${year}-05-${String(lastSunday.getDate()).padStart(2, "0")}`,
      type: "commercial",
    });
  }

  // Fête des Pères (3ème dimanche de juin)
  if (month === 6) {
    const thirdSunday = new Date(year, 5, 1);
    thirdSunday.setDate(1 + ((7 - thirdSunday.getDay()) % 7) + 14);
    events.push({
      name: "Fête des Pères",
      date: `${year}-06-${String(thirdSunday.getDate()).padStart(2, "0")}`,
      type: "commercial",
    });
  }

  // Black Friday (4ème vendredi de novembre)
  if (month === 11) {
    const fourthFriday = new Date(year, 10, 1);
    fourthFriday.setDate(1 + ((4 - fourthFriday.getDay() + 7) % 7) + 21);
    events.push({
      name: "Black Friday",
      date: `${year}-11-${String(fourthFriday.getDate()).padStart(2, "0")}`,
      type: "commercial",
    });
  }

  return events;
};

// Événements internationaux
const getInternationalEvents = (month) => {
  const internationalEvents = {
    1: [
      {
        name: "Journée mondiale de la paix",
        date: "01-01",
        type: "international",
      },
    ],
    2: [{ name: "Saint-Valentin", date: "02-14", type: "commercial" }],
    3: [
      {
        name: "Journée internationale des droits des femmes",
        date: "03-08",
        type: "international",
      },
    ],
    4: [{ name: "Poisson d'avril", date: "04-01", type: "commercial" }],
    5: [
      {
        name: "Journée mondiale de l'environnement",
        date: "06-05",
        type: "international",
      },
    ],
    6: [{ name: "Fête de la musique", date: "06-21", type: "cultural" }],
    7: [
      {
        name: "Journée internationale des amis",
        date: "07-30",
        type: "international",
      },
    ],
    8: [{ name: "Rentrée scolaire", date: "09-01", type: "commercial" }],
    9: [{ name: "Halloween", date: "10-31", type: "commercial" }],
    10: [{ name: "Thanksgiving", date: "11-24", type: "international" }],
    11: [{ name: "Cyber Monday", date: "11-28", type: "commercial" }],
    12: [{ name: "Réveillon de Noël", date: "12-24", type: "commercial" }],
  };

  return internationalEvents[month] || [];
};

export async function POST(request) {
  try {
    const { startDate, endDate, country = "FR" } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Dates manquantes" },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const events = [];

    // Parcourir chaque mois de la période
    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;

      // Jours fériés fixes
      const fixedHolidays = getFixedHolidays(year);
      fixedHolidays.forEach((holiday) => {
        const holidayDate = new Date(holiday.date);
        if (holidayDate >= start && holidayDate <= end) {
          events.push(holiday);
        }
      });

      // Lundi de Pâques
      const easterMonday = getEasterMonday(year);
      const easterMondayDate = new Date(easterMonday);
      if (easterMondayDate >= start && easterMondayDate <= end) {
        events.push({
          name: "Lundi de Pâques",
          date: easterMonday,
          type: "national",
        });
      }

      // Ascension (40 jours après Pâques)
      const ascensionDate = new Date(easterMondayDate);
      ascensionDate.setDate(easterMondayDate.getDate() + 38);
      if (ascensionDate >= start && ascensionDate <= end) {
        events.push({
          name: "Ascension",
          date: `${year}-${String(ascensionDate.getMonth() + 1).padStart(2, "0")}-${String(ascensionDate.getDate()).padStart(2, "0")}`,
          type: "national",
        });
      }

      // Pentecôte (50 jours après Pâques)
      const pentecostDate = new Date(easterMondayDate);
      pentecostDate.setDate(easterMondayDate.getDate() + 49);
      if (pentecostDate >= start && pentecostDate <= end) {
        events.push({
          name: "Pentecôte",
          date: `${year}-${String(pentecostDate.getMonth() + 1).padStart(2, "0")}-${String(pentecostDate.getDate()).padStart(2, "0")}`,
          type: "national",
        });
      }

      // Événements commerciaux
      const commercialEvents = getCommercialEvents(year, month);
      commercialEvents.forEach((event) => {
        const eventDate = new Date(event.date);
        if (eventDate >= start && eventDate <= end) {
          events.push(event);
        }
      });

      // Événements internationaux
      const internationalEvents = getInternationalEvents(month);
      internationalEvents.forEach((event) => {
        const eventDate = new Date(`${year}-${event.date}`);
        if (eventDate >= start && eventDate <= end) {
          events.push(event);
        }
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Supprimer les doublons
    const uniqueEvents = [];
    const seen = new Set();
    for (const event of events) {
      const key = `${event.name}-${event.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    }

    // Trier par date
    uniqueEvents.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return NextResponse.json({
      success: true,
      events: uniqueEvents,
      count: uniqueEvents.length,
    });
  } catch (error) {
    console.error("Erreur detect-events:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
