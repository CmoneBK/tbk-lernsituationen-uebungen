/* Wellen als technische Zeichnung.
 *
 * Eingebunden wird der Baustein von Hand, hinter `assets/zeichnen.js` und
 * `assets/wellen.js` und vor dem eigenen Skript der Seite:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/wellen.js"></script>
 *     <script src="../../assets/drehteil.js"></script>
 *
 * Nicht ans Dateiende, wie der Build es mit den übrigen Bausteinen tut: Die
 * Seiten rufen `zeichneWelle` beim Laden auf, da muss er schon da sein.
 *
 * Hier steht nur die Maschine, keine Welle. Welche gezeichnet wird, sagt
 * jede Seite selbst:
 *
 *     var WELLE = WELLEN.spannwelle;
 *     zeichneWelle(svg, WELLE, {masse: true});
 *
 * Die Wellen selbst stehen in `assets/wellen.js`. So zeichnet eine Änderung
 * an der Kontur überall gleich, und die Zeichnungsprüfung hat nur eine
 * Stelle zu bewachen - aber Lektion, Übung und Lernsituation haben
 * trotzdem jede ihr eigenes Werkstück.
 *
 * Gezeichnet wird in Ansicht, nicht im Schnitt: Eine Welle wird im
 * Längsschnitt ohnehin nicht geschnitten dargestellt. Eine Innenbohrung
 * erscheint deshalb als verdeckte Kante - schmale Strichlinie nach
 * DIN ISO 128-50.
 *
 * Was die Maschine zeichnen kann
 * ------------------------------
 *   abschnitte     zylindrisch, und mit `dBis` kegelig
 *   nuten          Sicherungsringnuten, rundum, gespiegelt
 *   rundungen      Innenrundungen an den Absaetzen, mit `radien` benannt
 *   freistiche     Freistiche nach DIN 509, ebenfalls ueber `radien`
 *   laengsnuten    Passfedernuten - sie liegen oben und werden nicht
 *                  gespiegelt, denn sie sind nicht rotationssymmetrisch
 *   bohrungen      Innenbohrungen als verdeckte Kanten
 *   gewinde        Außen- und Kerndurchmesser nach DIN ISO 6410
 */
"use strict";

/* Die Fase, mit der jede Stirnflaeche und jeder Absatz nach unten
   gebrochen wird - in Millimetern. Sie steht hier und nicht in der Kontur,
   damit das Zeichnungsblatt sie nennen kann, ohne sie abzuschreiben. */
var WELLEN_FASE = 0.5;

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

/* Der größte Durchmesser einer Welle - er bestimmt die Bildhöhe. */
function wellenGroesstDurchmesser(w){
  var d = 0;
  w.abschnitte.forEach(function(a){
    if(a.d > d) d = a.d;
    if(a.dBis !== undefined && a.dBis > d) d = a.dBis;
  });
  return d;
}

/* Der Halbmesser eines Abschnitts an der Stelle x. Bei einem kegeligen
   Abschnitt (er trägt ein `dBis`) wird zwischen Anfang und Ende
   geradlinig gerechnet - ein Kegelmantel ist im Längsschnitt eine
   Gerade. */
function abschnittRadius(a, x){
  if(a.dBis === undefined) return a.d / 2;
  var t = (x - a.von) / (a.bis - a.von);
  return (a.d + (a.dBis - a.d) * Math.min(1, Math.max(0, t))) / 2;
}

/* Die Kontur als Punktfolge (x, r) von links nach rechts.

   `oben` sagt, welche Hälfte gemeint ist. Für fast alles ist das egal -
   eine Welle ist rotationssymmetrisch. Nicht egal ist es bei der
   Passfedernut: Sie liegt oben und nur oben. Im Seitenriss ersetzt sie
   dort die oberste Mantellinie, statt unter ihr zu liegen. */
