/* Zeichnungen für Übungen und Trainings.
 *
 * Eingebunden mit einer Zeile vor dem eigenen Skript der Seite:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *
 * Hier stehen nur die allgemeinen Bausteine - Maßlinien, Schraffur, Schraube,
 * Gewindeprofil, Achsenkreuz. Was nur eine Übung braucht, gehört in ihr
 * eigenes Skript; was mehrere brauchen, kommt hierher.
 *
 * Zwei Festlegungen gelten überall:
 *   - Gezeichnet wird in currentColor. Dadurch stimmen heller und dunkler
 *     Modus, und eine Gruppe lässt sich über style="color:..." einfärben.
 *   - Die Strichstärke steht direkt am Element und nie in einer CSS-Klasse.
 *     Beim Gewinde trägt sie die fachliche Information (breite Vollinie außen,
 *     schmale innen) - sie darf nicht versehentlich überschrieben werden.
 */

var NS = "http://www.w3.org/2000/svg";
/* Zwei Linienbreiten im Verhaeltnis 2:1 - mehr kennt DIN ISO 128-20 fuer
   diese Zeichnungen nicht. Breit: sichtbare Koerperkanten, Kerndurchmesser
   im geschnittenen Innengewinde. Schmal: Mass-, Masshilfs- und
   Hinweislinien, Schraffur, Mittellinien, Gewindekern aussen. */
var BREIT = 2.0, SCHMAL = 1.0;

function svgEl(name, attr, eltern){
  var e = document.createElementNS(NS, name);
  for(var k in attr) if(attr.hasOwnProperty(k)) e.setAttribute(k, attr[k]);
  if(eltern) eltern.appendChild(e);
  return e;
}

/* Eine Gruppe, optional als hervorhebbares Teil für Teil 1. */
function gruppe(eltern, teil){
  return svgEl("g", teil ? {"class":"teil", "data-t":teil} : {}, eltern);
}

function bild(zielId, breite, hoehe, label, unterschrift){
  var ziel = document.getElementById(zielId);
  ziel.textContent = "";
  var svg = svgEl("svg", {viewBox:"0 0 " + breite + " " + hoehe,
                          role:"img", "aria-label":label}, ziel);
  if(unterschrift){
    var f = document.createElement("figcaption");
    f.innerHTML = unterschrift;
    ziel.appendChild(f);
  }
  return svg;
}

function linie(g, x1, y1, x2, y2, w, opt){
  opt = opt || {};
  var a = {x1:x1, y1:y1, x2:x2, y2:y2, stroke:"currentColor",
           "stroke-width": w || BREIT, "stroke-linecap":"round"};
  if(opt.strich)  a["stroke-dasharray"] = opt.strich;
  if(opt.deckung) a.opacity = opt.deckung;
  return svgEl("line", a, g);
}

function kasten(g, x, y, w, h, opt){
  opt = opt || {};
  return svgEl("rect", {x:x, y:y, width:w, height:h,
    fill: opt.fuell || "none", stroke: opt.ohneRand ? "none" : "currentColor",
    "stroke-width": opt.strich || BREIT}, g);
}

function txt(g, x, y, s, opt){
  opt = opt || {};
  var t = svgEl("text", {x:x, y:y, fill:"currentColor",
    "font-size": opt.groesse || 11.5, "font-family":"inherit",
    "text-anchor": opt.anker || "middle",
    "font-weight": opt.fett ? 700 : 500}, g);
  if(opt.deckung) t.setAttribute("opacity", opt.deckung);
  t.textContent = s;
  return t;
}

/* Massepfeil nach DIN ISO 129: geschlossenes, ausgefuelltes Dreieck, rund
   drei mal so lang wie breit. (dx, dy) ist die Richtung, in die er zeigt;
   die Spitze liegt auf dem Massepunkt. */
var PFEIL_L = 9, PFEIL_B = 1.55;
function pfeil(g, x, y, dx, dy){
  var bx = x - PFEIL_L * dx, by = y - PFEIL_L * dy;
  return svgEl("polygon", {points:[
    x.toFixed(2) + "," + y.toFixed(2),
    (bx - PFEIL_B * dy).toFixed(2) + "," + (by + PFEIL_B * dx).toFixed(2),
    (bx + PFEIL_B * dy).toFixed(2) + "," + (by - PFEIL_B * dx).toFixed(2)
  ].join(" "), fill:"currentColor"}, g);
}

/* Waagerechtes Maß mit Maßhilfslinien und Pfeilen. vonY = Kante des Objekts,
   von der die Hilfslinien ausgehen. Ist die Strecke zu kurz für Pfeile
   zwischen den Grenzen, zeigen sie von außen darauf. */
function mass(g, x1, x2, y, s, vonY){
  var k = svgEl("g", {}, g);
  var eng = (x2 - x1) < 34;

  if(vonY !== undefined){
    /* Die Masshilfslinie beginnt an der Kontur und steht ueber die Masslinie
       hinaus - nach DIN ISO 129 rund das Achtfache der Linienbreite. Liegen
       die beiden Konturpunkte verschieden hoch (etwa an einer Fase), darf
       vonY ein Paar sein. */
    var vy = (vonY.length === 2) ? vonY : [vonY, vonY];
    [[x1, vy[0]], [x2, vy[1]]].forEach(function(p){
      linie(k, p[0], p[1], p[0], y + (y > p[1] ? 7 : -7), SCHMAL);
    });
  }
  linie(k, eng ? x1 - 11 : x1, y, eng ? x2 + 11 : x2, y, SCHMAL);
  pfeil(k, x1, y, eng ? 1 : -1, 0);
  pfeil(k, x2, y, eng ? -1 : 1, 0);
  /* Bei engen Maßen zeigen die Pfeile von außen herein; der Text muss dann
     höher sitzen, sonst liegt er auf ihnen. */
  txt(k, (x1 + x2) / 2, y - (eng ? 11 : 5), s);
  return k;
}

