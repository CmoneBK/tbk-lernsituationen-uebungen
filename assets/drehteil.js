/* Die Welle LF5 als technische Zeichnung.
 *
 * Eingebunden wird er von Hand, unmittelbar hinter `assets/zeichnen.js`
 * und vor dem eigenen Skript der Seite:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/drehteil.js"></script>
 *
 * Nicht ans Dateiende, wie der Build es mit den übrigen Bausteinen tut: Die
 * Seiten rufen `zeichneWelle` beim Laden auf, da muss er schon da sein.
 *
 * Warum ein eigener Baustein
 * --------------------------
 * Dieselbe Welle steht in der Lektion, in vier Übungen und in der
 * Lernsituation. Gezeichnet wird sie deshalb genau einmal. Wer eine Kante
 * ändert, ändert sie überall - und die Zeichnungsprüfung hat nur eine
 * Stelle zu bewachen.
 *
 * Die Maße stammen von der Zeichnung „Welle LF5" (C. Mones, 28.08.2022,
 * A3), am Scan nachgemessen und gegen die Maßketten gerechnet.
 *
 * Gezeichnet wird in Ansicht, nicht im Schnitt: Eine Welle wird im
 * Längsschnitt ohnehin nicht geschnitten dargestellt, und ohne Bohrung gibt
 * es nichts zu zeigen, was innen läge.
 */
"use strict";

/* Die Kontur, von der linken Stirnfläche aus in Millimetern. */
var WELLE = {
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
  /* Freistiche DIN 509 - E 0,6 x 0,3 an den beiden Schultern, dazu der
     Gewindefreistich DIN 76 - A vor dem Gewinde. */
  freistiche: [
    {norm: "DIN 509 – E 0,6 × 0,3", bei: 22.3, r: 0.6, tiefe: 0.3, breite: 2.0},
    {norm: "DIN 509 – E 0,6 × 0,3", bei: 91.6, r: 0.6, tiefe: 0.3, breite: 2.0}
  ],
  /* Der kleinste Innenradius der ganzen Kontur - und damit die Grenze fuer
     den Eckenradius des Schlichtwerkzeugs: r_eps <= r_w - 0,1 mm.
     Nicht die R1 am Bund, wie man auf den ersten Blick meint: Die beiden
     Freistiche sind mit 0,6 mm enger. Wer sie uebersieht, waehlt ein
     Werkzeug, das nicht in die eigene Kontur passt. */
  kleinsterInnenradius: 0.6,
  gewindefreistich: {norm: "DIN 76 – A", von: 91.6, bis: 95.1},
  radius: {bei: 42.3, r: 1},
  zentrierbohrungen: {links: "ISO 6411 – A2×4,25", rechts: "ISO 6411 – A2,5×5,3"},
  rohteil: {d: 32, laenge: 135},
  werkstoff: "42CrMo4"
};

/* Die Flächen, an denen im Unterricht etwas zu entscheiden ist: Welches
   Drehverfahren gehört hierher? Reihenfolge = Reihenfolge auf dem Werkstück
   von links nach rechts. */
var WELLENFLAECHEN = [
  {id: "stirn_links", name: "linke Stirnfläche", bei: 0, art: "stirn",
   verfahren: "querplandrehen"},
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
   verfahren: "abstechdrehen"}
];

/* ---------- Zeichnen ---------- */

/* Rechnet Millimeter in Bildpunkte. Der Ursprung liegt auf der Achse an der
   linken Stirnfläche. */
function wellenMassstab(o){
  var s = o.s || 6;
  return {
    s: s,
    x: function(mm){ return o.x + mm * s; },
    y: function(d, oben){ return o.y + (oben ? -1 : 1) * d / 2 * s; },
    achse: o.y
  };
}

/* Die Kontur einer Hälfte, von der Achse aus gemessen, als Punktfolge von
   links nach rechts. Alles steckt darin: Fasen, Absätze, die beiden Nuten und
   der Gewindefreistich. Die andere Hälfte entsteht durch Spiegeln - eine
   Welle ist rotationssymmetrisch, und was man zweimal zeichnet, weicht früher
   oder später voneinander ab. */
