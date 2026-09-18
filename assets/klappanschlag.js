/* Der Klappanschlag - dritte Baugruppe derselben Schwierigkeit.
 *
 * Eingebunden nach zeichnen.js und zusammenstellung.js:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/zusammenstellung.js"></script>
 *     <script src="../../assets/klappanschlag.js"></script>
 *
 * Dieselbe Datei liegt in zwei Repos - wird sie geändert, gehört sie in
 * beide kopiert.
 *
 * Drei Baugruppen, damit man in den Übungen nicht die Lösungen der
 * Lernsituation wiedererkennt:
 *
 *     Lektion       Bohrvorrichtung   (assets/bohrvorrichtung.js)
 *     Übungen       Klappanschlag     (diese Datei)
 *     Lernsituation Biegepresse       (assets/biegepresse.js)
 *
 * Und weil jede etwas anderes zeigt: Die Presse übersetzt Kraft, die
 * Vorrichtung hält fest, der Anschlag dreht sich. Der Schwenkbolzen ist die
 * einzige bewegliche Verbindung - und er ist quer geschnitten, also
 * schraffiert. In der Presse war jeder Stift längs geschnitten und blieb
 * blank. Wer beides gesehen hat, kennt die Regel und nicht nur einen Fall.
 *
 * Zweck: An der Tafelschere legt der Anschlag die Streifenbreite fest. Zum
 * Ausräumen klappt man ihn nach hinten weg; ein Gewindestift stellt ein,
 * wie weit er zurückkommt.
 *
 * Koordinaten (mm):
 *   x  nach rechts, 0 = Schwenkachse
 *   y  nach oben,   0 = Unterseite der Grundplatte
 *   z  nach hinten, 0 = Mitte
 */