/* Senkrechtes Maß. links = Text links neben der Maßlinie, "gedreht" = Maßzahl
   parallel zur Maßlinie und von rechts zu lesen (DIN ISO 129-1). Das braucht
   man dort, wo neben der Maßlinie kein Platz ist. */
function massV(g, y1, y2, x, s, vonX, links){
  var k = svgEl("g", {}, g);
  if(vonX !== undefined){
    var vx = (vonX.length === 2) ? vonX : [vonX, vonX];
    [[y1, vx[0]], [y2, vx[1]]].forEach(function(p){
      /* Ueber die Masslinie hinaus, nicht davor enden. */
      linie(k, p[1], p[0], x + (x > p[1] ? 7 : -7), p[0], SCHMAL);
    });
  }
  linie(k, x, y1, x, y2, SCHMAL);
  pfeil(k, x, y1, 0, -1);
  pfeil(k, x, y2, 0, 1);
  var ym = (y1 + y2) / 2;
  if(links === "gedreht"){
    txt(k, x - 4, ym, s).setAttribute("transform",
      "rotate(-90 " + (x - 4) + " " + ym + ")");
  }else{
    txt(k, links ? x - 6 : x + 6, ym + 4, s,
        {anker: links ? "end" : "start"});
  }
  return k;
}

/* Mittellinie (Strichpunkt). */
function achse(g, x1, x2, y){
  linie(g, x1, y, x2, y, SCHMAL, {strich:"12 2 2 2"});
}

/* Schraffur für geschnittene Bauteile. Die ID muss je Bild eindeutig sein,
   sonst greifen alle Bilder auf dasselbe Muster zu. */
function schraffur(svg, id, winkel){
  /* Teilen sich mehrere Flaechen dieselbe Schraffur, wird das Muster nur
     einmal angelegt - sonst stehen doppelte IDs im SVG. */
  if(svg.querySelector("#" + id)) return "url(#" + id + ")";
  var defs = svg.querySelector("defs") || svgEl("defs", {}, svg);
  var p = svgEl("pattern", {id:id, width:7, height:7,
    patternUnits:"userSpaceOnUse",
    patternTransform:"rotate(" + winkel + ")"}, defs);
  svgEl("line", {x1:0, y1:0, x2:0, y2:7, stroke:"currentColor",
    "stroke-width":SCHMAL}, p);
  return "url(#" + id + ")";
}

/* Eckenmass aus der Schluesselweite - der ideale Sechskant, wie er
   gezeichnet wird. Die Norm nennt fuer e wegen der Toleranzen einen etwas
   kleineren Wert; fuer die Zeichnung ist der geometrische richtig. */
function eckenmass(sw){ return sw * 2 / Math.sqrt(3); }

/* Sechskant in Ansicht, ueber Ecke gesehen - so wird er normgerecht
   dargestellt.

   Der Blick zeigt auf eine Ecke, der Umriss ist deshalb das Eckenmass
   e = 2*s/Wurzel(3). Die Schluesselweite liegt quer zur Zeichenebene und ist
   hier nicht messbar. Sichtbar sind drei Flaechen, getrennt durch zwei
   Kanten bei e/4. Die Fase am freien Ende ist ein Kegel, der die
   Schluesselflaechen gerade beruehrt; wo er die drei Flaechen schneidet,
   entstehen Hyperbeln, die nach Norm als Kreisboegen gezeichnet werden.

   o = {achse, von, bis, sw, s, faseAn:"von"|"bis", waagerecht, fuell}
   "von" und "bis" laufen entlang der Achse, "achse" steht quer dazu. */
