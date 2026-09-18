/* Die Bohrvorrichtung - zweite Baugruppe derselben Schwierigkeit.
 *
 * Eingebunden nach zeichnen.js und zusammenstellung.js:
 *
 *     <script src="assets/zeichnen.js"></script>
 *     <script src="assets/zusammenstellung.js"></script>
 *     <script src="assets/bohrvorrichtung.js"></script>
 *
 * Dieselbe Datei liegt in zwei Repos - wird sie geändert, gehört sie in
 * beide kopiert.
 *
 * Warum es sie gibt: Die Lernsituation arbeitet an der Biegepresse. Wer in
 * der Lektion und in den Übungen dieselbe Baugruppe vor sich hätte, würde
 * die Lösungen wiedererkennen statt sie herzuleiten. Also drei Baugruppen -
 * gleiche Schwierigkeit, gleiche Begriffe, andere Antworten:
 *
 *     Lektion       Bohrvorrichtung   (diese Datei)
 *     Übungen       Klappanschlag     (assets/klappanschlag.js)
 *     Lernsituation Biegepresse       (assets/biegepresse.js)
 *
 * Auch hier: keine Lager, keine Dichtungen, keine Sicherungsringe. Platten,
 * Säulen, Schrauben, Stifte - und ein Spannelement aus dem Tabellenbuch.
 *
 * Koordinaten (mm):
 *   x  nach rechts, 0 = Mitte der Grundplatte
 *   y  nach oben,   0 = Unterseite der Grundplatte
 *   z  nach hinten, 0 = Mitte
 */
