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
 *   1. ZAHLEN - und die sind nicht alle gleicher Herkunft:
 *
 *      NORMMASSE (Außen-Ø, Breite, Kantenabstand, Nutmuttergewinde) stehen
 *      in DIN 623-1, DIN 625-1, DIN 628-1, DIN 720, DIN 981 und DIN 5406.
 *      Sie sind in jedem Herstellerkatalog frei einzusehen; die Quelle ist
 *      die Norm und nicht das Buch, in dem man sie nachschlägt.
 *
 *      TRAGZAHLEN C und C0 sind KEINE Normwerte. Jeder Hersteller gibt sie
 *      für sein Lager selbst an. Hier steht eine kleine Auswahl als
 *      Übungsgröße - für eine Auslegung gilt immer der Katalog des Lagers,
 *      das eingebaut wird. Das gehört auch so gelehrt.
 *
 *      RICHTWERTE aus dem Tabellenbuch Metall (Europa-Lehrmittel) sind
 *      Zusammenstellungen des Verlags. Sie stehen hier gekürzt auf das,
 *      was das Material braucht, und mit Quellenangabe. Wer sie erweitert,
 *      soll sich vorher fragen, ob er die Tabelle nachbaut.
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

  /* Bezeichnung von Wälzlagern nach DIN 623-1 (2020-06). Die Systematik
     ist Norminhalt und steht in jedem Katalog vorn. */
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

  /* Rillenkugellager nach DIN 625-1. Normmaße - dieselben Zahlen stehen
     in jedem Herstellerkatalog.
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

  /* Tragzahlen: eine Auswahl, kein Katalog.

     C und C0 sind keine Normwerte. Sie hängen an Werkstoff, Wärmebehandlung
     und Innengeometrie und stehen deshalb im Katalog des Herstellers - für
     genau das Lager, das eingebaut wird. Hier stehen zwölf Richtwerte zum
     Üben: drei Bohrungsdurchmesser über alle drei Reihen, dazu die Lager,
     mit denen das Material rechnet.

     Wer eine Aufgabe mit einem Lager stellen will, das hier fehlt, schreibt
     C, C0 und f0 in die Aufgabe - so, wie der Katalog sie liefert. Das ist
     nicht nur sauberer, es ist auch die Arbeitsweise, die gelehrt werden
     soll.

     d: [C in kN, C0 in kN, f0] */
  var TRAG = {
    '60': {30: [14.5, 8.3, 14.8], 50: [22, 15.8, 15.6], 80: [51, 40, 15.7]},
    '62': {30: [22, 11.3, 13.8], 40: [31.5, 17.8, 14.0],
           50: [38, 23.2, 14.4], 70: [66, 44, 14.4], 80: [77, 55, 15.0],
           100: [130, 93, 14.4]},
    '63': {30: [32, 16.2, 13.0], 50: [68, 38, 13.1], 80: [131, 87, 13.3]}
  };

  /* Schrägkugellager nach DIN 628-1, Ausführung B mit Berührungswinkel
     40°. Normmaße.
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

  /* Kegelrollenlager der Lagerreihe 302 nach DIN 720, Einbaumaße nach
     DIN 5418. Normmaße. d: [D, B, C, T, d1] in mm - das C ist hier die
     Breite des Innenrings und nicht die Tragzahl. */
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

  /* Nutmuttern nach DIN 981 und die Sicherungsbleche DIN 5406 dazu.
     Normmaße. Kurzzeichen: [Gewinde, d2, h] */
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

  /* Radiallastfaktor X und Axiallastfaktor Y für Rillenkugellager. Die
     Stützstellen folgen der Rechnung nach DIN ISO 281; dieselbe Tabelle
     steht in den Katalogen der Lagerhersteller. */
  var LAST = {
    stuetz: [0.3, 0.5, 0.9, 1.6, 3, 6],
    e: [0.22, 0.24, 0.28, 0.32, 0.36, 0.43],
    Y: [2, 1.8, 1.58, 1.4, 1.2, 1.0],
    X: 0.56
  };

  /* Empfohlene nominelle Lebensdauer L10h in Stunden - Richtwerte, keine
     Normwerte.

     Eine Auswahl der Betriebsfälle, mit denen dieses Material arbeitet.
     Ausführlichere Zusammenstellungen stehen im Tabellenbuch Metall
     (Europa-Lehrmittel) und in den Katalogen der Lagerhersteller. */
  var EMPFOHLEN = {
    'Universalgetriebe (mittel)': [4000, 14000],
    'E-Motoren, mittel (5…100 kW)': [21000, 30000],
    'Dreh-, Frässpindeln': [14000, 46000],
    'Bohrspindeln': [14000, 32000],
    'Elektro- und Druckluftwerkzeuge': [4000, 14000],
    'Hebezeuge, Fördermaschinen': [10000, 15000],
    'Pkw-Radlager': [1400, 5300],
    'Schienenfahrzeuggetriebe': [14000, 46000]
  };

  /* Längenausdehnungskoeffizienten für die Warmmontage. Werkstoffkennwerte,
     wie sie in jedem Tabellenwerk und jedem Datenblatt stehen. */
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

    /* --- Wo wird gehalten? ---------------------------------------------
       Nicht die Lager machen die Anordnung, sondern ihr Sitz. Ein
       Schrägkugellager kann nur in eine Richtung tragen; welche das ist,
       entscheidet sich daran, gegen welche Schulter sein Außenring und
       gegen welche sein Innenring drückt. Deshalb gehören beide in die
       Zeichnung - ohne sie steht dort eine Lagerung, die es so nicht gibt. */
    var hA = halten(anordnung, 0), hB = halten(anordnung, 1);

    /* --- Gehäuse: zwei Blöcke mit Schulter ----------------------------- */
    [[xA, lA, hA], [xB, lB, hB]].forEach(function (e) {
      gehaeuseZeichnen(g, vx, vy, e[0], e[1], gehaeuse, e[2].gehaeuse,
        sch.geh);
    });

    /* --- Welle: längs geschnitten, also blank --------------------------
       Wo der Innenring von innen gehalten wird, steht ein Wellenabsatz;
       wo von außen, eine Nutmutter. Beides ist Teil der Aussage. */
    var wx1 = xA - lA.B / 2 - 34, wx2 = xB + lB.B / 2 + 34;
    var rw = Math.min(lA.d, lB.d) / 2;
    var hs = Math.max(lA.h || 0, lB.h || 0)
      || (Math.max(lA.D, lB.D) - rw * 2) * 0.12;
    wellenzug(g, vx, vy, wx1, wx2, rw, hs, xA, lA, hA, xB, lB, hB, leer);

    /* --- Die Lager ----------------------------------------------------- */
    lagerZeichnen(g, vx, vy, s, xA, lA, sch.a, leer);
    lagerZeichnen(g, vx, vy, s, xB, lB, sch.b, leer);

    /* --- Loslager: der Außenring darf wandern -------------------------- */
    if (anordnung === 'festlos') {
      /* Der Außenring des Loslagers hat Luft im Gehäuse - das ist die
         ganze Aussage dieser Bauart, also steht es auch da. */
      var hb2 = lB.B / 2;
      [1, -1].forEach(function (v) {
        var y = vy(v * (gehaeuse + 9));
        linie(g, vx(xB - hb2 - 14), y, vx(xB + hb2 + 14), y, SCHMAL);
        pfeil(g, vx(xB - hb2 - 14), y, -1, 0);
        pfeil(g, vx(xB + hb2 + 14), y, 1, 0);
      });
      txt(g, vx(xB), vy(gehaeuse + 9) - 7, 'Loslager: wandert',
        {groesse: 11});
    }

    /* --- Drucklinien und Stützbasis ------------------------------------ */
    if (o.drucklinien && (anordnung === 'X' || anordnung === 'O')) {
      drucklinien(g, vx, vy, xA, lA, xB, lB, anordnung, abstand, o);
    }

    achse(g, vx(wx1 - 12), vx(wx2 + 12), vy(0));

    if (o.unterschrift !== false) {
      var f = document.createElement('figcaption');
      f.innerHTML = o.unterschrift || (lA.bezeichnung + ' und '
        + lB.bezeichnung + ', ' + anordnungName(anordnung) + '. '
        + sitzText(anordnung));
      ziel.appendChild(f);
    }
    return svg;
  }

  /* Die Haltestellen eines Lagers.

     "gehaeuse" und "welle" sagen, auf welcher Seite die Schulter liegt:
     -1 links, +1 rechts, 2 auf beiden Seiten, 0 gar nicht. "mutter" heißt:
     dort sitzt eine Nutmutter statt eines Wellenabsatzes - so muss es sein,
     wo von außen gehalten wird, denn einen Absatz außerhalb des äußersten
     Lagers bekäme man nicht mehr montiert.

     Die Regel stammt aus den Einbaubeispielen der Fachkunde: Die
     Gehäuseschulter liegt auf der Seite, die von S wegzeigt; der
     Wellenabsatz oder die Mutter auf der Seite, auf der S liegt. */
  function halten(anordnung, nr) {
    var r = richtungVon(anordnung, nr);
    if (anordnung === 'O' || anordnung === 'X') {
      return { gehaeuse: -r, welle: r, mutter: r < 0 && nr === 0
        ? true : (r > 0 && nr === 1) };
    }
    if (anordnung === 'festlos') {
      return nr === 0
        ? { gehaeuse: 2, welle: 2, mutter: true }
        : { gehaeuse: 0, welle: 2, mutter: false };
    }
    /* schwimmend: beide Außenringe haben Luft, die Innenringe sitzen fest */
    return { gehaeuse: 0, welle: 2, mutter: false };
  }

  /* Das Gehäuse um ein Lager, mit Schulter auf der angegebenen Seite. Die
     Schulter reicht bis an die Innenkante des Außenrings - weiter darf sie
     nicht, sonst streift sie den Käfig. */
  function gehaeuseZeichnen(g, vx, vy, x, l, gehaeuse, seite, fuell) {
    var ra = l.D / 2, dick = (ra - l.d / 2) * 0.27;
    var hb = l.B / 2, rand = 10;
    var rs = ra - dick;
    [1, -1].forEach(function (v) {
      var p = [];
      function zu(mm, r) { p.push([vx(mm), vy(v * r)]); }
      if (seite === -1 || seite === 2) {
        zu(x - hb - rand, rs); zu(x - hb, rs); zu(x - hb, ra);
      } else {
        zu(x - hb - rand, ra);
      }
      if (seite === 1 || seite === 2) {
        zu(x + hb, ra); zu(x + hb, rs); zu(x + hb + rand, rs);
      } else {
        zu(x + hb + rand, ra);
      }
      zu(x + hb + rand, gehaeuse);
      zu(x - hb - rand, gehaeuse);
      Zt(g, p, fuell);
    });
  }

  /* Die Welle als ein Zug: gerade, wo die Lager sitzen, mit einem Absatz
     dort, wo ein Innenring von innen gehalten wird. Die Muttern kommen
     danach obendrauf. */
  function wellenzug(g, vx, vy, wx1, wx2, rw, hs, xA, lA, hA, xB, lB, hB,
    leer) {
    /* Abschnitte als [von, bis, Radius] */
    var ab = [];
    var aInnen = hA.welle === 1 || hA.welle === 2;
    var bInnen = hB.welle === -1 || hB.welle === 2;
    var von = xA + lA.B / 2, bis = xB - lB.B / 2;
    if (aInnen && bInnen && bis > von) {
      ab.push([wx1, von, rw], [von, bis, rw + hs], [bis, wx2, rw]);
    } else {
      ab.push([wx1, wx2, rw]);
    }
    /* Ein geschlossener Umriss über beide Hälften. Zwei halbe Wellen
       ergäben eine Kante auf der Achse, und dort ist keine. */
    var p = [];
    ab.forEach(function (e) {
      p.push([vx(e[0]), vy(e[2])], [vx(e[1]), vy(e[2])]);
    });
    ab.slice().reverse().forEach(function (e) {
      p.push([vx(e[1]), vy(-e[2])], [vx(e[0]), vy(-e[2])]);
    });
    Zt(g, p, leer);

    /* Nutmuttern, wo von außen gehalten wird. */
    [[xA, lA, hA, -1], [xB, lB, hB, 1]].forEach(function (e) {
      if (!e[2].mutter) return;
      var l = e[1], r = e[3];
      var x1 = e[0] + r * (l.B / 2), x2 = x1 + r * 11;
      [1, -1].forEach(function (v) {
        Zt(g, [[vx(x1), vy(v * rw)], [vx(x2), vy(v * rw)],
          [vx(x2), vy(v * (rw + hs * 1.5))],
          [vx(x1), vy(v * (rw + hs * 1.5))]], leer);
      });
    });
  }

  /* Was die Schultern im Bild bedeuten - in einem Satz, damit die
     Zeichnung nicht nur richtig, sondern auch lesbar ist. */
  function sitzText(a) {
    if (a === 'O') {
      return 'Die Geh\u00e4useschultern liegen innen, die Nutmuttern '
        + 'halten die Innenringe von au\u00dfen.';
    }
    if (a === 'X') {
      return 'Die Geh\u00e4useschultern liegen au\u00dfen, der '
        + 'Wellenabsatz h\u00e4lt die Innenringe von innen.';
    }
    if (a === 'festlos') {
      return 'Der Au\u00dfenring des Festlagers liegt beidseitig an, der '
        + 'des Loslagers an keiner Seite.';
    }
    return 'Beide Au\u00dfenringe haben Luft im Geh\u00e4use.';
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
     [xB, lB, richtungVon(anordnung, 1)]].forEach(function (e, i) {
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
      /* Das S steht von seinem Lager weg gerückt: Dorthin laufen keine
         Drucklinien, denn die enden ja im Punkt S. Und weil bei einer
         engen X-Anordnung beide Punkte dicht beieinander liegen, steht das
         eine oben und das andere unten. */
      /* Der Punkt S liegt auf der Wellenachse, also mitten auf der Welle.
         Ausweichen kann der Buchstabe deshalb nicht - er bekommt einen Hof
         in der Hintergrundfarbe und steht damit lesbar auf dem Werkstoff.
         So macht es die Fachkunde in ihrem Einbaubeispiel auch. */
      txt(g, vx(sx) + r * 15, vy(0) + (i === 0 ? -10 : 22), 'S',
        {groesse: 13, fett: true, hof: true});
    });

    /* Die Stützbasis wird bemaßt - sie ist die Aussage des Bildes.

       Bei der X-Anordnung kann H sehr klein werden; dann ist die Maßzahl
       breiter als das Maß und läge auf den eigenen Maßhilfslinien. In dem
       Fall rückt sie nach rechts daneben - so macht man es auf dem Papier
       auch. */
    var yH = vy(0) + (Math.max(lA.D, lB.D) / 2 + 26)
      * (Number(o.masstab) || 2.2);
    var x1 = vx(Math.min(sp[0], sp[1])), x2 = vx(Math.max(sp[0], sp[1]));
    var text = 'H = ' + Math.round(Math.abs(sp[1] - sp[0])) + ' mm';
    var k = svgEl('g', {}, g);
    [x1, x2].forEach(function (x) {
      linie(k, x, vy(0), x, yH + 7, SCHMAL);
    });
    var eng = (x2 - x1) < text.length * 8 + 20;
    /* Die Masslinie selbst laeuft immer von Pfeilspitze zu Pfeilspitze -
       daran erkennt pruefungen/test-zeichnungen.js ein Mass. Bei engen
       Massen kommen nach aussen nur noch zwei Stummel dazu. */
    linie(k, x1, yH, x2, yH, SCHMAL);
    pfeil(k, x1, yH, eng ? 1 : -1, 0);
    pfeil(k, x2, yH, eng ? -1 : 1, 0);
    if (eng) {
      linie(k, x1 - 14, yH, x1, yH, SCHMAL);
      linie(k, x2, yH, x2 + 14, yH, SCHMAL);
    }
    if (eng) {
      txt(k, x2 + 22, yH + 4, text, {anker: 'start'});
    } else {
      txt(k, (x1 + x2) / 2, yH - 5, text);
    }
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

  /* Was unter einer Seite stehen soll, die mit diesen Zahlen arbeitet.
     assets/quellen.js setzt daraus die Fußzeile. */
  var QUELLEN = {
    normen: 'Ma\u00dfe nach DIN 623-1, DIN 625-1, DIN 628-1, DIN 720, '
      + 'DIN 981, DIN 5406 und DIN 5418.',
    tragzahlen: 'Die Tragzahlen C und C\u2080 sind Richtwerte zum '
      + '\u00dcben. F\u00fcr eine Auslegung gilt der Katalog des '
      + 'Lagerherstellers.',
    buch: 'Richtwerte und Rechenweg nach Tabellenbuch Metall, '
      + 'Europa-Lehrmittel, Kapitel 5.10 Lager.',
    fachkunde: 'Lagerungsarten, Anordnung und Anstellung nach '
      + 'Fachkenntnisse Industriemechaniker LF 5\u201315, '
      + 'Verlag Handwerk und Technik, Lernfeld 7.'
  };

  /* ======================================================================
     4  SKIZZEN
     ----------------------------------------------------------------------
     Kleine Bilder für Übungen und Trainings. Sie sind keine Zeichnungen
     nach Norm, sondern Prinzipbilder: Sie sollen eine Frage stellen, nicht
     eine Fertigung ermöglichen.
     ====================================================================== */

  /* Ein Zufall, der immer derselbe ist. Die Prüfungen rendern jede Seite
     mehrfach und vergleichen; ein echtes Math.random() ergäbe jedes Mal ein
     anderes Bild und damit Befunde, die es nicht gibt. */
  function wuerfel(saat) {
    var z = 0;
    for (var i = 0; i < String(saat).length; i++) {
      z = (z * 31 + String(saat).charCodeAt(i)) % 65536;
    }
    return function () {
      z = (z * 1103515245 + 12345) % 2147483648;
      return z / 2147483648;
    };
  }

  function bogen(g, cx, cy, r, von, bis, breit) {
    var a1 = von * Math.PI / 180, a2 = bis * Math.PI / 180;
    var gross = Math.abs(bis - von) > 180 ? 1 : 0;
    var d = 'M' + (cx + r * Math.cos(a1)).toFixed(1) + ','
      + (cy - r * Math.sin(a1)).toFixed(1)
      + ' A' + r + ',' + r + ' 0 ' + gross + ' 0 '
      + (cx + r * Math.cos(a2)).toFixed(1) + ','
      + (cy - r * Math.sin(a2)).toFixed(1);
    return svgEl('path', {d: d, fill: 'none', stroke: 'currentColor',
      'stroke-width': breit ? BREIT + 1.6 : SCHMAL,
      'stroke-linecap': 'round'}, g);
  }

  /* Das Umlaufverhältnis als Stirnansicht.

     o: {drehtInnen, lastDreht, lastWinkel, zeigen}

     Welcher Ring Umfangslast hat, entscheidet nicht die Kraft, sondern die
     Frage, wer sich gegenüber wem bewegt: Ein Ring hat Umfangslast, wenn er
     sich relativ zur Lastrichtung dreht. Das ist genau dann der Fall, wenn
     entweder der Ring oder die Last umläuft - aber nicht beide.

     Genau das ist aber die Frage, die geübt werden soll. Deshalb bleibt die
     Lastzone standardmäßig weg: Das Bild zeigt nur, was man an der
     Lagerstelle sieht - wer dreht und wohin die Kraft zeigt. Erst
     "zeigen: true" trägt die Antwort ein, für Lektion und Tafel. */
  function umlaufBild(zielId, o) {
    o = o || {};
    var ziel = typeof zielId === 'string'
      ? document.getElementById(zielId) : zielId;
    if (!ziel) return null;
    ziel.textContent = '';

    var drehtInnen = !!o.drehtInnen, lastDreht = !!o.lastDreht;
    var innenUmfang = drehtInnen !== lastDreht;
    var w = Number(o.lastWinkel === undefined ? 90 : o.lastWinkel);

    var B = 300, M = 150, cy = 148;
    var Ra = 78, t = 15, dw = 18, Ri = 34;
    var rm = (Ra - t + Ri + t) / 2;

    var svg = svgEl('svg', {viewBox: '0 0 ' + B + ' 330', role: 'img',
      'aria-label': 'Stirnansicht eines Wälzlagers: '
        + (drehtInnen ? 'Innenring' : 'Außenring')
        + ' dreht, die Last ' + (lastDreht ? 'dreht mit' : 'steht')
        + (o.zeigen ? '; Umfangslast hat der '
          + (innenUmfang ? 'Innenring' : 'Außenring') : '')}, ziel);
    var g = svgEl('g', {}, svg);
    var leer = 'var(--card, #ffffff)';

    /* Außenring, Innenring, Wälzkörper */
    [[Ra, BREIT], [Ra - t, SCHMAL], [Ri + t, SCHMAL], [Ri, BREIT]]
      .forEach(function (e) {
        svgEl('circle', {cx: M, cy: cy, r: e[0], fill: 'none',
          stroke: 'currentColor', 'stroke-width': e[1]}, g);
      });
    for (var i = 0; i < 10; i++) {
      var a = (i * 36 + 18) * Math.PI / 180;
      svgEl('circle', {cx: M + rm * Math.cos(a), cy: cy - rm * Math.sin(a),
        r: dw / 2, fill: leer, stroke: 'currentColor',
        'stroke-width': SCHMAL}, g);
    }

    /* Alles Weitere erklärt das Bild, statt das Lager zu zeichnen: Kraft,
       Drehrichtung, Beschriftung. Es gehört deshalb in eine Gruppe
       "erklaer" - sonst hält die Zeichnungsprüfung den Kraftpfeil für
       ein halb bemaßtes Maß. */
    var e = svgEl('g', {'class': 'erklaer'}, g);

    /* Wo die Last trägt: der Ring mit Umfangslast bekommt sie über den
       ganzen Umfang ab, der andere nur an einer Stelle. Das ist die Antwort
       und steht deshalb nur da, wo sie hingehört. */
    if (o.zeigen) {
      var lz = svgEl('g', {}, e);
      if (innenUmfang) {
        bogen(lz, M, cy, Ri + t, 0, 359.9, true);
        bogen(lz, M, cy, Ra - t, w - 32, w + 32, true);
      } else {
        bogen(lz, M, cy, Ra - t, 0, 359.9, true);
        bogen(lz, M, cy, Ri + t, w - 32, w + 32, true);
      }
    }

    /* Die Last */
    var ar = w * Math.PI / 180;
    var x1 = M + (Ra + 42) * Math.cos(ar), y1 = cy - (Ra + 42) * Math.sin(ar);
    var x2 = M + (Ra + 4) * Math.cos(ar), y2 = cy - (Ra + 4) * Math.sin(ar);
    linie(e, x1, y1, x2, y2, BREIT);
    pfeil(e, x2, y2, -Math.cos(ar), Math.sin(ar));
    txt(e, x1 + 14 * Math.cos(ar), y1 - 14 * Math.sin(ar) + 5, 'F',
      {groesse: 15, fett: true});

    /* Was sich dreht - und ob die Last mitdreht */
    var rd = drehtInnen ? Ri - 11 : Ra + 16;
    bogen(e, M, cy, rd, 200, 330, false);
    var ae = 330 * Math.PI / 180;
    pfeil(e, M + rd * Math.cos(ae), cy - rd * Math.sin(ae),
      -Math.sin(ae), -Math.cos(ae));
    txt(e, M + (rd + 12) * Math.cos(285 * Math.PI / 180),
      cy - (rd + 12) * Math.sin(285 * Math.PI / 180) + 5, 'n',
      {groesse: 14, fett: true, hof: true});

    /* Dreht die Last mit, bekommt ihr Pfeil einen eigenen Bogen - sonst
       sähe das Bild aus wie der Fall daneben. */
    if (lastDreht) {
      var rl = Ra + 30;
      bogen(e, M, cy, rl, w - 46, w - 6, false);
      var al = (w - 46) * Math.PI / 180;
      pfeil(e, M + rl * Math.cos(al), cy - rl * Math.sin(al),
        Math.sin(al), Math.cos(al));
    }

    txt(e, M, 300, drehtInnen ? 'Innenring dreht' : 'Außenring dreht',
      {groesse: 13, fett: true});
    txt(e, M, 320, lastDreht ? 'die Last dreht mit'
      : 'die Lastrichtung steht', {groesse: 12});
    return svg;
  }

  /* Die abgewickelte Laufbahn mit dem Muster, das ein Schaden hinterlässt.

     Die Laufbahn ist hier aufgerollt gedacht: links und rechts ist
     dieselbe Stelle. Was darauf steht, ist die Spur - und die Spur sagt,
     was passiert ist. */
  function laufspur(zielId, muster, o) {
    o = o || {};
    var ziel = typeof zielId === 'string'
      ? document.getElementById(zielId) : zielId;
    if (!ziel) return null;
    ziel.textContent = '';

    var B = 330, H = 132;
    var x0 = 22, x1 = B - 22, y0 = 34, y1 = 104;
    var svg = svgEl('svg', {viewBox: '0 0 ' + B + ' ' + H, role: 'img',
      'aria-label': o.beschreibung || ('Abgewickelte Laufbahn mit dem '
        + 'Muster ' + muster)}, ziel);
    var g = svgEl('g', {}, svg);
    var z = wuerfel(muster);

    kasten(g, x0, y0, x1 - x0, y1 - y0);
    txt(g, (x0 + x1) / 2, 20, o.titel || 'Laufbahn, abgewickelt',
      {groesse: 12, fett: true});

    var e = svgEl('g', {'class': 'erklaer'}, g);
    var i, x, y, m = (y0 + y1) / 2;

    if (muster === 'brinell') {
      /* Gleichmäßig verteilte Eindrücke im Abstand der Wälzkörper. */
      for (i = 0; i < 9; i++) {
        x = x0 + 24 + i * (x1 - x0 - 48) / 8;
        svgEl('ellipse', {cx: x, cy: m, rx: 7.5, ry: 13,
          fill: 'currentColor', opacity: 0.45}, e);
      }
    } else if (muster === 'riffel') {
      /* Feine, regelmäßige Querriefen - wie ein Waschbrett. */
      for (i = 0; i < 46; i++) {
        x = x0 + 8 + i * (x1 - x0 - 16) / 45;
        linie(e, x, m - 14, x, m + 14, SCHMAL);
      }
    } else if (muster === 'spurBreit') {
      /* Eine Laufspur über den ganzen Umfang, und sie ist breit. */
      svgEl('rect', {x: x0 + 3, y: m - 17, width: x1 - x0 - 6, height: 34,
        fill: 'currentColor', opacity: 0.32}, e);
    } else if (muster === 'spurTeil') {
      /* Eine Laufspur nur über einen Teil des Umfangs. */
      svgEl('rect', {x: x0 + 18, y: m - 13, width: (x1 - x0) * 0.34,
        height: 26, fill: 'currentColor', opacity: 0.32}, e);
    } else if (muster === 'spurSchraeg') {
      /* Die Spur wandert über die Breite - das Lager stand schief. */
      svgEl('path', {d: 'M' + (x0 + 4) + ',' + (y1 - 12) + ' L' + (x1 - 4)
        + ',' + (y0 + 12) + ' L' + (x1 - 4) + ',' + (y0 + 30) + ' L'
        + (x0 + 4) + ',' + (y1 + 6) + ' Z', fill: 'currentColor',
        opacity: 0.3}, e);
    } else if (muster === 'schmutz') {
      /* Eingedrückte Fremdkörper: unregelmäßig, überall. */
      for (i = 0; i < 38; i++) {
        x = x0 + 8 + z() * (x1 - x0 - 16);
        y = y0 + 8 + z() * (y1 - y0 - 16);
        svgEl('circle', {cx: x.toFixed(1), cy: y.toFixed(1),
          r: (1.4 + z() * 2.4).toFixed(1), fill: 'currentColor',
          opacity: 0.5}, e);
      }
    } else if (muster === 'fressen') {
      /* Längsriefen in Laufrichtung: geschmiert hat da nichts mehr. */
      for (i = 0; i < 13; i++) {
        y = y0 + 10 + z() * (y1 - y0 - 20);
        var xa = x0 + 6 + z() * (x1 - x0) * 0.4;
        linie(e, xa, y, xa + (x1 - x0) * (0.25 + z() * 0.3), y, SCHMAL);
      }
    } else if (muster === 'rost') {
      /* Passungsrost auf der Sitzfläche: fleckig, nicht gerichtet. */
      for (i = 0; i < 90; i++) {
        x = x0 + 5 + z() * (x1 - x0 - 10);
        y = y0 + 5 + z() * (y1 - y0 - 10);
        svgEl('circle', {cx: x.toFixed(1), cy: y.toFixed(1),
          r: (0.9 + z() * 1.8).toFixed(1), fill: 'currentColor',
          opacity: 0.38}, e);
      }
    } else if (muster === 'ausbruch') {
      /* Ermüdung: ausgebrochene Stellen, dort wo die Spur läuft. */
      svgEl('rect', {x: x0 + 3, y: m - 11, width: x1 - x0 - 6, height: 22,
        fill: 'currentColor', opacity: 0.22}, e);
      for (i = 0; i < 5; i++) {
        x = x0 + 30 + z() * (x1 - x0 - 60);
        svgEl('path', {d: 'M' + x.toFixed(1) + ',' + (m - 9)
          + ' l7,-3 l9,6 l-4,9 l-10,2 l-5,-8 Z', fill: 'currentColor',
          opacity: 0.75}, e);
      }
    }

    if (o.unterschrift !== false) {
      var f = document.createElement('figcaption');
      f.innerHTML = o.unterschrift || '';
      if (f.innerHTML) ziel.appendChild(f);
    }
    return svg;
  }

  global.Waelzlager = {
    QUELLEN: QUELLEN,
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
    sitzText: sitzText,
    umlaufBild: umlaufBild,
    laufspur: laufspur,
    zerlegen: zerlegen,
    lager: lager,
    lebensdauer: lebensdauer,
    stuetzbasis: stuetzbasis,
    waermedehnung: waermedehnung,
    lagerung: lagerung,
    rund: rund
  };
}(typeof window !== 'undefined' ? window : this));