function sechskantAnsicht(g, o){
  var rS = o.sw / 2 * o.s;
  var rE = rS * 2 / Math.sqrt(3);
  var laenge = Math.abs(o.bis - o.von);
  var tief = Math.max(3, Math.min((rE - rS) * Math.tan(Math.PI / 6), laenge * 0.4));

  var anFase = (o.faseAn === "bis") ? o.bis : o.von;
  var anderes = (o.faseAn === "bis") ? o.von : o.bis;
  var richtung = (anderes > anFase) ? 1 : -1;
  var qT = anFase + richtung * tief;          /* Ende der Fase */
  var qS = anFase - richtung * tief;          /* Steuerpunkt der Boegen */

  function pt(q, r){
    return o.waagerecht ? (q.toFixed(2) + "," + (o.achse + r).toFixed(2))
                        : ((o.achse + r).toFixed(2) + "," + q.toFixed(2));
  }

  var umriss = "M" + pt(anFase, -rS) + " L" + pt(anFase, rS) +
    " L" + pt(qT, rE) + " L" + pt(anderes, rE) +
    " L" + pt(anderes, -rE) + " L" + pt(qT, -rE) + " Z";
  svgEl("path", {d:umriss, fill:o.fuell || "var(--card)", stroke:"none"}, g);

  /* Die Auflageflaeche liegt vor dem Schaft und wird von ihm nicht
     verdeckt - die Kante laeuft deshalb durch. */
  svgEl("path", {d:umriss, fill:"none", stroke:"currentColor",
    "stroke-width":BREIT}, g);

  /* Die zwei Kanten zwischen den drei sichtbaren Flaechen. */
  [-1, 1].forEach(function(v){
    svgEl("path", {d:"M" + pt(qT, v * rE / 2) + " L" + pt(anderes, v * rE / 2),
      fill:"none", stroke:"currentColor", "stroke-width":BREIT}, g);
  });

  /* Die drei Boegen der Fase. */
  svgEl("path", {d:"M" + pt(qT, -rE / 2) + " Q" + pt(qS, 0) + " " + pt(qT, rE / 2),
    fill:"none", stroke:"currentColor", "stroke-width":BREIT}, g);
  [-1, 1].forEach(function(v){
    svgEl("path", {d:"M" + pt(qT, v * rE / 2) + " Q" + pt(qS, v * rE * 0.75) +
      " " + pt(qT, v * rE), fill:"none", stroke:"currentColor",
      "stroke-width":BREIT}, g);
  });

  return {rE:rE, rS:rS, tief:tief};
}

/* Sechskantschraube in Ansicht, Achse waagerecht, Kopf links.
   Maße in mm, s = Pixel je mm. Liefert die Teilgruppen zurück, damit Teil 1
   einzelne Bereiche hervorheben kann. */
function schraube(eltern, o){
  var s = o.s, y = o.y, x = o.x;
  var rd = o.d * s / 2;
  var sw = o.sw || o.d * 1.5;
  var rk = eckenmass(sw) * s / 2;      /* Umriss ueber Ecke, nicht SW */
  var kx = o.k * s;
  var lx = o.l * s;
  var bx = Math.min(o.b, o.l) * s;
  var r3 = (o.d - 1.2269 * o.P) * s / 2;
  var teile = o.teile || {};

  /* Die Reihenfolge ist die Tiefe: Was vorne liegt, kommt zuletzt. Der Kopf
     liegt vor dem Schaft - seine Auflagekante darf von dessen deckender
     Flaeche nicht angeknabbert werden. */
  var gSchaft  = gruppe(eltern, teile.schaft);
  var gGewinde = gruppe(eltern, teile.gewinde);
  var gKopf    = gruppe(eltern, teile.kopf);

  var gewindeVon = x + kx + (lx - bx);
  var ende = x + kx + lx;
  var fase = rd * 0.45;

  /* Schaft: nur die beiden Mantellinien sind Kanten. Quer zur Achse gibt es
     keine - der Zylinder laeuft weiter. */
  if(lx - bx > 0.5){
    kasten(gSchaft, x + kx, y - rd, lx - bx, 2 * rd,
           {fuell:"var(--card)", ohneRand:true});
    [-1, 1].forEach(function(v){
      linie(gSchaft, x + kx, y + v * rd, gewindeVon, y + v * rd, BREIT);
    });
  }

  /* Gewinde nach DIN ISO 6410: Aussendurchmesser breit, Kerndurchmesser
     schmal. Das Gewindeende ist eine BREITE Vollinie quer zur Achse - sie
     begrenzt das nutzbare Gewinde. Schmal gezeichnet wird nur der schraege
     Gewindeauslauf. Die Kernlinie endet an der Kuppenfase. */
  /* Die deckende Flaeche folgt der Kontur - am Ende sitzt eine Fase, kein
     rechter Winkel. Sonst stuende die Flaeche ueber das Bauteil hinaus und
     Masshilfslinien wuerden an ihr statt an der Kontur ansetzen. */
  svgEl("path", {d:
    "M" + gewindeVon + "," + (y - rd) +
    " L" + (ende - fase) + "," + (y - rd) +
    " L" + ende + "," + (y - rd + fase) +
    " L" + ende + "," + (y + rd - fase) +
    " L" + (ende - fase) + "," + (y + rd) +
    " L" + gewindeVon + "," + (y + rd) + " Z",
    fill:"var(--card)", stroke:"none"}, gGewinde);
  [-1, 1].forEach(function(v){
    linie(gGewinde, gewindeVon, y + v * rd, ende - fase, y + v * rd, BREIT);
    linie(gGewinde, ende - fase, y + v * rd, ende, y + v * (rd - fase), BREIT);
    linie(gGewinde, gewindeVon, y + v * r3, ende - fase + (rd - r3), y + v * r3,
          SCHMAL);
  });
  linie(gGewinde, ende, y - (rd - fase), ende, y + (rd - fase), BREIT);
  if(lx - bx > 0.5){
    linie(gGewinde, gewindeVon, y - rd, gewindeVon, y + rd, BREIT);
  }

  /* Der Kopf zuletzt: Er liegt vor dem Schaft, seine Auflagekante darf von
     dessen deckender Flaeche nicht halb weggenommen werden. */
  sechskantAnsicht(gKopf, {waagerecht:true, achse:y, von:x, bis:x + kx,
    sw:sw, s:s, faseAn:"von"});

  /* Die Mittellinie gehoert ueber das laengste zusammengehoerige Merkmal
     hinaus. Steckt die Schraube in einem Grundloch, ist das nicht ihr Ende,
     sondern der Bohrungsgrund - dann sagt der Aufrufer, bis wohin. */
  achse(eltern, x - 8, Math.max(ende + 10, o.achseBis || 0), y);

  return {kopf:gKopf, schaft:gSchaft, gewinde:gGewinde,
          kopfEnde:x + kx, gewindeVon:gewindeVon, ende:ende, rd:rd,
          /* Wo der Zylinder aufhoert und die Fase anfaengt - dort wird der
             Durchmesser bemasst, nicht an der Fase. */
          zylEnde:ende - fase, fase:fase,
          rk:rk, rE:rk, rS:sw * s / 2, sw:sw};
}