function wellenKontur(){
  var a = WELLE.abschnitte, fase = 0.5, p = [], i;

  function bis(x, r){ p.push({x: x, r: r}); }

  /* Linke Stirnfläche mit Fase. */
  bis(0, a[0].d / 2 - fase);
  bis(fase, a[0].d / 2);

  /* Für jeden Abschnitt: erst, was auf seinem Mantel liegt, dann der
     Übergang zum nächsten. */
  for(i = 0; i < a.length; i++){
    var r = a[i].d / 2;

    WELLE.nuten.forEach(function(n){
      if(n.bei < a[i].von || n.bei >= a[i].bis) return;
      bis(n.bei, r);
      bis(n.bei, r - n.tiefe);
      bis(n.bei + n.breite, r - n.tiefe);
      bis(n.bei + n.breite, r);
    });

    if(i === a.length - 1) break;
    var rn = a[i + 1].d / 2, x = a[i].bis;

    if(x === WELLE.gewindefreistich.von){
      /* Vor dem Gewinde geht der Durchmesser unter den Kerndurchmesser,
         damit das Werkzeug auslaufen kann. */
      var rf = WELLE.gewinde.d3 / 2 - 0.2;
      bis(x, r);
      bis(x, rf);
      bis(WELLE.gewindefreistich.bis, rf);
      bis(WELLE.gewindefreistich.bis, rn);
    }else if(rn > r){
      /* Absatz nach oben - die Kante bleibt scharf, der Freistich sitzt im
         kleineren Durchmesser. */
      bis(x, r);
      bis(x, rn);
    }else{
      /* Absatz nach unten - die Kante des größeren Durchmessers ist gefast. */
      bis(x - fase, r);
      bis(x, r - fase);
      bis(x, rn);
    }
  }

  /* Rechte Stirnfläche mit Fase. */
  var rl = a[a.length - 1].d / 2;
  bis(WELLE.laenge - fase, rl);
  bis(WELLE.laenge, rl - fase);
  return p;
}

/* Wie groß die Zeichenfläche sein muss. So braucht keine Seite zu raten,
   und ein geänderter Maßstab zieht die Bilder mit. */
function wellenGroesse(o){
  o = o || {};
  var s = o.s || 6;
  var oben = o.masse ? 100 : 46, unten = o.masse ? 106 : 46;
  if(o.bezeichnungen) oben = Math.max(oben, 56);
  if(o.rauheiten)     oben = Math.max(oben, 52);
  var halb = (o.rohteil ? WELLE.rohteil.d : 30) / 2 * s;
  return {
    breite: (o.rohteil ? WELLE.rohteil.laenge : WELLE.laenge) * s + 2 * (o.rand || 82),
    hoehe: 2 * halb + oben + unten,
    x: o.rand || 82,
    y: halb + oben
  };
}

/* Zeichnet die Welle. o = {x, y, s, masse, rauheiten, bezeichnungen,
   markiert, rohteil}. Gibt die Gruppe zurück. */
function zeichneWelle(svg, o){
  o = o || {};
  var m = wellenMassstab({x: o.x || 82, y: o.y || 140, s: o.s || 6});
  var g = svgEl("g", {}, svg);
  var i;

  /* Rohteil zuerst, damit die Kontur darüber liegt. Schmale
     Strichpunktlinie - es ist kein Körper dieses Teils, sondern der
     Ausgangszustand. */
  if(o.rohteil){
    var rl = WELLE.rohteil.laenge;
    [true, false].forEach(function(oben){
      linie(g, m.x(0), m.y(WELLE.rohteil.d, oben), m.x(rl),
            m.y(WELLE.rohteil.d, oben), SCHMAL, {strich:"12 2 2 2"});
    });
    linie(g, m.x(rl), m.y(WELLE.rohteil.d, true), m.x(rl),
          m.y(WELLE.rohteil.d, false), SCHMAL, {strich:"12 2 2 2"});
  }

  /* Die Kontur, beide Hälften aus derselben Punktfolge. */
  var k = wellenKontur();
  [true, false].forEach(function(oben){
    for(i = 0; i < k.length - 1; i++){
      linie(g, m.x(k[i].x), m.y(k[i].r * 2, oben),
               m.x(k[i + 1].x), m.y(k[i + 1].r * 2, oben), BREIT);
    }
  });
  /* Die beiden Stirnflächen. */
  var erst = k[0], letzt = k[k.length - 1];
  linie(g, m.x(erst.x), m.y(erst.r * 2, true),
           m.x(erst.x), m.y(erst.r * 2, false), BREIT);
  linie(g, m.x(letzt.x), m.y(letzt.r * 2, true),
           m.x(letzt.x), m.y(letzt.r * 2, false), BREIT);

  /* Das Gewinde: Außendurchmesser breit (er ist Teil der Kontur und schon
     gezeichnet), Kerndurchmesser schmal, Gewindeende breit quer zur Achse. */
  var gw = WELLE.gewinde;
  [true, false].forEach(function(oben){
    linie(g, m.x(gw.von), m.y(gw.d3, oben), m.x(gw.bis - 0.5),
          m.y(gw.d3, oben), SCHMAL);
  });
  linie(g, m.x(gw.von), m.y(gw.d3, true), m.x(gw.von), m.y(gw.d3, false), BREIT);

  /* Mittellinie, zwei bis drei Millimeter über das Teil hinaus. */
  achse(g, m.x(-4), m.x(WELLE.laenge + 4), m.achse);

  if(o.bezeichnungen) wellenBezeichnungen(g, m);
  if(o.rauheiten)     wellenRauheiten(g, m);
  if(o.masse)         wellenMasse(g, m);
  if(o.markiert)      wellenMarkieren(g, m, o.markiert, o.markenfarbe);
  return g;
}

