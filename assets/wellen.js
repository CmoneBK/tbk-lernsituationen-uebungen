/* Die Wellen des Drehprozess-Pakets - reine Daten, kein Zeichnen.
 *
 * Eingebunden wird die Datei von Hand, zwischen `assets/zeichnen.js` und
 * `assets/drehteil.js`:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/wellen.js"></script>
 *     <script src="../../assets/drehteil.js"></script>
 *
 * Nicht ans Dateiende, wie der Build es mit den übrigen Bausteinen tut: Die
 * Seiten rufen `zeichneWelle` beim Laden auf, da müssen beide schon da sein.
 *
 * Warum vier Wellen
 * -----------------
 * Wer dieselbe Welle in Lektion, Übung und Lernsituation vor sich hat,
 * kennt die Ergebnisse nach dem zweiten Mal auswendig. Deshalb bekommt
 * jede Stelle ihre eigene:
 *
 *   mitnehmerwelle  Lektion „Drehprozess planen"      C45E +QT
 *   spannwelle      Übungen und Trainings             C25E +QT
 *   antriebswelle   Lernsituation 1                   42CrMo4 +QT
 *   abtriebswelle   Lernsituation 2                   X5CrNi18-10
 *
 * Die vier liegen in vier verschiedenen Zeilen der Schnittdaten (Seiten 350
 * und 351) - drei Zeilen der Hauptanwendungsgruppe P und eine aus M. Wer
 * die Lektion auswendig lernt statt abzulesen, fällt in der Übung auf.
 *
 * Aufbau eines Eintrags
 * ---------------------
 *   laenge, abschnitte    die Kontur, von der linken Stirnfläche aus in mm
 *   gewinde               Bezeichnung, Lage, Steigung, Kerndurchmesser
 *   nuten                 Sicherungsringnuten, als Einzelheit vergrößert
 *   gewindefreistich      Lage des Auslaufs vor dem Gewinde
 *   rundungen             Innenrundungen an den Absätzen
 *   kleinsterInnenradius  die engste davon - Grenze für den Eckenradius
 *   flaechen              woran im Unterricht etwas zu entscheiden ist
 *   toleranzen            ISO-Kurzzeichen der Funktionsflächen
 *   masse                 die Maßeintragung, wie sie im Bild stehen soll
 *   bezeichnungen         Benennungen mit Hinweislinie (eigene Ebene)
 *   rauheiten             die geforderten Rautiefen im Bild
 *
 * Gezeichnet wird in Ansicht, nicht im Schnitt: Eine Welle wird im
 * Längsschnitt ohnehin nicht geschnitten dargestellt.
 */
"use strict";

var WELLEN = {};

/* ==================================================================== *
 * Antriebswelle - Lernsituation 1
 *
 * Die Fertigungszeichnung aus dem Unterricht (C. Mones, 28.08.2022, A3),
 * am Scan nachgemessen (200 dpi, 12,87 Pixel je Millimeter) und gegen die
 * Maßketten der Zeichnung geprüft. Sie hieß dort „Welle LF5"; LF5 stand
 * für das Lernfeld, nicht für das Bauteil.
 * ==================================================================== */
