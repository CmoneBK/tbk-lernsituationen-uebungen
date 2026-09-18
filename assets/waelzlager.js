/* Wälzlager: was im Buch steht, und wie man es zeichnet.
 *
 * Eingebunden nach assets/zeichnen.js:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/waelzlager.js"></script>
 *
 * Dieselbe Datei liegt in zwei Repos - wird sie geändert, gehört sie in
 * beide kopiert.
 *
 * Was dieser Baustein NICHT tut: ein bestimmtes Werkstück beschreiben.
 * Lektion, Übung, Training und Lernsituation bekommen je eigene Lagerungen
 * mit eigenen Größen; geteilt wird die Mechanik, nicht das Maß. Wer hier
 * eine feste Welle mit festen Lagern sucht, sucht am falschen Ort.
 *
 * Drei Dinge stehen hier:
 *
 *   1. NORM - die abgelesenen Tabellen aus dem Tabellenbuch Metall
 *      (50. Auflage), Kapitel 5.10 Lager, Seiten 281 bis 286. Der Ordner
 *      tabellenbuch/ steht in .gitignore; was das Material braucht, muss
 *      also hier stehen.
 *   2. Rechnen - Bezeichnung zerlegen, äquivalente Belastung, Lebensdauer,
 *      Stützbasis. Alles nachvollziehbar in Schritten, weil die Schritte
 *      der Lerninhalt sind und nicht das Ergebnis.
 *   3. Zeichnen - eine Lagerung im Schnitt, aus Parametern. Damit bekommt
 *      jede Seite ihr eigenes Bild, ohne dass jemand acht Zeichnungen von
 *      Hand baut.
 */