/* Senkkopfschraube, schematisch: Kopfdurchmesser rund 2d, Kopfhöhe rund 0,57d.
   Die Länge zählt hier ab der Kopfoberseite - genau darum geht es im Bild. */
function senkschraube(eltern, o){
  var s = o.s, y = o.y, x = o.x;
  var rd = o.d * s / 2;
  var rk = o.d * s;
  var kx = 0.57 * o.d * s;
  var lx = o.l * s;
  var r3 = (o.d - 1.2269 * o.P) * s / 2;
  var bx = Math.min(o.b, o.l - 0.57 * o.d) * s;

  var g = gruppe(eltern);
  svgEl("polygon", {points:[x, y - rk, x + kx, y - rd, x + kx, y + rd, x, y + rk].join(" "),
    fill:"var(--card)", stroke:"currentColor", "stroke-width":BREIT}, g);

  var ende = x + lx;
  var gewindeVon = Math.max(x + kx, ende - bx);
  if(gewindeVon > x + kx + 0.5){
    kasten(g, x + kx, y - rd, gewindeVon - (x + kx), 2 * rd, {fuell:"var(--card)"});
  }
  kasten(g, gewindeVon, y - rd, ende - gewindeVon, 2 * rd, {fuell:"var(--card)"});
  [y - r3, y + r3].forEach(function(yy){
    linie(g, gewindeVon + 1, yy, ende - 1, yy, SCHMAL);
  });
  /* Die Mittellinie gehoert ueber das laengste zusammengehoerige Merkmal
     hinaus. Steckt die Schraube in einem Grundloch, ist das nicht ihr Ende,
     sondern der Bohrungsgrund - dann sagt der Aufrufer, bis wohin. */
  achse(eltern, x - 8, Math.max(ende + 10, o.achseBis || 0), y);
  return {g:g, kopfEnde:x + kx, ende:ende, rd:rd, rk:rk};
}

/* Sechskant von vorn - dort ist die Schlüsselweite zu sehen.
   Ecken bei 0, 60, ... Grad: dadurch liegen die Flächen oben und unten, und
   der Abstand zwischen ihnen ist genau die Schlüsselweite. */
function hexKopf(eltern, cx, cy, sw, s){
  var h = sw * s / 2;                  /* halbe Schlüsselweite */
  var R = h * 2 / Math.sqrt(3);        /* Umkreisradius */
  var p = [];
  for(var i = 0; i < 6; i++){
    var w = Math.PI / 3 * i;
    p.push((cx + R * Math.cos(w)).toFixed(2), (cy + R * Math.sin(w)).toFixed(2));
  }
  var g = gruppe(eltern);
  svgEl("polygon", {points:p.join(" "), fill:"var(--card)",
    stroke:"currentColor", "stroke-width":BREIT}, g);
  return {g:g, h:h, R:R};
}

/* Gewindeprofil stark vergrößert: mehrere Gänge, damit die Steigung P als Maß
   zwischen zwei Spitzen sichtbar wird. */
function gewindeProfil(eltern, x, y, P, s, gaenge){
  var g = gruppe(eltern);
  var px = P * s;
  var H1 = 0.5413 * P * s;             /* Tragtiefe */
  var oben = y, unten = y + H1;

  var pfad = ["M", x, unten];
  for(var i = 0; i < gaenge; i++){
    pfad.push("L", x + i * px + px * 0.25, oben,
              "L", x + i * px + px * 0.50, oben,
              "L", x + i * px + px * 0.75, unten,
              "L", x + (i + 1) * px,       unten);
  }
  svgEl("path", {d:pfad.join(" "), fill:"none", stroke:"currentColor",
    "stroke-width":BREIT, "stroke-linejoin":"round"}, g);

  var breite = gaenge * px;
  linie(g, x - 12, oben,  x + breite + 30, oben,  SCHMAL, {deckung:.55});
  linie(g, x - 12, unten, x + breite + 30, unten, SCHMAL, {deckung:.55});
  linie(g, x - 12, (oben + unten) / 2, x + breite + 30, (oben + unten) / 2,
        SCHMAL, {strich:"6 4", deckung:.55});

  txt(g, x + breite + 34, oben  + 4, "d",  {anker:"start"});
  txt(g, x + breite + 34, (oben + unten) / 2 + 4, "d₂", {anker:"start"});
  txt(g, x + breite + 34, unten + 4, "d₃", {anker:"start"});

  mass(g, x + px * 0.25, x + px * 1.25, oben - 15, "P", oben - 2);
  return g;
}

