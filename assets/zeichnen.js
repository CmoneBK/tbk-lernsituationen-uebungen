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
var BREIT = 2.0, SCHMAL = 0.85;

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

/* Waagerechtes Maß mit Maßhilfslinien und Pfeilen. vonY = Kante des Objekts,
   von der die Hilfslinien ausgehen. Ist die Strecke zu kurz für Pfeile
   zwischen den Grenzen, zeigen sie von außen darauf. */
function mass(g, x1, x2, y, s, vonY){
  var k = svgEl("g", {}, g);
  var eng = (x2 - x1) < 34;

  if(vonY !== undefined){
    [x1, x2].forEach(function(x){
      linie(k, x, vonY, x, y + (y > vonY ? 3 : -3), SCHMAL, {deckung:.55});
    });
  }
  linie(k, eng ? x1 - 9 : x1, y, eng ? x2 + 9 : x2, y, SCHMAL);
  [[x1, eng ? -1 : 1], [x2, eng ? 1 : -1]].forEach(function(p){
    linie(k, p[0], y, p[0] + 6.5 * p[1], y - 2.6, SCHMAL);
    linie(k, p[0], y, p[0] + 6.5 * p[1], y + 2.6, SCHMAL);
  });
  /* Bei engen Maßen zeigen die Pfeile von außen herein; der Text muss dann
     höher sitzen, sonst liegt er auf ihnen. */
  txt(k, (x1 + x2) / 2, y - (eng ? 11 : 5), s);
  return k;
}

/* Senkrechtes Maß. links = Text links neben der Maßlinie. */
function massV(g, y1, y2, x, s, vonX, links){
  var k = svgEl("g", {}, g);
  if(vonX !== undefined){
    [y1, y2].forEach(function(y){
      linie(k, vonX, y, x + (x > vonX ? -3 : 3), y, SCHMAL, {deckung:.55});
    });
  }
  linie(k, x, y1, x, y2, SCHMAL);
  [[y1, 1], [y2, -1]].forEach(function(p){
    linie(k, x, p[0], x - 2.6, p[0] + 6.5 * p[1], SCHMAL);
    linie(k, x, p[0], x + 2.6, p[0] + 6.5 * p[1], SCHMAL);
  });
  txt(k, links ? x - 6 : x + 6, (y1 + y2) / 2 + 4, s,
      {anker: links ? "end" : "start"});
  return k;
}

/* Mittellinie (Strichpunkt). */
function achse(g, x1, x2, y){
  linie(g, x1, y, x2, y, SCHMAL, {strich:"10 3 2 3", deckung:.5});
}

/* Schraffur für geschnittene Bauteile. Die ID muss je Bild eindeutig sein,
   sonst greifen alle Bilder auf dasselbe Muster zu. */
function schraffur(svg, id, winkel){
  var defs = svg.querySelector("defs") || svgEl("defs", {}, svg);
  var p = svgEl("pattern", {id:id, width:7, height:7,
    patternUnits:"userSpaceOnUse",
    patternTransform:"rotate(" + winkel + ")"}, defs);
  svgEl("line", {x1:0, y1:0, x2:0, y2:7, stroke:"currentColor",
    "stroke-width":0.85, opacity:0.6}, p);
  return "url(#" + id + ")";
}

/* Sechskantschraube in Ansicht, Achse waagerecht, Kopf links.
   Maße in mm, s = Pixel je mm. Liefert die Teilgruppen zurück, damit Teil 1
   einzelne Bereiche hervorheben kann. */
function schraube(eltern, o){
  var s = o.s, y = o.y, x = o.x;
  var rd = o.d * s / 2;
  var rk = (o.sw || o.d * 1.5) * s / 2;
  var kx = o.k * s;
  var lx = o.l * s;
  var bx = Math.min(o.b, o.l) * s;
  var r3 = (o.d - 1.2269 * o.P) * s / 2;
  var teile = o.teile || {};

  var gKopf    = gruppe(eltern, teile.kopf);
  var gSchaft  = gruppe(eltern, teile.schaft);
  var gGewinde = gruppe(eltern, teile.gewinde);

  kasten(gKopf, x, y - rk, kx, 2 * rk, {fuell:"var(--card)"});
  linie(gKopf, x + kx * 0.24, y - rk, x + kx * 0.24, y + rk, SCHMAL, {deckung:.6});

  var gewindeVon = x + kx + (lx - bx);
  if(lx - bx > 0.5){
    kasten(gSchaft, x + kx, y - rd, lx - bx, 2 * rd, {fuell:"var(--card)"});
  }

  /* Gewinde: Außendurchmesser breit, Kerndurchmesser schmal. */
  kasten(gGewinde, gewindeVon, y - rd, bx, 2 * rd, {fuell:"var(--card)"});
  var ende = x + kx + lx;
  [y - r3, y + r3].forEach(function(yy){
    linie(gGewinde, gewindeVon + 1, yy, ende - 1, yy, SCHMAL);
  });
  linie(gGewinde, ende - rd * 0.45, y - rd, ende, y - rd * 0.55, SCHMAL);
  linie(gGewinde, ende - rd * 0.45, y + rd, ende, y + rd * 0.55, SCHMAL);

  achse(eltern, x - 8, ende + 10, y);

  return {kopf:gKopf, schaft:gSchaft, gewinde:gGewinde,
          kopfEnde:x + kx, gewindeVon:gewindeVon, ende:ende, rd:rd, rk:rk};
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
  achse(eltern, x - 8, ende + 10, y);
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