(function (global) {
  'use strict';

  /* ======================================================================
     1  WAS IM BUCH STEHT
     ====================================================================== */

  /* Seite 281, Bezeichnung von Wälzlagern, vgl. DIN 623-1 (2020-06) */
  var LAGERART = {
    '0': 'Schrägkugellager, zweireihig',
    '1': 'Pendelkugellager, zweireihig',
    '2': 'Tonnen- und Pendelrollenlager',
    '3': 'Kegelrollenlager',
    '4': 'Rillenkugellager, zweireihig',
    '5': 'Axial-Rillenkugellager',
    '6': 'Rillenkugellager, einreihig',
    '7': 'Schrägkugellager, einreihig',
    '8': 'Axial-Zylinderrollenlager',
    'NA': 'Nadellager',
    'QJ': 'Vierpunktlager',
    'N': 'Zylinderrollenlager',
    'NJ': 'Zylinderrollenlager',
    'NU': 'Zylinderrollenlager',
    'NUP': 'Zylinderrollenlager',
    'NN': 'Zylinderrollenlager, zweireihig',
    'NNU': 'Zylinderrollenlager, zweireihig'
  };

  var VORSETZ = {
    K: 'Käfig mit Wälzkörpern',
    L: 'Freier Ring',
    R: 'Ring mit Wälzkörpersatz',
    S: 'Nichtrostender Stahl',
    W: 'Nichtrostender Stahl'
  };

  var NACHSETZ = {
    K: 'Lager mit kegeliger Bohrung',
    Z: 'Deckscheibe auf einer Seite',
    '2Z': 'Deckscheibe auf zwei Seiten',
    E: 'Verstärkte Ausführung',
    RS: 'Dichtscheibe auf einer Seite',
    '2RS': 'Dichtscheibe auf beiden Seiten',
    P2: 'Höchste Maß-, Form- und Laufgenauigkeit',
    B: 'Berührungswinkel 40°'
  };

  /* Bohrungskennzahl -> Bohrungsdurchmesser in mm. Ab 04 ist es das
     Fünffache; darunter steht es in der Tabelle, weil die Regel dort noch
     nicht greift. */
  var BOHRUNG = {
    '00': 10, '01': 12, '02': 15, '03': 17, '04': 20, '05': 25, '06': 30,
    '07': 35, '08': 40, '09': 45, '10': 50, '11': 55, '12': 60, '13': 65,
    '14': 70, '15': 75, '16': 80, '17': 85, '18': 90, '19': 95, '20': 100,
    '21': 105, '22': 110, '24': 120
  };

  /* Seite 283, Rillenkugellager (Auswahl), vgl. DIN 625-1 (2011-04).
     d: [D, B, r max, h min] in mm */
  var RKL = {
    '60': {
      10: [26, 8, 0.3, 1], 12: [28, 8, 0.3, 1], 15: [32, 9, 0.3, 1],
      17: [35, 10, 0.3, 1], 20: [42, 12, 0.6, 1.6], 25: [47, 12, 0.6, 1.6],
      30: [55, 13, 1, 2.3], 35: [62, 14, 1, 2.3], 40: [68, 15, 1, 2.3],
      45: [75, 16, 1, 2.3], 50: [80, 16, 1, 2.3], 55: [90, 18, 1, 3],
      60: [95, 18, 1, 3], 65: [100, 18, 1, 3], 70: [110, 20, 1, 3],
      75: [115, 20, 1, 3], 80: [125, 22, 1, 3], 85: [130, 22, 1.5, 3.5],
      90: [140, 24, 1.5, 3.5], 95: [145, 24, 1.5, 3.5],
      100: [150, 24, 1.5, 3.5]
    },
    '62': {
      10: [30, 9, 0.6, 2.1], 12: [32, 10, 0.6, 2.1], 15: [35, 11, 0.6, 2.1],
      17: [40, 12, 0.6, 2.1], 20: [47, 14, 1, 2.8], 25: [52, 15, 1, 2.8],
      30: [62, 16, 1, 2.8], 35: [72, 17, 1, 2.8], 40: [80, 18, 1, 3.5],
      45: [85, 19, 1, 3.5], 50: [90, 20, 1, 3.5], 55: [100, 21, 1.5, 4.5],
      60: [110, 22, 1.5, 4.5], 65: [120, 23, 1.5, 4.5],
      70: [125, 24, 1.5, 4.5], 75: [130, 25, 2, 5.5], 80: [140, 26, 2, 5.5],
      85: [150, 28, 2.1, 6], 90: [160, 30, 2.1, 6], 95: [170, 32, 2.1, 6],
      100: [180, 34, 2.1, 6]
    },
    '63': {
      10: [35, 11, 0.6, 2.1], 12: [37, 12, 1, 2.8], 15: [42, 13, 1, 2.8],
      17: [47, 14, 1, 2.8], 20: [52, 15, 1, 3.5], 25: [62, 17, 1, 3.5],
      30: [72, 19, 1, 3.5], 35: [80, 21, 1.5, 4.5], 40: [90, 23, 1.5, 4.5],
      45: [100, 25, 1.5, 4.5], 50: [110, 27, 2, 5.5], 55: [120, 29, 2, 5.5],
      60: [130, 31, 2.1, 6], 65: [140, 33, 2.1, 6], 70: [150, 35, 2.1, 6],
      75: [160, 37, 2.1, 6], 80: [170, 39, 2.5, 7], 85: [180, 41, 2.5, 7],
      90: [190, 43, 2.5, 7], 95: [200, 45, 2.5, 7], 100: [215, 47, 2.5, 7]
    }
  };

  /* Seite 282, Richtwerte für Tragzahlen von Rillenkugellagern.
     d: [C in kN, C0 in kN, f0]

     Tabelliert sind nur acht Bohrungsdurchmesser. Wer eine Aufgabe mit
     d = 25 stellt, muss die Tragzahl erfinden - also stellt er sie nicht. */
  var TRAG = {
    '60': {
      20: [10.6, 5, 13.8], 30: [14.5, 8.3, 14.8], 40: [17.8, 11.5, 15.2],
      50: [22, 15.8, 15.6], 60: [31.5, 23.2, 15.6], 70: [40.5, 31, 15.6],
      80: [51, 40, 15.7], 100: [64, 54, 15.8]
    },
    '62': {
      20: [14.7, 6.6, 13.1], 30: [22, 11.3, 13.8], 40: [31.5, 17.8, 14.0],
      50: [38, 23.2, 14.4], 60: [57, 36.5, 14.5], 70: [66, 44, 14.4],
      80: [77, 55, 15.0], 100: [130, 93, 14.4]
    },
    '63': {
      20: [16.9, 7.9, 12.4], 30: [32, 16.2, 13.0], 40: [47, 25, 13.0],
      50: [68, 38, 13.1], 60: [89, 52, 13.2], 70: [115, 69, 13.4],
      80: [131, 87, 13.3], 100: [177, 137, 13.7]
    }
  };

  /* Seite 283, Schrägkugellager, Ausführung B: Berührungswinkel 40°.
     d: [D, B] in mm */
  var SKL = {
    '72': {
      15: [35, 11], 17: [40, 12], 20: [47, 14], 25: [52, 15], 30: [62, 16],
      35: [72, 17], 40: [80, 18], 45: [85, 19], 50: [90, 20], 55: [100, 21],
      60: [110, 22], 65: [120, 23], 70: [125, 24], 75: [130, 25],
      80: [140, 26], 85: [150, 28], 90: [160, 30], 95: [170, 32],
      100: [180, 34]
    },
    '73': {
      15: [42, 13], 17: [47, 14], 20: [52, 15], 25: [62, 17], 30: [72, 19],
      35: [80, 21], 40: [90, 23], 45: [100, 25], 50: [110, 27],
      55: [120, 29], 60: [130, 31], 65: [140, 33], 70: [150, 35],
      75: [160, 37], 80: [170, 39], 85: [180, 41], 90: [190, 43],
      95: [200, 45], 100: [215, 47]
    }
  };

  /* Seite 285, Kegelrollenlager, Lagerreihe 302, vgl. DIN 720.
     d: [D, B, C, T, d1] in mm */
  var KRL = {
    '302': {
      20: [47, 14, 12, 15.25, 33.2], 25: [52, 15, 13, 16.25, 37.4],
      30: [62, 16, 14, 17.25, 44.6], 35: [72, 17, 15, 18.25, 51.8],
      40: [80, 18, 16, 19.75, 57.5], 45: [85, 19, 16, 20.75, 63],
      50: [90, 20, 17, 21.75, 67.9], 55: [100, 21, 18, 22.75, 74.6],
      60: [110, 22, 19, 23.75, 81.5], 65: [120, 23, 20, 24.75, 89],
      70: [125, 24, 21, 26.25, 93.9], 75: [130, 25, 22, 27.25, 99.2],
      80: [140, 26, 22, 28.25, 105], 85: [150, 28, 24, 30.5, 112],
      90: [160, 30, 26, 32.5, 118]
    }
  };

  /* Seite 286, Nutmuttern DIN 981 und die Sicherungsbleche DIN 5406 dazu.
     Kurzzeichen: [Gewinde, d2, h] */
  var NUTMUTTER = {
    KM0: ['M10 × 0,75', 18, 4], KM1: ['M12 × 1', 22, 4],
    KM2: ['M15 × 1', 25, 5], KM3: ['M17 × 1', 28, 5],
    KM4: ['M20 × 1', 32, 6], KM5: ['M25 × 1,5', 38, 7],
    KM6: ['M30 × 1,5', 45, 7], KM7: ['M35 × 1,5', 52, 8],
    KM8: ['M40 × 1,5', 58, 9], KM9: ['M45 × 1,5', 65, 10],
    KM10: ['M50 × 1,5', 70, 11], KM11: ['M55 × 2', 75, 11],
    KM12: ['M60 × 2', 80, 11], KM13: ['M65 × 2', 85, 12],
    KM14: ['M70 × 2', 92, 12], KM15: ['M75 × 2', 98, 13],
    KM16: ['M80 × 2', 105, 15], KM17: ['M85 × 2', 110, 16],
    KM18: ['M90 × 2', 120, 16], KM19: ['M95 × 2', 125, 17],
    KM20: ['M100 × 2', 130, 18]
  };

  /* Seite 282, Radiallastfaktor X, Axiallastfaktor Y für Rillenkugellager */
  var LAST = {
    stuetz: [0.3, 0.5, 0.9, 1.6, 3, 6],
    e: [0.22, 0.24, 0.28, 0.32, 0.36, 0.43],
    Y: [2, 1.8, 1.58, 1.4, 1.2, 1.0],
    X: 0.56
  };

  /* Seite 282, empfohlene nominelle Lebensdauer L10h in Stunden */
  var EMPFOHLEN = {
    'Elektrische Haushaltsgeräte': [1500, 3000],
    'Universalgetriebe (mittel)': [4000, 14000],
    'E-Motoren, mittel (5…100 kW)': [21000, 30000],
    'Dreh-, Frässpindeln': [14000, 46000],
    'Bohrspindeln': [14000, 32000],
    'Elektro- und Druckluftwerkzeuge': [4000, 14000],
    'Hebezeuge, Fördermaschinen': [10000, 15000],
    'Verbrennungsmotoren': [900, 4000],
    'Motorräder': [400, 2000],
    'Pkw-Radlager': [1400, 5300],
    'Mittelschwere Lkw': [2900, 5300],
    'Schwere Lkw': [4000, 8800],
    'Omnibusse': [2900, 11000],
    'Schienenfahrzeuggetriebe': [14000, 46000]
  };

  /* Seite 220 der Fachkunde: Längenausdehnungskoeffizienten für die
     Warmmontage. Dieselben Zahlen stehen im Tabellenbuch bei den
     Werkstoffen. */
  var ALPHA = {
    'Unlegierter Stahl (E335)': 0.000011,
    'Legierter Stahl (41Cr4)': 0.000010,
    'Nichtrostender Stahl (X5CrNi18-10)': 0.000016,
    'Kupfer': 0.0000168,
    'Aluminium': 0.0000239
  };

  /* ======================================================================
     2  RECHNEN
     ====================================================================== */

  /* Eine Bezeichnung zerlegen: aus "6206-2RS" wird, was drinsteht.
     Zurück kommt null, wenn nichts Vernünftiges dabei herauskommt - eine
     Übung, die falsch geratene Eingaben still schluckt, prüft nichts. */
  function zerlegen(bez) {
    var roh = String(bez || '').trim().replace(/\s+/g, ' ');
    /* Vorsetzzeichen stehen vor dem Basiszeichen und sind ein einzelner
       Buchstabe mit Leerzeichen dahinter. */
    var vor = null;
    var m = roh.match(/^([KLRSW])\s+(.+)$/);
    if (m) { vor = m[1]; roh = m[2]; }

    /* Rollenlager tragen Buchstaben im Basiszeichen. */
    var buch = roh.match(/^(NNU|NUP|NN|NU|NJ|NA|QJ|N)\s*(\d+)(.*)$/);
    var art, rest, ziffern;
    if (buch) {
      art = buch[1];
      ziffern = buch[2];
      rest = buch[3];
    } else {
      m = roh.match(/^(\d{3,5})(.*)$/);
      if (!m) return null;
      ziffern = m[1];
      rest = m[2];
      art = ziffern.charAt(0);
    }

    var e = {
      bezeichnung: String(bez).trim(),
      vorsetz: vor,
      vorsetzText: vor ? VORSETZ[vor] : null,
      lagerart: art,
      lagerartText: LAGERART[art] || null,
      nachsetz: [],
      nachsetzText: []
    };

    /* Die letzten zwei Ziffern sind die Bohrungskennzahl, davor liegen
       Breiten- und Durchmesserreihe. Bei Rillen- und Schrägkugellagern
       lässt DIN 623-1 die 0 der Breitenreihe teilweise weg - dann bleiben
       vier Ziffern statt fünf. */
    var kenn = ziffern.slice(-2);
    var reihe = ziffern.slice(0, -2);
    e.kennzahl = kenn;
    e.d = BOHRUNG[kenn] !== undefined ? BOHRUNG[kenn]
      : (Number(kenn) >= 4 ? Number(kenn) * 5 : null);
    if (reihe.length === 3) {
      e.breitenreihe = reihe.charAt(1);
      e.durchmesserreihe = reihe.charAt(2);
    } else if (reihe.length === 2) {
      e.breitenreihe = '0';
      e.durchmesserreihe = reihe.charAt(1);
      e.breiteWeggelassen = true;
    } else {
      e.breitenreihe = null;
      e.durchmesserreihe = reihe.charAt(reihe.length - 1) || null;
    }
    e.massreihe = (e.breitenreihe || '') + (e.durchmesserreihe || '');
    e.lagerreihe = buch ? art + ziffern.slice(0, -2)
      : art + (e.durchmesserreihe || '');

    /* Nachsetzzeichen: alles hinter dem Basiszeichen, getrennt durch
       Bindestriche oder Leerzeichen. */
    String(rest || '').split(/[-\s]+/).forEach(function (t) {
      if (!t) return;
      var k = t.toUpperCase();
      e.nachsetz.push(k);
      e.nachsetzText.push(NACHSETZ[k] || 'nicht in der Auswahl des Buchs');
    });
    return e;
  }

  /* Zwischen zwei Stützstellen linear interpolieren. Das Buch rechnet
     genau so - sein Beispiel kommt auf e ≈ 0,292 und Y = 1,5254. */
  function zwischen(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (var i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        var t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
        return ys[i - 1] + t * (ys[i] - ys[i - 1]);
      }
    }
    return ys[ys.length - 1];
  }

  /* Die äquivalente Belastung und die Lebensdauer eines Rillenkugellagers.
     Zurück kommen nicht nur die Zahlen, sondern die Schritte - denn wer
     nur das Ergebnis sieht, hat nichts nachgeschlagen.

     o: {C, C0, f0, Fr, Fa, n}  Kräfte in kN, n in 1/min */
  function lebensdauer(o) {
    var C = Number(o.C), C0 = Number(o.C0), f0 = Number(o.f0);
    var Fr = Number(o.Fr), Fa = Number(o.Fa || 0), n = Number(o.n);
    var s = [];

    var hilf = C0 > 0 ? (f0 * Fa) / C0 : 0;
    s.push({ was: '(f₀ · Fₐ) / C₀', rechnung: rund(f0, 4) + ' · '
      + rund(Fa, 4) + ' kN / ' + rund(C0, 4) + ' kN', wert: rund(hilf, 4) });

    var e = zwischen(hilf, LAST.stuetz, LAST.e);
    s.push({ was: 'e', rechnung: 'aus der Tabelle, zwischen den '
      + 'Stützstellen interpoliert', wert: rund(e, 4) });

    var q = Fr > 0 ? Fa / Fr : Infinity;
    s.push({ was: 'Fₐ / Fᵣ', rechnung: rund(Fa, 4) + ' kN / '
      + rund(Fr, 4) + ' kN', wert: rund(q, 4) });

    var X, Y;
    if (Fa <= 0) {
      X = 1; Y = 0;
      s.push({ was: 'X und Y', rechnung: 'ohne Axialkraft ist P = Fᵣ',
        wert: 'X = 1, Y = 0' });
    } else if (q > e) {
      X = LAST.X;
      Y = zwischen(hilf, LAST.stuetz, LAST.Y);
      s.push({ was: 'X und Y', rechnung: 'Fₐ/Fᵣ > e, also X = 0,56 und '
        + 'Y aus derselben Spalte', wert: 'X = 0,56, Y = ' + rund(Y, 4) });
    } else {
      X = 1; Y = 0;
      s.push({ was: 'X und Y', rechnung: 'Fₐ/Fᵣ ≤ e, die Axialkraft '
        + 'zählt nicht mit', wert: 'X = 1, Y = 0' });
    }

    var P = X * Fr + Y * Fa;
    s.push({ was: 'P = X · Fᵣ + Y · Fₐ', rechnung: rund(X, 4) + ' · '
      + rund(Fr, 4) + ' kN + ' + rund(Y, 4) + ' · ' + rund(Fa, 4) + ' kN',
      wert: rund(P, 3) + ' kN' });

    var L10 = P > 0 ? Math.pow(C / P, 3) : Infinity;
    s.push({ was: 'L₁₀ = (C/P)³', rechnung: '(' + rund(C, 4) + ' kN / '
      + rund(P, 3) + ' kN)³', wert: rund(L10, 0) + ' · 10⁶ Umdrehungen' });

    var L10h = n > 0 ? (L10 * 1e6) / (60 * n) : Infinity;
    s.push({ was: 'L₁₀ₕ = L₁₀ / (60 · n)', rechnung: rund(L10, 0)
      + ' · 10⁶ / (60 · ' + rund(n, 0) + ' 1/min)',
      wert: rund(L10h, 0) + ' h' });

    return { hilf: hilf, e: e, q: q, X: X, Y: Y, P: P, L10: L10,
      L10h: L10h, schritte: s };
  }

  /* Die Stützbasis einer angestellten Lagerung.

     Die Drucklinie steht unter dem Berührungswinkel α zur Radialebene. Von
     der Mitte der Wälzkörper aus trifft sie die Wellenachse nach dem
     axialen Weg a = r_m / tan α. Bei der O-Anordnung zeigen die
     Drucklinien nach außen, die Schnittpunkte liegen also außerhalb: die
     Stützbasis wird größer als der Lagerabstand. Bei der X-Anordnung
     zeigen sie nach innen, und sie wird kleiner.

     o: {d, D, abstand, winkel} - alles in mm bzw. Grad */
  function stuetzbasis(o) {
    var rm = (Number(o.d) + Number(o.D)) / 4;
    var a = rm / Math.tan(Number(o.winkel) * Math.PI / 180);
    var L = Number(o.abstand);
    return { rm: rm, a: a, abstand: L, O: L + 2 * a, X: L - 2 * a };
  }

  /* Längenänderung durch Erwärmung, Fachkunde Seite 220. */
  function waermedehnung(l, alpha, dt) {
    return Number(l) * Number(alpha) * Number(dt);
  }

  /* Schlägt ein Lager nach. Zurück kommen die Maße und, wenn es sie gibt,
     die Tragzahlen. */
  function lager(bez) {
    var z = zerlegen(bez);
    if (!z) return null;
    var reihe = z.lagerart + (z.durchmesserreihe || '');
    var e = { bezeichnung: z.bezeichnung, zerlegt: z, reihe: reihe,
      d: z.d, art: null };
    var t;
    if (RKL[reihe] && RKL[reihe][z.d]) {
      t = RKL[reihe][z.d];
      e.art = 'rillenkugellager';
      e.D = t[0]; e.B = t[1]; e.r = t[2]; e.h = t[3];
      e.winkel = 0;
      if (TRAG[reihe] && TRAG[reihe][z.d]) {
        e.C = TRAG[reihe][z.d][0];
        e.C0 = TRAG[reihe][z.d][1];
        e.f0 = TRAG[reihe][z.d][2];
      }
    } else if (SKL[reihe] && SKL[reihe][z.d]) {
      t = SKL[reihe][z.d];
      e.art = 'schraegkugellager';
      e.D = t[0]; e.B = t[1];
      e.winkel = 40;
    } else if (KRL[z.lagerart + z.massreihe]
        && KRL[z.lagerart + z.massreihe][z.d]) {
      t = KRL[z.lagerart + z.massreihe][z.d];
      e.art = 'kegelrollenlager';
      e.D = t[0]; e.B = t[1]; e.Cb = t[2]; e.T = t[3]; e.d1 = t[4];
      /* Das Buch gibt fuer Kegelrollenlager keinen Beruehrungswinkel an;
         14 Grad ist der uebliche Wert der Reihe 302 und steht hier nur,
         damit sich die Drucklinie zeichnen laesst. Gerechnet wird die
         Stuetzbasis im Material am Schraegkugellager, dessen 40 Grad im
         Buch stehen. */
      e.winkel = 14;
    } else {
      return null;
    }
    return e;
  }

  function rund(x, n) {
    if (!isFinite(x)) return '∞';
    var f = Math.pow(10, n);
    var v = Math.round(x * f) / f;
    return String(v).replace('.', ',');
  }

  /* ======================================================================
     3  ZEICHNEN
     ----------------------------------------------------------------------
     Eine Lagerung im Schnitt, aus Parametern. Gezeichnet wird die obere
     und die untere Hälfte; die Welle liegt waagerecht.

     Wälzlager werden in Gruppen- und Gesamtzeichnungen im Schnitt
     dargestellt. Innen- und Außenring eines Lagers bekommen dieselbe
     Schraffur, weil das Lager systemtechnisch EIN Bauteil ist - das ist
     kein Versehen, sondern die Regel (Fachkunde, Kapitel 3.2).
     ====================================================================== */

  function lagerung(zielId, o) {
    o = o || {};
    var ziel = typeof zielId === 'string'
      ? document.getElementById(zielId) : zielId;
    if (!ziel) return null;
    ziel.textContent = '';

    var lA = lager(o.links), lB = lager(o.rechts);
    if (!lA || !lB) return null;

    var abstand = Number(o.abstand) || 120;
    var anordnung = o.anordnung || 'festlos';
    var s = Number(o.masstab) || 2.2;

    /* Bauraum in Millimetern, daraus die Bildgröße */
    var halbD = Math.max(lA.D, lB.D) / 2;
    var gehaeuse = halbD + 14;
    var xA = 0, xB = abstand;
    var randL = lA.B / 2 + 46, randR = lB.B / 2 + 46;
    var breite = (abstand + randL + randR) * s;
    var hoehe = (2 * gehaeuse + 66) * s;
    var MX = randL * s, MY = hoehe / 2;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + Math.round(breite) + ' ' + Math.round(hoehe),
      role: 'img',
      'aria-label': o.beschreibung || ('Wellenlagerung im Schnitt: '
        + lA.bezeichnung + ' und ' + lB.bezeichnung + ', '
        + anordnungName(anordnung))
    }, ziel);
    var g = svgEl('g', {}, svg);

    function vx(mm) { return MX + mm * s; }
    function vy(mm) { return MY - mm * s; }

    var sch = {
      a: schraffur(svg, zielId + '_wlA', 45),
      b: schraffur(svg, zielId + '_wlB', -45),
      geh: schraffur(svg, zielId + '_wlG', 45, 12)
    };
    var leer = 'var(--card, #ffffff)';

    /* --- Gehäuse: zwei Blöcke, in denen die Außenringe sitzen ---------- */
    [[xA, lA], [xB, lB]].forEach(function (e) {
      var x = e[0], l = e[1], hb = l.B / 2 + 6;
      [1, -1].forEach(function (v) {
        Zt(g, [[vx(x - hb), vy(v * l.D / 2)],
          [vx(x + hb), vy(v * l.D / 2)],
          [vx(x + hb), vy(v * gehaeuse)],
          [vx(x - hb), vy(v * gehaeuse)]], sch.geh);
      });
    });

    /* --- Welle: längs geschnitten, also blank -------------------------- */
    var wx1 = xA - lA.B / 2 - 30, wx2 = xB + lB.B / 2 + 30;
    var rw = Math.min(lA.d, lB.d) / 2;
    Zt(g, [[vx(wx1), vy(rw)], [vx(wx2), vy(rw)],
      [vx(wx2), vy(-rw)], [vx(wx1), vy(-rw)]], leer);

    /* --- Die Lager ----------------------------------------------------- */
    lagerZeichnen(g, vx, vy, s, xA, lA, sch.a, leer);
    lagerZeichnen(g, vx, vy, s, xB, lB, sch.b, leer);

    /* --- Loslager: der Außenring darf wandern -------------------------- */
    if (anordnung === 'festlos') {
      var hb2 = lB.B / 2;
      [1, -1].forEach(function (v) {
        linie(g, vx(xB + hb2 + 4), vy(v * (lB.D / 2 + 1)),
          vx(xB + hb2 + 12), vy(v * (lB.D / 2 + 1)), SCHMAL);
        pfeil(g, vx(xB + hb2 + 12), vy(v * (lB.D / 2 + 1)), 1, 0);
      });
    }

    /* --- Drucklinien und Stützbasis ------------------------------------ */
    if (o.drucklinien && (anordnung === 'X' || anordnung === 'O')) {
      drucklinien(g, vx, vy, xA, lA, xB, lB, anordnung, abstand, o);
    }

    achse(g, vx(wx1 - 12), vx(wx2 + 12), vy(0));

    if (o.unterschrift !== false) {
      var f = document.createElement('figcaption');
      f.innerHTML = o.unterschrift || (lA.bezeichnung + ' und '
        + lB.bezeichnung + ', ' + anordnungName(anordnung) + '.');
      ziel.appendChild(f);
    }
    return svg;
  }

  function anordnungName(a) {
    return a === 'X' ? 'X-Anordnung' : a === 'O' ? 'O-Anordnung'
      : a === 'schwimmend' ? 'schwimmende Lagerung' : 'Fest-Loslagerung';
  }

  /* Welche Seite des Lagers trägt? Bei der O-Anordnung zeigen die
     Drucklinien nach außen, bei der X-Anordnung nach innen. */
  function richtungVon(anordnung, nr) {
    if (anordnung === 'O') return nr === 0 ? -1 : 1;
    if (anordnung === 'X') return nr === 0 ? 1 : -1;
    return 0;
  }

  /* Ein Lager im Schnitt: Innenring, Wälzkörper, Außenring - oben und
     unten. Beide Ringe tragen dieselbe Schraffur. */
  function lagerZeichnen(g, vx, vy, s, x, l, fuell, leer) {
    var ri = l.d / 2, ra = l.D / 2;
    var dick = (ra - ri) * 0.27;
    var dw = (ra - ri) * 0.46;            /* Wälzkörperdurchmesser */
    var rm = (ri + ra) / 2;
    var hb = l.B / 2;

    [1, -1].forEach(function (v) {
      /* Innenring */
      Zt(g, [[vx(x - hb), vy(v * ri)], [vx(x + hb), vy(v * ri)],
        [vx(x + hb), vy(v * (ri + dick))],
        [vx(x - hb), vy(v * (ri + dick))]], fuell);
      /* Außenring */
      Zt(g, [[vx(x - hb), vy(v * (ra - dick))],
        [vx(x + hb), vy(v * (ra - dick))],
        [vx(x + hb), vy(v * ra)], [vx(x - hb), vy(v * ra)]], fuell);
      /* Wälzkörper */
      if (l.art === 'kegelrollenlager') {
        var k = dw / 2, n = 1.6;
        Zt(g, [[vx(x - hb * 0.7), vy(v * (rm - k * n))],
          [vx(x + hb * 0.7), vy(v * (rm - k))],
          [vx(x + hb * 0.7), vy(v * (rm + k))],
          [vx(x - hb * 0.7), vy(v * (rm + k * n))]], leer);
      } else {
        svgEl('circle', {cx: vx(x), cy: vy(v * rm), r: dw / 2 * s,
          fill: leer, stroke: 'currentColor', 'stroke-width': BREIT}, g);
      }
    });
  }

  /* Die Drucklinien und die Stützbasis H. Das ist der Kern: Man sieht
     erst an den Schnittpunkten, warum die O-Anordnung steifer ist. */
  function drucklinien(g, vx, vy, xA, lA, xB, lB, anordnung, abstand, o) {
    var winkel = Number(o.winkel) || lA.winkel || 40;
    var sp = [];
    [[xA, lA, richtungVon(anordnung, 0)],
     [xB, lB, richtungVon(anordnung, 1)]].forEach(function (e) {
      var x = e[0], l = e[1], r = e[2];
      var rm = (l.d / 2 + l.D / 2) / 2;
      var a = rm / Math.tan(winkel * Math.PI / 180);
      var sx = x + r * a;                /* Schnittpunkt auf der Achse */
      sp.push(sx);
      [1, -1].forEach(function (v) {
        linie(g, vx(x), vy(v * rm), vx(sx), vy(0), SCHMAL,
          {strich: '7 4'});
      });
      svgEl('circle', {cx: vx(sx), cy: vy(0), r: 3.2,
        fill: 'currentColor'}, g);
      txt(g, vx(sx), vy(0) - 10, 'S', {groesse: 13, fett: true});
    });

    /* Die Stützbasis wird bemaßt - sie ist die Aussage des Bildes. */
    var yH = vy(0) + (Math.max(lA.D, lB.D) / 2 + 26)
      * (Number(o.masstab) || 2.2);
    mass(g, vx(sp[0]), vx(sp[1]), yH,
      'H = ' + Math.round(Math.abs(sp[1] - sp[0])) + ' mm', vy(0));
  }

  /* Ein geschnittenes Teil als geschlossener Umriss. Dieselbe Idee wie in
     assets/zusammenstellung.js - hier noch einmal, weil dieser Baustein
     auch ohne sie auskommen soll. */
  function Zt(g, punkte, fuell) {
    var d = punkte.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ') + ' Z';
    svgEl('path', {d: d, fill: fuell, stroke: 'none'}, g);
    svgEl('path', {d: d, fill: 'none', stroke: 'currentColor',
      'stroke-width': BREIT, 'stroke-linejoin': 'miter'}, g);
  }

  global.Waelzlager = {
    LAGERART: LAGERART,
    VORSETZ: VORSETZ,
    NACHSETZ: NACHSETZ,
    BOHRUNG: BOHRUNG,
    RKL: RKL,
    TRAG: TRAG,
    SKL: SKL,
    KRL: KRL,
    NUTMUTTER: NUTMUTTER,
    LAST: LAST,
    EMPFOHLEN: EMPFOHLEN,
    ALPHA: ALPHA,
    zerlegen: zerlegen,
    lager: lager,
    lebensdauer: lebensdauer,
    stuetzbasis: stuetzbasis,
    waermedehnung: waermedehnung,
    lagerung: lagerung,
    rund: rund
  };
}(typeof window !== 'undefined' ? window : this));