/* Achsenkreuz für Diagramme: Pfeile nach rechts und nach oben, beschriftet.
   Liefert Umrechner von Datenwerten in Bildkoordinaten zurück. */
function achsenkreuz(eltern, o){
  var g = gruppe(eltern);
  var x0 = o.x, y0 = o.y, b = o.breite, h = o.hoehe;

  linie(g, x0, y0, x0 + b, y0, SCHMAL);
  linie(g, x0 + b, y0, x0 + b - 8, y0 - 3.5, SCHMAL);
  linie(g, x0 + b, y0, x0 + b - 8, y0 + 3.5, SCHMAL);

  linie(g, x0, y0, x0, y0 - h, SCHMAL);
  linie(g, x0, y0 - h, x0 - 3.5, y0 - h + 8, SCHMAL);
  linie(g, x0, y0 - h, x0 + 3.5, y0 - h + 8, SCHMAL);

  if(o.xText) txt(g, x0 + b, y0 + 18, o.xText, {anker:"end", deckung:.8});
  if(o.yText) txt(g, x0 + 4, y0 - h - 8, o.yText, {anker:"start", deckung:.8});

  return {
    g:g,
    px: function(v){ return x0 + b * v / o.xMax; },
    py: function(v){ return y0 - h * v / o.yMax; }
  };
}

/* Linienzug aus Datenpunkten [[x,y], ...]. */
function kurve(g, achs, punkte, opt){
  opt = opt || {};
  var d = punkte.map(function(p, i){
    return (i ? "L " : "M ") + achs.px(p[0]).toFixed(1) + " " + achs.py(p[1]).toFixed(1);
  }).join(" ");
  var a = {d:d, fill:"none", stroke:"currentColor",
           "stroke-width": opt.breit || BREIT,
           "stroke-linejoin":"round", "stroke-linecap":"round"};
  if(opt.strich)  a["stroke-dasharray"] = opt.strich;
  if(opt.deckung) a.opacity = opt.deckung;
  return svgEl("path", a, g);
}

/* ---------------------------------------------------------- Fügeverbindungen
 *
 * Schematische Bilder der Verbindungen aus der Lektion "Fügeverfahren im
 * Überblick". Bewusst schlicht: Es geht um die Frage, wo die Kraft übergeht -
 * nicht um eine normgerechte Zeichnung.
 *
 *     var svg = bild("bildId", 220, 140, "Beschreibung");
 *     fuegebild(svg, "schraube");
 *
 * Die Namen sind dieselben wie im Werkzeug, damit beide vom selben reden:
 *   kraft   schraube, pressverband, klemmverbindung, spannsatz
 *   form    passfeder, zahnwelle, stift, schnapp, bolzen, falz
 *   stoff   schweissen, loeten, kleben
 *   sonder  nieten, clinchen, schraubkleben
 */

var FUEGEBILDER = {};
var fbZaehler = 0;

/* Was auf dem Bild zu sehen ist - nicht, was es bedeutet. Eine
   Vorlesesoftware bekommt sonst nur den Namen des Verfahrens zu hoeren. */
var FUEGETEXT = {
  schraube: "Zwei Bauteile im Schnitt, von einer Sechskantschraube mit Mutter zusammengezogen",
  pressverband: "Welle im Schnitt, darauf eine Nabe ohne Nut - der Sitz entsteht durch Uebermass",
  klemmverbindung: "Geschlitzte Nabe auf glatter Welle, von einer Schraube zugezogen",
  spannsatz: "Kegelringe zwischen Welle und Nabe, axial verspannt",
  passfeder: "Welle mit Nut, darin die Passfeder, darueber die Nabe",
  zahnwelle: "Welle mit Verzahnung am Umfang, Nabe mit Gegenverzahnung",
  stift: "Zwei Teile, quer durchbohrt und mit einem Stift verbunden",
  schnapp: "Federnder Haken, der hinter einer Kante einrastet",
  bolzen: "Bolzen durch zwei Augen, mit einem Splint gesichert",
  falz: "Zwei Blechkanten umgelegt und ineinander gehakt",
  schweissen: "Zwei Bauteile im Stoss, dazwischen eine Schweissnaht",
  loeten: "Zwei Teile mit schmalem Spalt, darin das Lot",
  kleben: "Zwei Bauteile ueberlappt, dazwischen die Klebschicht",
  nieten: "Zwei Bleche, von einem Niet mit Setzkopf und Schliesskopf zusammengehalten",
  clinchen: "Zwei Bleche, ohne Zusatzteil ineinander durchgesetzt",
  schraubkleben: "Schraube im Gewinde, Klebstoff in den Gewindegaengen"
};

function fuegebild(svg, art){
  var g = svgEl("g", {}, svg);
  var fn = FUEGEBILDER[art];
  if(fn) fn(g, svg, "fb" + (fbZaehler++));
  /* Nur setzen, wenn die Seite nichts Besseres mitgebracht hat. */
  if((svg.getAttribute("aria-label") || "").length < 20 && FUEGETEXT[art]){
    svg.setAttribute("aria-label", FUEGETEXT[art]);
  }
  return g;
}

/* Ein Bauteil: Kasten mit Schraffur, damit man zwei Teile unterscheidet.
   Die Kennung muss je Bild eindeutig sein - sonst zeigen alle Bilder auf
   dasselbe Muster, und beim Entfernen des ersten verschwindet der Rest. */