WELLEN.antriebswelle = {
  id: "antriebswelle",
  name: "Antriebswelle",
  wo: "Lernsituation 1",
  werkstoff: "42CrMo4",
  werkstoffnummer: "1.7225",
  zustand: "+QT",
  quelle: "Fertigungszeichnung C. Mones, 28.08.2022, A3",

  laenge: 128.6,
  abschnitte: [
    {von: 0,    bis: 22.3,  d: 20, name: "Zapfen links"},
    {von: 22.3, bis: 42.3,  d: 24, name: "Absatz"},
    {von: 42.3, bis: 52.3,  d: 30, name: "Bund"},
    {von: 52.3, bis: 91.6,  d: 25, name: "Lagersitz"},
    {von: 91.6, bis: 128.6, d: 20, name: "Gewindezapfen"}
  ],
  /* Gewinde M20x1: Kerndurchmesser d3 = d - 1,2268 * P. Gezeichnet wird er
     als schmale Vollinie, der Außendurchmesser als breite - DIN ISO 6410. */
  gewinde: {bezeichnung: "M20×1 – 6g", von: 95.1, bis: 128.6, P: 1,
            d: 20, d3: 20 - 1.2268},
  /* Sicherungsringnuten, 1,3 mm breit (Einzelheiten A und B, 4:1). */
  nuten: [
    {marke: "A", bei: 9,    breite: 1.3, tiefe: 0.5, d: 20},
    {marke: "B", bei: 83.6, breite: 1.3, tiefe: 0.5, d: 25}
  ],
  freistiche: [
    {norm: "DIN 509 – E 0,6 × 0,3", bei: 22.3, r: 0.6, tiefe: 0.3, breite: 2.0},
    {norm: "DIN 509 – E 0,6 × 0,3", bei: 91.6, r: 0.6, tiefe: 0.3, breite: 2.0}
  ],
  rundungen: [{bei: 42.3, r: 1}],
  /* Der kleinste Innenradius der ganzen Kontur - und damit die Grenze für
     den Eckenradius des Schlichtwerkzeugs: r_eps <= r_w - 0,1 mm.
     Nicht die R1 am Bund, wie man auf den ersten Blick meint: Die beiden
     Freistiche sind mit 0,6 mm enger. Wer sie übersieht, wählt ein
     Werkzeug, das nicht in die eigene Kontur passt. */
  kleinsterInnenradius: 0.6,
  woher: "Freistiche DIN 509 – E 0,6 × 0,3 an beiden Schultern",
  gewindefreistich: {norm: "DIN 76 – A", von: 91.6, bis: 95.1},
  zentrierbohrungen: {links: "ISO 6411 – A2×4,25", rechts: "ISO 6411 – A2,5×5,3"},
  rohteil: {d: 32, laenge: 135},

  /* Die beiden Funktionsflächen tragen ISO-Toleranzen. Grenzabmaße in
     Mikrometern, Nennmaßbereich über 18 bis 30 mm, System Einheitsbohrung.
     k6 am Lagersitz: Der Innenring eines Wälzlagers mit Umfangslast braucht
     eine Übergangs- oder Übermaßpassung. f7 am Zapfen: Dort sitzt eine
     Buchse, die sich von Hand aufschieben lassen soll. */
  toleranzen: [
    {flaeche: "mantel_25", nennmass: 25, klasse: "k6", es: 15,  ei: 2},
    {flaeche: "mantel_20", nennmass: 20, klasse: "f7", es: -20, ei: -41}
  ],

  flaechen: [
    {id: "stirn_links", name: "linke Stirnfläche", bei: 0, art: "stirn",
     verfahren: "abstechdrehen"},
    {id: "mantel_20",   name: "Ø20 links",  von: 0,    bis: 22.3, d: 20,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 4},
    {id: "nut_a",       name: "Nut A",      bei: 9,    art: "nut",
     verfahren: "einstechdrehen"},
    {id: "schulter_22", name: "Schulter bei 22,3", bei: 22.3, art: "schulter",
     verfahren: "querplandrehen"},
    {id: "mantel_24",   name: "Ø24",        von: 22.3, bis: 42.3, d: 24,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 6},
    {id: "bund_30",     name: "Bund Ø30",   von: 42.3, bis: 52.3, d: 30,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 10},
    {id: "mantel_25",   name: "Ø25",        von: 52.3, bis: 91.6, d: 25,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 4},
    {id: "nut_b",       name: "Nut B",      bei: 83.6, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "freistich",   name: "Freistich DIN 76 – A", bei: 93.3, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "gewinde",     name: "Gewinde M20×1", von: 95.1, bis: 128.6, d: 20,
     art: "gewinde", verfahren: "gewindedrehen"},
    {id: "stirn_rechts", name: "rechte Stirnfläche", bei: 128.6, art: "stirn",
     verfahren: "querplandrehen"}
  ],

  masse: {
    unten: [
      {von: 0, bis: 9,     text: "9",     an: [20, 20]},
      {von: 0, bis: 22.3,  text: "22,3",  an: [20, 20]},
      {von: 0, bis: 42.3,  text: "42,3",  an: [20, 24]},
      {von: 0, bis: 128.6, text: "128,6", an: [20, 20]}
    ],
    oben: [
      {von: 95.1, bis: 128.6, text: "33,5", an: [20, 20]},
      {von: 91.6, bis: 128.6, text: "37",   an: [25, 20]},
      {von: 83.6, bis: 128.6, text: "45",   an: [25, 20]}
    ],
    durchmesser: [
      {d: 20, text: "Ø20 f7", seite: "links",  versatz: 26, vonMm: 0},
      {d: 24, text: "Ø24", seite: "links",  versatz: 52, vonMm: 22.3},
      {d: 30, text: "Ø30", seite: "mitte",  versatz: 47.3, ab: -34},
      {d: 25, text: "Ø25 k6", seite: "rechts", versatz: 34, vonMm: 91.6, ab: -30}
    ]
  },
  bezeichnungen: [
    {x: 9.65,  d: 20, text: "Nut A",           ab: -30, hoch: 46},
    {x: 84.25, d: 25, text: "Nut B",           ab: -46, hoch: 26},
    {x: 93.3,  d: 19, text: "DIN 76 – A",      ab: -12, hoch: 46},
    {x: 112,   d: 20, text: "M20×1 – 6g",      ab: 20,  hoch: 26}
  ],
  rauheiten: [
    {x: 16, d: 20, text: "Rz 4"},
    {x: 32, d: 24, text: "Rz 6"},
    {x: 70, d: 25, text: "Rz 4"}
  ]
};