function wellenKontur(w, oben){
  var a = w.abschnitte, fase = WELLEN_FASE, p = [], i;

  /* Zwei gleiche Punkte hintereinander ergaeben eine Linie der Laenge
     null - unsichtbar, aber sie steht im Bild und wird mitgeprueft. */
  function bis(x, r){
    var v = p[p.length - 1];
    if(v && Math.abs(v.x - x) < 1e-9 && Math.abs(v.r - r) < 1e-9) return;
    p.push({x: x, r: r});
  }

  /* Linke Stirnfläche mit Fase. */
  bis(0, a[0].d / 2 - fase);
  bis(fase, a[0].d / 2);

  /* Für jeden Abschnitt: erst, was auf seinem Mantel liegt, dann der
     Übergang zum nächsten. */
  for(i = 0; i < a.length; i++){
    var r = abschnittRadius(a[i], a[i].von);

    /* Was auf diesem Mantel liegt, der Reihe nach von links: rundum
       laufende Nuten immer, die Passfedernut nur in der oberen Hälfte.
       Beide werden zusammen sortiert - sonst springt die Punktfolge
       zurück, sobald eine Welle beides trägt. */
    var drauf = w.nuten.map(function(n){
      return {von: n.bei, bis: n.bei + n.breite, tiefe: n.tiefe};
    });
    if(oben){
      (w.laengsnuten || []).forEach(function(n){
        drauf.push({von: n.von, bis: n.bis, tiefe: n.tiefe});
      });
    }
    drauf.sort(function(x, y){ return x.von - y.von; });
    drauf.forEach(function(n){
      if(n.von < a[i].von || n.von >= a[i].bis) return;
      bis(n.von, r);
      bis(n.von, r - n.tiefe);
      bis(n.bis, r - n.tiefe);
      bis(n.bis, r);
    });

    /* Ein kegeliger Abschnitt endet auf einem anderen Halbmesser als er
       anfängt - die Gerade dorthin gehört in die Punktfolge. */
    if(a[i].dBis !== undefined){
      bis(a[i].von, a[i].d / 2);
      bis(a[i].bis, a[i].dBis / 2);
      r = a[i].dBis / 2;
    }

    if(i === a.length - 1) break;
    var rn = abschnittRadius(a[i + 1], a[i + 1].von), x = a[i].bis;

    if(w.gewindefreistich && x === w.gewindefreistich.von){
      /* Vor dem Gewinde geht der Durchmesser unter den Kerndurchmesser,
         damit das Werkzeug auslaufen kann. Wie weit, steht in DIN 76-1 als
         d_g je Steigung; nur wenn die Welle den Wert nicht mitbringt, wird
         er aus dem Kerndurchmesser geschaetzt. */
      var rf = w.gewindefreistich.dg !== undefined
        ? w.gewindefreistich.dg / 2
        : w.gewinde.d3 / 2 - 0.2;
      bis(x, r);
      bis(x, rf);
      bis(w.gewindefreistich.bis, rf);
      bis(w.gewindefreistich.bis, rn);
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
  var letzt = a[a.length - 1];
  var rl = abschnittRadius(letzt, letzt.bis);
  bis(w.laenge - fase, rl);
  bis(w.laenge, rl - fase);
  return p;
}

/* Wie groß die Zeichenfläche sein muss. So braucht keine Seite zu raten,
   und ein geänderter Maßstab zieht die Bilder mit. */
function wellenGroesse(w, o){
  o = o || {};
  var s = o.s || 6;
  var oben = 46, unten = 46;
  if(o.bezeichnungen) oben = Math.max(oben, 56);
  if(o.rauheiten)     oben = Math.max(oben, 52);
  if(o.radien)        oben = Math.max(oben, 56);
  /* Der Einzelheitkreis steht auf der Mantellinie und ragt halb darueber
     hinaus; der Buchstabe daneben. */
  if(o.einzelheiten)  oben = Math.max(oben, 2.2 * s + 26);
  /* Die Zentrierbohrungen haengen unter dem Teil, am Rand. */
  if(o.zentrierbohrungen && w.zentrierbohrungen){
    unten = Math.max(unten, 46);
  }

  /* Die Maßketten sind so hoch, wie die Welle Maße hat - 20 Bildpunkte je
     Stufe, wie in `wellenMasse`, plus der Überstand der Maßhilfslinien.
     Vier Maße unten ergeben wieder die 106, die hier früher fest standen. */
  if(o.masse){
    unten = 26 + Math.max(0, wellenLaengsmasse(w, o.masseUnten).length - 1)
          * 20 + 20;
    if(!o.masseUnten){
      oben = Math.max(oben, 30
        + Math.max(0, (w.masse.oben || []).length - 1) * 20 + 30);
    }
  }

  /* Die Erklaerebenen haengen an ihrem eigenen Durchmesser, nicht am
     groessten. Eine Benennung am duennen Zapfen braucht deshalb weniger
     Platz ueber dem Teil als dieselbe am Bund - gerechnet statt geraten. */
  oben = Math.max(oben, wellenErklaerHoehe(w, s, o));
  var halb = (o.rohteil ? w.rohteil.d : wellenGroesstDurchmesser(w)) / 2 * s;
  var links = wellenRand(w, o, "links"), rechts = wellenRand(w, o, "rechts");
  return {
    breite: (o.rohteil ? w.rohteil.laenge : w.laenge) * s + links + rechts,
    hoehe: 2 * halb + oben + unten,
    x: links,
    y: halb + oben
  };
}

/* Wie breit der Rand einer Seite sein muss. Ein Durchmessermaß steht um
   `versatz` neben dem Teil; die Maßhilfslinie läuft noch sieben Punkte
   darüber hinaus, und die hochkant stehende Maßzahl braucht daneben Platz.
   Ohne diese Rechnung stand die Antriebswelle aus ihrem eigenen Bild. */
function wellenRand(w, o, seite){
  var r = o.rand || 82;
  /* Die Bezeichnung der Zentrierbohrung steht unter der Stirnflaeche nach
     aussen - sie braucht ihre Textbreite als Rand, sonst steht sie halb
     ausserhalb des Bildes. */
  if(o.zentrierbohrungen && w.zentrierbohrungen){
    var t = w.zentrierbohrungen[seite];
    if(t && t !== "–"){
      var sym = (w.zentrierbohrungen.art === "erforderlich"
              || w.zentrierbohrungen.art === "nicht") ? 18 : 0;
      r = Math.max(r, t.length * 6.2 + sym + 26);
    }
  }
  if(!o.masse || !w.masse) return r;
  (w.masse.durchmesser || []).forEach(function(z){
    if(z.seite !== seite) return;
    r = Math.max(r, z.versatz + 16);
  });
  return r;
}

/* Wie weit die Erklaerebenen ueber den groessten Durchmesser hinausragen. */
function wellenErklaerHoehe(w, s, o){
  var gd = wellenGroesstDurchmesser(w), hoch = 0;
  function messen(liste, grund, dazu){
    (liste || []).forEach(function(k){
      var h = (gd - (k.d === undefined ? gd : k.d)) / 2 * s
            + (k.hoch === undefined ? grund : k.hoch) + (dazu || 20);
      if(h > hoch) hoch = h;
    });
  }
  if(o.bezeichnungen) messen(w.bezeichnungen, 26);
  /* Das Oberflaechenzeichen ist 3,1 Schrifthoehen hoch und traegt seine
     Angabe darueber - siehe `oberflaechenzeichen`. */
  if(o.rauheiten)     messen(w.rauheiten, 0, 3.1 * 11 + 18);
  if(o.radien)        messen(wellenRadienListe(w), RADIUS_HOCH);
  return hoch;
}

/* Zeichnet die Welle. o = {x, y, s, masse, masseUnten, rauheiten,
   bezeichnungen, radien, zentrierbohrungen, markiert, rohteil}.
   Gibt die Gruppe zurück. */
function zeichneWelle(svg, w, o){
  o = o || {};
  var m = wellenMassstab({x: o.x || 82, y: o.y || 140, s: o.s || 6});
  /* `svg` wird durchgereicht, weil die Schraffur ihr Muster in die defs
     des Bildes legen muss - nicht in die Gruppe. */
  var g = svgEl("g", {}, svg);
  var i;

  /* Rohteil zuerst, damit die Kontur darüber liegt. Schmale
     Strichpunktlinie - es ist kein Körper dieses Teils, sondern der
     Ausgangszustand. */
  if(o.rohteil){
    var rl = w.rohteil.laenge;
    [true, false].forEach(function(oben){
      linie(g, m.x(0), m.y(w.rohteil.d, oben), m.x(rl),
            m.y(w.rohteil.d, oben), SCHMAL, {strich:"12 2 2 2"});
    });
    linie(g, m.x(rl), m.y(w.rohteil.d, true), m.x(rl),
          m.y(w.rohteil.d, false), SCHMAL, {strich:"12 2 2 2"});
  }

  /* Die Kontur. Jede Hälfte bekommt ihre eigene Punktfolge: Die
     Passfedernut gehört nur in die obere. */
  var k = wellenKontur(w, true);
  [true, false].forEach(function(oben){
    var kk = oben ? k : wellenKontur(w, false);
    for(i = 0; i < kk.length - 1; i++){
      linie(g, m.x(kk[i].x), m.y(kk[i].r * 2, oben),
               m.x(kk[i + 1].x), m.y(kk[i + 1].r * 2, oben), BREIT);
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
  if(w.gewinde){
    var gw = w.gewinde;
    [true, false].forEach(function(oben){
      linie(g, m.x(gw.von), m.y(gw.d3, oben), m.x(gw.bis - 0.5),
            m.y(gw.d3, oben), SCHMAL);
    });
    linie(g, m.x(gw.von), m.y(gw.d3, true), m.x(gw.von), m.y(gw.d3, false),
          BREIT);
  }

  /* Eine Innenbohrung. In der Ansicht ist sie eine verdeckte Kante:
     schmale Strichlinie, DIN ISO 128-50. Geschnitten wird nicht - eine
     Welle stellt man im Längsschnitt nicht geschnitten dar. */
  (w.bohrungen || []).forEach(function(b){
    [true, false].forEach(function(oben){
      linie(g, m.x(b.von), m.y(b.d, oben), m.x(b.bis), m.y(b.d, oben),
            SCHMAL, {strich:"6 3"});
    });
    /* Der Bohrungsgrund, wenn sie nicht durchgeht. */
    if(b.bis < w.laenge){
      linie(g, m.x(b.bis), m.y(b.d, true), m.x(b.bis), m.y(b.d, false),
            SCHMAL, {strich:"6 3"});
    }
    if(b.von > 0){
      linie(g, m.x(b.von), m.y(b.d, true), m.x(b.von), m.y(b.d, false),
            SCHMAL, {strich:"6 3"});
    }
  });

  /* Die Passfedernut steckt in der oberen Kontur, siehe wellenKontur.
     Was hier noch fehlt, ist zweierlei.

     Erstens die Durchdringung: die Kante, an der die Nutflanke die
     Mantelfläche schneidet. Sie liegt bei der Sehne über der halben
     Nutbreite, also tiefer als die Mantellinie und höher als der Nutgrund.
     Nach Seite 73 ist das eine reale geometrische Durchdringung - und die
     wird mit einer BREITEN Vollinie gezeichnet, nicht mit einer schmalen.

     Zweitens der Ausbruch. Eine Welle wird in Längsrichtung nicht
     geschnitten (Seite 76); die Nut zeigt man deshalb mit einem
     Teilschnitt, dessen Bruchlinie eine durchgezogene Freihandlinie ist
     (Seite 75). Ohne ihn sieht die Nut aus wie eine Stufe. */
  (w.laengsnuten || []).forEach(function(n){
    laengsnutAusbruch(svg, g, m, w, n);
    /* Die Schnittebene des Querschnitts - Seite 75 - und der Blickpfeil
       zur Teilansicht - Seite 73. Sie stehen an verschiedenen Stellen der
       Nut, sonst liegen Buchstabe auf Buchstabe. */
    if(n.schnittMarke){
      schnittebene(g, m, w, n.von + (n.bis - n.von) * 0.68, n.schnittMarke);
    }
    if(n.ansichtMarke){
      blickpfeil(g, m, w, n.von + (n.bis - n.von) * 0.22, n.ansichtMarke);
    }
  });

  /* Mittellinie, zwei bis drei Millimeter über das Teil hinaus. */
  achse(g, m.x(-4), m.x(w.laenge + 4), m.achse);

  if(o.bezeichnungen) wellenBezeichnungen(g, m, w, o.masse);
  if(o.rauheiten)     wellenRauheiten(g, m, w);
  if(o.radien)        wellenRadien(g, m, w);
  if(o.zentrierbohrungen) wellenZentrierbohrungen(g, m, w);
  if(o.einzelheiten)      wellenEinzelheiten(g, m, w);
  if(o.masse)         wellenMasse(g, m, w, o.masseUnten);
  if(o.markiert)      wellenMarkieren(g, m, w, o.markiert, o.markenfarbe);
  return g;
}

/* Eine Schnittebene kennzeichnen - Tabellenbuch Seite 75.

   Die Schnittlinie ist eine BREITE Strich-Punktlinie quer über das Teil.
   An ihren Enden stehen Pfeile aus breiten Volllinien, die die
   Blickrichtung angeben; ihr Schenkelwinkel beträgt 30 Grad. Daneben der
   Großbuchstabe, mit dem der Schnitt selbst überschrieben wird. */
function schnittebene(g, m, w, mm, marke){
  var gd = wellenGroesstDurchmesser(w);
  var x = m.x(mm);
  var yo = m.y(gd, true) - 10, yu = m.y(gd, false) + 10;
  /* Dasselbe Strichbild wie die Mittellinie - der Unterschied ist die
     Breite, nicht das Muster: schmale Strich-Punktlinie fuer die Achse,
     breite fuer die Schnittlinie (Seite 75). */
  linie(g, x, yo - 16, x, yu + 16, BREIT, {strich:"12 2 2 2"});
  [[yo - 16, -1], [yu + 16, 1]].forEach(function(e){
    schnittpfeil(g, x, e[0], 1);
    txt(g, x - 13, e[0] + (e[1] < 0 ? -4 : 12), marke,
        {fett: true, groesse: 13});
  });
  return g;
}

/* Der Pfeil einer Schnittlinie: breite Vollinie, Schenkelwinkel 30 Grad
   (Seite 75). Er ist deutlich größer als ein Maßpfeil - und er ist keiner. */
function schnittpfeil(g, x, y, ri){
  var l = 15, halb = l * Math.tan(15 * Math.PI / 180);
  linie(g, x, y, x + ri * l, y, BREIT);
  svgEl("polygon", {points: [
    (x + ri * l).toFixed(1) + "," + y.toFixed(1),
    (x + ri * (l - 11)).toFixed(1) + "," + (y - halb * 2.6).toFixed(1),
    (x + ri * (l - 11)).toFixed(1) + "," + (y + halb * 2.6).toFixed(1)
  ].join(" "), fill: "currentColor"}, g);
  return g;
}

/* Der Blickpfeil einer Teilansicht - Seite 73: Die Teilansicht wird
   gekennzeichnet und in Pfeilrichtung dargestellt. Hier schaut man von
   oben auf die Nut. */
function blickpfeil(g, m, w, mm, marke){
  var gd = wellenGroesstDurchmesser(w);
  var x = m.x(mm), y = m.y(gd, true) - 30;
  linie(g, x, y - 16, x, y, BREIT);
  svgEl("polygon", {points: [
    x.toFixed(1) + "," + y.toFixed(1),
    (x - 4).toFixed(1) + "," + (y - 11).toFixed(1),
    (x + 4).toFixed(1) + "," + (y - 11).toFixed(1)
  ].join(" "), fill: "currentColor"}, g);
  txt(g, x + 14, y - 21, marke, {anker: "start", fett: true, groesse: 13});
  return g;
}

/* Eine Einzelheit in der Ansicht kennzeichnen - Tabellenbuch Seite 74:
   Der Teilbereich wird mit einer schmalen Vollinie eingekreist und mit
   einem Großbuchstaben versehen. Derselbe Buchstabe steht am
   vergrößerten Bild, dazu der Vergrößerungsmaßstab. */
function einzelheitKreis(g, m, w, mm, d, marke){
  var x = m.x(mm), y = m.y(d, true);
  var r = Math.max(13, 2.2 * m.s);
  svgEl("circle", {cx: x, cy: y, r: r, fill: "none",
    stroke: "currentColor", "stroke-width": SCHMAL}, g);
  /* Der Buchstabe steht ueber dem Kreis, nicht daneben: Daneben liegt die
     Mantellinie, und Text auf Geometrie ist der haeufigste Lesefehler. */
  txt(g, x + r + 8, y - r - 9, marke, {fett: true, groesse: 13});
  return g;
}

/* Die Einzelheiten aller Sicherungsringnuten einer Welle. */
function wellenEinzelheiten(g, m, w){
  var e = svgEl("g", {}, g);
  (w.nuten || []).forEach(function(n){
    einzelheitKreis(e, m, w, n.bei + n.breite / 2, n.d, n.marke);
  });
  return e;
}

/* Der Ausbruch an einer Passfedernut - ein flacher Teilschnitt, der zeigt,
   dass die Nut eine Nut ist und keine Stufe.

   Aufbau: Die Fläche zwischen der Kontur (Mantellinie, Nutflanken,
   Nutgrund) und einer Freihandlinie darunter wird schraffiert. Die
   Freihandlinie ist die Bruchlinie des Teilschnitts (Seite 75), die
   Schraffur die Grundschraffur unter 45 Grad (Seite 77).

   Die Tiefe des Ausbruchs ist Darstellung, kein Maß: Er reicht so weit ins
   Teil, dass die Schraffur lesbar wird. */
function laengsnutAusbruch(svg, g, m, w, n){
  var grund = n.d - 2 * n.tiefe;
  var tief = Math.max(grund - 10, grund * 0.45);   /* Boden des Ausbruchs */
  var rand = Math.min(5, (n.bis - n.von) / 4);     /* seitlich daneben */
  /* Der Teilschnitt geht über die ganze Länge der Passfeder. Damit ist die
     Nut in der Ansicht eindeutig als Nut zu lesen und nicht als Stufe.
     Die Durchdringungslinie steht dafür dort, wo man sie wirklich sieht:
     als Umriss der Nut in der Draufsicht. */
  var bis = n.bis;
  var xl = m.x(n.von - rand), xr = m.x(bis + rand);
  var yM = m.y(n.d, true), yG = m.y(grund, true), yT = m.y(tief, true);

  var punkte = [
    [xl, yM], [m.x(n.von), yM], [m.x(n.von), yG],
    [m.x(n.bis), yG], [m.x(n.bis), yM], [xr, yM], [xr, yT], [xl, yT]
  ];
  svgEl("polygon", {points: punkte.map(function(p){
      return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "),
    fill: schraffur(svg, "ausbruch-" + w.id, 45), stroke: "none"}, g);

  /* Die Bruchlinie: unten quer, an beiden Seiten hoch bis zur Mantellinie.
     Durchgezogene Freihandlinie, Seite 75. */
  svgEl("path", {d: bruchlinieQuer(xl, xr, yT), fill: "none",
    stroke: "currentColor", "stroke-width": SCHMAL}, g);
  [xl, xr].forEach(function(x){
    svgEl("path", {d: bruchlinie(x, yM, yT - yM), fill: "none",
      stroke: "currentColor", "stroke-width": SCHMAL}, g);
  });
  return {bis: bis};
}

/* Eine Bruchkante quer - dieselbe leichte Wellenlinie wie `bruchlinie`,
   nur waagerecht. */
function bruchlinieQuer(x1, x2, y){
  var d = "M" + x1.toFixed(1) + "," + y.toFixed(1);
  var n = Math.max(4, Math.round((x2 - x1) / 26));
  for(var i = 1; i <= n; i++){
    var xx = x1 + (x2 - x1) * i / n;
    var yy = y + (i % 2 ? 4 : -4);
    d += " Q" + (xx - (x2 - x1) / (2 * n)).toFixed(1) + "," + yy.toFixed(1)
       + " " + xx.toFixed(1) + "," + y.toFixed(1);
  }
  return d;
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

/* Welche Längenmaße unter dem Teil stehen. Im Regelfall die von links
   gemessenen; mit `alleUnten` auch die von rechts - dann nach Spannweite
   geordnet, damit das kurze Maß nah am Teil liegt und die Maßlinien sich
   nicht kreuzen. */
function wellenLaengsmasse(w, alleUnten){
  var u = (w.masse.unten || []).slice();
  if(!alleUnten) return u;
  return u.concat(w.masse.oben || []).sort(function(a, b){
    return (a.bis - a.von) - (b.bis - b.von);
  });
}

/* Die Maßeintragung: Längen von links unter dem Teil, Längen von rechts
   darüber, Durchmesser senkrecht - so steht es auf der Originalzeichnung.
   Welche Maße eingetragen werden, sagt die Welle selbst (`masse`); die
   Staffelung der Maßketten rechnet diese Funktion.

   `alleUnten` räumt die obere Maßkette nach unten. Das kostet Bildhöhe,
   macht aber die obere Hälfte frei - nur so passen Maße und Benennungen
   in ein Bild, siehe den Hinweis bei `wellenBezeichnungen`. */
function wellenMasse(g, m, w, alleUnten){
  var gd = wellenGroesstDurchmesser(w);
  var u = m.y(gd, false), o = m.y(gd, true);

  wellenLaengsmasse(w, alleUnten).forEach(function(z, i){
    mass(g, m.x(z.von), m.x(z.bis), u + 26 + i * 20, z.text,
         [m.y(z.an[0], false), m.y(z.an[1], false)]);
  });
  if(!alleUnten) (w.masse.oben || []).forEach(function(z, i){
    mass(g, m.x(z.von), m.x(z.bis), o - 30 - i * 20, z.text,
         [m.y(z.an[0], true), m.y(z.an[1], true)]);
  });
  (w.masse.durchmesser || []).forEach(function(z){
    var x;
    if(z.seite === "rechts")     x = m.x(w.laenge) + z.versatz;
    else if(z.seite === "mitte") x = m.x(z.versatz);
    else                         x = m.x(0) - z.versatz;
    massDurchmesser(g, m, {d: z.d, x: x, text: z.text,
                           vonMm: z.vonMm, ab: z.ab});
  });
}

/* Eine Hinweislinie nach DIN ISO 128-22, so wie das Tabellenbuch sie auf
   Seite 119 unten zeigt: eine schmale Vollinie, am Merkmal eine
   ausgefüllte Pfeilspitze, am oberen Ende ein Knick in eine waagerechte
   Bezugslinie, darüber der Text.

   Gestrichelt war das früher, mit der Begründung, es sei Erklärebene. Das
   war der Fehler: Eine Freistichbezeichnung ist Zeichnungsinhalt.
   Gestrichelt ist die verdeckte Kante - und sonst nichts.

   (x0, y0) ist das Merkmal, `ab` und `hoch` der Knick relativ dazu. Zeigt
   `ab` nach links, läuft auch die Bezugslinie nach links und der Text
   steht rechtsbündig darüber. */
function hinweislinie(g0, x0, y0, ab, hoch, text, o){
  o = o || {};
  var gr = o.groesse || 11;
  /* Eigene Gruppe mit der Kennung "hinweis". Sie ist nicht Kosmetik: Die
     Pfeilspitze einer Hinweislinie sitzt auf der Kontur, und eine Pruefung,
     die Pfeilspitzen zaehlt, haelt die danebenliegende Mantellinie sonst
     fuer ein halb bemasztes Mass. Die Zeichnung sagt hier also, was die
     Spitze bedeutet - ein Hinweis, kein Mass. */
  var g = svgEl("g", {"class":"hinweis"}, g0);
  var x1 = x0 + ab, y1 = y0 - hoch;
  var ri = ab < 0 ? -1 : 1;
  var laenge = Math.hypot(x0 - x1, y0 - y1) || 1;
  linie(g, x1, y1, x0, y0, SCHMAL);
  pfeil(g, x0, y0, (x0 - x1) / laenge, (y0 - y1) / laenge);
  var breite = o.breite !== undefined ? o.breite
             : (text ? text.length * gr * 0.56 + 6 : 0);
  if(o.vorn) breite += o.vorn;
  linie(g, x1, y1, x1 + ri * breite, y1, SCHMAL);
  var tx = x1 + ri * 3 + (o.vorn ? ri * o.vorn : 0);
  if(text) txt(g, tx, y1 - 4, text,
               {anker: ri < 0 ? "end" : "start", groesse: gr});
  return {x: x1, y: y1, ri: ri, textX: tx, g: g};
}

/* Das Kegelsinnbild nach DIN EN ISO 3040 (Tabellenbuch Seite 80): ein
   flaches Dreieck, das in Richtung der Verjüngung zeigt. Davor oder
   dahinter steht das Kegelverhältnis, und beides sitzt auf einer Linie
   parallel zur Kegelachse. */
function kegelzeichen(g, x, y, h, ri){
  var l = h * 2.2;
  svgEl("polygon", {points: [
    x.toFixed(1) + "," + (y - h / 2).toFixed(1),
    x.toFixed(1) + "," + (y + h / 2).toFixed(1),
    (x + ri * l).toFixed(1) + "," + y.toFixed(1)
  ].join(" "), fill: "none", stroke: "currentColor",
    "stroke-width": SCHMAL}, g);
  return g;
}

/* Benennungen mit Hinweislinie.
   Nicht zusammen mit `masse` verwenden: Die Hinweislinien laufen dann in die
   Maßhilfslinien der oberen Maßkette. Entweder die Zeichnung mit Maßen oder
   das Bild mit Benennungen - zwei Bilder sind besser als ein überfülltes.
   Die eine Ausnahme ist `masse` zusammen mit `masseUnten`: Dann steht keine
   Maßkette mehr über dem Teil, und beides passt nebeneinander. Genau so
   entsteht die Gesamtzeichnung in der Übersicht des Übungspakets.
   Die Höhen sind in den Daten gestaffelt: Vier Benennungen auf 130 mm Länge
   stoßen sonst aneinander. */
function wellenBezeichnungen(g, m, w, mitMasse){
  var e = svgEl("g", {}, g);
  (w.bezeichnungen || []).forEach(function(k){
    /* Eine Gewindebezeichnung ist ein Maß, kein Hinweis. Steht sie schon
       als Durchmessermaß im Bild, darf sie nicht ein zweites Mal als
       Benennung daneben stehen - doppelt bemaßt ist nicht bemaßt. */
    if(mitMasse && k.wennOhneMasse) return;
    /* Ein Kegel wird nach DIN EN ISO 3040 mit seinem Sinnbild und dem
       Verhältnis angegeben - Seite 80. Das Sinnbild steht vor der Zahl und
       zeigt in Richtung der Verjüngung. */
    var kegel = k.kegel ? 1 : 0;
    var h = hinweislinie(e, m.x(k.x), m.y(k.d, true), k.ab, k.hoch, k.text,
                         {vorn: kegel ? 20 : 0});
    if(kegel){
      kegelzeichen(e, h.x + h.ri * 4, h.y - 5, 7,
                   k.kegel === "links" ? -1 : 1);
    }
  });
}

/* Grundabstand einer Radienangabe von ihrer Mantellinie. */
var RADIUS_HOCH = 34;

/* Rundungen und Freistiche mit ihrer Angabe - aus den Daten, damit im Bild
   dieselbe Zahl steht wie in der Rechnung.

   Warum das eine eigene Ebene ist: Die engste Innenrundung der Kontur
   begrenzt den Eckenradius des Schlichtwerkzeugs. Wer sie aus der
   Zeichnung ablesen soll, muss sie dort auch finden - eine Zeichnung, die
   nur Rautiefen zeigt, lässt die Frage nicht beantworten.

   Ein Freistich trägt seine Bezeichnung, keine Radienzahl: Bei
   "DIN 509 - E 0,6 × 0,3" ist die erste Zahl der Radius, bei "DIN 76 - A"
   steht er in der Tabelle zur Steigung. Nachschlagen gehört zur Aufgabe.
   Der Gewindefreistich bleibt außen vor - er liegt am Gewinde und wird
   eingestochen, das Längsdrehwerkzeug fährt nicht hinein. Deshalb zählt er
   auch bei `kleinsterInnenradius` nicht mit. */
function wellenRadienListe(w){
  var liste = [];
  function eintrag(k, text){
    liste.push({x: k.bei, d: absatzDurchmesser(w, k.bei), text: text,
                ab: k.ab === undefined ? 18 * absatzSeite(w, k.bei) : k.ab,
                hoch: k.hoch === undefined ? RADIUS_HOCH : k.hoch});
  }
  (w.rundungen || []).forEach(function(r){
    eintrag(r, "R" + zahlKomma(r.r));
  });
  (w.freistiche || []).forEach(function(f){
    eintrag(f, f.norm || ("R" + zahlKomma(f.r)));
  });
  return liste;
}

/* Zu welcher Seite die Hinweislinie eines Absatzes zeigt: zur schlankeren.
   Dort ist über dem Teil Platz, und die Linie kreuzt keine Mantellinie des
   größeren Durchmessers. -1 heißt nach links, +1 nach rechts. */
function absatzSeite(w, mm){
  var links = null, rechts = null;
  w.abschnitte.forEach(function(a){
    if(a.bis === mm) links = abschnittRadius(a, mm);
    if(a.von === mm) rechts = abschnittRadius(a, mm);
  });
  if(links === null) return 1;
  if(rechts === null) return -1;
  return links <= rechts ? -1 : 1;
}

/* Der kleinere der beiden Durchmesser an einem Absatz. Dort liegt die
   Innenecke, in der die Rundung sitzt - und dort setzt die Hinweislinie
   an, nicht am Bund darüber. */
function absatzDurchmesser(w, mm){
  var d = null;
  w.abschnitte.forEach(function(a){
    if(mm < a.von || mm > a.bis) return;
    var dd = abschnittRadius(a, mm) * 2;
    if(d === null || dd < d) d = dd;
  });
  return d === null ? wellenGroesstDurchmesser(w) : d;
}

/* Die Radienangaben zeichnen - Erklärebene wie die Benennungen, deshalb
   gestrichelte Hinweislinie. */
function wellenRadien(g, m, w){
  var e = svgEl("g", {}, g);
  wellenRadienListe(w).forEach(function(k){
    hinweislinie(e, m.x(k.x), m.y(k.d, true), k.ab, k.hoch, k.text);
  });
}

/* Das Sinnbild für die Oberflächenbeschaffenheit nach DIN EN ISO 21920-1
   (Tabellenbuch Seite 112). Es steht auf der Fläche, zu der es gehört:
   kurzer Schenkel links, langer Schenkel rechts, beide unter 60 Grad, und
   vom langen Schenkel aus die waagerechte Fahne, auf der die Angabe steht.

   Die Größen stammen von Seite 111: Bei der Schrifthöhe h ist der kurze
   Schenkel H1 = 1,4 h hoch, der lange H2 = 3,1 h.

   `art` sagt, welches der drei Sinnbilder gemeint ist (Seite 110):
     "abtrag"  Materialabtrag vorgeschrieben - Balken über dem Winkel.
               Das ist der Regelfall hier: Jede Fläche dieser Wellen wird
               gedreht.
     "frei"    alle Fertigungsprozesse zulässig - nur der Winkel.
     "ohne"    Materialabtrag unzulässig - Kreis im Winkel.

   Gezeichnet wird mit der Spitze auf (x, y). Gibt `o.fahne` eine Länge,
   wird sie benutzt; sonst wird sie aus dem Text geschätzt. */
function oberflaechenzeichen(g, x, y, text, o){
  o = o || {};
  var h = o.groesse || 11;
  var H1 = 1.4 * h, H2 = 3.1 * h;
  var w60 = 1 / Math.tan(60 * Math.PI / 180);   /* waagerecht je Höhe */
  var lx = x - H1 * w60, ly = y - H1;           /* kurzer Schenkel oben */
  var rx = x + H2 * w60, ry = y - H2;           /* langer Schenkel oben */
  var k = svgEl("g", {}, g);

  linie(k, lx, ly, x, y, SCHMAL);
  linie(k, x, y, rx, ry, SCHMAL);

  var fahne = o.fahne !== undefined ? o.fahne
            : (text ? text.length * h * 0.56 + 6 : 12);
  linie(k, rx, ry, rx + fahne, ry, SCHMAL);

  if(o.art === "ohne"){
    /* Kreis im Winkel, auf Höhe des kurzen Schenkels. */
    svgEl("circle", {cx: x + (H1 * w60) / 2, cy: ly - H1 * 0.35,
      r: h * 0.42, fill: "none", stroke: "currentColor",
      "stroke-width": SCHMAL}, k);
  }else if(o.art !== "frei"){
    /* Balken quer über den Winkel, vom kurzen Schenkel zum langen. */
    linie(k, lx, ly, x + H1 * w60, ly, SCHMAL);
  }

  if(text) txt(k, rx + 3, ry - 4, text, {anker: "start", groesse: h});
  return k;
}

/* Die geforderten Rautiefen - als Oberflächenangabe, nicht als blanker
   Text. Sie entscheiden später über den Schlichtvorschub, deshalb stehen
   sie im Bild und nicht nur in der Tabelle.

   Ohne `hoch` steht das Sinnbild auf der Fläche (Seite 112, Fall 1). Mit
   `hoch` sitzt es am Ende einer Hinweislinie, die in einer Pfeilspitze auf
   der Fläche endet (Fall 2) - gebraucht wird das dort, wo sonst eine
   Maßhilfslinie darunterliegt. */
function wellenRauheiten(g, m, w){
  var e = svgEl("g", {}, g);
  (w.rauheiten || []).forEach(function(r){
    var y0 = m.y(r.d, true), x0 = m.x(r.x);
    if(r.hoch){
      var y1 = y0 - r.hoch;
      /* Hinweislinie mit Pfeilspitze auf der Flaeche (Seite 112, Fall 2).
         Eigene Gruppe, siehe `hinweislinie`. */
      var hg = svgEl("g", {"class":"hinweis"}, e);
      linie(hg, x0, y0, x0, y1, SCHMAL);
      pfeil(hg, x0, y0, 0, 1);
      oberflaechenzeichen(e, x0, y1, r.text, {art: r.art || "abtrag"});
    }else{
      oberflaechenzeichen(e, x0, y0, r.text, {art: r.art || "abtrag"});
    }
  });
}

/* Die Zentrierbohrungen. Sie stehen in den Daten jeder Welle, wurden aber
   nie gezeichnet - und eine Welle, die zwischen Spitzen gedreht wird,
   braucht sie.

   Zeichnungsangabe nach DIN ISO 6411 (Tabellenbuch Seite 118), drei Fälle:
     "darf"         Zentrierbohrung darf am Fertigteil vorhanden sein -
                    nur die Bezeichnung an einer Hinweislinie, kein Symbol.
     "erforderlich" sie ist erforderlich - Symbol < an der Stirnfläche.
     "nicht"        sie darf nicht vorhanden sein - dasselbe Symbol mit
                    einem Strich davor.

   Die Bezeichnung trennt mit Schrägstrich: ISO 6411 - A2/4,25 heißt Form A,
   d1 = 2 mm, d2 = 4,25 mm. */
function wellenZentrierbohrungen(g, m, w){
  var z = w.zentrierbohrungen;
  if(!z) return null;
  var e = svgEl("g", {}, g);
  var gd = wellenGroesstDurchmesser(w);
  var unten = m.y(gd, false) + 22;

  [["links", 0, -1], ["rechts", w.laenge, 1]].forEach(function(s){
    var text = z[s[0]];
    if(!text || text === "–") return;
    var x0 = m.x(s[1]), ri = s[2];
    /* Hinweislinie von der Stirnfläche auf der Achse nach unten-außen in
       den freien Rand; dort liegt weder ein Durchmessermaß noch die
       Maßkette. */
    /* Hinweislinie wie ueberall: schmale Vollinie, Pfeilspitze auf der
       Stirnflaeche, Knick in die waagerechte Bezugslinie. Die Spitze zeigt
       vom Text zum Merkmal - also nach oben und nach innen. */
    var sym = (z.art === "erforderlich" || z.art === "nicht") ? 20 : 0;
    var h = hinweislinie(e, x0, m.achse, ri * 16, m.achse - unten, text,
                         {vorn: sym});
    if(sym){
      zentriersymbol(e, h.x + h.ri * 8, h.y - 5, -ri, z.art === "nicht");
    }
  });
  return e;
}

/* Das Symbol < der Zentrierbohrung. `ri` = 1 zeigt nach links ins Teil,
   -1 nach rechts. `gesperrt` setzt den Strich davor: darf nicht vorhanden
   sein. */
function zentriersymbol(g, x, y, ri, gesperrt){
  var a = 7;
  linie(g, x, y, x + ri * a, y - a * 0.7, SCHMAL);
  linie(g, x, y, x + ri * a, y + a * 0.7, SCHMAL);
  if(gesperrt) linie(g, x - ri * 2, y - a * 0.8, x - ri * 2, y + a * 0.8, SCHMAL);
  return g;
}

/* Eine oder mehrere Flächen hervorheben - für die Frage, welches Verfahren
   dorthin gehört. Auch das ist Erklärebene: farbig und dicker, damit es
   niemand für eine Körperkante hält. */
function wellenMarkieren(g, m, w, ids, farbe){
  var e = svgEl("g", {"class":"erklaer",
    style:"color:" + (farbe || "var(--akzent, #b45309)")}, g);
  var randd = wellenGroesstDurchmesser(w) * 0.9;

  /* Der Durchmesser, in dem eine Stelle ohne eigenen Mantel markiert wird:
     der des Abschnitts, in dem sie liegt. Sonst zeichnet die Marke einer
     Nut auf einem dünnen Zapfen weit über dem Werkstück. */
  function durchmesserBei(mm){
    var d = null;
    w.abschnitte.forEach(function(a){
      if(mm >= a.von && mm <= a.bis && (d === null || a.d > d)) d = a.d;
    });
    return d === null ? randd : d;
  }

  (w.flaechen || []).forEach(function(f){
    if(ids.indexOf(f.id) < 0) return;
    if(f.art === "mantel" || f.art === "gewinde" || f.art === "kegel"){
      [true, false].forEach(function(oben){
        linie(e, m.x(f.von), m.y(f.d, oben), m.x(f.bis),
              m.y(f.dBis === undefined ? f.d : f.dBis, oben),
              BREIT * 2, {deckung: 0.45});
      });
    }else if(f.art === "laengsnut"){
      var n = (w.laengsnuten || [])[0];
      if(n){
        linie(e, m.x(n.von), m.y(n.d - 2 * n.tiefe, true),
              m.x(n.bis), m.y(n.d - 2 * n.tiefe, true), BREIT * 2,
              {deckung: 0.45});
      }
    }else if(f.art === "bohrung"){
      [true, false].forEach(function(oben){
        linie(e, m.x(f.von), m.y(f.d, oben), m.x(f.bis), m.y(f.d, oben),
              BREIT * 2, {deckung: 0.45});
      });
    }else{
      /* Stirnflächen, Schultern, Nuten: ein Strich quer zur Achse. */
      var d = durchmesserBei(f.bei) + (f.art === "stirn" ? 0 : 2);
      linie(e, m.x(f.bei), m.y(d, true), m.x(f.bei), m.y(d, false),
            BREIT * 2, {deckung: 0.45});
    }
  });
}

/* Eine Nut stark vergrößert, wie die Einzelheiten A und B auf der
   Zeichnung. Gezeichnet wird der Ausschnitt mit Bruchkanten links und
   rechts, bemaßt werden Breite und Tiefe.

   `s` ist die Bildpunktzahl je Millimeter. Sie sollte so groß sein, dass
   die Tiefe mehr als 34 Bildpunkte misst - darunter passen die Maßpfeile
   nicht zwischen die Maßhilfslinien, und `massV` kennt keinen engen Fall. */
function zeichneNutEinzelheit(svg, w, o){
  var n = null;
  w.nuten.forEach(function(x){ if(x.marke === (o.marke || "A")) n = x; });
  if(!n) n = w.nuten[0];
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

  /* Nutbreite mit ihrer Toleranzklasse, soweit das Buch sie fuer diesen
     Durchmesser hergibt (DIN 471, Seite 287: m ist H13). */
  /* Buchstabe und Vergroesserungsmassstab - Seite 74. Ohne beides ist ein
     vergroessertes Bild keine Einzelheit, sondern ein zweites Werkstueck. */
  if(o.massstab){
    txt(g, x0 - rand, y0 - 1.5 * s, n.marke + " (" + o.massstab + ":1)",
        {anker: "start", fett: true, groesse: 13});
  }
  mass(g, x0, x0 + b, y0 + t + 34,
       o.text || (zahlKomma(n.breite)
                  + (n.breiteToleranz ? " " + n.breiteToleranz : "")),
       [y0 + t, y0 + t]);
  /* Die Tiefe daneben. Eine Sicherungsringnut wird nach beiden Zahlen
     gefertigt - Breite allein sagt nichts über den Nutgrund. */
  massV(g, y0, y0 + t, x0 + b + rand + 34, zahlKomma(n.tiefe),
        [x0 + b + rand, x0 + b]);
  return g;
}

/* Der Querschnitt durch eine Passfedernut, stark vergrößert.

   Warum es ihn braucht: Breite und Tiefe liegen quer zur Achse. Im
   Seitenriss ist von der Breite nichts zu sehen und von der Tiefe nur der
   Nutgrund - beide Maße sind dort nicht einzutragen. Ohne diesen Schnitt
   bleibt die Nut unbemaßt.

   Bemaßt wird nach DIN 6885-1: b als Nutbreite mit ihrer Passung, t1 als
   Nuttiefe in der Welle, gemessen von der Mantelfläche. Dass die
   Mantelfläche an dieser Stelle gar nicht mehr da ist, ist kein Fehler -
   t1 wird von der gedachten Zylinderfläche aus angetragen; sie steht
   deshalb als schmale Strichlinie im Bild.

   Geschnitten wird quer, also mit Schraffur - anders als der Längsriss
   der Welle, den man nicht schneidet. */
function zeichneNutQuerschnitt(svg, w, o){
  o = o || {};
  var n = (w.laengsnuten || [])[0];
  if(!n) return null;
  var s = o.s || 8;
  var g = svgEl("g", {}, svg);
  var R = n.d / 2 * s;
  var cx = o.x === undefined ? R + 74 : o.x;
  var cy = o.y === undefined ? R + 62 : o.y;
  var halb = n.breite / 2 * s;
  /* Wo die Nutflanken die Mantelfläche schneiden - die Sehne über der
     halben Nutbreite. Dort hört der Kreis auf und die Nut fängt an. */
  var h = Math.sqrt(R * R - halb * halb);
  var grund = cy - (n.d / 2 - n.tiefe) * s;
  var oben = cy - R;

  var flaeche = svgEl("path", {d:
    "M" + (cx + halb).toFixed(1) + "," + (cy - h).toFixed(1)
    + " A" + R.toFixed(1) + "," + R.toFixed(1) + " 0 1 1 "
    + (cx - halb).toFixed(1) + "," + (cy - h).toFixed(1)
    + " L" + (cx - halb).toFixed(1) + "," + grund.toFixed(1)
    + " L" + (cx + halb).toFixed(1) + "," + grund.toFixed(1) + " Z",
    /* Die Musterkennung traegt den Namen der Welle: Zwei Querschnitte in
       einem Dokument haetten sonst dieselbe id, und das ist ungueltig. */
    fill: schraffur(svg, "nutschnitt-" + w.id, 45),
    stroke: "currentColor", "stroke-width": BREIT}, g);

  /* Die Mittellinien des Kreises. */
  achse(g, cx - R - 10, cx + R + 10, cy);
  /* Dieselbe Strichpunktlinie wie die waagerechte Achse - ein Bild, ein
     Strichbild. */
  fbAchseV(g, cy - R - 10, cy + R + 10, cx);

  /* Die gedachte Mantelfläche über der Nut - von ihr aus wird t1
     angetragen. */
  linie(g, cx - halb - 6, oben, cx + halb + 6, oben, SCHMAL, {strich:"6 3"});

  /* Die Nutbreite mit ihrer Passung und der Hüllbedingung - Seite 82
     zeigt die geschlossene Nut mit "10 P9 (E)". */
  var bt = zahlKomma(n.breite)
         + (n.breiteToleranz ? " " + n.breiteToleranz : "");
  var mb = mass(g, cx - halb, cx + halb, oben - 44, bt, [cy - h, cy - h]);
  huellbedingung(mb, cx + bt.length * 3.2 + 2, oben - 49, 11);
  massV(g, oben, grund, cx + R + 44,
        "t1 = " + zahlKomma(n.tiefe)
        + (n.tiefeToleranz ? " " + n.tiefeToleranz : ""),
        [cx + halb + 6, cx + halb]);
  return g;
}

/* Wie groß die Zeichenfläche für einen Nutquerschnitt sein muss. */
function nutQuerschnittGroesse(w, o){
  o = o || {};
  var n = (w.laengsnuten || [])[0];
  if(!n) return null;
  var s = o.s || 8, R = n.d / 2 * s;
  return {breite: 2 * R + 258, hoehe: 2 * R + 124,
          x: R + 74, y: R + 62, s: s};
}

/* Das Symbol der Hüllbedingung nach DIN EN ISO 14405-1: ein E im Kreis.
   Es steht hinter der Maßzahl - "10 N9 (E)" heißt, dass Maß und Form
   zusammen in der Toleranz liegen müssen. Gezeichnet statt gesetzt: Das
   Zeichen U+24BA fehlt in vielen Schriften, und ein leeres Kästchen mitten
   in der Bemaßung ist schlimmer als keine Angabe. */
function huellbedingung(g, x, y, groesse){
  var r = (groesse || 11) * 0.52;
  var k = svgEl("g", {}, g);
  svgEl("circle", {cx: x + r, cy: y - r * 0.65, r: r, fill: "none",
    stroke: "currentColor", "stroke-width": SCHMAL}, k);
  txt(k, x + r, y - r * 0.65 + (groesse || 11) * 0.34, "E",
      {groesse: (groesse || 11) * 0.78});
  return k;
}

/* Die Draufsicht auf eine Passfedernut - der einzige Riss, in dem ihre
   runden Enden zu sehen sind.

   Bemaßt wird hier nur der Radius, und zwar ohne Wert: Er folgt aus der
   halben Nutbreite, und Seite 82 lässt dafür ausdrücklich einen
   Radiuspfeil mit dem Symbol R ohne Zahl zu. Breite und Tiefe stehen im
   Querschnitt, Länge und Lage in der Ansicht - nichts doppelt. */
function zeichneNutDraufsicht(svg, w, o){
  o = o || {};
  var n = (w.laengsnuten || [])[0];
  if(!n) return null;
  var s = o.s || 8;
  var g = svgEl("g", {}, svg);
  var l = (n.bis - n.von) * s, b = n.breite * s, r = b / 2;
  var x0 = o.x === undefined ? 40 : o.x;
  var y0 = o.y === undefined ? 40 : o.y;   /* obere Kante der Nut */
  var rand = 0.9 * b;

  /* Ein Stück der Mantelfläche, oben und unten mit Bruchkante. */
  [[y0 - rand, -1], [y0 + b + rand, 1]].forEach(function(e){
    linie(g, x0 - 12, e[0], x0 + l + 12, e[0], SCHMAL, {deckung: 0});
  });
  svgEl("path", {d: bruchlinie(x0 - 10, y0 - rand, rand * 2 + b),
    fill: "none", stroke: "currentColor", "stroke-width": SCHMAL}, g);
  svgEl("path", {d: bruchlinie(x0 + l + 10, y0 - rand, rand * 2 + b),
    fill: "none", stroke: "currentColor", "stroke-width": SCHMAL}, g);

  /* Die Nut: zwei Geraden und zwei Halbkreise. */
  linie(g, x0 + r, y0, x0 + l - r, y0, BREIT);
  linie(g, x0 + r, y0 + b, x0 + l - r, y0 + b, BREIT);
  /* Der linke Bogen woelbt sich nach links, der rechte nach rechts - in
     SVG mit y nach unten heisst das sweep 0 links und 1 rechts. */
  [[x0 + r, 0], [x0 + l - r, 1]].forEach(function(e){
    svgEl("path", {d: "M" + e[0].toFixed(1) + "," + y0.toFixed(1)
      + " A" + r.toFixed(1) + "," + r.toFixed(1) + " 0 0 " + e[1] + " "
      + e[0].toFixed(1) + "," + (y0 + b).toFixed(1),
      fill: "none", stroke: "currentColor", "stroke-width": BREIT}, g);
  });

  /* Der Radiuspfeil - schräg auf den Bogen, Symbol R ohne Wert. */
  var mx = x0 + r, my = y0 + r;
  var wi = Math.PI * 0.75;
  var px = mx + r * Math.cos(wi), py = my + r * Math.sin(wi);
  var tx = mx + (r + 30) * Math.cos(wi), ty = my + (r + 30) * Math.sin(wi);
  linie(g, tx, ty, px, py, SCHMAL);
  pfeil(g, px, py, Math.cos(wi), Math.sin(wi));
  txt(g, tx - 3, ty - 3, "2× R", {anker: "end", groesse: 11});
  return g;
}

/* Wie groß die Zeichenfläche für die Draufsicht sein muss. */
function nutDraufsichtGroesse(w, o){
  o = o || {};
  var n = (w.laengsnuten || [])[0];
  if(!n) return null;
  var s = o.s || 8;
  return {breite: (n.bis - n.von) * s + 130,
          hoehe: n.breite * s * 2.8 + 70,
          x: 62, y: n.breite * s * 0.9 + 46, s: s};
}

/* Wie groß die Zeichenfläche für eine Nut-Einzelheit sein muss. Gerechnet
   statt geraten: Die Breite haengt am Massstab, und der haengt am Massstab
   der Ansicht - zehnfach, damit "(10:1)" auch stimmt. */
function nutEinzelheitGroesse(w, o){
  o = o || {};
  var n = (w.nuten || [])[0];
  if(!n) return null;
  var s = o.s || 26;
  var b = n.breite * s, t = n.tiefe * s, rand = 1.6 * s;
  return {breite: 2 * rand + b + 150,
          hoehe: 1.5 * s + 26 + t + 56,
          x: rand + 22, y: 1.5 * s + 26, s: s};
}

/* Eine Zahl mit Komma statt Punkt - für Maßzahlen. */
function zahlKomma(x){
  return String(x).replace(".", ",");
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
