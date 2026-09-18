/* Die Exzenter-Handbiegepresse - ein Gerät, drei Verwendungen.
 *
 * Eingebunden mit einer Zeile vor dem eigenen Skript der Seite:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/biegepresse.js"></script>
 *
 * Dieselbe Datei liegt in zwei Repos (Material und Werkzeuge) - wird sie
 * geändert, gehört sie in beide kopiert, wie assets/thema.js auch.
 *
 * Warum das hier steht und nicht in der Lernsituation: Die Presse kommt in
 * der Lektion, in sieben Übungen, in drei Trainings und in der
 * Lernsituation vor. Stünden ihre Maße an fünf Stellen, hätte sie nach der
 * dritten Änderung fünf verschiedene Gestalten. Hier steht sie einmal:
 *
 *   PRESSE.M          die Maße in Millimetern
 *   PRESSE.TEILE      die Stückliste, Pos. 1 zuerst
 *   PRESSE.STRUKTUR   welche Teile sich berühren, fest oder beweglich
 *   PRESSE.VORRANG    was vor was montiert werden muss - und warum
 *   PRESSE.zeichnen() die Zusammenstellungszeichnung
 *   PRESSE.teile3d()  dieselbe Presse als Körperliste für assets/bauteil3d.js
 *
 * Koordinaten (mm, rechtshändig):
 *   x  nach rechts, entlang der Wellenachse, 0 = Mitte
 *   y  nach oben,   0 = Unterseite der Grundplatte
 *   z  nach hinten, 0 = Mitte; der Blechstreifen wird aus -z eingeschoben
 *
 * Alle Normteile sind aus dem Tabellenbuch Metall (Europa) belegt:
 * Zylinderschrauben S. 232, Senkungen S. 245, Stifte S. 256-257,
 * Druckfedern S. 264, Stückliste und Positionsnummern S. 68.
 */