(function (global) {
  'use strict';

  var Z = global.Zusammenstellung;

  /* ======================================================================
     1  DIE MASSE
     ----------------------------------------------------------------------
     Die Vorrichtung bohrt zwei Löcher Ø 8 im Abstand 40 in eine Lasche
     80 × 40 × 6. Die Lasche liegt in der Ecke zweier Anschlagleisten, die
     Bohrplatte führt den Bohrer, die Spannschraube hält.

     Die Kette, an der alles hängt: Werkstück 6 dick auf der Grundplatte,
     Anschlagleisten 20 hoch - also 14 mm über dem Werkstück, damit die
     Lasche sicher anliegt und trotzdem herausgeht. Die Bohrplatte muss so
     hoch stehen, dass die Lasche darunter passt: 61 mm, das sind 40 mm
     Luft über dem Werkstück.
     ====================================================================== */
  var M = {
    gpL: 160, gpT: 100, gpD: 15,           /* Grundplatte */

    alL: 80, alB: 20, alH: 20,             /* Anschlagleiste, zwei Stück */
    alBx: -40,                             /* Leiste quer: Mitte in x */
    alBz1: -34, alBz2: 46,                 /* und ihre Enden in z */
    alAz: 26,                              /* Leiste längs: Mitte in z */
    alAx1: -30, alAx2: 50,                 /* und ihre Enden in x */

    saD: 20, saH: 46, saX: 65,             /* Distanzsäule, zwei Stück */

    bpL: 160, bpT: 80, bpD: 14,            /* Bohrplatte */
    fuehrD: 8.2, fuehrA: 40, fuehrM: -4,   /* Führungsbohrungen */

    spGew: 12, spL: 80, spX: -4,           /* Spannschraube M12 × 80 */
    griffD: 63,                            /* Kreuzgriff DIN 6335 – M12 */

    wsL: 80, wsT: 40, wsD: 6,              /* Werkstück */
    wsX1: -30, wsX2: 50, wsZ2: 16,         /* wo es liegt: in der Ecke */

    stiftAx: [-20, 40], schraubeAx: [0, 20],
    stiftBz: [-24, 36], schraubeBz: [-4, 16]
  };

  M.gpOben = M.gpD;                                  /* 15 */
  M.alOben = M.gpD + M.alH;                          /* 35 */
  M.saOben = M.gpD + M.saH;                          /* 61 */
  M.bpOben = M.saOben + M.bpD;                       /* 75 */
  M.wsOben = M.gpD + M.wsD;                          /* 21 */
  M.luft = M.saOben - M.wsOben;                      /* 40 */
  M.spOben = M.wsOben + M.spL;                       /* 101 */
  M.griffY = M.spOben - 8;                           /* Mitte des Kreuzgriffs */
  M.senkD = 11;                                      /* Senkung für M6 */
  M.senkT = 7;

  /* ======================================================================
     2  DIE STÜCKLISTE
     ====================================================================== */
  var TEILE = [
    {pos: 1, menge: 1, benennung: 'Grundplatte', werkstoff: 'S235JR',
     bemerkung: '160 × 100 × 15', art: 'fertigung', kurz: 'Grundplatte'},
    {pos: 2, menge: 2, benennung: 'Anschlagleiste', werkstoff: 'S235JR',
     bemerkung: '80 × 20 × 20', art: 'fertigung', kurz: 'Anschlagleiste'},
    {pos: 3, menge: 2, benennung: 'Distanzsäule', werkstoff: 'E295',
     bemerkung: 'Ø 20 × 46, Gewindezapfen M10', art: 'fertigung',
     kurz: 'Distanzsäule'},
    {pos: 4, menge: 1, benennung: 'Bohrplatte', werkstoff: 'C45',
     bemerkung: '2 × Ø 8,2 im Abstand 40', art: 'fertigung',
     kurz: 'Bohrplatte'},
    {pos: 5, menge: 1, benennung: 'Gewindestift DIN 6332 – S M12 × 80',
     werkstoff: '', bemerkung: 'Spannschraube mit Druckzapfen', art: 'norm',
     kurz: 'Spannschraube'},
    {pos: 6, menge: 1, benennung: 'Kreuzgriff DIN 6335 – M12',
     werkstoff: '', bemerkung: 'auf die Spannschraube', art: 'norm',
     kurz: 'Kreuzgriff'},
    {pos: 7, menge: 2, benennung: 'Zylinderschraube ISO 4762 – M8 × 30 – 8.8',
     werkstoff: '', bemerkung: 'Bohrplatte auf die Säulen', art: 'norm',
     kurz: 'Schraube M8'},
    {pos: 8, menge: 4, benennung: 'Zylinderschraube ISO 4762 – M6 × 20 – 8.8',
     werkstoff: '', bemerkung: 'Anschlagleisten', art: 'norm',
     kurz: 'Schraube M6'},
    {pos: 9, menge: 4, benennung: 'Zylinderstift ISO 2338 – 5 m6 × 16 – St',
     werkstoff: '', bemerkung: 'richtet die Leisten aus', art: 'norm',
     kurz: 'Zylinderstift'},
    {pos: 10, menge: 1, benennung: 'Sechskantmutter ISO 4032 – M12 – 8',
     werkstoff: '', bemerkung: 'kontert die Spannschraube', art: 'norm',
     kurz: 'Sechskantmutter'}
  ];

  /* ======================================================================
     3  DAS STRUKTURNETZ
     ====================================================================== */
  var STRUKTUR = [
    {a: 1, b: 9, art: 'fest',
     warum: 'Die Stifte stecken in der Grundplatte.'},
    {a: 2, b: 9, art: 'fest', warum: 'und in der Anschlagleiste.'},
    {a: 1, b: 2, art: 'fest',
     warum: 'Die Leisten liegen auf der Grundplatte.'},
    {a: 1, b: 8, art: 'fest',
     warum: 'Die M6-Schrauben greifen in die Grundplatte.'},
    {a: 2, b: 8, art: 'fest', warum: 'und halten die Leisten.'},
    {a: 1, b: 3, art: 'fest',
     warum: 'Die Säulen sind in die Grundplatte eingeschraubt.'},
    {a: 3, b: 4, art: 'fest', warum: 'Die Bohrplatte liegt auf den Säulen.'},
    {a: 3, b: 7, art: 'fest',
     warum: 'Die M8-Schrauben greifen in das Gewinde der Säulen.'},
    {a: 4, b: 7, art: 'fest',
     warum: 'und liegen mit dem Kopf auf der Bohrplatte.'},
    {a: 4, b: 5, art: 'beweglich',
     warum: 'Die Spannschraube dreht sich im Gewinde der Bohrplatte - '
       + 'sonst könnte sie nicht spannen.'},
    {a: 5, b: 6, art: 'fest',
     warum: 'Der Kreuzgriff sitzt fest auf der Spannschraube.'},
    {a: 5, b: 10, art: 'fest', warum: 'Die Mutter sitzt auf ihrem Gewinde.'},
    {a: 4, b: 10, art: 'fest',
     warum: 'und liegt auf der Bohrplatte auf - erst dadurch kontert sie.'}
  ];

  var NETZ_LAGE = {
    1: {x: 22, y: 76}, 2: {x: 30, y: 92}, 3: {x: 24, y: 54},
    4: {x: 52, y: 58}, 5: {x: 58, y: 30}, 6: {x: 60, y: 12},
    7: {x: 84, y: 44}, 8: {x: 78, y: 76}, 9: {x: 66, y: 92},
    10: {x: 86, y: 12}
  };

  /* ======================================================================
     4  DIE VORRANGBEZIEHUNGEN
     ====================================================================== */
  var VORRANG = [
    {vorher: 1, nachher: 9,
     warum: 'Der Stift wird in die Grundplatte getrieben. Ohne Platte gibt '
       + 'es keine Bohrung.'},
    {vorher: 9, nachher: 2,
     warum: 'Die Stifte richten die Leiste aus. Wer erst schraubt und dann '
       + 'stiftet, hat den Sinn verfehlt - die Lage ist dann schon falsch.'},
    {vorher: 2, nachher: 8,
     warum: 'Erst liegt die Leiste auf den Stiften, dann wird sie '
       + 'festgezogen.'},
    {vorher: 1, nachher: 8,
     warum: 'Die Schraube greift in das Gewinde der Grundplatte.'},
    {vorher: 1, nachher: 3,
     warum: 'Die Säule wird in die Grundplatte eingeschraubt.'},
    {vorher: 3, nachher: 4,
     warum: 'Die Bohrplatte liegt auf den Säulen. Ohne sie schwebt sie.'},
    {vorher: 4, nachher: 7,
     warum: 'Erst liegt die Platte auf, dann wird sie verschraubt.'},
    {vorher: 3, nachher: 7,
     warum: 'Die Schraube greift in das Gewinde der Säule.'},
    {vorher: 4, nachher: 5,
     warum: 'Die Spannschraube wird durch das Gewinde der Bohrplatte '
       + 'geschraubt. Ohne Platte hat sie nichts, worin sie sitzt.'},
    {vorher: 5, nachher: 6,
     warum: 'Der Kreuzgriff kommt auf das obere Ende der Spannschraube.'},
    {vorher: 5, nachher: 10,
     warum: 'Die Kontermutter wird auf die Spannschraube gedreht.'},
    {vorher: 10, nachher: 6,
     warum: 'Die Mutter muss über das obere Ende der Spannschraube. Sitzt '
       + 'dort schon der Kreuzgriff, kommt sie nicht mehr daran vorbei - '
       + 'im Modell sieht man es, auf dem Papier muss man es sich denken.'},

    /* Und eine, die am Werkzeug hängt, nicht am Werkstück. */
    {vorher: 8, nachher: 4,
     warum: 'Die M6-Schrauben werden von oben mit dem '
       + 'Innensechskantschlüssel angezogen. Über den Leisten steht dann '
       + 'die Bohrplatte, und darunter bleiben 26 mm - zu wenig für den '
       + 'Schlüssel.'}
  ];

  /* ======================================================================
     5  DIE ZUSAMMENSTELLUNGSZEICHNUNG
     ----------------------------------------------------------------------
     Drei Darstellungen, und die dritte gibt es aus einem Grund:

         Schnitt A-A   senkrecht durch die Mitte - der Aufbau
         Draufsicht    was man von oben wirklich sieht
         Schnitt B-B   waagerecht, knapp unter der Bohrplatte

     Von oben deckt die Bohrplatte alles zu, was die Vorrichtung ausmacht:
     die beiden Anschlagleisten, ihr Bohrbild, das Werkstück. Zeichnete man
     das trotzdem als Volllinien ein, stünde dort etwas, was niemand sehen
     kann - und gestrichelt wäre es ein Gestrüpp. Also wird waagerecht
     geschnitten: In B-B ist die Bohrplatte weg, und darunter liegt alles
     offen.

     Die Schnittebene von B-B liegt bei y = 40 mm. Dort trifft sie nur die
     beiden Distanzsäulen - die M8-Schrauben beginnen erst bei 45 mm, die
     Leisten hören bei 35 mm auf. Ein Schnitt, der wenig trifft, zeigt viel.
     ====================================================================== */
  var s = 2.2;                       /* Bildpunkte je Millimeter */
  var MX = 380, VY0 = 480;           /* Schnitt A-A: x = 0 und y = 0 */
  var DZ0 = 810;                     /* Draufsicht: z = 0 */
  var DZ2 = 1240;                    /* Schnitt B-B: z = 0 */
  var BB = 40;                       /* Höhe der waagerechten Schnittebene */

  function vx(mm) { return MX + mm * s; }
  function vy(mm) { return VY0 - mm * s; }
  /* Methode 1: Was dem Betrachter der Vorderansicht am nächsten ist - also
     -z -, steht in der Draufsicht unten. */
  function dz(mm) { return DZ0 - mm * s; }
  function dz2(mm) { return DZ2 - mm * s; }

  function riegel(g, x1, x2, y1, y2, fuell) {
    Z.schnittTeil(g, [[vx(x1), vy(y1)], [vx(x2), vy(y1)],
      [vx(x2), vy(y2)], [vx(x1), vy(y2)]], fuell);
  }

  /* Ein Sechskant von oben, über Eck gemessen e, mit Schlüsselflächen oben
     und unten. Eine Mutter von oben ist kein Kreis. */
  function sechskant(g, cx, cy, e, breit, fuell) {
    var r = e / 2, d = [];
    for (var i = 0; i < 6; i++) {
      var w = i * Math.PI / 3;
      d.push((i ? 'L' : 'M') + (cx + r * Math.cos(w)).toFixed(1) + ','
        + (cy + r * Math.sin(w)).toFixed(1));
    }
    svgEl('path', {d: d.join(' ') + ' Z', fill: fuell || 'none',
      stroke: 'currentColor',
      'stroke-width': breit ? BREIT : SCHMAL}, g);
  }

  function zeichnen(zielId, opt) {
    opt = opt || {};
    var ziel = document.getElementById(zielId);
    if (!ziel) return null;
    ziel.textContent = '';

    var svg = svgEl('svg', {viewBox: '0 0 980 1530', role: 'img',
      'aria-label': 'Zusammenstellungszeichnung der Bohrvorrichtung: oben '
        + 'der Vollschnitt A-A mit Grundplatte, Anschlagleisten, '
        + 'Distanzsäulen, Bohrplatte und Spannschraube, darunter die '
        + 'Draufsicht auf die Bohrplatte und darunter der waagerechte '
        + 'Schnitt B-B mit abgenommener Bohrplatte'}, ziel);
    if (opt.unterschrift !== false) {
      var f = document.createElement('figcaption');
      f.innerHTML = opt.unterschrift || 'Die Bohrvorrichtung, '
        + 'Zusammenstellungszeichnung in Projektionsmethode 1. Gezeichnet '
        + 'mit eingelegtem Werkst&uuml;ck &ndash; die Lasche liegt in der '
        + 'Ecke der beiden Anschlagleisten und wird von oben gespannt. '
        + 'Schnitt B&ndash;B zeigt, was unter der Bohrplatte liegt.';
      ziel.appendChild(f);
    }
    var g = svgEl('g', {}, svg);

    var sch = {
      gp: schraffur(svg, zielId + '_gp', 45),
      al: schraffur(svg, zielId + '_al', -45),
      bp: schraffur(svg, zielId + '_bp', 45),
      sa: schraffur(svg, zielId + '_sa', -45)
    };
    var leer = 'var(--card, #ffffff)';

    txt(g, vx(0), 118, 'Schnitt A–A', {groesse: 17, fett: true});
    schnittAA(g, sch, leer);
    draufsicht(g, leer);
    txt(g, vx(0), DZ2 - 170, 'Schnitt B–B', {groesse: 17, fett: true});
    schnittBB(g, sch, leer);
    bemassung(g);
    if (opt.posnummern !== false) positionsnummern(g);
    if (opt.schriftfeld !== false) {
      Z.schriftfeld(g, {x: 610, y: 1150, benennung: 'Bohrvorrichtung',
        nummer: 'TBK-2026-042'});
    }
    return svg;
  }

  /* --------------------------------------------------- Schnitt A-A ----- */
  function schnittAA(g, sch, leer) {
    var halbL = M.gpL / 2, halbBp = M.bpL / 2;
    var f1 = M.fuehrM - M.fuehrA / 2, f2 = M.fuehrM + M.fuehrA / 2;
    var fr = M.fuehrD / 2, sr = M.spGew / 2;
    var zr = 5;                      /* Radius des Gewindezapfens M10 */

    /* --- Grundplatte ---------------------------------------------------- */
    /* Ein einziger geschlossener Umriss, und in ihm stecken die beiden
       Grundlöcher für die Gewindezapfen der Säulen. Als voller Riegel
       gezeichnet liefe die Schraffur mitten durch die Zapfen. */
    var p = [[-halbL, M.gpD]];
    [-1, 1].forEach(function (v) {
      var m = v * M.saX;
      p.push([m - zr, M.gpD], [m - zr, 2], [m + zr, 2], [m + zr, M.gpD]);
    });
    p.push([halbL, M.gpD], [halbL, 0], [-halbL, 0]);
    Z.schnittTeil(g, p.map(function (e) {
      return [vx(e[0]), vy(e[1])];
    }), sch.gp);

    /* --- Anschlagleisten ------------------------------------------------ */
    /* Die quer liegende wird geschnitten. Die längs liegende steht dahinter
       und ist deshalb nur zu sehen - Umriss ohne Schraffur. */
    riegel(g, M.alBx - M.alB / 2, M.alBx + M.alB / 2, M.gpD, M.alOben,
      sch.al);
    kasten(g, vx(M.alAx1), vy(M.alOben), (M.alAx2 - M.alAx1) * s,
      M.alH * s);

    /* --- Distanzsäulen: der Länge nach geschnitten, nicht schraffiert --- */
    [-1, 1].forEach(function (v) {
      var m = v * M.saX, r = M.saD / 2;
      riegel(g, m - r, m + r, M.gpD, M.saOben, leer);
      Z.gewindeZapfen(g, vx(m), vy(M.gpD), vy(2), zr * s, 4.2 * s);
    });

    /* --- Bohrplatte ----------------------------------------------------- */
    /* Im Schnitt bleibt von einer durchbohrten Platte nur stehen, was
       zwischen den Bohrungen liegt: sechs Abschnitte. */
    var loecher = [[-M.saX, 4.5], [f1, fr], [M.spX, sr], [f2, fr],
      [M.saX, 4.5]];
    var kante = -halbBp;
    loecher.forEach(function (l) {
      riegel(g, kante, l[0] - l[1], M.saOben, M.bpOben, sch.bp);
      kante = l[0] + l[1];
    });
    riegel(g, kante, halbBp, M.saOben, M.bpOben, sch.bp);

    /* Durch eine leere Bohrung sieht man auf ihre Rückwand, und wo die auf
       die Plattenfläche trifft, liegt eine umlaufende Kante. Im Schnitt
       erscheint sie als Strich quer über die Bohrung - die Fläche der
       Platte läuft also durch. Die beiden Führungsbohrungen sind die
       einzigen, die offen bleiben; in allen anderen steckt etwas. */
    [f1, f2].forEach(function (x) {
      [M.saOben, M.bpOben].forEach(function (y) {
        linie(g, vx(x - fr), vy(y), vx(x + fr), vy(y), BREIT);
      });
    });

    /* --- Zylinderschrauben M8, von oben in die Säulen ------------------- */
    [-1, 1].forEach(function (v) {
      var m = v * M.saX;
      riegel(g, m - 6.5, m + 6.5, M.bpOben, M.bpOben + 8, leer);
      riegel(g, m - 4, m + 4, M.saOben - 16, M.bpOben, leer);
    });

    /* --- Kreuzgriff, Kontermutter, Spannschraube ------------------------ */
    /* In dieser Reihenfolge: Die Spannschraube steckt in beiden, also wird
       sie zuletzt gezeichnet. Sonst verschwände ihr Umriss unter der
       Mutter, und die Mutter säße auf nichts. */
    var sp = M.spX, gy = M.griffY;
    /* Der Kreuzgriff steht um 45 Grad gedreht - in der Draufsicht läge er
       sonst genau auf den beiden Führungsbohrungen, und ausgerechnet die
       machen die Vorrichtung aus. Ein Griff, der sich dreht, darf das.
       Von vorn sieht man deshalb nicht die volle Armlänge, sondern ihre
       Projektion; und geschnitten sind die Arme nicht, sie stehen davor. */
    var ap = (M.griffD / 2 + 6) / Math.SQRT2;
    [-1, 1].forEach(function (v) {
      Z.schnittTeil(g, [[vx(sp + v * 9), vy(gy + 4)],
        [vx(sp + v * ap), vy(gy + 2)],
        [vx(sp + v * ap), vy(gy - 2)],
        [vx(sp + v * 9), vy(gy - 4)]], leer);
    });
    riegel(g, sp - 9, sp + 9, gy - 6, gy + 8, leer);
    riegel(g, sp - 10, sp + 10, M.bpOben, M.bpOben + 10, leer);
    riegel(g, sp - sr, sp + sr, M.wsOben, M.spOben, leer);
    Z.achseV(g, vx(sp), vy(M.spOben + 12), vy(M.wsOben - 10));

    /* --- Das Werkstück -------------------------------------------------- */
    /* Es gehört nicht zur Stückliste - es wird gebohrt. */
    var bg = svgEl('g', {'class': 'erklaer', opacity: 0.5}, g);
    kasten(bg, vx(M.wsX1), vy(M.wsOben), M.wsL * s, M.wsD * s,
      {fuell: 'currentColor', ohneRand: true});

    /* --- Der Verlauf von B-B -------------------------------------------- */
    [34, vx(halbL) + 150].forEach(function (x) {
      Z.schnittmarke(g, {x: x, y: vy(BB), richtung: 'unten', name: 'B'});
    });
  }

  /* --------------------------------------------------- Draufsicht ------ */
  /* Was man von oben wirklich sieht - nicht mehr. Die Reihenfolge ist die
     Reihenfolge der Schichten: erst die Grundplatte, dann die Leiste, die
     hinten unter der Bohrplatte hervorschaut, dann die Bohrplatte mit
     Deckfarbe darüber. Was sie verdeckt, ist damit verdeckt. */
  function draufsicht(g, leer) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2, halbBp = M.bpT / 2;
    var f1 = M.fuehrM - M.fuehrA / 2, f2 = M.fuehrM + M.fuehrA / 2;
    var sp = M.spX;

    kasten(g, vx(-halbL), dz(halbT), M.gpL * s, M.gpT * s);
    kasten(g, vx(M.alBx - M.alB / 2), dz(M.alBz2), M.alB * s,
      (M.alBz2 - M.alBz1) * s);

    kasten(g, vx(-halbL), dz(halbBp), M.bpL * s, M.bpT * s, {fuell: leer});

    /* Die beiden Führungsbohrungen bleiben offen - alles andere ist
       besetzt: in den Ecken die Schraubenköpfe, in der Mitte die
       Spannschraube. */
    [f1, f2].forEach(function (x) {
      Z.bohrung(g, vx(x), dz(0), M.fuehrD / 2 * s, 0, leer);
    });
    [-1, 1].forEach(function (v) {
      var m = vx(v * M.saX);
      Z.bohrung(g, m, dz(0), 6.5 * s, 0, leer);
      sechskant(g, m, dz(0), 6.9 * s, false);
    });

    /* Kontermutter und Kreuzgriff: Der Griff liegt darüber und deckt sie
       teilweise zu. Deshalb erst die Mutter, dann der Griff mit Deckfarbe. */
    sechskant(g, vx(sp), dz(0), 20 * s, true);
    var a = M.griffD / 2 * s, b = 6 * s, cx = vx(sp), cy = dz(0), d = [];
    var c45 = Math.SQRT1_2;
    [[b, b], [a, b], [a, -b], [b, -b], [b, -a], [-b, -a], [-b, -b],
     [-a, -b], [-a, b], [-b, b], [-b, a], [b, a]].forEach(function (e, i) {
      var ex = (e[0] - e[1]) * c45, ey = (e[0] + e[1]) * c45;
      d.push((i ? 'L' : 'M') + (cx + ex).toFixed(1) + ','
        + (cy + ey).toFixed(1));
    });
    svgEl('path', {d: d.join(' ') + ' Z', fill: leer, stroke: 'currentColor',
      'stroke-width': BREIT, 'stroke-linejoin': 'miter'}, g);
    svgEl('circle', {cx: cx, cy: cy, r: 9 * s, fill: leer,
      stroke: 'currentColor', 'stroke-width': BREIT}, g);

    achse(g, vx(-halbL - 10), vx(halbL + 10), dz(0));
    Z.achseV(g, vx(sp), dz(halbT + 10), dz(-halbT - 10));
    [f1, f2].forEach(function (x) {
      Z.achseV(g, vx(x), dz(M.fuehrD / 2 + 8), dz(-M.fuehrD / 2 - 8));
    });

    /* Schnittverlauf A-A: Die Pfeile zeigen in die Blickrichtung der
       Hauptansicht, nach +z, und das ist hier nach oben. */
    [vx(-halbL) - 128, vx(halbL) + 128].forEach(function (x) {
      Z.schnittmarke(g, {x: x, y: dz(0), richtung: 'oben', name: 'A'});
    });
  }

  /* --------------------------------------------------- Schnitt B-B ----- */
  /* Waagerecht bei y = 40 mm, Blick nach unten. Getroffen werden nur die
     beiden Distanzsäulen; alles andere liegt darunter und ist zu sehen. */
  function schnittBB(g, sch, leer) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2;

    kasten(g, vx(-halbL), dz2(halbT), M.gpL * s, M.gpT * s);

    var bg = svgEl('g', {'class': 'erklaer', opacity: 0.45}, g);
    kasten(bg, vx(M.wsX1), dz2(M.wsZ2), M.wsL * s, M.wsT * s,
      {fuell: 'currentColor', ohneRand: true});

    /* Die beiden Anschlagleisten über Eck, von oben */
    kasten(g, vx(M.alAx1), dz2(M.alAz + M.alB / 2),
      (M.alAx2 - M.alAx1) * s, M.alB * s);
    kasten(g, vx(M.alBx - M.alB / 2), dz2(M.alBz2), M.alB * s,
      (M.alBz2 - M.alBz1) * s);

    /* Stifte und Schrauben der Leisten. Über dem Schraubenkopf steht die
       Senkung, im Kopf der Innensechskant SW 5. */
    M.stiftAx.forEach(function (x) {
      Z.bohrung(g, vx(x), dz2(M.alAz), 2.5 * s, 0, leer);
    });
    M.schraubeAx.forEach(function (x) {
      Z.bohrung(g, vx(x), dz2(M.alAz), 5 * s, M.senkD / 2 * s, leer);
      sechskant(g, vx(x), dz2(M.alAz), 5.8 * s, false);
    });
    M.stiftBz.forEach(function (z) {
      Z.bohrung(g, vx(M.alBx), dz2(z), 2.5 * s, 0, leer);
    });
    M.schraubeBz.forEach(function (z) {
      Z.bohrung(g, vx(M.alBx), dz2(z), 5 * s, M.senkD / 2 * s, leer);
      sechskant(g, vx(M.alBx), dz2(z), 5.8 * s, false);
    });

    /* Die Distanzsäulen sind quer geschnitten - also schraffiert. Derselbe
       Bolzen, der in A-A blank bleibt. */
    [-1, 1].forEach(function (v) {
      svgEl('circle', {cx: vx(v * M.saX), cy: dz2(0), r: M.saD / 2 * s,
        fill: sch.sa, stroke: 'currentColor', 'stroke-width': BREIT}, g);
    });

    achse(g, vx(-halbL - 10), vx(halbL + 10), dz2(0));
    achse(g, vx(M.alAx1 - 10), vx(M.alAx2 + 10), dz2(M.alAz));
    Z.achseV(g, vx(M.alBx), dz2(M.alBz2 + 10), dz2(M.alBz1 - 10));
  }

  /* --------------------------------------------------- Bemassung ------- */
  /* Eine Zusammenstellung trägt die Hauptmaße: Gesamtabmessungen,
     Anschlussmaße und was die Funktion beschreibt. Alles Übrige steht auf
     den Einzelteilzeichnungen. */
  function bemassung(g) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2;
    var LINKS = vx(-halbL), RECHTS = vx(halbL);

    mass(g, vx(-M.saX), vx(M.saX), vy(0) + 34, (2 * M.saX) + '', vy(M.gpD));
    mass(g, LINKS, RECHTS, vy(0) + 70, M.gpL + '', vy(0));

    massV(g, vy(M.gpD), vy(0), LINKS - 28, M.gpD + '', LINKS, true);
    massV(g, vy(M.alOben), vy(M.gpD), LINKS - 58, M.alH + '',
      vx(M.alBx - M.alB / 2), true);
    massV(g, vy(M.saOben), vy(M.gpD), LINKS - 88, M.saH + '',
      vx(-M.saX - M.saD / 2), true);
    massV(g, vy(M.bpOben), vy(0), LINKS - 118, M.bpOben + '',
      [vx(-M.bpL / 2), LINKS], true);

    massV(g, vy(M.bpOben), vy(M.saOben), RECHTS + 28, M.bpD + '',
      vx(M.bpL / 2), false);
    massV(g, vy(M.saOben), vy(M.wsOben), RECHTS + 58, M.luft + '',
      [vx(M.bpL / 2), vx(M.wsX2)], false);
    massV(g, vy(M.wsOben), vy(M.gpD), RECHTS + 88, M.wsD + '',
      [vx(M.wsX2), RECHTS], false);

    Z.massHinweis(g, vx(M.spX + M.spGew / 2), vy(52), 58, 0, 'M12');

    /* Tiefen an der Draufsicht */
    massV(g, dz(halbT), dz(-halbT), LINKS - 28, M.gpT + '', vx(-halbL), true);
    massV(g, dz(M.bpT / 2), dz(-M.bpT / 2), LINKS - 58, M.bpT + '',
      vx(-halbL), true);
    mass(g, vx(M.fuehrM - M.fuehrA / 2), vx(M.fuehrM + M.fuehrA / 2),
      dz(-halbT) + 36, M.fuehrA + '', dz(0));
    Z.massHinweis(g, vx(M.fuehrM + M.fuehrA / 2), dz(M.fuehrD / 2), 132,
      118, '2 × ⌀' + M.fuehrD);

    /* Und an B-B, wo die Leisten liegen */
    massV(g, dz2(M.alAz), dz2(0), RECHTS + 28, M.alAz + '',
      [vx(M.alAx2), vx(M.alAx2)], false);
    mass(g, vx(-halbL), vx(M.alBx), dz2(-halbT) + 36,
      (halbL + M.alBx) + '', dz2(0));
    mass(g, vx(M.stiftAx[0]), vx(M.stiftAx[1]), dz2(-halbT) + 70,
      (M.stiftAx[1] - M.stiftAx[0]) + '', dz2(M.alAz));
    Z.massHinweis(g, vx(-M.saX) - M.saD / 2 * s + 3, dz2(0) + 12,
      -76, -58, '⌀' + M.saD);
  }

  /* ------------------------------------------- Positionsnummern -------- */
  /* Eine Reihe über dem Schnitt A-A, sortiert nach der Lage ihrer
     Hinweisstellen von links nach rechts - so kreuzt keine Hinweislinie
     eine andere. Geprüft wird das nicht nach Augenmaß: Die Prüfung rechnet
     jedes Paar durch. */
  function positionsnummern(g) {
    var oben = 160;
    [[1, -75, 7.5, 168],
     [3, -71, 52, 222],
     [4, -55, 68, 280],
     [2, -45, 26, 338],
     [5, -4, 44, 398],
     [10, 4, 80, 452],
     [6, 20, 93, 506],
     [7, 65, 79, 562]
    ].forEach(function (e) {
      Z.posNr(g, e[0], vx(e[1]), vy(e[2]), e[3], oben);
    });
    /* Stift und M6-Schraube sieht man nur in B-B. */
    var unten = dz2(-M.gpT / 2) + 118;
    [[9, M.stiftAx[0], M.alAz, 250], [8, M.schraubeAx[1], M.alAz, 430]
    ].forEach(function (e) {
      Z.posNr(g, e[0], vx(e[1]), dz2(e[2]), e[3], unten);
    });
  }

  /* ======================================================================
     6  DIE VORRICHTUNG ALS KÖRPER
     ----------------------------------------------------------------------
     Dieselben Maße, jetzt für assets/bauteil3d.js.

     Zwei Dinge sind hier wichtiger, als sie aussehen:

     1. BOHRUNGEN. Wo ein Teil durch ein anderes gesteckt wird, hat das
        andere ein Loch. Ohne sie sähe man einen Block, durch den zwei
        Säulen wachsen - und die Vorrichtung lebt davon, dass man durch die
        Bohrplatte hindurchbohrt.

     2. EINSCHUBRICHTUNG. Diese Baugruppe ist ein Stapel: Bis auf die
        Grundplatte, die von unten kommt, fährt jedes Teil von oben ein.
        Das ist keine Vereinfachung, sondern der Grund, warum sie eine
        Vorrichtung ist - was von oben kommt, lässt sich auch von oben
        wieder lösen.

     Beides zusammen entscheidet, welche Reihenfolgen möglich sind, und
     pruefungen/test-montage.js rechnet jedes Paar durch: Kein Teil darf auf
     seinem Weg ein anderes durchqueren, das nach den Vorrangbeziehungen
     schon dort liegen könnte. Die Bedingung "Kontermutter vor Kreuzgriff"
     stammt aus genau dieser Rechnung.

     Das Werkstück ist kein Körper. Es steht nicht in der Stückliste - es
     wird gebohrt, nicht montiert. In der Zeichnung liegt es als graue
     Fläche in der Ecke.
     ====================================================================== */
  function teile3d() {
    var t = [];
    function nimm(e) { t.push(e); return e; }

    var alMitteX = (M.alAx1 + M.alAx2) / 2;      /* Mitte der Leiste längs */
    var alMitteZ = (M.alBz1 + M.alBz2) / 2;      /* Mitte der Leiste quer  */
    var senkUnten = M.alOben - M.senkT;          /* wo die Senkung anfängt */

    /* --- 1 Grundplatte, mit vierzehn Bohrungen ------------------------ */
    var loecher = [];
    M.stiftAx.forEach(function (x) {
      loecher.push({d: 5, x: x, z: M.alAz});
    });
    M.schraubeAx.forEach(function (x) {
      loecher.push({d: 5, x: x, z: M.alAz});     /* Gewinde M6 */
    });
    M.stiftBz.forEach(function (z) {
      loecher.push({d: 5, x: M.alBx, z: z});
    });
    M.schraubeBz.forEach(function (z) {
      loecher.push({d: 5, x: M.alBx, z: z});
    });
    [-1, 1].forEach(function (v) {
      loecher.push({d: 8.5, x: v * M.saX, z: 0});  /* Gewinde M10 */
    });
    nimm({id: 'grundplatte', pos: 1, name: 'Grundplatte', form: 'platte',
      masse: {x: M.gpL, y: M.gpD, z: M.gpT, loecher: loecher},
      lage: {x: 0, y: M.gpD / 2, z: 0}, von: {x: 0, y: -190, z: 0}});

    /* --- 9 Zylinderstifte, von oben eingetrieben ---------------------- */
    M.stiftAx.forEach(function (x, i) {
      nimm({id: 'stiftA' + i, pos: 9, name: 'Zylinderstift', form: 'rohr',
        achse: 'y', masse: {d: 5, di: 0, l: 16},
        lage: {x: x, y: M.gpD, z: M.alAz}, von: {x: 0, y: 180, z: 0}});
    });
    M.stiftBz.forEach(function (z, i) {
      nimm({id: 'stiftB' + i, pos: 9, name: 'Zylinderstift', form: 'rohr',
        achse: 'y', masse: {d: 5, di: 0, l: 16},
        lage: {x: M.alBx, y: M.gpD, z: z}, von: {x: 0, y: 180, z: 0}});
    });

    /* --- 2 Anschlagleisten, je zwei Körper ---------------------------- */
    /* Zwei, weil die Senkung für den Schraubenkopf ein zweiter Durchmesser
       ist: unten das Durchgangsloch 6,6, oben die Senkung 11. Ein einzelner
       ausgezogener Umriss kann nur eines von beidem. */
    function leiste(id, masseUnten, masseOben, lage) {
      nimm({id: id + 'U', pos: 2, name: 'Anschlagleiste', form: 'platte',
        masse: masseUnten,
        lage: {x: lage.x, y: (M.gpD + senkUnten) / 2, z: lage.z},
        von: {x: 0, y: 150, z: 0}});
      nimm({id: id + 'O', pos: 2, name: 'Anschlagleiste', form: 'platte',
        masse: masseOben,
        lage: {x: lage.x, y: (senkUnten + M.alOben) / 2, z: lage.z},
        von: {x: 0, y: 150, z: 0}});
    }
    (function leisteLaengs() {
      var u = [], o = [];
      M.stiftAx.forEach(function (x) {
        u.push({d: 5, x: x - alMitteX, z: 0});
        o.push({d: 5, x: x - alMitteX, z: 0});
      });
      M.schraubeAx.forEach(function (x) {
        u.push({d: 6.6, x: x - alMitteX, z: 0});
        o.push({d: M.senkD, x: x - alMitteX, z: 0});
      });
      leiste('leisteA',
        {x: M.alL, y: senkUnten - M.gpD, z: M.alB, loecher: u},
        {x: M.alL, y: M.alOben - senkUnten, z: M.alB, loecher: o},
        {x: alMitteX, z: M.alAz});
    }());
    (function leisteQuer() {
      var u = [], o = [];
      M.stiftBz.forEach(function (z) {
        u.push({d: 5, x: 0, z: z - alMitteZ});
        o.push({d: 5, x: 0, z: z - alMitteZ});
      });
      M.schraubeBz.forEach(function (z) {
        u.push({d: 6.6, x: 0, z: z - alMitteZ});
        o.push({d: M.senkD, x: 0, z: z - alMitteZ});
      });
      leiste('leisteB',
        {x: M.alB, y: senkUnten - M.gpD, z: M.alL, loecher: u},
        {x: M.alB, y: M.alOben - senkUnten, z: M.alL, loecher: o},
        {x: M.alBx, z: alMitteZ});
    }());

    /* --- 8 Zylinderschrauben M6 × 20, von oben ------------------------ */
    function schraubeM6(id, x, z) {
      nimm({id: id + 'Kopf', pos: 8, name: 'Zylinderschraube M6',
        form: 'rohr', achse: 'y', masse: {d: 10, di: 0, l: 6},
        lage: {x: x, y: senkUnten + 3, z: z}, von: {x: 0, y: 140, z: 0}});
      nimm({id: id + 'Schaft', pos: 8, name: 'Zylinderschraube M6',
        form: 'rohr', achse: 'y', masse: {d: 6, di: 0, l: 20},
        lage: {x: x, y: senkUnten - 10, z: z}, von: {x: 0, y: 140, z: 0}});
    }
    M.schraubeAx.forEach(function (x, i) {
      schraubeM6('m6A' + i, x, M.alAz);
    });
    M.schraubeBz.forEach(function (z, i) {
      schraubeM6('m6B' + i, M.alBx, z);
    });

    /* --- 3 Distanzsäulen mit Gewindezapfen M10 ------------------------ */
    [-1, 1].forEach(function (v) {
      var k = v < 0 ? 'L' : 'R';
      nimm({id: 'saeule' + k, pos: 3, name: 'Distanzsäule', form: 'rohr',
        achse: 'y', masse: {d: M.saD, di: 0, l: M.saH},
        lage: {x: v * M.saX, y: M.gpD + M.saH / 2, z: 0},
        von: {x: 0, y: 175, z: 0}});
      nimm({id: 'zapfen' + k, pos: 3, name: 'Gewindezapfen M10',
        form: 'rohr', achse: 'y', masse: {d: 10, di: 0, l: 13},
        lage: {x: v * M.saX, y: M.gpD - 6.5, z: 0},
        von: {x: 0, y: 175, z: 0}});
    });

    /* --- 4 Bohrplatte, von oben auf die Säulen ------------------------ */
    nimm({id: 'bohrplatte', pos: 4, name: 'Bohrplatte', form: 'platte',
      masse: {x: M.bpL, y: M.bpD, z: M.bpT, loecher: [
        {d: 9, x: -M.saX, z: 0}, {d: 9, x: M.saX, z: 0},
        {d: M.fuehrD, x: M.fuehrM - M.fuehrA / 2, z: 0},
        {d: M.fuehrD, x: M.fuehrM + M.fuehrA / 2, z: 0},
        {d: M.spGew, x: M.spX, z: 0}]},
      lage: {x: 0, y: M.saOben + M.bpD / 2, z: 0},
      von: {x: 0, y: 165, z: 0}});

    /* --- 7 Zylinderschrauben M8 × 30, von oben in die Säulen ---------- */
    [-1, 1].forEach(function (v) {
      var k = v < 0 ? 'L' : 'R';
      nimm({id: 'm8Kopf' + k, pos: 7, name: 'Zylinderschraube M8',
        form: 'rohr', achse: 'y', masse: {d: 13, di: 0, l: 8},
        lage: {x: v * M.saX, y: M.bpOben + 4, z: 0},
        von: {x: 0, y: 150, z: 0}});
      nimm({id: 'm8Schaft' + k, pos: 7, name: 'Zylinderschraube M8',
        form: 'rohr', achse: 'y', masse: {d: 8, di: 0, l: 30},
        lage: {x: v * M.saX, y: M.bpOben - 15, z: 0},
        von: {x: 0, y: 150, z: 0}});
    });

    /* --- 5 Spannschraube, durch das Gewinde der Bohrplatte ------------ */
    nimm({id: 'spannschraube', pos: 5, name: 'Spannschraube', form: 'rohr',
      achse: 'y', masse: {d: M.spGew, di: 0, l: M.spL},
      lage: {x: M.spX, y: M.wsOben + M.spL / 2, z: 0},
      von: {x: 0, y: 190, z: 0}});

    /* --- 10 Kontermutter, auf die Bohrplatte -------------------------- */
    nimm({id: 'kontermutter', pos: 10, name: 'Sechskantmutter',
      form: 'rohr', achse: 'y', masse: {d: 20, di: M.spGew, l: 10},
      lage: {x: M.spX, y: M.bpOben + 5, z: 0},
      von: {x: 0, y: 140, z: 0}});

    /* --- 6 Kreuzgriff: Nabe und zwei gekreuzte Arme ------------------- */
    nimm({id: 'griffNabe', pos: 6, name: 'Kreuzgriff', form: 'rohr',
      achse: 'y', masse: {d: 18, di: 0, l: 14},
      lage: {x: M.spX, y: M.griffY + 1, z: 0},
      von: {x: 0, y: 160, z: 0}});
    [{x: M.griffD, y: 8, z: 12}, {x: 12, y: 8, z: M.griffD}]
      .forEach(function (masse, i) {
        nimm({id: 'griffArm' + i, pos: 6, name: 'Kreuzgriff', form: 'quader',
          masse: masse, lage: {x: M.spX, y: M.griffY, z: 0},
          von: {x: 0, y: 160, z: 0}});
      });

    return t;
  }

  /* Eine gültige Montagefolge, als Liste von Körperkennungen. Gesucht wird
     nicht die schönste, sondern irgendeine, die keine Vorrangbeziehung
     verletzt - genau das prüft die Übung ja auch. */
  function reihenfolge() {
    var offen = TEILE.map(function (t) { return t.pos; });
    var gesetzt = [], folge = [];
    while (offen.length) {
      var genommen = false;
      for (var i = 0; i < offen.length; i++) {
        var pos = offen[i];
        var frei = VORRANG.every(function (v) {
          return v.nachher !== pos || gesetzt.indexOf(v.vorher) >= 0;
        });
        if (!frei) continue;
        gesetzt.push(pos);
        offen.splice(i, 1);
        genommen = true;
        break;
      }
      if (!genommen) break;        /* Kreise gibt es keine - siehe Prüfung */
    }
    var koerper = teile3d();
    gesetzt.forEach(function (pos) {
      koerper.forEach(function (k) {
        if (k.pos === pos) folge.push(k.id);
      });
    });
    return folge;
  }

  /* ======================================================================
     7  WAS DIE PRÜFUNG BRAUCHT
     ====================================================================== */
  function darfDurchdringen(a, b) {
    return STRUKTUR.some(function (k) {
      return (k.a === a && k.b === b) || (k.a === b && k.b === a);
    });
  }

  function teilNr(pos) {
    for (var i = 0; i < TEILE.length; i++) {
      if (TEILE[i].pos === pos) return TEILE[i];
    }
    return null;
  }

  global.VORRICHTUNG = {
    name: 'Bohrvorrichtung',
    nummer: 'TBK-2026-042',
    M: M,
    TEILE: TEILE,
    STRUKTUR: STRUKTUR,
    NETZ_LAGE: NETZ_LAGE,
    VORRANG: VORRANG,
    REIHENFOLGE: reihenfolge(),
    zeichnen: zeichnen,
    teile3d: teile3d,
    darfDurchdringen: darfDurchdringen,
    teil: teilNr
  };
}(typeof window !== 'undefined' ? window : this));
