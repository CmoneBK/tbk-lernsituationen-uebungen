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
 * Längsschnitt ohnehin nicht geschnitten dargestellt, und ohne Bohrung gibt
 * es nichts zu zeigen, was innen läge.
 */
"use strict";

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
  w.abschnitte.forEach(function(a){ if(a.d > d) d = a.d; });
  return d;
}

/* Die Kontur einer Hälfte, von der Achse aus gemessen, als Punktfolge von
   links nach rechts. Alles steckt darin: Fasen, Absätze, die Nuten und der
   Gewindefreistich. Die andere Hälfte entsteht durch Spiegeln - eine Welle
   ist rotationssymmetrisch, und was man zweimal zeichnet, weicht früher
   oder später voneinander ab. */
function wellenKontur(w){
  var a = w.abschnitte, fase = 0.5, p = [], i;

  function bis(x, r){ p.push({x: x, r: r}); }

  /* Linke Stirnfläche mit Fase. */
  bis(0, a[0].d / 2 - fase);
  bis(fase, a[0].d / 2);

  /* Für jeden Abschnitt: erst, was auf seinem Mantel liegt, dann der
     Übergang zum nächsten. */
  for(i = 0; i < a.length; i++){
    var r = a[i].d / 2;

    w.nuten.forEach(function(n){
      if(n.bei < a[i].von || n.bei >= a[i].bis) return;
      bis(n.bei, r);
      bis(n.bei, r - n.tiefe);
      bis(n.bei + n.breite, r - n.tiefe);
      bis(n.bei + n.breite, r);
    });

    if(i === a.length - 1) break;
    var rn = a[i + 1].d / 2, x = a[i].bis;

    if(w.gewindefreistich && x === w.gewindefreistich.von){
      /* Vor dem Gewinde geht der Durchmesser unter den Kerndurchmesser,
         damit das Werkzeug auslaufen kann. */
      var rf = w.gewinde.d3 / 2 - 0.2;
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
  var rl = a[a.length - 1].d / 2;
  bis(w.laenge - fase, rl);
  bis(w.laenge, rl - fase);
  return p;
}

/* Wie groß die Zeichenfläche sein muss. So braucht keine Seite zu raten,
   und ein geänderter Maßstab zieht die Bilder mit. */
function wellenGroesse(w, o){
  o = o || {};
  var s = o.s || 6;
  var oben = o.masse ? 100 : 46, unten = o.masse ? 106 : 46;
  if(o.bezeichnungen) oben = Math.max(oben, 56);
  if(o.rauheiten)     oben = Math.max(oben, 52);
  var halb = (o.rohteil ? w.rohteil.d : wellenGroesstDurchmesser(w)) / 2 * s;
  return {
    breite: (o.rohteil ? w.rohteil.laenge : w.laenge) * s + 2 * (o.rand || 82),
    hoehe: 2 * halb + oben + unten,
    x: o.rand || 82,
    y: halb + oben
  };
}

/* Zeichnet die Welle. o = {x, y, s, masse, rauheiten, bezeichnungen,
   markiert, rohteil}. Gibt die Gruppe zurück. */
function zeichneWelle(svg, w, o){
  o = o || {};
  var m = wellenMassstab({x: o.x || 82, y: o.y || 140, s: o.s || 6});
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

  /* Die Kontur, beide Hälften aus derselben Punktfolge. */
  var k = wellenKontur(w);
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
  if(w.gewinde){
    var gw = w.gewinde;
    [true, false].forEach(function(oben){
      linie(g, m.x(gw.von), m.y(gw.d3, oben), m.x(gw.bis - 0.5),
            m.y(gw.d3, oben), SCHMAL);
    });
    linie(g, m.x(gw.von), m.y(gw.d3, true), m.x(gw.von), m.y(gw.d3, false),
          BREIT);
  }

  /* Mittellinie, zwei bis drei Millimeter über das Teil hinaus. */
  achse(g, m.x(-4), m.x(w.laenge + 4), m.achse);

  if(o.bezeichnungen) wellenBezeichnungen(g, m, w);
  if(o.rauheiten)     wellenRauheiten(g, m, w);
  if(o.masse)         wellenMasse(g, m, w);
  if(o.markiert)      wellenMarkieren(g, m, w, o.markiert, o.markenfarbe);
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
   darüber, Durchmesser senkrecht - so steht es auf der Originalzeichnung.
   Welche Maße eingetragen werden, sagt die Welle selbst (`masse`); die
   Staffelung der Maßketten rechnet diese Funktion. */
function wellenMasse(g, m, w){
  var gd = wellenGroesstDurchmesser(w);
  var u = m.y(gd, false), o = m.y(gd, true);

  (w.masse.unten || []).forEach(function(z, i){
    mass(g, m.x(z.von), m.x(z.bis), u + 26 + i * 20, z.text,
         [m.y(z.an[0], false), m.y(z.an[1], false)]);
  });
  (w.masse.oben || []).forEach(function(z, i){
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

/* Benennungen mit Hinweislinie - Erklärebene, deshalb gestrichelt und in
   einer eigenen Gruppe. Sie gehören nicht zur Zeichnung.
   Nicht zusammen mit `masse` verwenden: Die Hinweislinien laufen dann in die
   Maßhilfslinien der oberen Maßkette. Entweder die Zeichnung mit Maßen oder
   das Bild mit Benennungen - zwei Bilder sind besser als ein überfülltes.
   Die Höhen sind in den Daten gestaffelt: Vier Benennungen auf 130 mm Länge
   stoßen sonst aneinander. */
function wellenBezeichnungen(g, m, w){
  var e = svgEl("g", {"class":"erklaer"}, g);
  (w.bezeichnungen || []).forEach(function(k){
    var y0 = m.y(k.d, true), y1 = y0 - k.hoch;
    linie(e, m.x(k.x), y0, m.x(k.x) + k.ab, y1, SCHMAL, {strich:"4 3"});
    txt(e, m.x(k.x) + k.ab, y1 - 5, k.text,
        {anker: k.ab < 0 ? "end" : "start", groesse: 11});
  });
}

/* Die geforderten Rautiefen. Sie entscheiden später über den
   Schlichtvorschub, deshalb stehen sie im Bild und nicht nur im Text. */
function wellenRauheiten(g, m, w){
  var e = svgEl("g", {"class":"erklaer"}, g);
  (w.rauheiten || []).forEach(function(r){
    var y0 = m.y(r.d, true), y1 = y0 - 16;
    linie(e, m.x(r.x), y0, m.x(r.x), y1, SCHMAL);
    txt(e, m.x(r.x), y1 - 4, r.text, {groesse: 11});
  });
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
    if(f.art === "mantel" || f.art === "gewinde"){
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

/* Eine Nut im Maßstab 4:1, wie die Einzelheiten A und B auf der Zeichnung.
   Gezeichnet wird der Ausschnitt mit Bruchkanten links und rechts. */
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

  mass(g, x0, x0 + b, y0 + t + 34, o.text || zahlKomma(n.breite),
       [y0 + t, y0 + t]);
  return g;
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