function fbTeil(g, svg, kennung, x, y, w, h, nr){
  var m = schraffur(svg, kennung + "_" + nr, nr === 1 ? 45 : (nr === 2 ? -45 : 20));
  return kasten(g, x, y, w, h, {fuell:m});
}

/* Ein nicht geschnittenes Teil: Welle, Schraube, Stift, Feder, Niet. Es
   bekommt keine Schraffur (DIN ISO 128-50) - aber eine deckende Flaeche,
   sonst laeuft die Schraffur der Nachbarn hindurch. */
function fbVoll(g, x, y, w, h){
  return kasten(g, x, y, w, h, {fuell:"var(--card)"});
}
function fbWelle(g, x, y, w, h){ return fbVoll(g, x, y, w, h); }

/* Mittellinie waagerecht bzw. senkrecht. */
function fbAchse(g, x1, x2, y){ achse(g, x1, x2, y); }
function fbAchseV(g, y1, y2, x){
  linie(g, x, y1, x, y2, SCHMAL, {strich:"12 2 2 2"});
}

/* Ein Stueck Aussengewinde, Achse senkrecht: aussen breit, Kern schmal,
   Gewindeende breit quer zur Achse. */
function fbGewindeV(g, cx, vonY, bisY, rd, r3){
  [-1, 1].forEach(function(v){
    linie(g, cx + v * r3, vonY, cx + v * r3, bisY, SCHMAL);
  });
  linie(g, cx - rd, vonY, cx + rd, vonY, BREIT);
}