(function (global) {
  'use strict';

  var Z = global.Zusammenstellung;

  /* ======================================================================
     1  DIE MASSE
     ====================================================================== */
  var M = {
    gpL: 140, gpT: 80, gpD: 12,            /* Grundplatte */

    laL: 50, laB: 8, laH: 45, laZ: 16,     /* Lagerlasche, zwei Stück */

    armB: 24, armZ: 20,                    /* Schwenkarm: Breite und Dicke */
    armUnten: 25, armOben: 145,
    nasenX: 45, nasenOben: 41,             /* die Nase, auf der er aufliegt */

    achseY: 45,                            /* Schwenkachse */
    bolzenGew: 12, bolzenL: 70,

    apB: 10, apH: 40, apT: 60,             /* Anschlagplatte */
    apUnten: 105,

    gsGew: 10, gsX: 35, gsOben: 25,        /* Gewindestift als Anschlag */

    schraubeX: [-18, 18], stiftX: [-8, 8], /* Bohrbild der Laschen */
    schraubeApY: [115, 135]                /* Anschlagplatte am Arm */
  };

  M.gpOben = M.gpD;                                  /* 12  */
  M.laOben = M.gpD + M.laH;                          /* 57  */
  M.apOben = M.apUnten + M.apH;                      /* 145 */
  M.hoehe = M.armOben;                               /* 145 */
  M.spalt = M.armUnten - M.gsOben;                   /* 0: der Arm liegt auf */

  /* ======================================================================
     2  DIE STÜCKLISTE
     ====================================================================== */
  var TEILE = [
    {pos: 1, menge: 1, benennung: 'Grundplatte', werkstoff: 'S235JR',
     bemerkung: '140 × 80 × 12', art: 'fertigung', kurz: 'Grundplatte'},
    {pos: 2, menge: 2, benennung: 'Lagerlasche', werkstoff: 'S235JR',
     bemerkung: '50 × 8 × 45', art: 'fertigung', kurz: 'Lagerlasche'},
    {pos: 3, menge: 1, benennung: 'Schwenkarm', werkstoff: 'S235JR',
     bemerkung: 'Flachstahl 20 dick, mit Nase', art: 'fertigung',
     kurz: 'Schwenkarm'},
    {pos: 4, menge: 1, benennung: 'Anschlagplatte', werkstoff: 'C45',
     bemerkung: '60 × 40 × 10, gehärtet', art: 'fertigung',
     kurz: 'Anschlagplatte'},
    {pos: 5, menge: 1, benennung: 'Zylinderschraube ISO 4762 – M12 × 70 – 8.8',
     werkstoff: '', bemerkung: 'Schwenkbolzen', art: 'norm',
     kurz: 'Schwenkbolzen'},
    {pos: 6, menge: 1, benennung: 'Sechskantmutter ISO 4032 – M12 – 8',
     werkstoff: '', bemerkung: 'sichert den Schwenkbolzen', art: 'norm',
     kurz: 'Sechskantmutter'},
    {pos: 7, menge: 1, benennung: 'Gewindestift DIN 6332 – S M10 × 40',
     werkstoff: '', bemerkung: 'stellt den Anschlagwinkel ein', art: 'norm',
     kurz: 'Gewindestift'},
    {pos: 8, menge: 4, benennung: 'Zylinderschraube ISO 4762 – M8 × 25 – 8.8',
     werkstoff: '', bemerkung: 'von unten durch die Grundplatte', art: 'norm',
     kurz: 'Schraube M8'},
    {pos: 9, menge: 4, benennung: 'Zylinderstift ISO 2338 – 6 m6 × 20 – St',
     werkstoff: '', bemerkung: 'richtet die Laschen aus', art: 'norm',
     kurz: 'Zylinderstift'},
    {pos: 10, menge: 2, benennung: 'Zylinderschraube ISO 4762 – M6 × 16 – 8.8',
     werkstoff: '', bemerkung: 'Anschlagplatte am Arm', art: 'norm',
     kurz: 'Schraube M6'}
  ];

  /* ======================================================================
     3  DAS STRUKTURNETZ
     ====================================================================== */
  var STRUKTUR = [
    {a: 1, b: 9, art: 'fest', warum: 'Die Stifte stecken in der Grundplatte.'},
    {a: 2, b: 9, art: 'fest', warum: 'und in der Lagerlasche.'},
    {a: 1, b: 2, art: 'fest',
     warum: 'Die Laschen stehen auf der Grundplatte.'},
    {a: 1, b: 8, art: 'fest',
     warum: 'Die Schraube liegt mit dem Kopf in der Senkung der '
       + 'Grundplatte.'},
    {a: 2, b: 8, art: 'fest',
     warum: 'und greift in das Gewinde der Lasche.'},
    {a: 2, b: 5, art: 'fest',
     warum: 'Der Schwenkbolzen sitzt in den Bohrungen beider Laschen.'},
    {a: 3, b: 5, art: 'beweglich',
     warum: 'Der Arm dreht sich auf dem Bolzen - das ist die einzige '
       + 'Bewegung der ganzen Baugruppe.'},
    {a: 5, b: 6, art: 'fest', warum: 'Die Mutter sitzt auf dem Bolzen.'},
    {a: 2, b: 6, art: 'fest',
     warum: 'und liegt an der äußeren Lasche an - erst dadurch hält sie.'},
    {a: 3, b: 4, art: 'fest',
     warum: 'Die Anschlagplatte sitzt am oberen Ende des Arms.'},
    {a: 3, b: 10, art: 'fest',
     warum: 'Die M6-Schrauben greifen in das Gewinde des Arms.'},
    {a: 4, b: 10, art: 'fest', warum: 'und halten die Platte.'},
    {a: 1, b: 7, art: 'fest',
     warum: 'Der Gewindestift ist in die Grundplatte eingeschraubt.'},
    {a: 3, b: 7, art: 'beweglich',
     warum: 'Die Nase des Arms legt sich auf den Druckzapfen - beim '
       + 'Wegklappen hebt sie wieder ab.'}
  ];

  var NETZ_LAGE = {
    1: {x: 24, y: 76}, 2: {x: 54, y: 54}, 3: {x: 50, y: 30},
    4: {x: 24, y: 10}, 5: {x: 86, y: 34}, 6: {x: 88, y: 12},
    7: {x: 20, y: 52}, 8: {x: 84, y: 76}, 9: {x: 52, y: 94},
    10: {x: 20, y: 30}
  };

  /* ======================================================================
     4  DIE VORRANGBEZIEHUNGEN
     ----------------------------------------------------------------------
     Anders als bei der Biegepresse hängt hier keine einzige Bedingung am
     Werkzeug. Der Arm klappt weg - und was sich wegklappen lässt, gibt den
     Platz wieder frei. Das ist kein Zufall, sondern der Unterschied
     zwischen einer Maschine und einer Vorrichtung.
     ====================================================================== */
  var VORRANG = [
    {vorher: 1, nachher: 9,
     warum: 'Der Stift wird in die Grundplatte getrieben.'},
    {vorher: 9, nachher: 2,
     warum: 'Die Stifte richten die Lasche aus. Erst ausrichten, dann '
       + 'festziehen - sonst sitzt sie schief und der Arm klemmt.'},
    {vorher: 2, nachher: 8,
     warum: 'Erst steht die Lasche auf den Stiften, dann wird sie '
       + 'verschraubt.'},
    {vorher: 1, nachher: 8,
     warum: 'Die Schraube kommt von unten durch die Grundplatte.'},
    {vorher: 2, nachher: 5,
     warum: 'Der Schwenkbolzen geht durch die Bohrungen beider Laschen. '
       + 'Ohne sie hat er nichts zu durchdringen.'},
    {vorher: 3, nachher: 5,
     warum: 'Der Arm muss zwischen den Laschen liegen, bevor der Bolzen '
       + 'kommt - danach bekommt man ihn nicht mehr dazwischen.'},
    {vorher: 5, nachher: 6,
     warum: 'Die Mutter wird auf das Ende des Bolzens gedreht.'},
    {vorher: 3, nachher: 10,
     warum: 'Die M6-Schrauben greifen in das Gewinde des Arms.'},
    {vorher: 4, nachher: 10,
     warum: 'und halten die Anschlagplatte. Ohne Platte halten sie nichts.'},
    {vorher: 1, nachher: 7,
     warum: 'Der Gewindestift wird in die Grundplatte eingeschraubt.'}
  ];

  /* ======================================================================
     5  DIE ZUSAMMENSTELLUNGSZEICHNUNG
     ----------------------------------------------------------------------
     Zwei Ansichten in Projektionsmethode 1: oben der Vollschnitt A-A durch
     die Mitte, darunter die Draufsicht.

     Gezeichnet ist die Arbeitsstellung: Der Arm steht, seine Nase liegt auf
     dem Gewindestift. Nach hinten klappt er weg.
     ====================================================================== */
  var s = 2.2;
  var MX = 300, VY0 = 560;
  var DZ0 = 790;

  function vx(mm) { return MX + mm * s; }
  function vy(mm) { return VY0 - mm * s; }
  function dz(mm) { return DZ0 - mm * s; }

  function riegel(g, x1, x2, y1, y2, fuell) {
    Z.schnittTeil(g, [[vx(x1), vy(y1)], [vx(x2), vy(y1)],
      [vx(x2), vy(y2)], [vx(x1), vy(y2)]], fuell);
  }

  function zeichnen(zielId, opt) {
    opt = opt || {};
    var ziel = document.getElementById(zielId);
    if (!ziel) return null;
    ziel.textContent = '';

    var svg = svgEl('svg', {viewBox: '0 0 980 1010', role: 'img',
      'aria-label': 'Zusammenstellungszeichnung des Klappanschlags: oben der '
        + 'Vollschnitt A-A mit Grundplatte, zwei Lagerlaschen, Schwenkarm, '
        + 'Anschlagplatte, Schwenkbolzen und Gewindestift, darunter die '
        + 'Draufsicht; mit den Hauptmaßen und zehn Positionsnummern'}, ziel);
    if (opt.unterschrift !== false) {
      var f = document.createElement('figcaption');
      f.innerHTML = opt.unterschrift || 'Der Klappanschlag, '
        + 'Zusammenstellungszeichnung in Projektionsmethode 1. Gezeichnet in '
        + 'der Arbeitsstellung &ndash; die Nase des Arms liegt auf dem '
        + 'Gewindestift, und der stellt ein, wie weit der Arm '
        + 'zur&uuml;ckkommt.';
      ziel.appendChild(f);
    }
    var g = svgEl('g', {}, svg);

    var sch = {
      gp: schraffur(svg, zielId + '_gp', 45),
      arm: schraffur(svg, zielId + '_arm', -45),
      ap: schraffur(svg, zielId + '_ap', 45),
      bo: schraffur(svg, zielId + '_bo', 45)
    };
    var leer = 'var(--card, #ffffff)';

    txt(g, vx(0), 118, 'Schnitt A–A', {groesse: 17, fett: true});
    schnittAA(g, sch, leer);
    draufsicht(g, leer);
    bemassung(g);
    if (opt.posnummern !== false) positionsnummern(g);
    if (opt.schriftfeld !== false) {
      Z.schriftfeld(g, {x: 600, y: 890, benennung: 'Klappanschlag',
        nummer: 'TBK-2026-043'});
    }
    return svg;
  }

  /* --------------------------------------------------- Schnitt A-A ----- */
  function schnittAA(g, sch, leer) {
    var halbL = M.gpL / 2, halbArm = M.armB / 2;

    /* Grundplatte, geschnitten */
    riegel(g, -halbL, halbL, 0, M.gpD, sch.gp);

    /* Die hintere Lagerlasche steht hinter der Schnittebene und ist nur zu
       sehen - Umriss ohne Schraffur. */
    kasten(g, vx(-M.laL / 2), vy(M.laOben), M.laL * s, M.laH * s);

    /* Der Schwenkarm, geschnitten: ein Winkel aus Flachstahl. */
    Z.schnittTeil(g, [
      [vx(-halbArm), vy(M.armUnten)], [vx(M.nasenX), vy(M.armUnten)],
      [vx(M.nasenX), vy(M.nasenOben)], [vx(halbArm), vy(M.nasenOben)],
      [vx(halbArm), vy(M.armOben)], [vx(-halbArm), vy(M.armOben)]], sch.arm);

    /* Der Schwenkbolzen steht quer zur Schnittebene: quer geschnitten, also
       schraffiert. Ein Stift oder eine Schraube der Länge nach geschnitten
       bliebe blank - hier ist es andersherum, und das ist die Regel. */
    svgEl('circle', {cx: vx(0), cy: vy(M.achseY), r: M.bolzenGew / 2 * s,
      fill: sch.bo, stroke: 'currentColor', 'stroke-width': BREIT}, g);
    achse(g, vx(-halbArm - 8), vx(halbArm + 8), vy(M.achseY));
    Z.achseV(g, vx(0), vy(M.achseY - 12), vy(M.achseY + 12));

    /* Die Anschlagplatte, geschnitten, dazu die beiden M6-Schrauben - die
       liegen der Länge nach im Schnitt und bleiben blank. */
    riegel(g, -halbArm - M.apB, -halbArm, M.apUnten, M.apOben, sch.ap);
    M.schraubeApY.forEach(function (y) {
      riegel(g, -halbArm - M.apB + 3, halbArm - 4, y - 3, y + 3, leer);
      riegel(g, -halbArm - M.apB, -halbArm - M.apB + 3, y - 5, y + 5, leer);
    });

    /* Der Gewindestift, der Länge nach geschnitten: blank. */
    var gr = M.gsGew / 2;
    riegel(g, M.gsX - gr, M.gsX + gr, 2, M.gsOben, leer);
    Z.gewindeZapfen(g, vx(M.gsX), vy(M.gpD), vy(2), gr * s, 4.2 * s);
  }

  /* --------------------------------------------------- Draufsicht ------ */
  function draufsicht(g, leer) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2;

    kasten(g, vx(-halbL), dz(halbT), M.gpL * s, M.gpT * s);

    /* Gezeichnet wird von unten nach oben, und jedes Teil deckt mit
       Deckfarbe zu, was unter ihm liegt. Sonst stünden hier Kanten, die
       von oben niemand sieht: der Schwenkbolzen mitten durch den Arm, das
       Bohrbild der Lasche mitten durch die Anschlagplatte. */

    /* Der Gewindestift steht frei auf der Grundplatte. */
    Z.bohrung(g, vx(M.gsX), dz(0), M.gsGew / 2 * s, 0, leer);

    /* Die beiden Laschen mit ihrem Bohrbild */
    [-1, 1].forEach(function (v) {
      kasten(g, vx(-M.laL / 2), dz(v * M.laZ + M.laB / 2), M.laL * s,
        M.laB * s, {fuell: leer});
      M.schraubeX.forEach(function (x) {
        Z.bohrung(g, vx(x), dz(v * M.laZ), 4.5 * s, 7.5 * s, leer);
      });
      M.stiftX.forEach(function (x) {
        Z.bohrung(g, vx(x), dz(v * M.laZ), 3 * s, 0, leer);
      });
    });

    /* Der Schwenkbolzen steckt in beiden Laschen; zwischen ihnen liegt der
       Arm und deckt ihn gleich wieder zu. */
    kasten(g, vx(-M.bolzenGew / 2), dz(M.laZ + M.laB / 2 + 4),
      M.bolzenGew * s, (2 * M.laZ + M.laB + 8) * s, {fuell: leer});

    /* Der Arm liegt zwischen den Laschen; von oben sieht man seinen
       Rücken und die Nase. */
    kasten(g, vx(-M.armB / 2), dz(M.armZ / 2), M.armB * s, M.armZ * s,
      {fuell: leer});
    kasten(g, vx(M.armB / 2), dz(M.armZ / 2),
      (M.nasenX - M.armB / 2) * s, M.armZ * s, {fuell: leer});

    /* Und ganz oben, quer über allem, die Anschlagplatte. */
    kasten(g, vx(-M.armB / 2 - M.apB), dz(M.apT / 2), M.apB * s, M.apT * s,
      {fuell: leer});

    [-1, 1].forEach(function (v) {
      achse(g, vx(-M.armB / 2 - M.apB - 4), vx(M.laL / 2 + 10),
        dz(v * M.laZ));
    });
    achse(g, vx(-halbL - 10), vx(halbL + 10), dz(0));
    Z.achseV(g, vx(0), dz(halbT + 10), dz(-halbT - 4));

    [vx(-halbL) - 130, vx(halbL) + 130].forEach(function (x) {
      Z.schnittmarke(g, {x: x, y: dz(0), richtung: 'oben', name: 'A'});
    });
  }

  /* --------------------------------------------------- Bemassung ------- */
  function bemassung(g) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2;
    var LINKS = vx(-halbL), RECHTS = vx(halbL);

    mass(g, vx(M.gsX), RECHTS, vy(0) + 34,
      (M.gpL / 2 - M.gsX) + '', vy(M.gpD));
    mass(g, vx(M.schraubeX[0]), vx(M.schraubeX[1]), vy(0) + 76,
      (M.schraubeX[1] - M.schraubeX[0]) + '', vy(M.gpD));
    mass(g, LINKS, RECHTS, vy(0) + 112, M.gpL + '', vy(0));

    massV(g, vy(M.gpD), vy(0), LINKS - 28, M.gpD + '', LINKS, true);
    massV(g, vy(M.laOben), vy(M.gpD), LINKS - 58, M.laH + '',
      vx(-M.laL / 2), true);
    massV(g, vy(M.achseY), vy(M.gpD), LINKS - 88, (M.achseY - M.gpD) + '',
      [vx(-M.armB / 2), vx(-M.laL / 2)], true);
    massV(g, vy(M.armOben), vy(0), LINKS - 118, M.armOben + '',
      [vx(-M.armB / 2 - M.apB), LINKS], true);

    massV(g, vy(M.apOben), vy(M.apUnten), RECHTS + 28, M.apH + '',
      [vx(M.armB / 2), vx(M.armB / 2)], false);
    massV(g, vy(M.nasenOben), vy(M.armUnten), RECHTS + 58,
      (M.nasenOben - M.armUnten) + '', vx(M.nasenX), false);
    massV(g, vy(M.gsOben), vy(M.gpD), RECHTS + 88,
      (M.gsOben - M.gpD) + '', vx(M.gsX + M.gsGew / 2), false);

    Z.massHinweis(g, vx(-M.bolzenGew / 2), vy(M.achseY + 4), -78, 44, 'M12');
    Z.massHinweis(g, vx(M.gsX + M.gsGew / 2), vy(M.gsOben - 4), 74, 70,
      'M10');

    /* Tiefen an der Draufsicht */
    massV(g, dz(halbT), dz(-halbT), LINKS - 28, M.gpT + '', vx(-halbL), true);
    massV(g, dz(M.laZ), dz(-M.laZ), LINKS - 58, (2 * M.laZ) + '',
      vx(-M.laL / 2), true);
    massV(g, dz(M.apT / 2), dz(-M.apT / 2), LINKS - 88, M.apT + '',
      vx(-M.armB / 2 - M.apB), true);
    massV(g, dz(M.armZ / 2), dz(-M.armZ / 2), RECHTS + 28, M.armZ + '',
      vx(M.nasenX), false);
    mass(g, vx(M.stiftX[0]), vx(M.stiftX[1]), dz(-halbT) + 40,
      (M.stiftX[1] - M.stiftX[0]) + '', dz(-M.laZ));
    mass(g, vx(-M.laL / 2), vx(M.laL / 2), dz(-halbT) + 70, M.laL + '',
      dz(-M.laZ - M.laB / 2));
  }

  /* ------------------------------------------- Positionsnummern -------- */
  function positionsnummern(g) {
    var oben = 152;
    [[2, -M.laL / 2 + 3, M.laOben - 8, 180],
     [10, -M.armB / 2 - M.apB + 1, M.schraubeApY[1], 244],
     [4, -M.armB / 2 - M.apB + 4, M.apOben - 10, 308],
     [3, 0, M.armOben - 16, 372],
     [5, 0, M.achseY, 436],
     [7, M.gsX, M.gsOben - 6, 500]
    ].forEach(function (e) {
      Z.posNr(g, e[0], vx(e[1]), vy(e[2]), e[3], oben);
    });
    var unten = dz(-M.gpT / 2) + 106;
    [[8, M.schraubeX[0], -M.laZ, 250], [9, M.stiftX[0], -M.laZ, 380],
     [6, 0, -M.laZ - M.laB / 2 - 2, 460], [1, 55, -30, 540]
    ].forEach(function (e) {
      Z.posNr(g, e[0], vx(e[1]), dz(e[2]), e[3], unten);
    });
  }

  /* ======================================================================
     6  WAS DIE PRÜFUNG BRAUCHT
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

  global.ANSCHLAG = {
    name: 'Klappanschlag',
    nummer: 'TBK-2026-043',
    M: M,
    TEILE: TEILE,
    STRUKTUR: STRUKTUR,
    NETZ_LAGE: NETZ_LAGE,
    VORRANG: VORRANG,
    zeichnen: zeichnen,
    darfDurchdringen: darfDurchdringen,
    teil: teilNr
  };
}(typeof window !== 'undefined' ? window : this));
