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
     Was hier noch fehlt, sind die beiden Kanten, an denen ihre Flanken die
     Mantelfläche schneiden: Sie liegen tiefer als die Mantellinie und
     höher als der Nutgrund, und zwar bei der Sehne über der halben
     Nutbreite. Schmale Vollinie - sichtbare Kante, aber keine Kontur. */
  (w.laengsnuten || []).forEach(function(n){
    var rr = n.d / 2, halb = n.breite / 2;
    if(halb >= rr) return;
    var dk = 2 * Math.sqrt(rr * rr - halb * halb);
    if(dk <= n.d - 2 * n.tiefe) return;
    linie(g, m.x(n.von), m.y(dk, true), m.x(n.bis), m.y(dk, true), SCHMAL);
  });

  /* Mittellinie, zwei bis drei Millimeter über das Teil hinaus. */
  achse(g, m.x(-4), m.x(w.laenge + 4), m.achse);

  if(o.bezeichnungen) wellenBezeichnungen(g, m, w, o.masse);
  if(o.rauheiten)     wellenRauheiten(g, m, w);
  if(o.radien)        wellenRadien(g, m, w);
  if(o.zentrierbohrungen) wellenZentrierbohrungen(g, m, w);
  if(o.masse)         wellenMasse(g, m, w, o.masseUnten);
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

/* Benennungen mit Hinweislinie - Erklärebene, deshalb gestrichelt und in
   einer eigenen Gruppe. Sie gehören nicht zur Zeichnung.
   Nicht zusammen mit `masse` verwenden: Die Hinweislinien laufen dann in die
   Maßhilfslinien der oberen Maßkette. Entweder die Zeichnung mit Maßen oder
   das Bild mit Benennungen - zwei Bilder sind besser als ein überfülltes.
   Die eine Ausnahme ist `masse` zusammen mit `masseUnten`: Dann steht keine
   Maßkette mehr über dem Teil, und beides passt nebeneinander. Genau so
   entsteht die Gesamtzeichnung in der Übersicht des Übungspakets.
   Die Höhen sind in den Daten gestaffelt: Vier Benennungen auf 130 mm Länge
   stoßen sonst aneinander. */
function wellenBezeichnungen(g, m, w, mitMasse){
  var e = svgEl("g", {"class":"erklaer"}, g);
  (w.bezeichnungen || []).forEach(function(k){
    /* Eine Gewindebezeichnung ist ein Maß, kein Hinweis. Steht sie schon
       als Durchmessermaß im Bild, darf sie nicht ein zweites Mal als
       Benennung daneben stehen - doppelt bemaßt ist nicht bemaßt. */
    if(mitMasse && k.wennOhneMasse) return;
    var y0 = m.y(k.d, true), y1 = y0 - k.hoch;
    linie(e, m.x(k.x), y0, m.x(k.x) + k.ab, y1, SCHMAL, {strich:"4 3"});
    txt(e, m.x(k.x) + k.ab, y1 - 5, k.text,
        {anker: k.ab < 0 ? "end" : "start", groesse: 11});
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
  var e = svgEl("g", {"class":"erklaer"}, g);
  wellenRadienListe(w).forEach(function(k){
    var y0 = m.y(k.d, true), y1 = y0 - k.hoch;
    linie(e, m.x(k.x), y0, m.x(k.x) + k.ab, y1, SCHMAL, {strich:"4 3"});
    txt(e, m.x(k.x) + k.ab, y1 - 5, k.text,
        {anker: k.ab < 0 ? "end" : "start", groesse: 11});
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
  var e = svgEl("g", {"class":"erklaer"}, g);
  (w.rauheiten || []).forEach(function(r){
    var y0 = m.y(r.d, true), x0 = m.x(r.x);
    if(r.hoch){
      var y1 = y0 - r.hoch;
      linie(e, x0, y0, x0, y1, SCHMAL);
      pfeil(e, x0, y0, 0, 1);
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
  var e = svgEl("g", {"class":"erklaer"}, g);
  var gd = wellenGroesstDurchmesser(w);
  var unten = m.y(gd, false) + 18;

  [["links", 0, -1], ["rechts", w.laenge, 1]].forEach(function(s){
    var text = z[s[0]];
    if(!text || text === "–") return;
    var x0 = m.x(s[1]), ri = s[2];
    /* Hinweislinie von der Stirnfläche auf der Achse nach unten-außen in
       den freien Rand; dort liegt weder ein Durchmessermaß noch die
       Maßkette. */
    var x1 = x0 + ri * 14;
    linie(e, x0, m.achse, x1, unten, SCHMAL);
    pfeil(e, x0, m.achse, -ri, -1);
    if(z.art === "erforderlich" || z.art === "nicht"){
      zentriersymbol(e, x1 + ri * 8, unten, ri, z.art === "nicht");
      x1 += ri * 18;
    }
    txt(e, x1 + ri * 4, unten + 4, text,
        {anker: ri < 0 ? "end" : "start", groesse: 11});
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

  mass(g, x0, x0 + b, y0 + t + 34, o.text || zahlKomma(n.breite),
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