/* Durchmessermaß: senkrechte Maßlinie zwischen den beiden Mantellinien,
   Maßzahl von rechts lesbar. `ab` schiebt sie aus der Mitte - sonst kreuzt
   die Mittellinie die Zahl, und das verbietet DIN ISO 129-1. */
function massDurchmesser(g, m, o){
  var k = svgEl("g", {}, g);
  var y1 = m.y(o.d, true), y2 = m.y(o.d, false);
  if(o.vonMm !== undefined){
    var vx = m.x(o.vonMm);
    [y1, y2].forEach(function(yy){
      linie(k, vx, yy, o.x + (o.x > vx ? 7 : -7), yy, SCHMAL);
    });
  }
  linie(k, o.x, y1, o.x, y2, SCHMAL);
  pfeil(k, o.x, y1, 0, -1);
  pfeil(k, o.x, y2, 0, 1);
  var ym = (y1 + y2) / 2 + (o.ab || 0);
  txt(k, o.x - 4, ym, o.text).setAttribute("transform",
    "rotate(-90 " + (o.x - 4) + " " + ym + ")");
  return k;
}

/* Die Maßeintragung: Längen von links unter dem Teil, Längen von rechts
   darüber, Durchmesser senkrecht - so steht es auf der Originalzeichnung. */
function wellenMasse(g, m){
  var u = m.y(30, false), o = m.y(30, true);

  mass(g, m.x(0), m.x(9),     u + 26, "9",     [m.y(20, false), m.y(20, false)]);
  mass(g, m.x(0), m.x(22.3),  u + 46, "22,3",  [m.y(20, false), m.y(20, false)]);
  mass(g, m.x(0), m.x(42.3),  u + 66, "42,3",  [m.y(20, false), m.y(24, false)]);
  mass(g, m.x(0), m.x(128.6), u + 86, "128,6", [m.y(20, false), m.y(20, false)]);

  mass(g, m.x(95.1), m.x(128.6), o - 30, "33,5", [m.y(20, true), m.y(20, true)]);
  mass(g, m.x(91.6), m.x(128.6), o - 50, "37",   [m.y(25, true), m.y(20, true)]);
  mass(g, m.x(83.6), m.x(128.6), o - 70, "45",   [m.y(25, true), m.y(20, true)]);

  massDurchmesser(g, m, {d: 20, x: m.x(0) - 26, text: "Ø20", vonMm: 0});
  massDurchmesser(g, m, {d: 24, x: m.x(0) - 52, text: "Ø24", vonMm: 22.3});
  massDurchmesser(g, m, {d: 30, x: m.x(47.3),   text: "Ø30", ab: -34});
  massDurchmesser(g, m, {d: 25, x: m.x(128.6) + 34, text: "Ø25",
                         vonMm: 91.6, ab: -30});
}

/* Benennungen mit Hinweislinie - Erklärebene, deshalb gestrichelt und in
   einer eigenen Gruppe. Sie gehören nicht zur Zeichnung.
   Nicht zusammen mit `masse` verwenden: Die Hinweislinien laufen dann in die
   Maßhilfslinien der oberen Maßkette. Entweder die Zeichnung mit Maßen oder
   das Bild mit Benennungen - zwei Bilder sind besser als ein überfülltes.
   Die Höhen sind gestaffelt: Vier Benennungen auf 130 mm Länge stoßen sonst
   aneinander. */