/* ==================================================================== *
 * Mitnehmerwelle - die Welle der Lektion
 *
 * Das durchgerechnete Beispiel. Sie trägt von jedem Drehverfahren genau
 * ein Stück, damit die Lektion nichts erklären muss, was nicht im Bild
 * steht. Ihre engste Innenrundung ist die R0,8 am ersten Absatz - daraus
 * folgt r_eps <= 0,7 mm, genormt 0,6 mm.
 * ==================================================================== */
WELLEN.mitnehmerwelle = {
  id: "mitnehmerwelle",
  name: "Mitnehmerwelle",
  wo: "Lektion „Drehprozess planen“",
  werkstoff: "C45E",
  werkstoffnummer: "1.1191",
  zustand: "+QT",

  laenge: 106,
  abschnitte: [
    {von: 0,  bis: 18,  d: 26, name: "Zapfen links"},
    {von: 18, bis: 56,  d: 32, name: "Lagersitz"},
    {von: 56, bis: 68,  d: 36, name: "Bund"},
    {von: 68, bis: 106, d: 24, name: "Gewindezapfen"}
  ],
  gewinde: {bezeichnung: "M24×2 – 6g", von: 72, bis: 106, P: 2,
            d: 24, d3: 24 - 1.2268 * 2},
  nuten: [
    {marke: "A", bei: 7, breite: 1.3, tiefe: 0.5, d: 26}
  ],
  freistiche: [],
  /* Keine Freistiche nach DIN 509: Die Absätze sind verrundet, die
     Gegenstücke gefast. Die engste Rundung ist damit die R0,8. */
  rundungen: [{bei: 18, r: 0.8}, {bei: 56, r: 1.6}],
  kleinsterInnenradius: 0.8,
  woher: "Rundung R0,8 am Absatz Ø26 auf Ø32",
  gewindefreistich: {norm: "DIN 76 – A", von: 68, bis: 72},
  zentrierbohrungen: {links: "ISO 6411 – A2,5×5,3", rechts: "ISO 6411 – A3,15×6,7"},
  rohteil: {d: 38, laenge: 112},

  flaechen: [
    {id: "stirn_links", name: "linke Stirnfläche", bei: 0, art: "stirn",
     verfahren: "abstechdrehen"},
    {id: "mantel_26",   name: "Ø26 links", von: 0, bis: 18, d: 26,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 6.3},
    {id: "nut_a",       name: "Nut A", bei: 7, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "schulter_18", name: "Schulter bei 18", bei: 18, art: "schulter",
     verfahren: "querplandrehen"},
    {id: "mantel_32",   name: "Lagersitz Ø32", von: 18, bis: 56, d: 32,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 4},
    {id: "bund_36",     name: "Bund Ø36", von: 56, bis: 68, d: 36,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 10},
    {id: "freistich",   name: "Freistich DIN 76 – A", bei: 70, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "gewinde",     name: "Gewinde M24×2", von: 72, bis: 106, d: 24,
     art: "gewinde", verfahren: "gewindedrehen"},
    {id: "stirn_rechts", name: "rechte Stirnfläche", bei: 106, art: "stirn",
     verfahren: "querplandrehen"}
  ],

  masse: {
    unten: [
      {von: 0, bis: 7,   text: "7",   an: [26, 26]},
      {von: 0, bis: 18,  text: "18",  an: [26, 26]},
      {von: 0, bis: 56,  text: "56",  an: [26, 32]},
      {von: 0, bis: 106, text: "106", an: [26, 24]}
    ],
    oben: [
      {von: 72, bis: 106, text: "34", an: [24, 24]},
      {von: 68, bis: 106, text: "38", an: [36, 24]},
      {von: 56, bis: 106, text: "50", an: [36, 24]}
    ],
    durchmesser: [
      {d: 26, text: "Ø26", seite: "links", versatz: 26, vonMm: 0},
      {d: 32, text: "Ø32", seite: "links", versatz: 52, vonMm: 18},
      {d: 36, text: "Ø36", seite: "mitte", versatz: 62, ab: -34}
    ]
  },
  bezeichnungen: [
    {x: 7.65, d: 26, text: "Nut A",      ab: -30, hoch: 46},
    {x: 70,   d: 22, text: "DIN 76 – A", ab: -12, hoch: 46},
    {x: 90,   d: 24, text: "M24×2 – 6g", ab: 20,  hoch: 26}
  ],
  rauheiten: [
    {x: 12, d: 26, text: "Rz 6,3"},
    {x: 36, d: 32, text: "Rz 4"}
  ]
};