(function (global) {
  'use strict';

  /* ======================================================================
     1  DIE MASSE
     ----------------------------------------------------------------------
     Jede Zahl hier hat einen Grund, und die Gründe hängen zusammen. Wer
     eine ändert, muss die Kette nachrechnen:

       Wellenachse 100 · Exzenter e = 6 · Exzenterradius 28
       → Berührpunkt am Stempelhalter zwischen y = 66 (unten) und 78 (oben)
       → Hub = 2 · e = 12
       → Stempelhalter 20 dick  → Unterkante 46 … 58
       → Stempel 19 hoch        → Spitze 27 … 39
       → Gesenk 20 hoch, Nut 10 tief → Nutgrund 25
       → unten bleiben 2 mm: die Dicke des Blechstreifens.

     Und quer dazu: Der Streifen ist 30 breit und liegt zwischen den
     Führungsbolzen bei x = ±35, die Federn (Ø 21,6) stehen zwischen dem
     Gesenk (±20) und den Ständern (±50).
     ====================================================================== */
  var M = {
    /* Grundplatte */
    gpL: 200, gpT: 120, gpD: 15,

    /* Ständer, zwei Stück */
    stB: 20, stT: 90, stH: 110, stX: 50,      /* stX = innen; außen = stX+stB */

    /* Exzenterwelle */
    wellD: 20, wellY: 100, wellVon: -78, wellBis: 78,
    bundD: 28, bundVon: -50, bundBis: -42,    /* axialer Anschlag innen links */
    exzD: 56, exzB: 36, exzE: 6,              /* Exzenterbund, mittig */

    /* Stempelhalter mit Biegestempel */
    shB: 90, shT: 50, shD: 20,
    stempelH: 19, stempelB: 60,               /* Breite in x; Keil 90° in z */

    /* Führungsbolzen und Federn */
    fbD: 12, fbH: 68, fbX: 35,                /* fbH über der Grundplatte */
    federD: 21.6, federDraht: 1.6, federL0: 48, federR: 2.4,

    /* Biegegesenk */
    geB: 40, geT: 70, geH: 20, geNut: 10,     /* Nut 90°, läuft in x */

    /* Handhebel */
    hebelL: 280, hebelB: 25, hebelD: 8, nabeD: 36, nabeB: 8,

    /* Werkstück */
    blechB: 30, blechD: 2,

    /* Verschraubung */
    schraubeStX: 60, schraubeStZ: 30,         /* 4 x M8, Ständer */
    schraubeGeX: 12, schraubeGeZ: 22,         /* 2 x M6, Gesenk (diagonal) */
    senkungStD: 15, senkungStT: 8.6,          /* DIN 974-1, Seite 245 */
    senkungGeD: 11, senkungGeT: 6.4
  };

  /* Was sich daraus ergibt - nicht noch einmal eingetippt, sondern gerechnet.
     So kann keine abgeleitete Zahl von ihrer Grundlage abweichen. */
  M.exzR = M.exzD / 2;
  M.gpOben = M.gpD;                                  /* 15  */
  M.stOben = M.gpD + M.stH;                          /* 125 */
  M.beruehrUnten = M.wellY - M.exzE - M.exzR;        /* 66  */
  M.beruehrOben = M.wellY + M.exzE - M.exzR;         /* 78  */
  M.hub = 2 * M.exzE;                                /* 12  */
  M.shUnten = M.beruehrUnten - M.shD;                /* 46  */
  M.spitze = M.shUnten - M.stempelH;                 /* 27  */
  M.geOben = M.gpD + M.geH;                          /* 35  */
  M.nutGrund = M.geOben - M.geNut;                   /* 25  */
  M.luft = M.spitze - M.nutGrund;                    /* 2 = Blechdicke */
  M.fbOben = M.gpD + M.fbH;                          /* 83  */
  M.federEinbau = M.shUnten - M.gpOben;              /* 31 in der unteren Lage */

  /* ======================================================================
     2  DIE STÜCKLISTE
     ----------------------------------------------------------------------
     Aufbau nach Tabellenbuch Seite 68: Pos.-Nr., Menge, Benennung,
     Werkstoff bzw. Normkurzbezeichnung, Bemerkung. Hier steht sie mit
     Pos. 1 zuerst; in die Zeichnung wird sie von unten nach oben
     eingetragen, das dreht die Anzeige um.

     "art" ist nicht aus der Norm, sondern für das Strukturnetz: Rechteck
     für Fertigungsteile, Oval für Normteile.
     ====================================================================== */
  var TEILE = [
    {pos: 1, menge: 1, benennung: 'Grundplatte', werkstoff: 'S235JR',
     bemerkung: '200 × 120 × 15', art: 'fertigung', kurz: 'Grundplatte'},
    {pos: 2, menge: 2, benennung: 'Ständer', werkstoff: 'S235JR',
     bemerkung: '20 × 90 × 110', art: 'fertigung', kurz: 'Ständer'},
    {pos: 3, menge: 1, benennung: 'Exzenterwelle', werkstoff: 'E295',
     bemerkung: 'e = 6 mm, Hub 12 mm', art: 'fertigung', kurz: 'Exzenterwelle'},
    {pos: 4, menge: 1, benennung: 'Stempelhalter mit Biegestempel',
     werkstoff: 'C45', bemerkung: 'Keil 90°', art: 'fertigung',
     kurz: 'Stempelhalter'},
    {pos: 5, menge: 1, benennung: 'Biegegesenk', werkstoff: 'C45',
     bemerkung: 'V-Nut 90°, 10 tief', art: 'fertigung', kurz: 'Biegegesenk'},
    {pos: 6, menge: 2, benennung: 'Führungsbolzen', werkstoff: 'E295',
     bemerkung: 'Ø 12 h8, Gewindezapfen M10', art: 'fertigung',
     kurz: 'Führungsbolzen'},
    {pos: 7, menge: 1, benennung: 'Handhebel', werkstoff: 'S235JR',
     bemerkung: 'l = 280 mm', art: 'fertigung', kurz: 'Handhebel'},
    {pos: 8, menge: 2, benennung: 'Druckfeder 1,6 × 21,6 × 48,0',
     werkstoff: 'DIN 2099-1', bemerkung: 'R = 2,4 N/mm', art: 'norm',
     kurz: 'Druckfeder'},
    {pos: 9, menge: 4, benennung: 'Zylinderschraube ISO 4762 – M8 × 20 – 8.8',
     werkstoff: '', bemerkung: 'Senkung DIN 974-1', art: 'norm',
     kurz: 'Schraube M8'},
    {pos: 10, menge: 2, benennung: 'Zylinderschraube ISO 4762 – M6 × 25 – 8.8',
     werkstoff: '', bemerkung: 'Senkung DIN 974-1', art: 'norm',
     kurz: 'Schraube M6'},
    {pos: 11, menge: 2, benennung: 'Zylinderstift ISO 2338 – 6 m6 × 20 – St',
     werkstoff: '', bemerkung: 'richtet das Gesenk aus', art: 'norm',
     kurz: 'Zylinderstift'},
    {pos: 12, menge: 1, benennung: 'Kegelstift ISO 2339 – A – 5 × 40 – St',
     werkstoff: '', bemerkung: 'sichert den Hebel', art: 'norm',
     kurz: 'Kegelstift'}
  ];

  /* ======================================================================
     3  DAS STRUKTURNETZ
     ----------------------------------------------------------------------
     Welche Teile berühren einander? Und bewegen sie sich dabei
     gegeneinander? Mehr sagt ein Strukturnetz nicht - und gerade deshalb
     zwingt es zum Hinsehen. Die Frage "berührt der Kegelstift die Welle?"
     ist an der Zeichnung zu beantworten und nicht zu erraten.

     art: "fest" = volle Linie, "beweglich" = unterbrochene Linie.
     ====================================================================== */
  var STRUKTUR = [
    {a: 1, b: 2, art: 'fest', warum: 'Die Ständer stehen auf der Grundplatte.'},
    {a: 1, b: 9, art: 'fest',
     warum: 'Die Schrauben liegen mit dem Kopf in der Senkung der Grundplatte.'},
    {a: 2, b: 9, art: 'fest', warum: 'Sie greifen in das Gewinde der Ständer.'},
    {a: 1, b: 5, art: 'fest', warum: 'Das Gesenk sitzt auf der Grundplatte.'},
    {a: 1, b: 10, art: 'fest',
     warum: 'Die M6-Schrauben greifen in die Grundplatte.'},
    {a: 5, b: 10, art: 'fest', warum: 'Sie halten das Gesenk.'},
    {a: 1, b: 11, art: 'fest', warum: 'Der Stift steckt in der Grundplatte.'},
    {a: 5, b: 11, art: 'fest', warum: 'und im Gesenk - er richtet es aus.'},
    {a: 1, b: 6, art: 'fest',
     warum: 'Die Bolzen sind in die Grundplatte eingeschraubt.'},
    {a: 1, b: 8, art: 'fest', warum: 'Die Federn stehen auf der Grundplatte.'},
    {a: 6, b: 8, art: 'beweglich',
     warum: 'Die Feder gleitet auf dem Bolzen, wenn sie federt.'},
    {a: 4, b: 8, art: 'beweglich',
     warum: 'Die Feder drückt den Stempelhalter nach oben und wird dabei '
       + 'länger und kürzer.'},
    {a: 4, b: 6, art: 'beweglich',
     warum: 'Der Stempelhalter gleitet auf den Bolzen - das ist die Führung.'},
    {a: 3, b: 4, art: 'beweglich',
     warum: 'Der Exzenter wälzt sich auf dem Stempelhalter ab.'},
    {a: 2, b: 3, art: 'beweglich',
     warum: 'Die Welle dreht sich in den Bohrungen der Ständer.'},
    {a: 3, b: 7, art: 'fest',
     warum: 'Der Hebel sitzt auf dem Wellenzapfen und dreht sie mit.'},
    {a: 3, b: 12, art: 'fest', warum: 'Der Kegelstift steckt in der Welle.'},
    {a: 7, b: 12, art: 'fest', warum: 'und in der Nabe des Hebels.'}
  ];

  /* Wo die Kaesten im Strukturnetz stehen. Ein Raster von 0 bis 100; die
     Lagen sind von Hand gesetzt, damit moeglichst wenige Linien einander
     kreuzen. Ganz ohne Kreuzung geht es nicht - die Grundplatte beruehrt
     fast alles, und das ist die Aussage. */
  var NETZ_LAGE = {
    1: {x: 56, y: 50}, 2: {x: 12, y: 28}, 3: {x: 44, y: 28},
    4: {x: 40, y: 92}, 5: {x: 82, y: 50}, 6: {x: 22, y: 66},
    7: {x: 62, y: 8}, 8: {x: 14, y: 90}, 9: {x: 14, y: 50},
    10: {x: 94, y: 72}, 11: {x: 72, y: 72}, 12: {x: 30, y: 8}
  };

  /* ======================================================================
     4  DIE VORRANGBEZIEHUNGEN
     ----------------------------------------------------------------------
     Das Herzstück der Einheit. Jede Zeile heißt: "vorher" muss vor
     "nachher" montiert sein - und der Grund steht daneben, denn ohne Grund
     ist es Auswendiglernen.

     Was hier NICHT steht, ist frei. Ob das Gesenk vor oder nach den
     Ständern kommt, ist gleichgültig; es gibt also viele richtige
     Reihenfolgen und nicht die eine.
     ====================================================================== */
  var VORRANG = [
    {vorher: 6, nachher: 8,
     warum: 'Die Feder wird auf den Bolzen gesteckt. Ohne Bolzen liegt sie '
       + 'nur herum.'},
    {vorher: 6, nachher: 4,
     warum: 'Der Stempelhalter wird auf die Bolzen gefädelt - sie sind '
       + 'seine Führung.'},
    {vorher: 8, nachher: 4,
     warum: 'Die Federn liegen unter dem Stempelhalter. Danach kommt man '
       + 'nicht mehr an sie heran.'},
    {vorher: 4, nachher: 2,
     warum: 'Über dem Stempelhalter steht später der Exzenter. Zwischen '
       + 'ihm und der Grundplatte bleiben dann keine 51 mm - der '
       + 'Stempelhalter ginge nicht mehr über die Bolzen.'},
    {vorher: 4, nachher: 3,
     warum: 'Dieselbe Enge: Die Welle liegt über dem Stempelhalter.'},
    {vorher: 3, nachher: 2,
     warum: 'Der Exzenterbund ist Ø 56 und passt durch keine Ø-20-Bohrung. '
       + 'Die Welle wird zwischen die Ständer gelegt, dann werden die '
       + 'Ständer von beiden Seiten aufgeschoben.'},
    {vorher: 2, nachher: 9,
     warum: 'Erst stehen die Ständer, dann werden sie verschraubt.'},
    {vorher: 1, nachher: 9,
     warum: 'Die Schraube kommt von unten durch die Grundplatte.'},
    {vorher: 1, nachher: 6,
     warum: 'Die Bolzen werden in die Grundplatte eingeschraubt.'},
    {vorher: 1, nachher: 11,
     warum: 'Der Stift steckt in der Grundplatte.'},
    {vorher: 11, nachher: 5,
     warum: 'Die Stifte richten das Gesenk aus. Wer erst schraubt und dann '
       + 'stiftet, hat den Sinn verfehlt.'},
    {vorher: 5, nachher: 10,
     warum: 'Erst liegt das Gesenk auf den Stiften, dann wird es '
       + 'festgezogen.'},
    {vorher: 3, nachher: 7,
     warum: 'Der Hebel wird auf den Wellenzapfen geschoben.'},
    {vorher: 2, nachher: 7,
     warum: 'Der Zapfen ragt erst aus dem Ständer heraus, wenn die Welle '
       + 'darin liegt.'},
    {vorher: 7, nachher: 12,
     warum: 'Der Kegelstift geht durch Nabe und Welle. Vorher gibt es '
       + 'nichts zu sichern.'},

    /* Drei Bedingungen, die nicht am Werkstück hängen, sondern am Werkzeug.
       Über dem Gesenk steht später der Stempelhalter; darunter bleiben
       31 mm. Ein Teil hineinzubekommen ist das eine - es dort zu treffen,
       zu treiben und zu schrauben das andere. */
    {vorher: 11, nachher: 4,
     warum: 'Der Stift wird mit dem Hammer eingetrieben. Unter dem '
       + 'Stempelhalter kommt man weder mit dem Hammer noch mit dem Auge '
       + 'an ihn heran.'},
    {vorher: 5, nachher: 4,
     warum: 'Das Gesenk muss senkrecht auf beide Stifte gesetzt werden. '
       + 'Unter dem Stempelhalter hindurch ginge das nur gekippt - und '
       + 'gekippt verkantet es auf den Stiften.'},
    {vorher: 10, nachher: 4,
     warum: 'Die Schraube wird von oben eingesetzt und mit dem '
       + 'Innensechskantschlüssel angezogen. Für den Schlüssel ist unter '
       + 'dem Stempelhalter kein Platz.'}
  ];

  /* ======================================================================
     5  DIE ZUSAMMENSTELLUNGSZEICHNUNG
     ----------------------------------------------------------------------
     Zwei Ansichten in Projektionsmethode 1: oben der Schnitt A-A, darunter
     die Draufsicht. Der Schnittverlauf steht in der Draufsicht.

     Warum ein Vollschnitt als Hauptansicht? Von außen ist an dieser Presse
     nichts zu sehen: zwei Platten, zwei Ständer, eine Welle. Alles, worum
     es geht - die Nut im Gesenk, der Keil darüber, die zwei Millimeter
     dazwischen, die Federn unter dem Stempelhalter - liegt innen. Eine
     Außenansicht wäre ein Rechteck mit lauter gestrichelten Linien.

     Geschnitten wird durch z = 0. Welle, Führungsbolzen, Schrauben, Stifte
     und Federn werden dabei der Länge nach getroffen und deshalb nach
     DIN ISO 128-50 NICHT schraffiert. Das ist keine Nachlässigkeit,
     sondern die Regel - und in Übung 1 die Frage.

     Gezeichnet ist die untere Endlage: Hebel senkrecht, Exzenter unten,
     Stempel im Gesenk. In dieser Lage ist der Luftspalt von 2 mm zu sehen,
     und der ist die Blechdicke.
     ====================================================================== */

  var s = 2.0;                       /* Bildpunkte je Millimeter */
  var MX = 400, VY0 = 470;           /* Schnitt A-A: Nullpunkt */
  var DZ0 = 740;                     /* Draufsicht: z = 0 */
  var HEBEL_BRUCH = 62;              /* so weit wird der Hebel gezeichnet */
  var BB_Y = 30;                     /* Hoehe der Schnittebene B-B */

  function vx(mm) { return MX + mm * s; }
  function vy(mm) { return VY0 - mm * s; }
  /* Draufsicht in Projektionsmethode 1: Sie liegt unter der Vorderansicht,
     und was dem Betrachter der Vorderansicht am naechsten ist - die
     Vorderseite des Werkstuecks, also -z -, steht darin UNTEN. */
  function dz(mm) { return DZ0 - mm * s; }

  /* Ein geschnittenes Teil ist EIN Umriss, nicht drei Rechtecke. Wer
     Rechtecke uebereinanderlegt, bekommt Linien mitten im Werkstoff, wo gar
     keine Kante ist. Deshalb wird jede Schnittflaeche als geschlossener
     Streckenzug uebergeben: p = [[x,y], [x,y], ...] in Millimetern. */
  function schnittTeil(g, p, fuell) {
    var d = p.map(function (e, i) {
      return (i ? 'L' : 'M') + vx(e[0]).toFixed(1) + ',' + vy(e[1]).toFixed(1);
    }).join(' ') + ' Z';
    svgEl('path', {d: d, fill: fuell, stroke: 'none'}, g);
    svgEl('path', {d: d, fill: 'none', stroke: 'currentColor',
      'stroke-width': BREIT, 'stroke-linejoin': 'miter'}, g);
  }

  /* Die Feder als Sinnbild nach DIN ISO 2162-1: ein Linienzug ohne
     Drahtquerschnitt. In einer Zusammenstellung ist das die uebliche
     Darstellung - die Windungen einzeln zu zeichnen braechte nichts, was
     die Zeichnung sagen muesste. */
  function federSinnbild(g, xm, yUnten, yOben, breite) {
    var r = breite / 2, n = 5;
    var h = (yUnten - yOben) / n;
    var p = ['M' + (xm - r) + ',' + yUnten];
    for (var i = 0; i < n; i++) {
      var y1 = yUnten - i * h, y2 = y1 - h;
      p.push('L' + (xm + r) + ',' + (y1 - h / 2));
      p.push('L' + (xm - r) + ',' + y2);
    }
    svgEl('path', {d: p.join(' '), fill: 'none', stroke: 'currentColor',
      'stroke-width': SCHMAL, 'stroke-linejoin': 'round'}, g);
    /* Die aufliegenden Enden sind geschliffen, also flach. */
    linie(g, xm - r, yUnten, xm + r, yUnten, SCHMAL);
    linie(g, xm - r, yOben, xm + r, yOben, SCHMAL);
  }

  /* Positionsnummer nach DIN EN ISO 6433: etwa doppelt so gross wie die
     Masszahlen, ausserhalb der Umrisslinien, mit Hinweislinie und Punkt auf
     der Flaeche des Teils. */
  function posNr(g, nr, zx, zy, kx, ky) {
    var h = svgEl('g', {'class': 'posnr'}, g);
    /* Die Hinweislinie beginnt am Rand der Marke, nicht in ihrer Mitte -
       sonst liefe sie unter der Zahl hindurch. */
    var dx = zx - kx, dy = zy - ky, l = Math.hypot(dx, dy) || 1;
    linie(h, kx + dx / l * 13, ky + dy / l * 13, zx, zy, SCHMAL);
    svgEl('circle', {cx: zx, cy: zy, r: 2.6, fill: 'currentColor'}, h);
    svgEl('circle', {cx: kx, cy: ky, r: 12, fill: 'currentColor'}, h);
    svgEl('text', {x: kx, y: ky + 6.5, 'text-anchor': 'middle',
      'font-size': 17, 'font-weight': 700,
      fill: 'var(--card, #ffffff)'}, h).textContent = String(nr);
    return h;
  }

  function zeichnen(zielId, opt) {
    opt = opt || {};
    var ziel = document.getElementById(zielId);
    if (!ziel) return null;
    ziel.textContent = '';

    var svg = svgEl('svg', {viewBox: '0 0 1260 1060', role: 'img',
      'aria-label': 'Zusammenstellungszeichnung der Exzenter-Handbiegepresse: '
        + 'oben der Vollschnitt A-A mit Grundplatte, zwei Staendern, '
        + 'Exzenterwelle, Stempelhalter mit Biegestempel, Biegegesenk, zwei '
        + 'Fuehrungsbolzen mit Druckfedern und dem Handhebel, darunter der '
        + 'waagerechte Schnitt B-B dicht ueber der Grundplatte und rechts '
        + 'der Schnitt C-C durch die Arbeitsstelle im Massstab 2:1; mit den '
        + 'Hauptmassen und zwoelf Positionsnummern'}, ziel);
    if (opt.unterschrift !== false) {
      var f = document.createElement('figcaption');
      f.innerHTML = opt.unterschrift || 'Die Exzenter-Handbiegepresse, '
        + 'Zusammenstellungszeichnung in Projektionsmethode 1. Eine '
        + 'Zusammenstellung tr&auml;gt nur die <strong>Hauptma&szlig;e</strong> '
        + '&ndash; Anschluss-, Funktions- und Gesamtma&szlig;e; alles '
        + '&Uuml;brige steht auf den Einzelteilzeichnungen. Gezeichnet ist '
        + 'die untere Endlage: Zwischen Stempel und Nutgrund bleiben genau '
        + 'die 2 mm, die der Blechstreifen dick ist.';
      ziel.appendChild(f);
    }
    var g = svgEl('g', {}, svg);

    /* Schraffuren: benachbarte Teile wechseln die Richtung, sonst saehe man
       die Trennfuge nicht. */
    var sch = {
      gp: schraffur(svg, zielId + '_gp', 45),
      st: schraffur(svg, zielId + '_st', -45),
      sh: schraffur(svg, zielId + '_sh', 45),
      ge: schraffur(svg, zielId + '_ge', -45),
      he: schraffur(svg, zielId + '_he', 45)
    };
    var leer = 'var(--card, #ffffff)';

    schnittAA(g, sch, leer);
    schnittBB(g, sch, leer);
    schnittCC(g, sch);
    bemassung(g);
    if (opt.posnummern !== false) positionsnummern(g);
    if (opt.schriftfeld !== false) schriftfeld(g);
    return svg;
  }

  /* --------------------------------------------------- Schnitt A-A ----- */
  function schnittAA(g, sch, leer) {
    var halbL = M.gpL / 2, stA = M.stX + M.stB;
    var wr = M.wellD / 2, br = M.bundD / 2;
    var ey = M.wellY - M.exzE;              /* Mitte des Exzenterbundes */

    /* --- Grundplatte ---------------------------------------------------- */
    schnittTeil(g, [[-halbL, 0], [halbL, 0], [halbL, M.gpD], [-halbL, M.gpD]],
      sch.gp);

    /* --- Staender, zwei Stueck ----------------------------------------- */
    [-1, 1].forEach(function (v) {
      var a = v < 0 ? -stA : M.stX, b = v < 0 ? -M.stX : stA;
      schnittTeil(g, [[a, M.gpD], [b, M.gpD], [b, M.stOben], [a, M.stOben]],
        sch.st);
    });

    /* --- Biegegesenk ---------------------------------------------------- */
    /* Die Schnittebene z = 0 liegt genau im Grund der V-Nut. Vom Gesenk
       bleibt dort nur der Teil unter dem Nutgrund stehen. */
    schnittTeil(g, [[-M.geB / 2, M.gpD], [M.geB / 2, M.gpD],
      [M.geB / 2, M.nutGrund], [-M.geB / 2, M.nutGrund]], sch.ge);
    /* Was hinter der Schnittebene liegt, ist sichtbar: die Oberkante des
       Gesenks und die beiden Stirnkanten der Nut - Koerperkanten, also
       breite Volllinien. */
    linie(g, vx(-M.geB / 2), vy(M.geOben), vx(M.geB / 2), vy(M.geOben), BREIT);
    [-1, 1].forEach(function (v) {
      linie(g, vx(v * M.geB / 2), vy(M.nutGrund), vx(v * M.geB / 2),
        vy(M.geOben), BREIT);
    });

    /* --- Stempelhalter mit Biegestempel: ein Teil, ein Umriss ---------- */
    schnittTeil(g, [
      [-M.shB / 2, M.beruehrUnten], [M.shB / 2, M.beruehrUnten],
      [M.shB / 2, M.shUnten], [M.stempelB / 2, M.shUnten],
      [M.stempelB / 2, M.spitze], [-M.stempelB / 2, M.spitze],
      [-M.stempelB / 2, M.shUnten], [-M.shB / 2, M.shUnten]], sch.sh);

    /* --- Fuehrungsbolzen ------------------------------------------------ */
    /* Der Laenge nach getroffen - nach DIN ISO 128-50 nicht schraffiert.
       Sie liegen vor der Schraffur des Stempelhalters und decken sie ab;
       genau das macht die Bohrung sichtbar. */
    [-1, 1].forEach(function (v) {
      var m = v * M.fbX, r = M.fbD / 2;
      schnittTeil(g, [[m - r, M.gpD], [m + r, M.gpD], [m + r, M.fbOben],
        [m - r, M.fbOben]], leer);
      /* Gewindezapfen M10, vereinfachte Darstellung nach DIN ISO 6410-1:
         Aussendurchmesser breit, Kerndurchmesser schmal. */
      linie(g, vx(m - 5), vy(M.gpD), vx(m + 5), vy(M.gpD), BREIT);
      [-1, 1].forEach(function (w) {
        linie(g, vx(m + w * 5), vy(M.gpD), vx(m + w * 5), vy(3), BREIT);
        linie(g, vx(m + w * 4.2), vy(M.gpD), vx(m + w * 4.2), vy(3), SCHMAL);
      });
      linie(g, vx(m - 5), vy(3), vx(m + 5), vy(3), BREIT);
      federSinnbild(g, vx(m), vy(M.gpD), vy(M.shUnten), M.federD * s);
    });

    /* --- Exzenterwelle: ein Teil, ein Umriss, nicht schraffiert -------- */
    schnittTeil(g, [
      [M.wellVon, M.wellY - wr], [M.bundVon, M.wellY - wr],
      [M.bundVon, M.wellY - br], [M.bundBis, M.wellY - br],
      [M.bundBis, M.wellY - wr], [-M.exzB / 2, M.wellY - wr],
      [-M.exzB / 2, ey - M.exzR], [M.exzB / 2, ey - M.exzR],
      [M.exzB / 2, M.wellY - wr], [M.wellBis, M.wellY - wr],
      [M.wellBis, M.wellY + wr], [M.exzB / 2, M.wellY + wr],
      [M.exzB / 2, ey + M.exzR], [-M.exzB / 2, ey + M.exzR],
      [-M.exzB / 2, M.wellY + wr], [M.bundBis, M.wellY + wr],
      [M.bundBis, M.wellY + br], [M.bundVon, M.wellY + br],
      [M.bundVon, M.wellY + wr], [M.wellVon, M.wellY + wr]], leer);
    achse(g, vx(M.wellVon - 16), vx(M.gpL / 2 + 6), vy(M.wellY));
    achse(g, vx(-M.exzB / 2 - 12), vx(M.exzB / 2 + 12), vy(ey));

    /* --- Handhebel mit Nabe: ein Teil, ein Umriss ---------------------- */
    /* Der Hebel schwenkt in der Ebene quer zur Welle. In der unteren
       Endlage steht er senkrecht - deshalb liegt er hier in der
       Schnittebene und ist in wahrer Laenge zu sehen. */
    var a = stA, b = stA + M.nabeB, nr = M.nabeD / 2, hb = M.hebelD / 2;
    var hm = (a + b) / 2;
    schnittTeil(g, [
      [a, M.wellY - nr], [b, M.wellY - nr], [b, M.wellY + nr],
      [hm + hb, M.wellY + nr], [hm + hb, M.wellY + HEBEL_BRUCH],
      [hm - hb, M.wellY + HEBEL_BRUCH], [hm - hb, M.wellY + nr],
      [a, M.wellY + nr]], sch.he);
    /* Der Wellenzapfen steckt in der Nabe: kein Werkstoff der Nabe, also
       keine Schraffur. */
    schnittTeil(g, [[a, M.wellY - wr], [b, M.wellY - wr], [b, M.wellY + wr],
      [a, M.wellY + wr]], leer);
    bruchlinie(g, vx(hm - hb), vx(hm + hb), vy(M.wellY + HEBEL_BRUCH));

    /* --- Kegelstift, quer getroffen ------------------------------------ */
    svgEl('circle', {cx: vx(hm), cy: vy(M.wellY), r: 2.5 * s,
      fill: leer, stroke: 'currentColor', 'stroke-width': BREIT}, g);

    /* --- Schnittverlauf B-B -------------------------------------------- */
    /* Die waagerechte Ebene bei y = 30. Die Pfeile zeigen nach unten, denn
       so blickt man auf den Schnitt B-B: von oben. */
    var yB = vy(BB_Y), bx1 = vx(-halbL) - 152, bx2 = vx(halbL) + 152;
    var gB = svgEl('g', {'class': 'schnittmarke'}, g);
    [bx1, bx2].forEach(function (x) {
      linie(gB, x - 18, yB, x + 18, yB, BREIT);
      linie(gB, x, yB, x, yB + 32, SCHMAL);
      pfeil(gB, x, yB + 32, 0, 1);
      txt(gB, x, yB + 52, 'B', {groesse: 17, fett: true});
    });

    /* --- Das Werkstueck ------------------------------------------------- */
    /* Der Blechstreifen gehoert nicht zur Stueckliste - er wird gebogen.
       Deshalb steht er auf der Erklaerebene und nicht im Umriss. */
    var bg = svgEl('g', {'class': 'erklaer', opacity: 0.5}, g);
    kasten(bg, vx(-M.blechB / 2), vy(M.nutGrund + M.blechD),
      M.blechB * s, M.blechD * s, {fuell: 'currentColor', ohneRand: true});
  }

  /* Bruchlinie (Freihand) nach DIN ISO 128-24: schmale Volllinie, unruhig. */
  function bruchlinie(g, x1, x2, y) {
    var n = 6, d = (x2 - x1) / n, p = ['M' + x1 + ',' + y];
    for (var i = 1; i <= n; i++) {
      p.push('L' + (x1 + i * d) + ',' + (y + (i % 2 ? 4 : -4)));
    }
    svgEl('path', {d: p.join(' '), fill: 'none', stroke: 'currentColor',
      'stroke-width': SCHMAL, 'stroke-linejoin': 'round'}, g);
  }

  /* --------------------------------------------------- Schnitt B-B ----- */
  /* Warum hier kein gewoehnlicher Blick von oben steht: Er waere fast nur
     verdeckte Kante. Von oben sieht man die Welle, den Exzenterbund und
     zwei Staender - alles Uebrige liegt darunter. Ein waagerechter Schnitt
     dicht ueber der Grundplatte zeigt dagegen genau das, was die Tiefe
     ausmacht: den Querschnitt der Staender, das Gesenk mit seiner Nut, die
     beiden Fuehrungsbolzen mit den Federn und das Bohrbild der Platte.

     Die Ebene liegt bei y = 30, also 5 mm ueber dem Nutgrund. Dort ist die
     90-Grad-Nut 10 mm breit - haette man genau im Nutgrund geschnitten,
     waere sie ein Strich und man saehe nichts. */
  function schnittBB(g, sch, leer) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2, stA = M.stX + M.stB;
    var nutHalb = BB_Y - M.nutGrund;        /* 90 Grad: halbe Breite = Hoehe */

    /* Die Grundplatte liegt unter der Schnittebene und ist nicht
       geschnitten - sie erscheint als sichtbarer Umriss. */
    kasten(g, vx(-halbL), dz(halbT), M.gpL * s, M.gpT * s);

    /* Mittellinien der beiden Bohrbilder. Eine Bohrung ohne Mittellinie ist
       keine fertige Zeichnung - und ohne sie haette jede Masshilfslinie ihr
       freies Ende im Mittelpunkt eines Kreises, also im Nichts. */
    [-M.schraubeStX, M.schraubeStX].forEach(function (x) {
      achseV(g, vx(x), dz(M.stT / 2 + 8), dz(-M.stT / 2 - 8));
    });
    [-M.schraubeStZ, M.schraubeStZ].forEach(function (z) {
      achse(g, vx(-M.schraubeStX - 16), vx(M.schraubeStX + 16), dz(z));
    });
    [-M.schraubeGeX, M.schraubeGeX].forEach(function (x) {
      achseV(g, vx(x), dz(M.geT / 2 + 8), dz(-M.geT / 2 - 8));
    });
    [-M.schraubeGeZ, M.schraubeGeZ].forEach(function (z) {
      achse(g, vx(-M.geB / 2 - 10), vx(M.geB / 2 + 10), dz(z));
    });

    /* Staender, geschnitten */
    [-1, 1].forEach(function (v) {
      var x0 = v < 0 ? vx(-stA) : vx(M.stX);
      kasten(g, x0, dz(M.stT / 2), M.stB * s, M.stT * s,
        {fuell: sch.st, strich: BREIT});
      /* Die Senkungen der vier M8-Schrauben liegen auf der Unterseite der
         Grundplatte: verdeckt, also schmale Strichlinie. */
      [-1, 1].forEach(function (w) {
        [M.senkungStD / 2 * s, 4.5].forEach(function (r) {
          svgEl('circle', {cx: vx(v * M.schraubeStX),
            cy: dz(w * M.schraubeStZ), r: r, fill: 'none',
            stroke: 'currentColor', 'stroke-width': SCHMAL,
            'stroke-dasharray': '7 3'}, g);
        });
      });
    });

    /* Gesenk, geschnitten - in der Mitte klafft die Nut */
    [[-M.geT / 2, -nutHalb], [nutHalb, M.geT / 2]].forEach(function (e) {
      kasten(g, vx(-M.geB / 2), dz(e[1]), M.geB * s, (e[1] - e[0]) * s,
        {fuell: sch.ge, strich: BREIT});
    });
    /* Der Nutgrund liegt unter der Ebene und ist sichtbar. */
    achse(g, vx(-M.geB / 2 - 10), vx(M.geB / 2 + 10), dz(0));

    /* Stifte und Schrauben des Gesenks, ueber Kreuz gesetzt: zwei Stifte
       richten aus, zwei Schrauben halten fest. Beide sind hier quer
       getroffen und deshalb nicht schraffiert. */
    bohrung(g, vx(-M.schraubeGeX), dz(-M.schraubeGeZ), 3, false, leer);
    bohrung(g, vx(M.schraubeGeX), dz(M.schraubeGeZ), 3, false, leer);
    bohrung(g, vx(M.schraubeGeX), dz(-M.schraubeGeZ), 3, true, leer);
    bohrung(g, vx(-M.schraubeGeX), dz(M.schraubeGeZ), 3, true, leer);

    /* Fuehrungsbolzen mit der Feder darum - beide quer getroffen, beide
       ohne Schraffur. */
    [-1, 1].forEach(function (v) {
      var cx = vx(v * M.fbX), cy = dz(0);
      svgEl('circle', {cx: cx, cy: cy, r: M.federD / 2 * s, fill: leer,
        stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
      svgEl('circle', {cx: cx, cy: cy,
        r: (M.federD / 2 - M.federDraht) * s, fill: leer,
        stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
      svgEl('circle', {cx: cx, cy: cy, r: M.fbD / 2 * s, fill: leer,
        stroke: 'currentColor', 'stroke-width': BREIT}, g);
      achse(g, cx - M.federD / 2 * s - 8, cx + M.federD / 2 * s + 8, cy);
    });

    /* --- Schnittverlauf C-C -------------------------------------------- */
    /* Senkrechte Ebene bei x = 0. Der Blick geht nach +x, in dieser
       Darstellung also nach rechts. */
    var xC = vx(0), cy1 = dz(halbT) - 22, cy2 = dz(-halbT) + 22;
    var gC = svgEl('g', {'class': 'schnittmarke'}, g);
    [cy1, cy2].forEach(function (y) {
      linie(gC, xC - 18, y, xC + 18, y, BREIT);
      linie(gC, xC, y, xC + 32, y, SCHMAL);
      pfeil(gC, xC + 32, y, 1, 0);
      txt(gC, xC + 50, y + 5, 'C', {groesse: 17, fett: true});
    });

    /* --- Schnittverlauf A-A -------------------------------------------- */
    /* Die Pfeile zeigen in die Blickrichtung der Hauptansicht - nach +z,
       und das ist in dieser Lage nach oben. */
    var yA = dz(0), x1 = vx(-halbL) - 152, x2 = vx(halbL) + 152;
    var gA = svgEl('g', {'class': 'schnittmarke'}, g);
    [x1, x2].forEach(function (x) {
      linie(gA, x, yA - 18, x, yA + 18, BREIT);
      linie(gA, x, yA, x, yA - 32, SCHMAL);
      pfeil(gA, x, yA - 32, 0, -1);
      txt(gA, x, yA - 40, 'A', {groesse: 17, fett: true});
    });
  }

  /* zeichnen.js kennt nur die waagerechte Mittellinie. Senkrecht wird sie
     hier gebraucht, fuer die Bohrbilder. */
  function achseV(g, x, y1, y2) {
    linie(g, x, y1, x, y2, SCHMAL, {strich: '12 2 2 2'});
  }

  /* Bohrung im Schnitt: mit Senkung = Schraube, ohne = Stift. */
  function bohrung(g, cx, cy, r, mitSenkung, leer) {
    if (mitSenkung) {
      svgEl('circle', {cx: cx, cy: cy, r: M.senkungGeD / 2 * s, fill: leer,
        stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    }
    svgEl('circle', {cx: cx, cy: cy, r: r * s, fill: leer,
      stroke: 'currentColor', 'stroke-width': BREIT}, g);
  }

  /* --------------------------------------------------- Schnitt C-C ----- */
  /* Die Arbeitsstelle, doppelt so gross gezeichnet.

     Hier steckt der Grund, warum es diesen dritten Schnitt ueberhaupt gibt:
     Die V-Nut laeuft in x-Richtung, also genau in die Blickrichtung von
     A-A. Dort zeigt sie nur ihren Grund als Strich - vom Keil, vom
     eingeschlossenen Winkel und von den zwei Millimetern darueber ist
     nichts zu sehen. Erst der Blick quer dazu zeigt sie.

     Blickrichtung +x. Rechts im Bild liegt damit -z, also die Seite, von
     der der Blechstreifen eingeschoben wird. */
  var CX = 970, CY0 = 826, cs = 4;        /* 2:1 - doppelter Massstab */

  function cz(mm) { return CX - mm * cs; }
  function cy(mm) { return CY0 - mm * cs; }

  function schnittCC(g, sch) {
    var teil = function (punkte, fuell) {
      var d = punkte.map(function (e, i) {
        return (i ? 'L' : 'M') + cz(e[0]).toFixed(1) + ','
          + cy(e[1]).toFixed(1);
      }).join(' ') + ' Z';
      svgEl('path', {d: d, fill: fuell, stroke: 'none'}, g);
      svgEl('path', {d: d, fill: 'none', stroke: 'currentColor',
        'stroke-width': BREIT, 'stroke-linejoin': 'miter'}, g);
    };

    var gh = M.geT / 2, no = M.geOben - M.nutGrund;   /* halbe Nutoeffnung */

    /* Grundplatte, angeschnitten und seitlich abgebrochen */
    teil([[-46, 8], [46, 8], [46, M.gpD], [-46, M.gpD]], sch.gp);

    /* Gesenk mit der V-Nut: 90 Grad eingeschlossen, also steigen die
       Flanken unter 45 Grad an. */
    teil([[-gh, M.gpD], [gh, M.gpD], [gh, M.geOben], [no, M.geOben],
      [0, M.nutGrund], [-no, M.geOben], [-gh, M.geOben]], sch.ge);

    /* Stempelhalter mit dem Keil - ein Teil, ein Umriss */
    var sh = M.shT / 2, kh = M.shUnten - M.spitze;
    teil([[-sh, M.shUnten], [-kh, M.shUnten], [0, M.spitze], [kh, M.shUnten],
      [sh, M.shUnten], [sh, M.beruehrUnten], [-sh, M.beruehrUnten]], sch.sh);

    /* Der Blechstreifen liegt dazwischen - er gehoert nicht zur Stueckliste
       und steht deshalb auf der Erklaerebene. */
    var bg = svgEl('g', {'class': 'erklaer', opacity: 0.5}, g);
    svgEl('path', {d: 'M' + cz(-24) + ',' + cy(M.geOben) + ' L' + cz(-no)
      + ',' + cy(M.geOben) + ' L' + cz(0) + ',' + cy(M.nutGrund + M.blechD)
      + ' L' + cz(no) + ',' + cy(M.geOben) + ' L' + cz(24) + ','
      + cy(M.geOben), fill: 'none', stroke: 'currentColor',
      'stroke-width': M.blechD * cs, 'stroke-linejoin': 'round'}, bg);

    /* Masse dieser Stelle: der eingeschlossene Winkel, die Nuttiefe und der
       Spalt, in dem das Blech liegt.

       Der Winkel wird am Keil gemessen und nicht in der Nut - in der Nut
       steckt der Keil, dort ist kein Platz. Beide sind 90 Grad; stuende die
       Zahl zweimal, waere sie einmal zu viel. */
    var w = svgEl('g', {}, g);
    var r = 20;                                   /* mm entlang der Flanke */
    var f = r / Math.SQRT2;                       /* Fusspunkt der Flanke */
    svgEl('path', {d: 'M' + cz(-f) + ',' + cy(M.spitze + f)
      + ' A ' + (r * cs) + ' ' + (r * cs) + ' 0 0 1 '
      + cz(f) + ',' + cy(M.spitze + f), fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, w);
    linie(w, cz(-f), cy(M.spitze + f), cz(-34), cy(M.spitze + f + 8), SCHMAL);
    linie(w, cz(-34), cy(M.spitze + f + 8), cz(-46), cy(M.spitze + f + 8),
      SCHMAL);
    txt(w, cz(-36), cy(M.spitze + f + 10), '90°', {groesse: 13,
      anker: 'start'});

    massV(w, cy(M.geOben), cy(M.nutGrund), cz(gh) - 30, M.geNut + '',
      cz(gh), true);
    massVeng(w, cy(M.spitze), cy(M.nutGrund), cz(-46) - 26, M.luft + '',
      [cz(0), cz(0)], false);
    txt(g, CX, cy(2), 'Schnitt C-C (2:1)', {groesse: 15, fett: true});
  }

  /* --------------------------------------------------- Bemassung ------- */
  /* Eine Zusammenstellungszeichnung wird nicht wie eine Einzelteilzeichnung
     bemasst. Sie traegt die Hauptmasse: Gesamtabmessungen, Anschlussmasse
     und die Masse, die die Funktion beschreiben - Hub, Exzentrizitaet, der
     Spalt ueber dem Nutgrund, die Hebellaenge. Jedes Fertigungsmass mehr
     stuende doppelt: einmal hier und einmal auf der Einzelteilzeichnung,
     und nach DIN ISO 129-1 gehoert nichts doppelt in eine Zeichnung. */
  function bemassung(g) {
    var halbL = M.gpL / 2, halbT = M.gpT / 2, stA = M.stX + M.stB;
    var LINKS = vx(-halbL), RECHTS = vx(halbL);

    /* Laengen unter dem Schnitt, von innen nach aussen gestaffelt */
    mass(g, vx(-M.exzB / 2), vx(M.exzB / 2), vy(0) + 32, M.exzB + '', vy(0));
    mass(g, vx(-M.stX), vx(M.stX), vy(0) + 62, (2 * M.stX) + '', vy(M.gpD));
    mass(g, LINKS, RECHTS, vy(0) + 92, M.gpL + '', vy(0));

    /* Hoehen links: die Grundmasse */
    massV(g, vy(M.gpD), vy(0), LINKS - 28, M.gpD + '', LINKS, true);
    massV(g, vy(M.stOben), vy(M.gpD), LINKS - 58, M.stH + '', vx(-stA), true);
    massV(g, vy(M.wellY), vy(M.gpD), LINKS - 88, (M.wellY - M.gpD) + '',
      [vx(M.wellVon), vx(-stA)], true);
    massV(g, vy(M.fbOben), vy(M.gpD), LINKS - 118, M.fbH + '',
      vx(-M.fbX - M.fbD / 2), true);

    /* Hoehen rechts: was daran haengt */
    massV(g, vy(M.geOben), vy(M.gpD), RECHTS + 28, M.geH + '',
      vx(M.geB / 2), false);
    massV(g, vy(M.beruehrUnten), vy(M.shUnten), RECHTS + 58, M.shD + '',
      vx(M.shB / 2), false);
    massV(g, vy(M.stOben), vy(0), RECHTS + 88, M.stOben + '',
      [vx(stA), vx(halbL)], false);

    /* Die drei Masse, um die es fachlich geht. Alle drei sind kurz - der
       Hub misst 12 mm, die Exzentrizitaet 6, der Spalt 2 -, deshalb stehen
       ihre Pfeile aussen. */
    massVeng(g, vy(M.beruehrOben), vy(M.beruehrUnten), vx(M.exzB / 2) + 30,
      M.hub + '', vx(M.exzB / 2), false);

    /* Die Exzentrizitaet steht als Hinweis an der Exzenterachse: Zwischen
       ihr und der Wellenachse liegen sechs Millimeter, und die liegen mitten
       im Werkstoff der Welle - dort ist fuer eine Masszahl kein Platz. */
    massHinweis(g, vx(-16), vy(M.wellY - M.exzE + 3), -118, 62,
      'e = ' + M.exzE);

    /* Durchmesser und Winkel an Hinweislinien, jeder in eine andere Ecke. */
    massHinweis(g, vx(-12), vy(M.wellY - M.exzE + M.exzR), -74, 92,
      '⌀' + M.exzD);
    massHinweis(g, vx(M.wellVon + 6), vy(M.wellY - M.wellD / 2), -68, 40,
      '⌀' + M.wellD);
    massHinweis(g, vx(-M.fbX - M.fbD / 2), vy(20), -92, -62, '⌀' + M.fbD);
    massHinweis(g, vx(stA + M.nabeB / 2), vy(M.wellY - M.nabeD / 2), 78, 30,
      '⌀' + M.nabeD);

    /* Der Hebel ist abgebrochen gezeichnet; sein Mass gilt ab Wellenmitte. */
    var hx = vx(stA + M.nabeB / 2);
    massV(g, vy(M.wellY + HEBEL_BRUCH), vy(M.wellY), hx + 52, M.hebelL + '',
      [hx + M.hebelD / 2 * s, vx(M.gpL / 2)], false);
    txt(g, hx + 58, vy(M.wellY + HEBEL_BRUCH) - 18, 'ab Wellenmitte',
      {groesse: 11, anker: 'start'});

    /* Tiefen am Schnitt B-B */
    massV(g, dz(M.stT / 2), dz(-M.stT / 2), LINKS - 28, M.stT + '',
      vx(-stA), true);
    massV(g, dz(M.schraubeStZ), dz(-M.schraubeStZ), LINKS - 58,
      (2 * M.schraubeStZ) + '', vx(-M.schraubeStX), true);
    massV(g, dz(M.schraubeGeZ), dz(-M.schraubeGeZ), LINKS - 88,
      (2 * M.schraubeGeZ) + '', vx(-M.schraubeGeX), true);
    massV(g, dz(M.geT / 2), dz(-M.geT / 2), RECHTS + 28, M.geT + '',
      vx(M.geB / 2), false);
    massV(g, dz(M.geNut), dz(-M.geNut), RECHTS + 58, (2 * M.geNut) + '',
      vx(M.geB / 2), false);
    massV(g, dz(halbT), dz(-halbT), RECHTS + 88, M.gpT + '', vx(halbL), false);

    mass(g, vx(-M.fbX), vx(M.fbX), dz(-halbT) + 56, (2 * M.fbX) + '',
      dz(-halbT));
    mass(g, vx(-M.schraubeStX), vx(M.schraubeStX), dz(-halbT) + 86,
      (2 * M.schraubeStX) + '', dz(-M.schraubeStZ));
    mass(g, vx(-M.schraubeGeX), vx(M.schraubeGeX), dz(-halbT) + 116,
      (2 * M.schraubeGeX) + '', dz(-M.schraubeGeZ));
  }

  /* Ein senkrechtes Mass, das kuerzer ist als seine eigenen Pfeile. mass()
     kann das schon - die Pfeile zeigen dann von aussen herein und die
     Masszahl steht daneben; massV() kann es nicht, und der Spalt von 2 mm
     ueber dem Nutgrund ist genau so ein Fall. */
  function massVeng(g, y1, y2, x, text, vonX, links) {
    var k = svgEl('g', {}, g);
    var vx2 = (vonX.length === 2) ? vonX : [vonX, vonX];
    [[y1, vx2[0]], [y2, vx2[1]]].forEach(function (e) {
      linie(k, e[1], e[0], x + (x > e[1] ? 7 : -7), e[0], SCHMAL);
    });
    linie(k, x, y1 - 12, x, y2 + 12, SCHMAL);
    pfeil(k, x, y1, 0, 1);
    pfeil(k, x, y2, 0, -1);
    txt(k, links ? x - 6 : x + 6, (y1 + y2) / 2 + 4, text,
      {anker: links ? 'end' : 'start'});
    return k;
  }

  /* Durchmesser nach DIN ISO 129-1 an einer Hinweislinie, weil im Kreis
     kein Platz fuer die Masszahl ist. */
  function massHinweis(g, zx, zy, ab, hoch, text) {
    var h = svgEl('g', {'class': 'hinweis'}, g);
    var x1 = zx + ab, y1 = zy - hoch;
    var l = Math.hypot(ab, hoch) || 1;
    linie(h, x1, y1, zx, zy, SCHMAL);
    pfeil(h, zx, zy, -ab / l, hoch / l);
    var r = ab < 0 ? -1 : 1;
    linie(h, x1, y1, x1 + r * (text.length * 7 + 8), y1, SCHMAL);
    svgEl('text', {x: x1 + r * 4, y: y1 - 6, 'font-size': 12.5,
      'text-anchor': r < 0 ? 'end' : 'start', fill: 'currentColor'}, h)
      .textContent = text;
    return h;
  }

  /* ------------------------------------------- Positionsnummern -------- */
  /* Waagerecht und senkrecht angeordnet, ausserhalb der Umrisse, in zwei
     Spalten links und rechts. Keine Hinweislinie kreuzt eine andere. */
  function positionsnummern(g) {
    var stA = M.stX + M.stB;

    /* Eine Reihe ueber der Hauptansicht. Die Marken stehen in derselben
       Reihenfolge wie die Teile, auf die sie zeigen - deshalb kreuzt keine
       Hinweislinie eine andere. */
    var oben = 176;
    [[1, -82, M.gpD / 2, 212],
     [2, -stA + 5, M.stOben - 10, 248],
     [8, -M.fbX - M.federD / 2 + 2, M.gpD + 14, 284],
     [4, -M.shB / 2 + 8, M.shUnten + M.shD / 2, 320],
     [3, -34, M.wellY, 356],
     [5, M.geB / 2 - 5, M.gpD + 5, 430],
     [6, M.fbX, M.fbOben - 14, 466],
     [7, stA + M.nabeB / 2, M.wellY + 52, 570],
     [12, stA + M.nabeB / 2, M.wellY, 628]
    ].forEach(function (e) {
      posNr(g, e[0], vx(e[1]), vy(e[2]), e[3], oben);
    });

    /* Und eine Reihe unter dem Schnitt B-B, fuer die drei Positionen, die
       es nur dort zu sehen gibt. */
    var unten = dz(-M.gpT / 2) + 30;
    [[9, -M.schraubeStX, M.schraubeStZ, 300],
     [11, -M.schraubeGeX, -M.schraubeGeZ, 480],
     [10, M.schraubeGeX, M.schraubeGeZ, 570]
    ].forEach(function (e) {
      posNr(g, e[0], vx(e[1]), dz(e[2]), e[3], unten);
    });
  }

  /* ------------------------------------------------- Schriftfeld ------- */
  function schriftfeld(g) {
    var x = 800, y = 944, w = 360, h = 96;
    kasten(g, x, y, w, h);
    linie(g, x, y + 38, x + w, y + 38, SCHMAL);
    linie(g, x + 210, y, x + 210, y + h, SCHMAL);
    txt(g, x + 12, y + 14, 'Benennung', {groesse: 9.5, anker: 'start'});
    txt(g, x + 12, y + 32, 'Exzenter-Handbiegepresse',
      {groesse: 13.5, anker: 'start', fett: true});
    txt(g, x + 222, y + 14, 'Zeichnungs-Nr.', {groesse: 9.5, anker: 'start'});
    txt(g, x + 222, y + 32, 'TBK-2026-041', {groesse: 13, anker: 'start'});
    txt(g, x + 12, y + 54, 'Maßstab', {groesse: 9.5, anker: 'start'});
    txt(g, x + 12, y + 72, '1 : 1', {groesse: 13, anker: 'start'});
    txt(g, x + 96, y + 54, 'Werkstoff', {groesse: 9.5, anker: 'start'});
    txt(g, x + 96, y + 72, 'siehe Stückliste', {groesse: 11, anker: 'start'});
    txt(g, x + 222, y + 54, 'Blatt', {groesse: 9.5, anker: 'start'});
    txt(g, x + 222, y + 72, '1 von 1', {groesse: 11, anker: 'start'});

    /* Projektionssymbol Methode 1: der Kegel und daneben, auf der Seite,
       von der aus man ihn sieht, seine Ansicht. */
    var px = x + 302, py = y + 68;
    svgEl('path', {d: 'M' + (px - 28) + ',' + (py - 8) + ' L' + (px - 6)
      + ',' + (py - 14) + ' L' + (px - 6) + ',' + (py + 14) + ' L'
      + (px - 28) + ',' + (py + 8) + ' Z', fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    svgEl('ellipse', {cx: px + 14, cy: py, rx: 5, ry: 14, fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    svgEl('ellipse', {cx: px + 14, cy: py, rx: 3, ry: 8, fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    achse(g, px - 34, px + 24, py);
  }

  /* Wo steckt was in was? Ein Bolzen in seiner Bohrung, eine Schraube in
     ihrem Durchgangsloch, die Welle in der Staenderbohrung: Diese Paare
     duerfen einander durchdringen, alle anderen nicht.

     Die Liste muss nicht neu geschrieben werden - sie steht schon im
     Strukturnetz. Was sich beruehrt, darf sich ueberlappen; was sich nicht
     beruehrt, darf es nicht. Zwei Paare fehlen dort, und beide mit Absicht:
     Der Stempel beruehrt weder das Gesenk noch die Koepfe der
     M6-Schrauben. Seine Huelle ueberschneidet beide trotzdem - weil ein
     Keil sich verjuengt und ein Huellquader das nicht tut. Auf Hoehe der
     Schraubenkoepfe misst der Keil acht Millimeter zur Seite; die Koepfe
     liegen bei zweiundzwanzig. */
  var DURCHDRINGUNG = [[4, 5], [4, 10]];

  function darfDurchdringen(a, b) {
    var treffer = STRUKTUR.some(function (k) {
      return (k.a === a && k.b === b) || (k.a === b && k.b === a);
    });
    if (treffer) return true;
    return DURCHDRINGUNG.some(function (e) {
      return (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a);
    });
  }

  /* ======================================================================
     6  DIE PRESSE ALS KÖRPER
     ----------------------------------------------------------------------
     Dieselben Maße, jetzt für assets/bauteil3d.js.

     Zwei Dinge sind hier wichtiger, als sie aussehen:

     1. BOHRUNGEN. Wo ein Teil durch ein anderes gesteckt wird, hat das
        andere ein Loch. Das ist keine Verzierung: Der Stempelhalter wird
        auf die Führungsbolzen gefädelt, und ohne die beiden Löcher sähe
        man einen Block, durch den zwei Bolzen wachsen.

     2. EINSCHUBRICHTUNG. Jedes Teil kommt aus der Richtung, aus der es
        sich einbauen lässt - die Feder von oben über den Bolzen, der
        Ständer von der Seite auf den Zapfen, die Schraube von unten durch
        die Platte. "von" ist der Abstand zur Ruhelage, gemessen vom Platz
        aus, und liegt immer auf dieser Achse.

     Beides zusammen entscheidet, welche Montagereihenfolgen möglich sind -
     und pruefungen/test-montage.js rechnet jedes Paar durch: Kein Teil darf
     auf seinem Weg ein Teil durchqueren, das nach den Vorrangbeziehungen
     schon dort liegen könnte.
     ====================================================================== */
  function teile3d() {
    var t = [];
    var ey = M.wellY - M.exzE;                 /* Mitte des Exzenterbundes */
    var stM = M.stX + M.stB / 2;               /* Mitte eines Ständers in x */
    var nx = M.stX + M.stB + M.nabeB / 2;      /* Mitte der Hebelnabe */
    var gX = M.schraubeGeX, gZ = M.schraubeGeZ;

    function nimm(e) { t.push(e); return e; }

    /* --- 1 Grundplatte, mit zehn Bohrungen ---------------------------- */
    var loecher = [];
    [-1, 1].forEach(function (v) {
      [-1, 1].forEach(function (w) {
        /* Durchgangsloch mittel für M8, dazu die Senkung von unten */
        loecher.push({d: 9, x: v * M.schraubeStX, z: w * M.schraubeStZ});
      });
      loecher.push({d: 8.5, x: v * M.fbX, z: 0});      /* Gewinde M10 */
    });
    /* Über Kreuz: zwei Stifte richten aus, zwei Schrauben halten fest. */
    loecher.push({d: 6, x: gX, z: -gZ}, {d: 6, x: -gX, z: gZ});
    loecher.push({d: 5, x: -gX, z: -gZ}, {d: 5, x: gX, z: gZ});

    nimm({id: 'grundplatte', pos: 1, name: 'Grundplatte', form: 'platte',
      masse: {x: M.gpL, y: M.gpD, z: M.gpT, loecher: loecher},
      lage: {x: 0, y: M.gpD / 2, z: 0}, von: {x: 0, y: -170, z: 0}});

    /* --- 6 Führungsbolzen, von oben eingeschraubt --------------------- */
    [-1, 1].forEach(function (v) {
      nimm({id: 'bolzen' + (v < 0 ? 'L' : 'R'), pos: 6,
        name: 'Führungsbolzen', form: 'rohr', achse: 'y',
        masse: {d: M.fbD, di: 0, l: M.fbH + 12},
        lage: {x: v * M.fbX, y: M.gpD + M.fbH / 2 - 6, z: 0},
        von: {x: 0, y: 190, z: 0}});
    });

    /* --- 8 Druckfedern, von oben über den Bolzen ---------------------- */
    [-1, 1].forEach(function (v) {
      nimm({id: 'feder' + (v < 0 ? 'L' : 'R'), pos: 8, name: 'Druckfeder',
        form: 'rohr', achse: 'y',
        masse: {d: M.federD, di: M.federD - 2 * M.federDraht,
          l: M.federEinbau},
        lage: {x: v * M.fbX, y: M.gpD + M.federEinbau / 2, z: 0},
        von: {x: 0, y: 150, z: 0}});
    });

    /* --- 11 Zylinderstifte, von oben eingetrieben --------------------- */
    [[gX, -gZ, 'V'], [-gX, gZ, 'H']].forEach(function (e) {
      nimm({id: 'stift' + e[2], pos: 11, name: 'Zylinderstift',
        form: 'rohr', achse: 'y', masse: {d: 6, di: 0, l: 20},
        lage: {x: e[0], y: M.gpD, z: e[1]},
        von: {x: 0, y: 175, z: 0}});
    });

    /* --- 5 Biegegesenk ------------------------------------------------ */
    /* Fünf Körper für ein Teil. Der Grund ist die Nut: Sie läuft in
       x-Richtung, die Bohrungen laufen in y-Richtung, und ein einzelner
       ausgezogener Umriss kann nur eines von beidem. Also trägt die Basis
       die Bohrungen, die beiden Leisten je zwei weitere, und dazwischen
       stehen die beiden Flanken, die die 90 Grad machen. */
    var geUnten = M.gpD, geOben = M.geOben, geMitte = M.nutGrund;
    nimm({id: 'gesenkBasis', pos: 5, name: 'Biegegesenk', form: 'platte',
      masse: {x: M.geB, y: geMitte - geUnten, z: M.geT, loecher: [
        {d: 6, x: gX, z: -gZ}, {d: 6, x: -gX, z: gZ},
        {d: 6.6, x: -gX, z: -gZ}, {d: 6.6, x: gX, z: gZ}]},
      lage: {x: 0, y: (geUnten + geMitte) / 2, z: 0},
      von: {x: 0, y: 140, z: 0}});
    [-1, 1].forEach(function (v) {
      var von = v * M.geNut, bis = v * M.geT / 2;
      var mitte = (von + bis) / 2;
      nimm({id: 'gesenkLeiste' + (v < 0 ? 'V' : 'H'), pos: 5,
        name: 'Biegegesenk', form: 'platte',
        masse: {x: M.geB, y: geOben - geMitte, z: Math.abs(bis - von),
          loecher: [{d: 6, x: v > 0 ? -gX : gX, z: v * gZ - mitte},
            {d: 6.6, x: v > 0 ? gX : -gX, z: v * gZ - mitte}]},
        lage: {x: 0, y: (geMitte + geOben) / 2, z: mitte},
        von: {x: 0, y: 140, z: 0}});
      nimm({id: 'gesenkFlanke' + (v < 0 ? 'V' : 'H'), pos: 5,
        name: 'Biegegesenk', form: 'flanke',
        masse: {x: M.geB, y: geOben - geMitte, z: M.geNut + 2,
          nut: M.geNut},
        dreh: {y: v < 0 ? Math.PI / 2 : -Math.PI / 2},
        lage: {x: 0, y: (geMitte + geOben) / 2, z: 0},
        von: {x: 0, y: 140, z: 0}});
    });

    /* --- 10 Zylinderschrauben M6, von oben ---------------------------- */
    [[-gX, -gZ, 'V'], [gX, gZ, 'H']].forEach(function (e) {
      var kopfOben = geOben, kopfUnten = geOben - M.senkungGeT;
      nimm({id: 'schraubeGeKopf' + e[2], pos: 10,
        name: 'Zylinderschraube M6', form: 'rohr', achse: 'y',
        masse: {d: M.senkungGeD - 1, di: 0, l: M.senkungGeT},
        lage: {x: e[0], y: (kopfOben + kopfUnten) / 2, z: e[1]},
        von: {x: 0, y: 150, z: 0}});
      nimm({id: 'schraubeGeSchaft' + e[2], pos: 10,
        name: 'Zylinderschraube M6', form: 'rohr', achse: 'y',
        masse: {d: 6, di: 0, l: 25},
        lage: {x: e[0], y: kopfUnten - 25 / 2, z: e[1]},
        von: {x: 0, y: 150, z: 0}});
    });

    /* --- 4 Stempelhalter mit Biegestempel, von oben über die Bolzen --- */
    nimm({id: 'stempelhalter', pos: 4, name: 'Stempelhalter', form: 'platte',
      masse: {x: M.shB, y: M.shD, z: M.shT,
        loecher: [{d: M.fbD, x: -M.fbX, z: 0}, {d: M.fbD, x: M.fbX, z: 0}]},
      lage: {x: 0, y: M.shUnten + M.shD / 2, z: 0},
      von: {x: 0, y: 165, z: 0}});
    nimm({id: 'stempel', pos: 4, name: 'Biegestempel', form: 'dach',
      masse: {x: M.stempelB, y: M.stempelH, z: 2 * M.stempelH},
      lage: {x: 0, y: M.spitze + M.stempelH / 2, z: 0},
      von: {x: 0, y: 165, z: 0}});

    /* --- 3 Exzenterwelle, von oben zwischen die Ständer --------------- */
    /* Die Welle in drei Stücken: Der rechte Zapfen wird vom Kegelstift
       durchbohrt, und eine Querbohrung entsteht hier aus zwei Segmenten mit
       Platz dazwischen. Die Kappe ganz außen schließt die Stirnfläche - sonst
       klaffte dort der Schlitz. Zu sehen ist von alledem nichts: Dieses Stück
       steckt vollständig in der Hebelnabe. Richtig sein muss es trotzdem,
       sonst steckt der Stift in vollem Werkstoff. */
    var qVon = M.stX + M.stB, qBis = M.wellBis - 1;
    nimm({id: 'welle', pos: 3, name: 'Exzenterwelle', form: 'rohr',
      achse: 'x', masse: {d: M.wellD, di: 0, l: qVon - M.wellVon},
      lage: {x: (M.wellVon + qVon) / 2, y: M.wellY, z: 0},
      von: {x: 0, y: 200, z: 0}});
    [true, false].forEach(function (oben) {
      nimm({id: 'welleQuer' + (oben ? 'O' : 'U'), pos: 3,
        name: 'Exzenterwelle', form: 'ringSegment', achse: 'x',
        masse: {d: M.wellD, di: 0, l: qBis - qVon, schlitz: 5, oben: oben},
        lage: {x: (qVon + qBis) / 2, y: M.wellY, z: 0},
        von: {x: 0, y: 200, z: 0}});
    });
    nimm({id: 'welleKappe', pos: 3, name: 'Exzenterwelle', form: 'rohr',
      achse: 'x', masse: {d: M.wellD, di: 0, l: M.wellBis - qBis},
      lage: {x: (qBis + M.wellBis) / 2, y: M.wellY, z: 0},
      von: {x: 0, y: 200, z: 0}});
    nimm({id: 'exzenter', pos: 3, name: 'Exzenterbund', form: 'rohr',
      achse: 'x', masse: {d: M.exzD, di: 0, l: M.exzB},
      lage: {x: 0, y: ey, z: 0}, von: {x: 0, y: 200, z: 0}});
    nimm({id: 'bund', pos: 3, name: 'Bund', form: 'rohr', achse: 'x',
      masse: {d: M.bundD, di: 0, l: M.bundBis - M.bundVon},
      lage: {x: (M.bundVon + M.bundBis) / 2, y: M.wellY, z: 0},
      von: {x: 0, y: 200, z: 0}});

    /* --- 2 Ständer, seitlich auf den Wellenzapfen geschoben ----------- */
    [-1, 1].forEach(function (v) {
      nimm({id: 'staender' + (v < 0 ? 'L' : 'R'), pos: 2, name: 'Ständer',
        form: 'quader',
        masse: {x: M.stT, y: M.stH, z: M.stB,
          loch: {d: M.wellD, x: 0, y: M.wellY - (M.gpD + M.stH / 2)}},
        dreh: {y: Math.PI / 2},
        lage: {x: v * stM, y: M.gpD + M.stH / 2, z: 0},
        von: {x: v * 230, y: 0, z: 0}});
    });

    /* --- 9 Zylinderschrauben M8, von unten durch die Grundplatte ------ */
    [-1, 1].forEach(function (v) {
      [-1, 1].forEach(function (w) {
        var kennung = (v < 0 ? 'L' : 'R') + (w < 0 ? 'V' : 'H');
        nimm({id: 'schraubeStKopf' + kennung, pos: 9,
          name: 'Zylinderschraube M8', form: 'rohr', achse: 'y',
          masse: {d: M.senkungStD - 2, di: 0, l: 8},
          lage: {x: v * M.schraubeStX, y: M.senkungStT - 4,
            z: w * M.schraubeStZ},
          von: {x: 0, y: -140, z: 0}});
        nimm({id: 'schraubeStSchaft' + kennung, pos: 9,
          name: 'Zylinderschraube M8', form: 'rohr', achse: 'y',
          masse: {d: 8, di: 0, l: 20},
          lage: {x: v * M.schraubeStX, y: M.senkungStT + 10,
            z: w * M.schraubeStZ},
          von: {x: 0, y: -140, z: 0}});
      });
    });

    /* --- 7 Handhebel, seitlich auf den Zapfen ------------------------- */
    /* Die Nabe in drei Scheiben: Nur die mittlere ist geschlitzt, und sie
       ist genau so breit wie der Stift dick ist. Ginge der Schlitz durch die
       ganze Nabe, sähe sie aus, als wäre sie zersägt - so sieht man, was es
       ist: eine Bohrung. Hier ist sie auch zu sehen; man nimmt den Stift
       zurück und schaut hinein. */
    var stiftD = 5;
    var qa = nx - stiftD / 2, qb = nx + stiftD / 2;
    [[M.stX + M.stB, qa], [qb, M.stX + M.stB + M.nabeB]].forEach(function (e) {
      nimm({id: 'nabe' + (e[0] < nx ? 'V' : 'H'), pos: 7, name: 'Hebelnabe',
        form: 'rohr', achse: 'x',
        masse: {d: M.nabeD, di: M.wellD, l: e[1] - e[0]},
        lage: {x: (e[0] + e[1]) / 2, y: M.wellY, z: 0},
        von: {x: 240, y: 0, z: 0}});
    });
    [true, false].forEach(function (oben) {
      nimm({id: 'nabe' + (oben ? 'O' : 'U'), pos: 7, name: 'Hebelnabe',
        form: 'ringSegment', achse: 'x',
        masse: {d: M.nabeD, di: M.wellD, l: stiftD, schlitz: stiftD,
          oben: oben},
        lage: {x: nx, y: M.wellY, z: 0}, von: {x: 240, y: 0, z: 0}});
    });
    nimm({id: 'hebel', pos: 7, name: 'Handhebel', form: 'quader',
      masse: {x: M.hebelD, y: M.hebelL - M.nabeD / 2, z: M.hebelB},
      lage: {x: nx, y: M.wellY + M.nabeD / 2
        + (M.hebelL - M.nabeD / 2) / 2, z: 0},
      von: {x: 240, y: 0, z: 0}});

    /* --- 12 Kegelstift, quer durch Nabe und Welle --------------------- */
    nimm({id: 'kegelstift', pos: 12, name: 'Kegelstift', form: 'rohr',
      achse: 'z', masse: {d: 5, di: 0, l: M.nabeD + 4},
      lage: {x: nx, y: M.wellY, z: 0}, von: {x: 0, y: 0, z: -210}});

    return t;
  }

  /* Die Montagereihenfolge, die das Modell abspielt - eine von vielen
     möglichen, und genau deshalb steht sie hier und nicht in VORRANG. */
  /* Die Montagereihenfolge, die das Modell abspielt, wenn niemand selbst
     plant - eine von vielen moeglichen. Sie entsteht aus den Koerpern und
     einer gueltigen Folge der Positionen, damit sie nicht von Hand
     nachgezogen werden muss. */
  function reihenfolge() {
    var folge = [];
    var offen = TEILE.map(function (x) { return x.pos; });
    var gesetzt = [];
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
      if (!genommen) break;          /* Kreise gibt es keine - siehe Pruefung */
    }
    var koerper = teile3d();
    gesetzt.forEach(function (pos) {
      koerper.forEach(function (k) {
        if (k.pos === pos) folge.push(k.id);
      });
    });
    return folge;
  }

  /* Prüft eine vom Lernenden gebaute Reihenfolge gegen die
     Vorrangbeziehungen. Zurück kommt der erste Verstoß - nicht alle, denn
     wer den ersten behebt, sieht die übrigen ohnehin neu. */
  function reihenfolgePruefen(folge) {
    var platz = {};
    folge.forEach(function (pos, i) { platz[pos] = i; });
    for (var i = 0; i < VORRANG.length; i++) {
      var v = VORRANG[i];
      if (platz[v.vorher] === undefined || platz[v.nachher] === undefined) {
        continue;
      }
      if (platz[v.vorher] > platz[v.nachher]) return v;
    }
    return null;
  }

  /* Darf dieses Teil jetzt eingebaut werden? Nur, wenn alles, was davor
     gehört, schon liegt. */
  function jetztMoeglich(pos, gesetzt) {
    for (var i = 0; i < VORRANG.length; i++) {
      var v = VORRANG[i];
      if (v.nachher === pos && gesetzt.indexOf(v.vorher) < 0) return v;
    }
    return null;
  }

  function teilNr(pos) {
    for (var i = 0; i < TEILE.length; i++) {
      if (TEILE[i].pos === pos) return TEILE[i];
    }
    return null;
  }

  global.PRESSE = {
    M: M,
    TEILE: TEILE,
    STRUKTUR: STRUKTUR,
    NETZ_LAGE: NETZ_LAGE,
    VORRANG: VORRANG,
    REIHENFOLGE: reihenfolge(),
    DURCHDRINGUNG: DURCHDRINGUNG,
    darfDurchdringen: darfDurchdringen,
    zeichnen: zeichnen,
    teile3d: teile3d,
    reihenfolgePruefen: reihenfolgePruefen,
    jetztMoeglich: jetztMoeglich,
    teil: teilNr
  };
}(typeof window !== 'undefined' ? window : this));