function wellenBezeichnungen(g, m){
  var e = svgEl("g", {"class":"erklaer"}, g);
  [{x: 9.65,  d: 20, text: "Nut A",                     ab: -30, hoch: 46},
   {x: 84.25, d: 25, text: "Nut B",                     ab: -46, hoch: 26},
   {x: 93.3,  d: 19, text: WELLE.gewindefreistich.norm, ab: -12, hoch: 46},
   {x: 112,   d: 20, text: WELLE.gewinde.bezeichnung,   ab: 20,  hoch: 26}
  ].forEach(function(k){
    var y0 = m.y(k.d, true), y1 = y0 - k.hoch;
    linie(e, m.x(k.x), y0, m.x(k.x) + k.ab, y1, SCHMAL, {strich:"4 3"});
    txt(e, m.x(k.x) + k.ab, y1 - 5, k.text,
        {anker: k.ab < 0 ? "end" : "start", groesse: 11});
  });
}

/* Die geforderten Rautiefen. Sie entscheiden später über den
   Schlichtvorschub, deshalb stehen sie im Bild und nicht nur im Text. */
function wellenRauheiten(g, m){
  var e = svgEl("g", {"class":"erklaer"}, g);
  [{x: 16, d: 20, t: "Rz 4"}, {x: 70, d: 25, t: "Rz 4"},
   {x: 32, d: 24, t: "Rz 6"}].forEach(function(r){
    var y0 = m.y(r.d, true), y1 = y0 - 16;
    linie(e, m.x(r.x), y0, m.x(r.x), y1, SCHMAL);
    txt(e, m.x(r.x), y1 - 4, r.t, {groesse: 11});
  });
}

/* Eine oder mehrere Flächen hervorheben - für die Frage, welches Verfahren
   dorthin gehört. Auch das ist Erklärebene: farbig und dicker, damit es
   niemand für eine Körperkante hält. */
function wellenMarkieren(g, m, ids, farbe){
  var e = svgEl("g", {"class":"erklaer",
    style:"color:" + (farbe || "var(--akzent, #b45309)")}, g);
  WELLENFLAECHEN.forEach(function(f){
    if(ids.indexOf(f.id) < 0) return;
    if(f.art === "mantel" || f.art === "gewinde"){
      [true, false].forEach(function(oben){
        linie(e, m.x(f.von), m.y(f.d, oben), m.x(f.bis), m.y(f.d, oben),
              BREIT * 2, {deckung: 0.45});
      });
    }else if(f.art === "stirn"){
      var d = f.bei === 0 ? 20 : 20;
      linie(e, m.x(f.bei), m.y(d, true), m.x(f.bei), m.y(d, false),
            BREIT * 2, {deckung: 0.45});
    }else{
      linie(e, m.x(f.bei), m.y(26, true), m.x(f.bei), m.y(26, false),
            BREIT * 2, {deckung: 0.45});
    }
  });
}

/* Eine Nut im Maßstab 4:1, wie die Einzelheiten A und B auf der Zeichnung.
   Gezeichnet wird der Ausschnitt mit Bruchkanten links und rechts. */
function zeichneNutEinzelheit(svg, o){
  var n = WELLE.nuten[o.marke === "B" ? 1 : 0];
  var s = o.s || 26, x0 = o.x || 60, y0 = o.y || 30;
  var g = svgEl("g", {}, svg);
  var b = n.breite * s, t = n.tiefe * s, rand = 1.6 * s;

  /* Oberkante links und rechts, dazwischen die Nut. */
  linie(g, x0 - rand, y0, x0, y0, BREIT);
  linie(g, x0, y0, x0, y0 + t, BREIT);
  linie(g, x0, y0 + t, x0 + b, y0 + t, BREIT);
  linie(g, x0 + b, y0 + t, x0 + b, y0, BREIT);
  linie(g, x0 + b, y0, x0 + b + rand, y0, BREIT);

  /* Bruchkanten: schmale Freihandlinie - der Werkstoff geht weiter. */
  [x0 - rand, x0 + b + rand].forEach(function(bx){
    svgEl("path", {d: bruchlinie(bx, y0, t + 12), fill:"none",
      stroke:"currentColor", "stroke-width":SCHMAL}, g);
  });

  mass(g, x0, x0 + b, y0 + t + 34, o.text || "1,3", [y0 + t, y0 + t]);
  return g;
}

/* Eine Bruchkante als leichte Wellenlinie. */
function bruchlinie(x, y, h){
  var d = "M" + x.toFixed(1) + "," + y.toFixed(1), n = 5;
  for(var i = 1; i <= n; i++){
    var yy = y + h * i / n;
    var xx = x + (i % 2 ? 4 : -4);
    d += " Q" + xx.toFixed(1) + "," + (yy - h / (2 * n)).toFixed(1)
       + " " + x.toFixed(1) + "," + yy.toFixed(1);
  }
  return d;
}