/* ==================================================================== *
 * Spannwelle - die Welle der Übungen und Trainings
 *
 * Kleiner und weicher als die anderen: C25E liegt in der Zeile
 * „Rm <= 650", also bei ganz anderen Schnittgeschwindigkeiten. Ihre
 * engste Innenrundung ist R1,0 - daraus folgt r_eps <= 0,9 mm, genormt
 * 0,8 mm. Wer die Zahl aus der Lektion abschreibt, liegt falsch.
 * ==================================================================== */
WELLEN.spannwelle = {
  id: "spannwelle",
  name: "Spannwelle",
  wo: "Übungen und Trainings",
  werkstoff: "C25E",
  werkstoffnummer: "1.1158",
  zustand: "+QT",

  laenge: 90,
  abschnitte: [
    {von: 0,  bis: 14, d: 18, name: "Zapfen links"},
    {von: 14, bis: 48, d: 22, name: "Führungssitz"},
    {von: 48, bis: 58, d: 26, name: "Bund"},
    {von: 58, bis: 90, d: 16, name: "Gewindezapfen"}
  ],
  gewinde: {bezeichnung: "M16×1,5 – 6g", von: 61.5, bis: 90, P: 1.5,
            d: 16, d3: 16 - 1.2268 * 1.5},
  nuten: [
    {marke: "A", bei: 6,  breite: 1.3, tiefe: 0.5, d: 18},
    {marke: "B", bei: 43, breite: 1.3, tiefe: 0.5, d: 22}
  ],
  freistiche: [],
  rundungen: [{bei: 14, r: 1}, {bei: 48, r: 1.6}],
  kleinsterInnenradius: 1,
  woher: "Rundung R1 am Absatz Ø18 auf Ø22",
  gewindefreistich: {norm: "DIN 76 – A", von: 58, bis: 61.5},
  zentrierbohrungen: {links: "ISO 6411 – A2×4,25", rechts: "ISO 6411 – A2,5×5,3"},
  rohteil: {d: 28, laenge: 96},

  /* Zwei Passungen, absichtlich von anderer Art als bei der
     Antriebswelle: g6 ist eine Spielpassung, n6 eine Übermasspassung.
     Der Ø18 liegt genau auf der Bereichsgrenze - die Zeile "über 10 bis
     18" gilt, nicht die darüber. Das ist der Ablesefehler, um den es in
     der Übung geht. */
  toleranzen: [
    {flaeche: "mantel_22", nennmass: 22, klasse: "g6", es: -7, ei: -20},
    {flaeche: "mantel_18", nennmass: 18, klasse: "n6", es: 23, ei: 12}
  ],

  flaechen: [
    {id: "stirn_links", name: "linke Stirnfläche", bei: 0, art: "stirn",
     verfahren: "abstechdrehen"},
    {id: "mantel_18",   name: "Ø18 links", von: 0, bis: 14, d: 18,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 6.3},
    {id: "nut_a",       name: "Nut A", bei: 6, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "schulter_14", name: "Schulter bei 14", bei: 14, art: "schulter",
     verfahren: "querplandrehen"},
    {id: "mantel_22",   name: "Führungssitz Ø22", von: 14, bis: 48, d: 22,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 4},
    {id: "nut_b",       name: "Nut B", bei: 43, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "bund_26",     name: "Bund Ø26", von: 48, bis: 58, d: 26,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 10},
    {id: "freistich",   name: "Freistich DIN 76 – A", bei: 59.7, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "gewinde",     name: "Gewinde M16×1,5", von: 61.5, bis: 90, d: 16,
     art: "gewinde", verfahren: "gewindedrehen"},
    {id: "stirn_rechts", name: "rechte Stirnfläche", bei: 90, art: "stirn",
     verfahren: "querplandrehen"}
  ],

  masse: {
    unten: [
      {von: 0, bis: 6,  text: "6",  an: [18, 18]},
      {von: 0, bis: 14, text: "14", an: [18, 18]},
      {von: 0, bis: 48, text: "48", an: [18, 22]},
      {von: 0, bis: 90, text: "90", an: [18, 16]}
    ],
    oben: [
      {von: 61.5, bis: 90, text: "28,5", an: [16, 16]},
      {von: 58,   bis: 90, text: "32",   an: [26, 16]},
      {von: 43,   bis: 90, text: "47",   an: [22, 16]}
    ],
    durchmesser: [
      {d: 18, text: "Ø18 n6", seite: "links", versatz: 26, vonMm: 0},
      {d: 22, text: "Ø22 g6", seite: "links", versatz: 52, vonMm: 14},
      {d: 26, text: "Ø26", seite: "mitte", versatz: 53, ab: -34}
    ]
  },
  bezeichnungen: [
    {x: 6.65,  d: 18, text: "Nut A",        ab: -30, hoch: 46},
    {x: 43.65, d: 22, text: "Nut B",        ab: -46, hoch: 26},
    {x: 59.7,  d: 15, text: "DIN 76 – A",   ab: -12, hoch: 46},
    {x: 76,    d: 16, text: "M16×1,5 – 6g", ab: 20,  hoch: 26}
  ],
  rauheiten: [
    {x: 10, d: 18, text: "Rz 6,3"},
    {x: 30, d: 22, text: "Rz 4"}
  ]
};

