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
  /* "hof" legt eine Kontur in der Hintergrundfarbe hinter die Schrift. Das
     ist fuer die kleinen Prinzipbilder gedacht, in denen unter der
     Zeichnung keine Zeile mehr frei ist: Die Linie verschwindet dann hinter
     der Schrift, statt sie zu zerschneiden. In den technischen Zeichnungen
     wird es nicht benutzt - dort weicht der Text aus. */
  if(opt.hof){
    /* Die Farbe der Flaeche, auf der die Zeichnung liegt - nicht Weiss:
       Im dunklen Modus waere Weiss genau die Schriftfarbe, und der Hof
       fraesse die Buchstaben auf. */
    t.setAttribute("stroke", "var(--card, #ffffff)");
    t.setAttribute("stroke-width", 3);
    t.setAttribute("stroke-linejoin", "round");
    t.setAttribute("paint-order", "stroke");
  }
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
function schraffur(svg, id, winkel, abstand){
  /* Teilen sich mehrere Flaechen dieselbe Schraffur, wird das Muster nur
     einmal angelegt - sonst stehen doppelte IDs im SVG.

     "abstand" ist der Kachelabstand in Bildpunkten, normal 7. DIN ISO
     128-50 laesst benachbarte Teile "gegenlaeufig ODER versetzt" zu: Wo
     drei Flaechen aneinanderstossen, reichen zwei Richtungen nicht, und
     dann hilft ein anderer Abstand bei gleicher Richtung. */
  if(svg.querySelector("#" + id)) return "url(#" + id + ")";
  var a = abstand || 7;
  var defs = svg.querySelector("defs") || svgEl("defs", {}, svg);
  var p = svgEl("pattern", {id:id, width:a, height:a,
    patternUnits:"userSpaceOnUse",
    patternTransform:"rotate(" + winkel + ")"}, defs);
  svgEl("line", {x1:0, y1:0, x2:0, y2:a, stroke:"currentColor",
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
  var kopfSk = sechskantAnsicht(gKopf, {waagerecht:true, achse:y, von:x,
    bis:x + kx, sw:sw, s:s, faseAn:"von"});

  /* Die Mittellinie gehoert ueber das laengste zusammengehoerige Merkmal
     hinaus. Steckt die Schraube in einem Grundloch, ist das nicht ihr Ende,
     sondern der Bohrungsgrund - dann sagt der Aufrufer, bis wohin. */
  achse(eltern, x - 8, Math.max(ende + 10, o.achseBis || 0), y);

  return {kopf:gKopf, schaft:gSchaft, gewinde:gGewinde,
          /* Wie tief die Fase am Kopf reicht: Erst dahinter ist der Umriss
             das Eckenmass, vorher nur die Schluesselweite. Wer e bemasst,
             braucht das. */
          kopfTief:kopfSk.tief,
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

  /* Die Steigung wird von Spitze zu Spitze gemessen - die
     Masshilfslinien setzen auf der Spitzenlinie an, nicht daneben. */
  mass(g, x + px * 0.25, x + px * 1.25, oben - 15, "P", oben);
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
  pressverband: "Links der Querschnitt: Welle in der Nabe, ohne Nut und ohne Verzahnung. Rechts ein Schaubild: Die Nabe wird mit Kraft auf die Welle gepresst",
  klemmverbindung: "Querschnitt: Die Nabe ist bis zur Bohrung geschlitzt, eine Schraube quer zum Schlitz zieht sie auf der Welle zusammen",
  spannsatz: "Kegelringe zwischen Welle und Nabe, axial verspannt",
  passfeder: "Querschnitt: Welle und Nabe haben je eine Nut, die Passfeder liegt in beiden. Ueber ihrem Ruecken bleibt Spiel",
  zahnwelle: "Querschnitt: Die Welle traegt Zaehne am ganzen Umfang, die Nabe die Gegenverzahnung",
  stift: "Laengsschnitt: Welle und Nabe sind quer durchbohrt, ein Stift steckt durch beide",
  schnapp: "Ein federnder Haken ist durch ein Loch im Blech gesteckt, seine Nase liegt unter dem Blech",
  bolzen: "Laengsschnitt: Ein Bolzen steckt durch die beiden Schenkel einer Gabel und das Auge dazwischen, gesichert mit einem Splint",
  falz: "Zwei Blechkanten umgelegt und ineinander gehakt",
  schweissen: "Zwei Bauteile im Stoss, dazwischen eine Schweissnaht",
  loeten: "Zwei Teile mit schmalem Spalt, darin das Lot",
  kleben: "Zwei Bauteile ueberlappt, dazwischen die Klebschicht",
  nieten: "Zwei Bleche, von einem Niet mit Setzkopf und Schliesskopf zusammengehalten",
  clinchen: "Zwei Bleche ohne Zusatzteil ineinander durchgesetzt - der Napf wird nach unten breiter und haelt dadurch",
  schraubkleben: "Schraube im Gewinde, Klebstoff in den Gewindegaengen"
};

/* Bildunterschrift eines Fuegebildes. Die Bilder sind unterschiedlich hoch -
   die Zeile sitzt deshalb am Rand ihres eigenen Bildes, nicht auf einer
   festen Hoehe. */
function fbUnter(g, svg, text){
  var vb = (svg.getAttribute("viewBox") || "0 0 220 140").split(/[ ,]+/);
  var h = parseFloat(vb[3]) || 140;
  return txt(g, 110, h - 8, text, {groesse:9.5, deckung:0.75, hof:true});
}

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

/* Kreis mit breiter Umrisskante - der Querschnitt runder Teile. */
function fbKreis(g, cx, cy, r, fuell){
  return svgEl("circle", {cx:cx, cy:cy, r:r, fill:fuell || "none",
    stroke:"currentColor", "stroke-width":BREIT}, g);
}

/* Mittellinienkreuz, das ueber den Umriss hinaussteht. */
function fbKreuz(g, cx, cy, r){
  linie(g, cx - r - 7, cy, cx + r + 7, cy, SCHMAL, {strich:"12 2 2 2"});
  linie(g, cx, cy - r - 7, cx, cy + r + 7, SCHMAL, {strich:"12 2 2 2"});
}

/* Ein Vieleck aus Punktpaaren. */
function fbVieleck(g, punkte, fuell, strich){
  return svgEl("polygon", {points:punkte.join(" "), fill:fuell || "none",
    stroke:strich === false ? "none" : "currentColor",
    "stroke-width":BREIT}, g);
}

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
  fbUnter(g, svg, "Reibung in der Trennfuge");
};

FUEGEBILDER.pressverband = function(g, svg, k){
  /* Zwei Bilder nebeneinander. Der Pressverband hat kein Formelement - im
     Querschnitt sind es zwei Kreise, und genau das ist die Aussage. Was ihn
     ausmacht, sieht man erst beim Fuegen, deshalb rechts das Schaubild. */
  var mW = schraffur(svg, k + "_1", 45), mN = schraffur(svg, k + "_2", -45);

  /* Links: Querschnitt. Quer geschnitten wird auch die Welle - die Regel,
     dass sie ungeschnitten bleibt, gilt nur laengs zur Achse. */
  var cx = 54, cy = 58, rW = 15, rN = 32;
  fbKreis(g, cx, cy, rN, mN);
  fbKreis(g, cx, cy, rW, "var(--card)");
  fbKreis(g, cx, cy, rW, mW);
  fbKreuz(g, cx, cy, rN);

  /* Rechts: Schaubild, kein Schnitt - also keine Schraffur. */
  var y = 58, rw = 10, rn = 22, ex = 5, exW = ex * rw / rn;
  var xL = 118, xR = 212, nL = 150, nR = 184;

  function ruecken(x, r, rx){          /* ferne Stirnflaeche: nur ihr Ruecken */
    svgEl("path", {d:"M" + x + "," + (y - r) + " A" + rx + "," + r
      + " 0 0 0 " + x + "," + (y + r), fill:"none", stroke:"currentColor",
      "stroke-width":BREIT}, g);
  }
  ruecken(xL, rw, exW);
  [-1, 1].forEach(function(v){
    linie(g, xL, y + v * rw, nL, y + v * rw, BREIT);
  });
  /* Die Nabe ist undurchsichtig: Was von der Welle in ihr steckt, sieht man
     nicht. */
  svgEl("path", {d:"M" + nL + "," + (y - rn) + " L" + nR + "," + (y - rn)
    + " A" + ex + "," + rn + " 0 0 1 " + nR + "," + (y + rn)
    + " L" + nL + "," + (y + rn)
    + " A" + ex + "," + rn + " 0 0 1 " + nL + "," + (y - rn) + " Z",
    fill:"var(--card)", stroke:"currentColor", "stroke-width":BREIT}, g);
  svgEl("ellipse", {cx:nR, cy:y, rx:exW, ry:rw, fill:"var(--card)",
    stroke:"currentColor", "stroke-width":BREIT}, g);
  [-1, 1].forEach(function(v){
    linie(g, nR, y + v * rw, xR, y + v * rw, BREIT);
  });
  svgEl("ellipse", {cx:xR, cy:y, rx:exW, ry:rw, fill:"var(--card)",
    stroke:"currentColor", "stroke-width":BREIT}, g);

  /* Der Pfeil erklaert das Fuegen und gehoert nicht zur Zeichnung. */
  var e = svgEl("g", {"class":"erklaer"}, g);
  linie(e, 206, 22, 172, 22, BREIT);
  pfeil(e, 166, 22, -1, 0);
  txt(e, 186, 14, "aufpressen", {groesse:9.5, deckung:0.8});

  fbUnter(g, svg, "Übermaß presst – kein Formelement");
};

FUEGEBILDER.klemmverbindung = function(g, svg, k){
  /* Querschnitt: Erst quer zur Achse sieht man den Schlitz - und ohne ihn
     ist die Klemmnabe von einem Pressverband nicht zu unterscheiden. */
  var cx = 92, cy = 62, rW = 20, rN = 42, hs = 3;
  var ax = cx + 48, ay = 34;           /* Auge: rechte Kante, halbe Hoehe */
  var mW = schraffur(svg, k + "_1", 45), mN = schraffur(svg, k + "_2", -45);

  /* Die Nabe ist Kreis und Auge in einem Stueck - also auch ein Umriss.
     Wo das Auge anfaengt, hoert der Kreisbogen auf. */
  var xk = cx + Math.sqrt(rN * rN - ay * ay);
  var umriss = "M" + xk + "," + (cy - ay)
    + " L" + ax + "," + (cy - ay)
    + " L" + ax + "," + (cy + ay)
    + " L" + xk + "," + (cy + ay)
    + " A" + rN + "," + rN + " 0 1 1 " + xk + "," + (cy - ay) + " Z";
  svgEl("path", {d:umriss, fill:mN, stroke:"currentColor",
    "stroke-width":BREIT}, g);

  /* Der Schlitz reicht von der Bohrung bis nach aussen durch das Auge. Er
     macht die Nabe federnd. */
  var xi = cx + Math.sqrt(rW * rW - hs * hs);
  kasten(g, xi, cy - hs, ax - xi, 2 * hs, {fuell:"var(--card)", ohneRand:true});
  [-1, 1].forEach(function(v){
    linie(g, xi, cy + v * hs, ax, cy + v * hs, BREIT);
  });

  svgEl("circle", {cx:cx, cy:cy, r:rW, fill:"var(--card)", stroke:"none"}, g);
  fbKreis(g, cx, cy, rW, mW);
  fbKreuz(g, cx, cy, rN);

  /* Klemmschraube quer zum Schlitz, im Auge. Sie ist nicht geschnitten:
     deckende Flaeche, Kanten, Gewinde - aussen breit, Kern schmal. */
  var sx = cx + 34, rd = 6, r3 = 4.2;
  var oben = cy - ay - 2, unten = cy + ay - 4;
  fbVoll(g, sx - rd, oben, 2 * rd, unten - oben);
  [-1, 1].forEach(function(v){
    linie(g, sx + v * r3, cy + 6, sx + v * r3, unten - 2, SCHMAL);
  });
  linie(g, sx - rd, cy + 6, sx + rd, cy + 6, BREIT);   /* Gewindeende */
  sechskantAnsicht(g, {achse:sx, von:oben - 14, bis:oben, sw:18, s:1,
    faseAn:"von"});
  linie(g, sx, oben - 22, sx, unten + 8, SCHMAL, {strich:"12 2 2 2"});

  fbUnter(g, svg, "Schlitz zugezogen – Nabe klemmt");
};

FUEGEBILDER.spannsatz = function(g, svg, k){
  /* Hier bleibt der Laengsschnitt: Der Kegel wirkt axial, quer zur Achse
     waeren es nur konzentrische Kreise. */
  /* Vier Teile grenzen aneinander: Nabe, Aussenring, Innenring, Welle.
     Drei davon sind geschnitten und brauchen drei Schraffurrichtungen. */
  var y = 66, rw = 12;
  var mA = schraffur(svg, k + "_1", 45), mI = schraffur(svg, k + "_3", 20);
  fbTeil(g, svg, k, 66, 14, 92, 24, 2);               /* Nabe */
  fbTeil(g, svg, k, 66, 94, 92, 24, 2);
  /* Zwei Ringe, die sich ineinander schieben: der aeussere innen kegelig,
     der innere aussen kegelig. Beim Anziehen keilen sie sich. */
  [-1, 1].forEach(function(v){
    var a = y - v * 28, b = y - v * 12;               /* aussen, innen */
    fbVieleck(g, [[72, a], [152, a], [152, a + v * 3], [72, b - v * 2]], mA);
    fbVieleck(g, [[72, b - v * 2], [152, a + v * 3], [152, b], [72, b]], mI);
  });
  fbWelle(g, 16, y - rw, 188, 2 * rw);                /* Welle, ungeschnitten */
  fbAchse(g, 8, 212, y);
  fbUnter(g, svg, "Kegelringe pressen");
};

FUEGEBILDER.passfeder = function(g, svg, k){
  /* Querschnitt: Nur quer sieht man beide Nuten und die Feder darin. */
  var cx = 110, cy = 60, rW = 26, rN = 50, nb = 11;
  var tW = 11, tN = 9;                                /* Nuttiefen */
  var mW = schraffur(svg, k + "_1", 45), mN = schraffur(svg, k + "_2", -45);
  var mF = schraffur(svg, k + "_3", 20);
  var yW = cy - Math.sqrt(rW * rW - nb * nb);         /* Nut trifft die Welle */

  fbKreis(g, cx, cy, rN, mN);
  /* Nur die Flaeche freistellen, nicht schon die Kante ziehen - die bringt
     die genutete Welle mit, und dort fehlt sie an der Nut. */
  svgEl("circle", {cx:cx, cy:cy, r:rW, fill:"var(--card)", stroke:"none"}, g);
  /* Nut in der Nabe: Der Ausschnitt nimmt die Schraffur wieder weg. */
  kasten(g, cx - nb, yW - tN, 2 * nb, tN + 2, {fuell:"var(--card)",
    ohneRand:true});
  [-1, 1].forEach(function(v){
    linie(g, cx + v * nb, yW - tN, cx + v * nb, yW, BREIT);
  });
  linie(g, cx - nb, yW - tN, cx + nb, yW - tN, BREIT);

  /* Welle mit Nut: ein Umriss, kein aufgesetztes Rechteck. */
  svgEl("path", {d:"M" + (cx - nb) + "," + yW
    + " L" + (cx - nb) + "," + (yW + tW)
    + " L" + (cx + nb) + "," + (yW + tW)
    + " L" + (cx + nb) + "," + yW
    + " A" + rW + "," + rW + " 0 1 1 " + (cx - nb) + "," + yW + " Z",
    fill:mW, stroke:"currentColor", "stroke-width":BREIT}, g);

  /* Die Feder wird quer geschnitten - also schraffiert, in dritter Richtung.
     Ueber ihrem Ruecken bleibt Spiel: Sie traegt an den Flanken. */
  kasten(g, cx - nb, yW - tN + 3, 2 * nb, tW + tN - 3, {fuell:"var(--card)"});
  kasten(g, cx - nb, yW - tN + 3, 2 * nb, tW + tN - 3, {fuell:mF});
  fbKreuz(g, cx, cy, rN);
  fbUnter(g, svg, "Feder in beiden Nuten");
};

FUEGEBILDER.zahnwelle = function(g, svg, k){
  /* Querschnitt: Die Zaehne laufen um den ganzen Umfang - laengs sieht man
     davon nur Striche. */
  var cx = 110, cy = 60, rF = 24, rK = 32, rN = 50, z = 8;
  var mW = schraffur(svg, k + "_1", 45), mN = schraffur(svg, k + "_2", -45);

  /* Das Zahnprofil einmal berechnen: Fuss - Flanke - Kopf - Flanke - Fuss. */
  var p = [];
  for(var i = 0; i < z; i++){
    var a = i * 2 * Math.PI / z;
    [[-0.30, rF], [-0.15, rK], [0.15, rK], [0.30, rF]].forEach(function(q){
      p.push([(cx + Math.cos(a + q[0]) * q[1]).toFixed(1),
              (cy + Math.sin(a + q[0]) * q[1]).toFixed(1)]);
    });
  }
  fbKreis(g, cx, cy, rN, mN);
  /* Die Bohrung der Nabe ist die Gegenverzahnung - dasselbe Profil. */
  fbVieleck(g, p, "var(--card)", false);
  fbVieleck(g, p, mW);
  fbKreuz(g, cx, cy, rN);
  fbUnter(g, svg, "Zähne teilen die Last");
};

FUEGEBILDER.stift = function(g, svg, k){
  /* Laengsschnitt: Die Welle wird laengs nicht geschnitten und bleibt
     deshalb ohne Schraffur - die Nabe um sie herum ist geschnitten. */
  var y = 70, rw = 15;
  fbTeil(g, svg, k, 74, 30, 72, y - rw - 30, 2);
  fbTeil(g, svg, k, 74, y + rw, 72, 110 - (y + rw), 2);
  fbWelle(g, 16, y - rw, 188, 2 * rw);
  fbVoll(g, 103, 30, 14, 80);                         /* Stift, ungeschnitten */
  fbAchse(g, 8, 212, y);
  fbAchseV(g, 22, 118, 110);
  fbUnter(g, svg, "Stift quer durch Welle und Nabe");
};

FUEGEBILDER.schnapp = function(g, svg, k){
  /* Der Haken steckt durch ein Loch im Blech, seine Nase liegt darunter.
     Die schraegen Flanken sind die Einfuehrschraegen, die waagerechte
     Flaeche darueber haelt. */
  var m1 = schraffur(svg, k + "_1", 45);
  fbTeil(g, svg, k, 20, 70, 80, 22, 2);               /* Blech, links */
  fbTeil(g, svg, k, 136, 70, 64, 22, 2);              /* Blech, rechts */
  /* Der Haken steht im Loch mit Spiel - sonst koennte er beim Stecken nicht
     ausweichen. Seine Nase greift links und rechts deutlich unter das Blech. */
  fbVieleck(g, [[104, 32], [132, 32], [132, 92], [148, 92], [134, 112],
    [102, 112], [88, 92], [104, 92]], m1);
  /* Der Pfeil zeigt, wie gefuegt wird - Erklaerung, keine Zeichnung. Er
     steht ueber dem Haken, nicht ueber dem Blech. */
  var e = svgEl("g", {"class":"erklaer"}, g);
  linie(e, 118, 8, 118, 22, BREIT);
  pfeil(e, 118, 28, 0, 1);
  txt(e, 100, 20, "stecken", {anker:"end", groesse:9.5, deckung:0.8});
  fbUnter(g, svg, "Nase rastet unter dem Blech ein");
};

FUEGEBILDER.bolzen = function(g, svg, k){
  /* Laengsschnitt durch den Bolzen: Gabel, Lasche, Gabel. Der Bolzen selbst
     wird laengs nicht geschnitten. */
  var y = 66, rb = 13;
  fbTeil(g, svg, k, 46, 28, 26, 76, 1);               /* Gabel, beide Schenkel */
  fbTeil(g, svg, k, 148, 28, 26, 76, 1);
  fbTeil(g, svg, k, 72, 36, 76, 60, 2);               /* Lasche dazwischen */
  fbVoll(g, 30, y - rb, 174, 2 * rb);                 /* Bolzen */
  fbVoll(g, 22, y - 20, 8, 40);                       /* Bolzenkopf */
  /* Splint durch die Querbohrung: Ring oben, Schenkel unten gespreizt. */
  [-1, 1].forEach(function(v){
    linie(g, 192 + v * 3, y - rb, 192 + v * 3, y + rb, SCHMAL);
  });
  /* Oben die Oese, unten die beiden aufgebogenen Schenkel - so sieht man,
     dass es ein Splint ist und keine zweite Bohrung. */
  svgEl("path", {d:"M186," + (y - rb) + " A6,8 0 0 1 198," + (y - rb),
    fill:"none", stroke:"currentColor", "stroke-width":SCHMAL}, g);
  linie(g, 189, y + rb, 181, y + rb + 16, SCHMAL);
  linie(g, 195, y + rb, 203, y + rb + 16, SCHMAL);
  fbAchse(g, 14, 212, y);
  fbUnter(g, svg, "Bolzen im Auge, mit Splint gesichert");
};

FUEGEBILDER.falz = function(g, svg, k){
  /* Zwei Blechraender, jeder um 180 Grad umgelegt und ineinander gehakt -
     vier Lagen uebereinander. Vorher war es eine blosse Stufe. */
  var m1 = schraffur(svg, k + "_1", 45), m2 = schraffur(svg, k + "_2", -45);
  fbVieleck(g, [[20, 44], [150, 44], [150, 71], [105, 71], [105, 62],
    [141, 62], [141, 53], [20, 53]], m1);
  fbVieleck(g, [[200, 80], [80, 80], [80, 53], [132, 53], [132, 62],
    [89, 62], [89, 71], [200, 71]], m2);
  fbUnter(g, svg, "Blechränder ineinander gehakt");
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
  /* Halbrundniet: Setzkopf und Schliesskopf sind Kalotten, nicht Kloetze.
     Kopfdurchmesser rund 1,6 d, Kopfhoehe rund 0,6 d. */
  var cx = 110, rd = 10, rk = 16, hk = 12, o = 50, u = 86;
  fbTeil(g, svg, k, 20, o, 180, (u - o) / 2, 1);
  fbTeil(g, svg, k, 20, (o + u) / 2, 180, (u - o) / 2, 2);
  /* Der Niet wird nicht geschnitten: eine deckende Flaeche, eine Kontur. */
  svgEl("path", {d:"M" + (cx - rk) + "," + o
    + " A" + rk + "," + hk + " 0 0 1 " + (cx + rk) + "," + o
    + " L" + (cx + rd) + "," + o
    + " L" + (cx + rd) + "," + u
    + " L" + (cx + rk) + "," + u
    + " A" + rk + "," + hk + " 0 0 0 " + (cx - rk) + "," + u
    + " L" + (cx - rd) + "," + u
    + " L" + (cx - rd) + "," + o + " Z",
    fill:"var(--card)", stroke:"currentColor", "stroke-width":BREIT}, g);
  fbAchseV(g, 30, 108, cx);
  fbUnter(g, svg, "Schaft füllt, Köpfe halten");
};

FUEGEBILDER.clinchen = function(g, svg, k){
  /* Der Napf wird nach unten breiter - diese Hinterschneidung haelt die
     Verbindung. Ohne sie waeren es nur zwei durchgedrueckte Bleche. */
  /* Beide Bleche folgen derselben Napfform. Die Wand laeuft nach unten
     auseinander - diese Hinterschneidung haelt die Verbindung.
     Die Blechdicke ist senkrecht zur Wand abgetragen, nicht senkrecht nach
     unten: Sonst wird die schraege Wand zum Strich. */
  fbVieleck(g, [[16, 44], [96.7, 44], [82.7, 78], [137.3, 78], [123.3, 44],
    [204, 44], [204, 53], [136.7, 53], [150.7, 87], [69.3, 87], [83.3, 53],
    [16, 53]], schraffur(svg, k + "_1", 45));
  fbVieleck(g, [[16, 53], [83.3, 53], [69.3, 87], [150.7, 87], [136.7, 53],
    [204, 53], [204, 62], [150.2, 62], [164.2, 96], [55.9, 96], [69.9, 62],
    [16, 62]], schraffur(svg, k + "_2", -45));
  fbUnter(g, svg, "Bleche hinterschnitten durchgesetzt");
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
  fbUnter(g, svg, "Gewinde zusätzlich verklebt");
};