FUEGEBILDER.schraube = function(g, svg, k){
  var cx = 110, rd = 9, r3 = 6.5, rh = 11;
  /* Zwei Platten, gegenlaeufig schraffiert, mit Durchgangsloch. */
  [[40, 26, 1], [66, 26, 2]].forEach(function(p){
    fbTeil(g, svg, k, 30, p[0], cx - rh - 30, p[1], p[2]);
    fbTeil(g, svg, k, cx + rh, p[0], 190 - (cx + rh), p[1], p[2]);
  });
  /* Die Trennfuge laeuft durch das Spiel weiter bis zur Schraube. */
  [-1, 1].forEach(function(v){
    linie(g, cx + v * rd, 66, cx + v * rh, 66, BREIT);
  });
  /* Schraube: Schaft, Gewinde, dann Mutter und Kopf - was vorne liegt,
     kommt zuletzt. */
  /* Die Schraube steht hinter der Mutter ueber - sonst waere sie zu kurz
     gewaehlt. Das Gewinde beginnt im unteren Blech, nicht erst an der
     Mutter: sonst verdeckt die Mutter es ganz. */
  fbVoll(g, cx - rd, 40, 2 * rd, 74);
  fbGewindeV(g, cx, 74, 114, rd, r3);
  sechskantAnsicht(g, {achse:cx, von:106, bis:92, sw:32, s:1, faseAn:"von"});
  sechskantAnsicht(g, {achse:cx, von:22, bis:40, sw:32, s:1, faseAn:"von"});
  fbAchseV(g, 12, 124, cx);
  txt(g, 110, 132, "Reibung in der Trennfuge", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.pressverband = function(g, svg, k){
  fbTeil(g, svg, k, 74, 30, 72, 28, 2);               /* Nabe oben */
  fbTeil(g, svg, k, 74, 82, 72, 28, 2);               /* Nabe unten */
  fbWelle(g, 20, 58, 180, 24);                        /* Welle, ungeschnitten */
  fbAchse(g, 10, 210, 70);
  txt(g, 110, 132, "Übermaß presst", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.klemmverbindung = function(g, svg, k){
  fbTeil(g, svg, k, 66, 28, 84, 32, 2);
  fbTeil(g, svg, k, 66, 80, 84, 32, 2);
  fbWelle(g, 20, 60, 180, 20);
  linie(g, 150, 28, 150, 60, SCHMAL);                 /* Schlitz */
  linie(g, 150, 80, 150, 112, SCHMAL);
  /* Klemmschraube quer durch den Schlitz: Kopf, Schaft, Gewinde. */
  [44, 96].forEach(function(y){
    fbVoll(g, 128, y - 4, 44, 8);
    linie(g, 158, y - 4, 158, y + 4, BREIT);          /* Gewindeende */
    [-1, 1].forEach(function(v){
      linie(g, 158, y + v * 2.6, 172, y + v * 2.6, SCHMAL);
    });
    sechskantAnsicht(g, {waagerecht:true, achse:y, von:128, bis:116,
      sw:16, s:1, faseAn:"von"});
  });
  fbAchse(g, 10, 210, 70);
  txt(g, 110, 132, "Nabe wird zugezogen", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.spannsatz = function(g, svg, k){
  fbTeil(g, svg, k, 70, 20, 80, 26, 2);               /* Nabe */
  fbTeil(g, svg, k, 70, 94, 80, 26, 2);
  /* Die Kegelringe sind eigene Teile und werden mitgeschnitten - dritter
     Schraffurwinkel, damit sie von der Nabe zu unterscheiden sind. */
  var mR = schraffur(svg, k + "_3", 20);
  svgEl("path", {d:"M74 46 L146 46 L134 60 L86 60 Z", fill:mR,
    stroke:"currentColor", "stroke-width":BREIT}, g);
  svgEl("path", {d:"M74 94 L146 94 L134 80 L86 80 Z", fill:mR,
    stroke:"currentColor", "stroke-width":BREIT}, g);
  fbWelle(g, 20, 60, 180, 20);
  fbAchse(g, 10, 210, 70);
  txt(g, 110, 132, "Kegelringe pressen", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.passfeder = function(g, svg, k){
  /* Nabe mit Nut: der Ausschnitt gehoert in die Kontur, nicht daruebergelegt. */
  svgEl("path", {d:"M74 26 L146 26 L146 60 L128 60 L128 52 L92 52 L92 60 L74 60 Z",
    fill:schraffur(svg, k + "_2", -45), stroke:"currentColor",
    "stroke-width":BREIT}, g);
  fbTeil(g, svg, k, 74, 84, 72, 26, 2);
  /* Welle mit Nut. */
  svgEl("path", {d:"M20 60 L92 60 L92 68 L128 68 L128 60 L200 60 L200 84 L20 84 Z",
    fill:"var(--card)", stroke:"currentColor", "stroke-width":BREIT}, g);
  /* Die Feder wird nicht geschnitten. */
  fbVoll(g, 92, 52, 36, 16);
  fbAchse(g, 10, 210, 72);
  txt(g, 110, 132, "Feder in beiden Nuten", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.zahnwelle = function(g, svg, k){
  fbTeil(g, svg, k, 74, 26, 84, 22, 2);
  fbTeil(g, svg, k, 74, 92, 84, 22, 2);
  fbVoll(g, 20, 58, 180, 24);                         /* Welle, ungeschnitten */
  /* Die Zaehne sind angeformt - sie gehoeren zur Welle und bekommen deshalb
     dieselbe deckende Flaeche und eine breite Kante. */
  for(var i = 0; i < 6; i++){
    fbVoll(g, 78 + i * 13, 48, 9, 10);
    fbVoll(g, 78 + i * 13, 82, 9, 10);
  }
  fbAchse(g, 10, 210, 70);
  txt(g, 110, 132, "Zähne teilen die Last", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.stift = function(g, svg, k){
  fbTeil(g, svg, k, 20, 58, 180, 24, 1);
  fbTeil(g, svg, k, 74, 30, 72, 28, 2);
  fbTeil(g, svg, k, 74, 82, 72, 28, 2);
  fbVoll(g, 104, 30, 12, 80);                         /* Stift, ungeschnitten */
  fbAchseV(g, 22, 118, 110);
  txt(g, 110, 132, "Stift quer durch beide Teile", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.schnapp = function(g, svg, k){
  fbTeil(g, svg, k, 24, 40, 92, 24, 1);
  /* Der Haken gehoert zum oberen Teil - dieselbe Schraffur, eine Kontur. */
  svgEl("path", {d:"M116 40 L150 40 L150 58 L164 58 L164 70 L138 70 L138 52 L116 52 Z",
    fill:schraffur(svg, k + "_1", 45), stroke:"currentColor",
    "stroke-width":BREIT}, g);
  fbTeil(g, svg, k, 24, 78, 114, 24, 2);
  /* Die Kante, hinter der der Haken sitzt. */
  fbTeil(g, svg, k, 138, 70, 26, 32, 2);
  txt(g, 110, 132, "Haken rastet hinter der Kante ein", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.bolzen = function(g, svg, k){
  fbTeil(g, svg, k, 24, 36, 60, 20, 1);
  fbTeil(g, svg, k, 24, 84, 60, 20, 1);
  fbTeil(g, svg, k, 84, 58, 96, 24, 2);
  fbVoll(g, 100, 28, 16, 84);                         /* Bolzen, ungeschnitten */
  /* Splint: zwei Schenkel durch die Querbohrung. */
  linie(g, 98, 104, 118, 104, BREIT);
  linie(g, 105, 104, 105, 118, SCHMAL);
  linie(g, 111, 104, 111, 118, SCHMAL);
  fbAchseV(g, 20, 124, 108);
  txt(g, 110, 132, "Bolzen gesichert mit Splint", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.falz = function(g, svg, k){
  /* Zwei duenne Bleche, ineinander umgelegt - geschnitten, also schraffiert. */
  svgEl("path", {d:"M20 54 L122 54 L122 80 L104 80 L104 68 L20 68 Z",
    fill:schraffur(svg, k + "_1", 45), stroke:"currentColor",
    "stroke-width":BREIT}, g);
  svgEl("path", {d:"M200 80 L114 80 L114 46 L132 46 L132 66 L200 66 Z",
    fill:schraffur(svg, k + "_2", -45), stroke:"currentColor",
    "stroke-width":BREIT}, g);
  txt(g, 110, 132, "Blechränder ineinander umgelegt", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.schweissen = function(g, svg, k){
  fbTeil(g, svg, k, 20, 46, 80, 34, 1);
  fbTeil(g, svg, k, 120, 46, 80, 34, 2);
  /* Die Naht ist aufgeschmolzener Werkstoff - ein eigener Bereich, dritter
     Schraffurwinkel, mit leichter Ueberhoehung im Stoss. */
  svgEl("path", {d:"M100 46 Q110 40 120 46 L120 80 Q110 86 100 80 Z",
    fill:schraffur(svg, k + "_3", 20), stroke:"currentColor",
    "stroke-width":BREIT, "stroke-linejoin":"round"}, g);
  txt(g, 110, 120, "Werkstoff selbst aufgeschmolzen", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.loeten = function(g, svg, k){
  fbTeil(g, svg, k, 20, 40, 110, 24, 1);
  fbTeil(g, svg, k, 90, 67, 110, 24, 2);
  /* Sehr duenne Schicht - geschwaerzt statt schraffiert (DIN ISO 128-50). */
  kasten(g, 90, 64, 40, 3, {fuell:"currentColor", ohneRand:true});
  txt(g, 110, 120, "Lot füllt den schmalen Spalt", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.kleben = function(g, svg, k){
  fbTeil(g, svg, k, 20, 34, 110, 24, 1);
  fbTeil(g, svg, k, 90, 65, 110, 24, 2);
  kasten(g, 90, 58, 40, 7, {fuell:"currentColor", ohneRand:true});
  txt(g, 110, 120, "Klebschicht überträgt durch Haftung",
      {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.nieten = function(g, svg, k){
  fbTeil(g, svg, k, 20, 50, 180, 18, 1);
  fbTeil(g, svg, k, 20, 68, 180, 18, 2);
  /* Der Niet wird nicht geschnitten: Schaft und beide Koepfe deckend. */
  svgEl("path", {d:"M92 38 L128 38 L128 50 L120 50 L120 86 L128 86 L128 98 "
    + "L92 98 L92 86 L100 86 L100 50 L92 50 Z", fill:"var(--card)",
    stroke:"currentColor", "stroke-width":BREIT}, g);
  fbAchseV(g, 28, 108, 110);
  txt(g, 110, 124, "Schaft füllt und klemmt", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.clinchen = function(g, svg, k){
  /* Zwei Bleche ineinander durchgesetzt - beide geschnitten, gegenlaeufig. */
  svgEl("path", {d:"M20 50 L90 50 L96 66 L124 66 L130 50 L200 50 L200 64 L130 64 "
    + "L126 78 L94 78 L90 64 L20 64 Z", fill:schraffur(svg, k + "_1", 45),
    stroke:"currentColor", "stroke-width":BREIT}, g);
  svgEl("path", {d:"M20 64 L90 64 L94 78 L126 78 L130 64 L200 64 L200 78 L134 78 "
    + "L130 92 L90 92 L86 78 L20 78 Z", fill:schraffur(svg, k + "_2", -45),
    stroke:"currentColor", "stroke-width":BREIT}, g);
  txt(g, 110, 124, "Bleche ineinander durchgesetzt", {groesse:9.5, deckung:0.75});
};

FUEGEBILDER.schraubkleben = function(g, svg, k){
  var cx = 110, rd = 7, r3 = 5;
  var oben = 56, unten = 110;
  var yEnde = 90, yGew = 96, yBohr = 101;   /* Schraube, Gewinde, Bohrung */
  var spitze = r3 / Math.tan(Math.PI / 3);  /* 120 Grad eingeschlossen */

  /* Bauteil mit Grundlochgewinde. Die Schraffur wird nur bis zum
     Kerndurchmesser weggenommen - der Gewindegang darüber ist Werkstoff. */
  kasten(g, 30, oben, 160, unten - oben, {fuell:schraffur(svg, k + "_1", 45)});
  svgEl("path", {d:"M" + (cx - r3) + "," + oben
    + " L" + (cx - r3) + "," + yBohr
    + " L" + cx + "," + (yBohr + spitze)
    + " L" + (cx + r3) + "," + yBohr
    + " L" + (cx + r3) + "," + oben + " Z",
    fill:"var(--card)", stroke:"none"}, g);
  [-1, 1].forEach(function(v){
    linie(g, cx + v * r3, oben, cx + v * r3, yBohr, BREIT);   /* Kern, breit */
    linie(g, cx + v * r3, yBohr, cx, yBohr + spitze, BREIT);  /* Bohrerspitze */
    linie(g, cx + v * rd, oben, cx + v * rd, yGew, SCHMAL);   /* Nenn, schmal */
  });
  linie(g, cx - rd, yGew, cx + rd, yGew, BREIT);              /* Gewindeende */

  /* Die Schraube liegt davor: ungeschnitten, deckend, ganz mit Gewinde
     (ISO 4017). Sie setzt im Grundloch nicht auf. */
  fbVoll(g, cx - rd, 38, 2 * rd, yEnde - 38);
  [-1, 1].forEach(function(v){
    linie(g, cx + v * r3, 40, cx + v * r3, yEnde - 2, SCHMAL);
  });
  sechskantAnsicht(g, {achse:cx, von:22, bis:38, sw:30, s:1, faseAn:"von"});

  /* Der Klebstoff sitzt in den Gewindegängen - zu schmal für eine Schraffur,
     deshalb geschwärzt (DIN ISO 128-50). */
  [-1, 1].forEach(function(v){
    kasten(g, cx + v * rd - (v < 0 ? 1.6 : 0), oben + 1, 1.6, yEnde - oben - 2,
           {fuell:"currentColor", ohneRand:true});
  });
  fbAchseV(g, 14, 118, cx);
  txt(g, 110, 132, "Gewinde zusätzlich verklebt", {groesse:9.5, deckung:0.75});
};