/* ==================================================================== *
 * Abtriebswelle - Lernsituation 2
 *
 * Die schwierige. Jede Entscheidung für sich ist noch lehrbuchmäßig, aber
 * sie widersprechen sich, und das muss aufgelöst werden:
 *
 *   X5CrNi18-10   Hauptanwendungsgruppe M, nicht P. Wer in der
 *                 Stahlzeile nachschlägt, liest zu hohe Werte.
 *   R0,3          Die engste Innenrundung erlaubt nur r_eps = 0,2 mm.
 *                 Der Vorschub für Rz 4 wäre dann 0,08 mm - und liegt
 *                 damit UNTER dem Schlichtbereich des Tabellenbuchs
 *                 (0,1 bis 0,25 mm). Die Zeichnung fordert etwas, das
 *                 sich so nicht drehen lässt.
 *   Schmiedehaut  Das Rohteil ist gesenkgeschmiedet. Der erste Schnitt
 *                 läuft durch wechselnde Tiefe und Zunder - Zeile 2 der
 *                 Bedingungstabelle.
 *   Passfedernut  Wird sie vor dem Schlichten gefräst, läuft die
 *                 Schlichtschneide über eine Unterbrechung - Zeile 3.
 *   Kegel 1:10    Der Vorschub läuft schräg zur Achse.
 *   Bohrung       Innendrehen mit ausgekragter Bohrstange.
 * ==================================================================== */
WELLEN.abtriebswelle = {
  id: "abtriebswelle",
  name: "Abtriebswelle",
  wo: "Lernsituation 2",
  werkstoff: "X5CrNi18-10",
  werkstoffnummer: "1.4301",
  zustand: "warmgewalzter Stab",

  laenge: 165,
  abschnitte: [
    {von: 0,  bis: 30,  d: 28, name: "Zapfen links"},
    {von: 30, bis: 78,  d: 36, name: "Lagersitz"},
    {von: 78, bis: 90,  d: 42, name: "Bund"},
    /* Der Kegel: 1:10 heißt vier Millimeter Durchmesser auf vierzig
       Millimeter Länge. `dBis` macht den Abschnitt kegelig. */
    {von: 90, bis: 130, d: 38, dBis: 34, name: "Kegel 1:10"},
    {von: 130, bis: 165, d: 24, name: "Gewindezapfen"}
  ],
  gewinde: {bezeichnung: "M24×3 – 6g", von: 134, bis: 165, P: 3,
            d: 24, d3: 24 - 1.2268 * 3},
  nuten: [],
  /* Passfedernut nach DIN 6885-1: Für Ø 30 bis 38 mm sind das b = 10 mm
     Breite und t1 = 5 mm Tiefe in der Welle. Sie liegt oben und ist nicht
     rotationssymmetrisch - gefräst, nicht gedreht. */
  laengsnuten: [{von: 38, bis: 70, breite: 10, tiefe: 5, d: 36,
                 norm: "Passfeder DIN 6885-1 – A – 10 × 8 × 32"}],
  /* Eine Sacklochbohrung von links, als verdeckte Kante gezeichnet. */
  bohrungen: [{von: 0, bis: 40, d: 18, norm: "Ø18 H7, 40 tief"}],
  freistiche: [],
  rundungen: [{bei: 30, r: 0.3}, {bei: 78, r: 1.6}, {bei: 90, r: 0.8}],
  /* Die R0,3 am ersten Absatz. Sie ist der Grund, warum sich die geforderte
     Rz 4 am Lagersitz nicht drehen lässt: r_eps <= 0,2 mm, und der
     Vorschub dazu läge unter dem, was das Tabellenbuch fürs Schlichten
     vorsieht. */
  kleinsterInnenradius: 0.3,
  woher: "Rundung R0,3 am Absatz Ø28 auf Ø36",
  gewindefreistich: {norm: "DIN 76 – A", von: 130, bis: 134},
  zentrierbohrungen: {links: "–", rechts: "ISO 6411 – A3,15×6,7"},
  rohteil: {d: 46, laenge: 172,
            art: "Gesenkschmiedeteil mit Zunderhaut"},

  toleranzen: [
    {flaeche: "mantel_36", nennmass: 36, klasse: "k6", es: 18, ei: 2},
    {flaeche: "bohrung_18", nennmass: 18, klasse: "H7", es: 18, ei: 0}
  ],

  flaechen: [
    {id: "stirn_links", name: "linke Stirnfläche", bei: 0, art: "stirn",
     verfahren: "abstechdrehen"},
    {id: "bohrung_18", name: "Bohrung Ø18 H7", von: 0, bis: 40, d: 18,
     art: "bohrung", verfahren: "innendrehen"},
    {id: "mantel_28",  name: "Ø28 links", von: 0, bis: 30, d: 28,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 6.3},
    {id: "schulter_30", name: "Schulter bei 30", bei: 30, art: "schulter",
     verfahren: "querplandrehen"},
    {id: "mantel_36",  name: "Lagersitz Ø36 k6", von: 30, bis: 78, d: 36,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 4},
    {id: "laengsnut",  name: "Passfedernut 10 × 5", von: 38, bis: 70,
     art: "laengsnut", verfahren: "fraesen"},
    {id: "bund_42",    name: "Bund Ø42", von: 78, bis: 90, d: 42,
     art: "mantel", verfahren: "laengsrunddrehen", rz: 10},
    {id: "kegel",      name: "Kegel 1:10", von: 90, bis: 130, d: 38,
     dBis: 34, art: "kegel", verfahren: "kegeldrehen", rz: 6.3},
    {id: "freistich",  name: "Freistich DIN 76 – A", bei: 132, art: "nut",
     verfahren: "einstechdrehen"},
    {id: "gewinde",    name: "Gewinde M24×3", von: 134, bis: 165, d: 24,
     art: "gewinde", verfahren: "gewindedrehen"},
    {id: "stirn_rechts", name: "rechte Stirnfläche", bei: 165, art: "stirn",
     verfahren: "querplandrehen"}
  ],

  masse: {
    unten: [
      {von: 0, bis: 30,  text: "30",  an: [28, 28]},
      {von: 0, bis: 78,  text: "78",  an: [28, 36]},
      {von: 0, bis: 90,  text: "90",  an: [28, 42]},
      {von: 0, bis: 165, text: "165", an: [28, 24]}
    ],
    oben: [
      {von: 134, bis: 165, text: "31", an: [24, 24]},
      {von: 90,  bis: 130, text: "40", an: [42, 34]},
      {von: 38,  bis: 70,  text: "32", an: [36, 36]}
    ],
    durchmesser: [
      {d: 28, text: "Ø28",    seite: "links",  versatz: 26, vonMm: 0},
      {d: 36, text: "Ø36 k6", seite: "links",  versatz: 52, vonMm: 30},
      {d: 42, text: "Ø42",    seite: "mitte",  versatz: 84, ab: -40},
      {d: 34, text: "Ø34",    seite: "rechts", versatz: 34, vonMm: 130,
       ab: -30}
    ]
  },
  bezeichnungen: [
    {x: 20,  d: 18, text: "Ø18 H7, 40 tief",     ab: -18, hoch: 56},
    {x: 54,  d: 36, text: "Passfedernut 10 × 5", ab: 14,  hoch: 34},
    {x: 105, d: 36, text: "Kegel 1:10",          ab: -30, hoch: 60},
    {x: 132, d: 21, text: "DIN 76 – A",          ab: 26,  hoch: 96},
    {x: 150, d: 24, text: "M24×3 – 6g",          ab: 16,  hoch: 26}
  ],
  rauheiten: [
    {x: 14,  d: 28, text: "Rz 6,3"},
    {x: 74,  d: 36, text: "Rz 4"},
    {x: 120, d: 35, text: "Rz 6,3"}
  ]
};
