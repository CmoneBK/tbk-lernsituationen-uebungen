/* Schweißnahtsymbole nach DIN EN ISO 2553 (2022-07).
 *
 * Eingebunden mit einer Zeile, ohne weitere Voraussetzungen:
 *
 *     <script src="../../assets/schweissnaht.js"></script>
 *
 * Der Baustein steht bewusst fuer sich: Die Lektion im Werkzeugrepo bringt
 * eigene Funktionen namens `linie`, `txt` und `pfeil` mit, mit anderen
 * Signaturen. Wer sich hier etwas ausliehe, bekaeme je nach Reihenfolge
 * das eine oder das andere. Deshalb haben die Helfer hier eigene Namen und
 * stehen in einer Kapsel; nach aussen sichtbar sind nur `SN_*`,
 * `schweissSinnbild`, `schweissStoss` und `schweissName`.
 *
 * Dieselbe Datei liegt in zwei Repos (Material und Werkzeuge) - wird sie
 * geändert, gehört sie in beide kopiert, wie assets/zeichnen.js auch.
 *
 * Woher die Formen stammen
 * ------------------------
 * Tabellenbuch Metall, Seiten 127 bis 130: Lage der Symbole in Zeichnungen,
 * Grundsymbole, kombinierte Grundsymbole für symmetrische beidseitige
 * Nähte, Zusatzsymbole und die Bemaßungsbeispiele. Die Symbole sind dort
 * abgebildet; hier sind sie nachgezeichnet, nicht neu erfunden.
 *
 * Wie ein Sinnbild aufgebaut ist
 * ------------------------------
 *   - Die **Pfeillinie** zeigt auf den Stoß. Sie ist schräg und trägt eine
 *     ausgefüllte Spitze.
 *   - Die **Bezugs-Volllinie** liegt waagerecht am Knick der Pfeillinie.
 *     Ein Symbol an ihr meint die **Pfeilseite**.
 *   - Die **Bezugs-Strichlinie** verläuft parallel dazu, darüber oder
 *     darunter. Ein Symbol an ihr meint die **Gegenseite**.
 *   - Bei symmetrischen beidseitigen Nähten entfällt die Strichlinie; dann
 *     steht ein kombiniertes Grundsymbol über und unter der Volllinie.
 *
 * Die Maßangaben stehen **vor** dem Symbol (Nahtdicke a, z oder s) und
 * **dahinter** die Stückelung n × l (e).
 *
 * Alles wird in currentColor gezeichnet, wie in zeichnen.js festgelegt.
 */

(function (welt) {
  "use strict";

  var NS_SVG = "http://www.w3.org/2000/svg";
  /* Dieselben zwei Linienbreiten wie in zeichnen.js: breit fuer
     Koerperkanten, schmal fuer alles Zeichnerische. */
  var SN_BREIT = 2.0, SN_SCHMAL = 1.0;

  function snEl(name, attr, eltern) {
    var e = document.createElementNS(NS_SVG, name);
    for (var k in attr) if (attr.hasOwnProperty(k)) e.setAttribute(k, attr[k]);
    if (eltern) eltern.appendChild(e);
    return e;
  }

  function snLinie(g, x1, y1, x2, y2, w) {
    return snEl("line", {x1: x1, y1: y1, x2: x2, y2: y2,
      stroke: "currentColor", "stroke-width": w || SN_BREIT,
      "stroke-linecap": "round"}, g);
  }

  function snKasten(g, x, y, w, h, strich) {
    return snEl("rect", {x: x, y: y, width: w, height: h, fill: "none",
      stroke: "currentColor", "stroke-width": strich || SN_BREIT}, g);
  }

  function snTxt(g, x, y, s, o) {
    o = o || {};
    var t = snEl("text", {x: x, y: y, fill: "currentColor",
      "font-size": o.groesse || 11.5, "font-family": "inherit",
      "text-anchor": o.anker || "middle", "font-weight": 500}, g);
    t.textContent = s;
    return t;
  }

  /* Massepfeil nach DIN ISO 129: ausgefuelltes Dreieck, rund drei mal so
     lang wie breit; die Spitze liegt auf dem Punkt. */
  function snPfeil(g, x, y, dx, dy) {
    var L = 9, B = 1.55;
    var bx = x - L * dx, by = y - L * dy;
    return snEl("polygon", {points: [
      x.toFixed(2) + "," + y.toFixed(2),
      (bx - B * dy).toFixed(2) + "," + (by + B * dx).toFixed(2),
      (bx + B * dy).toFixed(2) + "," + (by - B * dx).toFixed(2)
    ].join(" "), fill: "currentColor"}, g);
  }

  /* Grundhöhe eines Symbols. Die Symbole sitzen auf der Bezugslinie und
     ragen um diese Höhe nach oben oder unten. */
  var SN_H = 13;

  /* ---------- die Grundsymbole ----------
   *
   * Jede Funktion zeichnet ihr Symbol so, dass es auf (x, y) steht - das ist
   * der Punkt auf der Bezugslinie - und um h in Richtung `ri` ragt. `ri` ist
   * -1 für oberhalb der Linie (in SVG zählt y nach unten) und +1 darunter.
   * Die zurückgegebene Zahl ist die Breite, die das Symbol belegt; danach
   * richtet sich, wo die nächste Angabe steht.
   */
  var SN_SYMBOLE = {

    /* I-Naht: zwei kurze Striche nebeneinander, ‖ */
    i: {name: "I-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.34;
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x + b / 2, y, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* V-Naht: die Spitze sitzt auf der Linie, die Schenkel öffnen sich. */
    v: {name: "V-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.9;
      snLinie(g, x, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x, y, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* Y-Naht: wie die V-Naht, aber mit Steg bis zur Linie. */
    y: {name: "Y-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.9, s = h * 0.38;
      snLinie(g, x, y, x, y + ri * s, SN_SCHMAL);
      snLinie(g, x, y + ri * s, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x, y + ri * s, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* HV-Naht: die halbe V-Naht - eine Flanke steht senkrecht. */
    hv: {name: "HV-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.62;
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x - b / 2, y, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* HY-Naht: die halbe Y-Naht, mit Steg. */
    hy: {name: "HY-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.62, s = h * 0.38;
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * s, SN_SCHMAL);
      snLinie(g, x - b / 2, y + ri * s, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* U-Naht: ein kurzer Steg auf der Linie, darüber eine gerundete Wanne,
       deren Schenkel nach außen auslaufen. */
    u: {name: "U-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.9, s = h * 0.26, r = h * 0.26;
      var yw = y + ri * s;                 /* Boden der Wanne */
      var yr = y + ri * (s + r);           /* wo die Rundung endet */
      snLinie(g, x, y, x, yw, SN_SCHMAL);
      snEl("path", {d: "M " + (x - r) + " " + yr
        + " Q " + (x - r) + " " + yw + " " + x + " " + yw
        + " Q " + (x + r) + " " + yw + " " + (x + r) + " " + yr,
        fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      snLinie(g, x - r, yr, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x + r, yr, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* HU-Naht: die halbe U-Naht - eine Flanke senkrecht, eine gerundet. */
    hu: {name: "HU-Naht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.66, s = h * 0.26, r = h * 0.26;
      var yw = y + ri * s, yr = y + ri * (s + r);
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snEl("path", {d: "M " + (x - b / 2) + " " + yw
        + " Q " + (x - b / 2 + r) + " " + yw + " "
        + (x - b / 2 + r) + " " + yr,
        fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      snLinie(g, x - b / 2 + r, yr, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* Bördelnaht: zwei hohle Flanken, die sich zu einer Spitze treffen. */
    boerdel: {name: "Bördelnaht", zeichne: function (g, x, y, h, ri) {
      var b = h * 1.0;
      snEl("path", {d: "M " + (x - b / 2) + " " + y
        + " Q " + (x - b * 0.14) + " " + y + " " + x + " " + (y + ri * h)
        + " Q " + (x + b * 0.14) + " " + y + " " + (x + b / 2) + " " + y,
        fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      return b;
    }},

    /* Kehlnaht: rechtwinkliges Dreieck, die senkrechte Kathete links. */
    kehl: {name: "Kehlnaht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.95;
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x - b / 2, y + ri * h, x + b / 2, y, SN_SCHMAL);
      snLinie(g, x - b / 2, y, x + b / 2, y, SN_SCHMAL);
      return b;
    }},

    /* Steilflankennaht: fast senkrechte Flanken, oben leicht ausgestellt. */
    steilflanke: {name: "Steilflankennaht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.8, e = h * 0.62;
      snLinie(g, x - b * 0.16, y, x - b * 0.16, y + ri * e, SN_SCHMAL);
      snLinie(g, x + b * 0.16, y, x + b * 0.16, y + ri * e, SN_SCHMAL);
      snLinie(g, x - b * 0.16, y + ri * e, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x + b * 0.16, y + ri * e, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* Halbsteilflankennaht: davon die Hälfte. */
    halbsteilflanke: {name: "Halbsteilflankennaht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.6, e = h * 0.62;
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x + b * 0.1, y, x + b * 0.1, y + ri * e, SN_SCHMAL);
      snLinie(g, x + b * 0.1, y + ri * e, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* Stirnnaht: zwei Rechtecke nebeneinander, oben geschlossen. */
    stirn: {name: "Stirnnaht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.95, s = b * 0.32;
      [-1, 1].forEach(function (v) {
        var m = x + v * s * 0.95;
        snLinie(g, m - s / 2, y, m - s / 2, y + ri * h, SN_SCHMAL);
        snLinie(g, m + s / 2, y, m + s / 2, y + ri * h, SN_SCHMAL);
        snLinie(g, m - s / 2, y + ri * h, m + s / 2, y + ri * h, SN_SCHMAL);
      });
      return b;
    }},

    /* Lochnaht: ein Rechteck, unten offen. */
    loch: {name: "Lochnaht", zeichne: function (g, x, y, h, ri) {
      var b = h * 0.9;
      snLinie(g, x - b / 2, y, x - b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x + b / 2, y, x + b / 2, y + ri * h, SN_SCHMAL);
      snLinie(g, x - b / 2, y + ri * h, x + b / 2, y + ri * h, SN_SCHMAL);
      return b;
    }},

    /* Schmelzgeschweißte Punktnaht: ein Kreis auf der Linie. */
    punkt: {name: "schmelzgeschweißte Punktnaht", zeichne: function (g, x, y, h, ri) {
      var r = h * 0.36;
      snEl("circle", {cx: x, cy: y + ri * r, r: r, fill: "none",
        stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      return r * 2;
    }},

    /* Widerstandsgeschweißte Punktnaht: Kreis mit Strich hindurch. */
    punktWiderstand: {name: "widerstandsgeschweißte Punktnaht",
      zeichne: function (g, x, y, h, ri) {
        var r = h * 0.36;
        snEl("circle", {cx: x, cy: y, r: r, fill: "none",
          stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
        snLinie(g, x - r * 1.5, y, x + r * 1.5, y, SN_SCHMAL);
        return r * 3;
      }},

    /* Auftragsschweißung: zwei Buckel auf der Linie. */
    auftrag: {name: "Auftragsschweißung", zeichne: function (g, x, y, h, ri) {
      var r = h * 0.32;
      [-1, 1].forEach(function (v) {
        var m = x + v * r;
        snEl("path", {d: "M " + (m - r) + " " + y + " A " + r + " " + r
          + " 0 0 " + (ri < 0 ? 1 : 0) + " " + (m + r) + " " + y,
          fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      });
      return r * 4;
    }},

    /* Bolzenschweißverbindung: Kreis mit Kreuz. */
    bolzen: {name: "Bolzenschweißverbindung", zeichne: function (g, x, y, h, ri) {
      var r = h * 0.36, d = r * 0.71;
      snEl("circle", {cx: x, cy: y + ri * r, r: r, fill: "none",
        stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      snLinie(g, x - d, y + ri * r - d, x + d, y + ri * r + d, SN_SCHMAL);
      snLinie(g, x - d, y + ri * r + d, x + d, y + ri * r - d, SN_SCHMAL);
      return r * 2;
    }},
  };

  /* ---------- kombinierte Grundsymbole ----------
   *
   * Symmetrische beidseitige Nähte tragen ein Symbol über UND unter der
   * Bezugs-Volllinie; eine Strichlinie gibt es dann nicht (Seite 129).
   */
  var SN_KOMBI = {
    dv:   {name: "Doppel-V-Naht (DV-Naht)",        teile: ["v", "v"]},
    dhv:  {name: "Doppel-HV-Naht (DHV-Naht)",      teile: ["hv", "hv"]},
    du:   {name: "Doppel-U-Naht (DU-Naht)",        teile: ["u", "u"]},
    dy:   {name: "Doppel-Y-Naht (DY-Naht)",        teile: ["y", "y"]},
    dhy:  {name: "Doppel-HY-Naht mit Kehlnaht",    teile: ["hy", "kehl"]},
    dkehl: {name: "Doppel-Kehlnaht",               teile: ["kehl", "kehl"]},
  };

  /* ---------- Zusatzsymbole ----------
   *
   * Sie sitzen auf dem Grundsymbol, außen. `ri` zeigt wieder von der
   * Bezugslinie weg.
   */
  var SN_ZUSATZ = {
    flach: {name: "flach nachbearbeitet", zeichne: function (g, x, y, h, ri, b) {
      snLinie(g, x - b / 2, y + ri * h, x + b / 2, y + ri * h, SN_SCHMAL);
    }},
    konvex: {name: "konvex (gewölbt)", zeichne: function (g, x, y, h, ri, b) {
      snEl("path", {d: "M " + (x - b / 2) + " " + (y + ri * h)
        + " Q " + x + " " + (y + ri * (h + b * 0.45)) + " "
        + (x + b / 2) + " " + (y + ri * h),
        fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
    }},
    konkav: {name: "konkav (hohl)", zeichne: function (g, x, y, h, ri, b) {
      snEl("path", {d: "M " + (x - b / 2) + " " + (y + ri * h)
        + " Q " + x + " " + (y + ri * (h - b * 0.45)) + " "
        + (x + b / 2) + " " + (y + ri * h),
        fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
    }},
    gegenlage: {name: "Gegenlage", zeichne: function (g, x, y, h, ri, b) {
      var r = b * 0.55;
      snEl("path", {d: "M " + (x - r) + " " + y + " A " + r + " " + r
        + " 0 0 " + (ri < 0 ? 0 : 1) + " " + (x + r) + " " + y,
        fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
    }},
    wurzel: {name: "Wurzelüberhöhung", zeichne: function (g, x, y, h, ri, b) {
      var r = b * 0.5;
      snEl("path", {d: "M " + (x - r) + " " + y + " A " + r + " " + r
        + " 0 0 " + (ri < 0 ? 1 : 0) + " " + (x + r) + " " + y + " Z",
        fill: "currentColor", stroke: "none"}, g);
    }},
    kerbfrei: {name: "Nahtübergänge kerbfrei", zeichne: function (g, x, y, h, ri, b) {
      var r = b * 0.2;
      [-1, 1].forEach(function (v) {
        var m = x + v * b * 0.3;
        snEl("path", {d: "M " + m + " " + (y + ri * (h + r * 2))
          + " A " + r + " " + r + " 0 0 " + (v < 0 ? 1 : 0) + " "
          + (m + v * r * 2) + " " + (y + ri * (h + r * 2)),
          fill: "none", stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
      });
    }},
  };

  /* ---------- Bezugslinie mit allem, was daran hängt ---------- */

  /* Zeichnet ein vollständiges Sinnbild.
   *
   *   o.x, o.y        Knick der Pfeillinie (dort beginnt die Bezugslinie)
   *   o.zielX, o.zielY  Spitze der Pfeillinie - worauf sie zeigt
   *   o.laenge        Länge der Bezugslinie (Vorgabe 120)
   *   o.nachLinks     Bezugslinie läuft nach links statt nach rechts
   *   o.pfeilseite    {art, mass, hinten, zusatz} - Symbol an der Volllinie
   *   o.gegenseite    dasselbe an der Strichlinie
   *   o.kombi         statt der beiden: ein kombiniertes Grundsymbol
   *   o.strichOben    Strichlinie über die Volllinie legen (Vorgabe: darunter)
   *   o.ringsum       Kreis am Knick
   *   o.baustelle     Fähnchen am Knick
   *   o.gabel         Zeilen der Gabel am Ende der Bezugslinie
   */
  function schweissSinnbild(eltern, o) {
    var g = snEl("g", {"class": "sinnbild"}, eltern);
    var h = o.hoehe || SN_H;
    var ri = o.nachLinks ? -1 : 1;
    var laenge = o.laenge || 120;
    var x0 = o.x, y0 = o.y;
    var xEnde = x0 + ri * laenge;

    /* Die Pfeillinie, schräg, mit ausgefüllter Spitze. */
    if (o.zielX !== undefined) {
      var dx = o.zielX - x0, dy = o.zielY - y0;
      var l = Math.sqrt(dx * dx + dy * dy) || 1;
      snLinie(g, x0, y0, o.zielX, o.zielY, SN_SCHMAL);
      snPfeil(g, o.zielX, o.zielY, dx / l, dy / l);
    }

    /* Die Bezugs-Volllinie. */
    snLinie(g, x0, y0, xEnde, y0, SN_SCHMAL);

    /* Die Bezugs-Strichlinie - nur, wenn es eine Gegenseite gibt und die
       Naht nicht symmetrisch ist. Bei kombinierten Grundsymbolen entfällt
       sie (Seite 129). */
    var abstand = h * 1.25;
    var yStrich = y0 + (o.strichOben ? -abstand : abstand);
    if (o.gegenseite && !o.kombi) {
      snEl("line", {x1: x0, y1: yStrich, x2: xEnde, y2: yStrich,
        stroke: "currentColor", "stroke-width": SN_SCHMAL,
        "stroke-dasharray": "8 4"}, g);
    }

    /* Ringsumnaht: kleiner Kreis am Knick. Baustellennaht: Fähnchen. */
    if (o.ringsum) {
      snEl("circle", {cx: x0, cy: y0, r: h * 0.28, fill: "none",
        stroke: "currentColor", "stroke-width": SN_SCHMAL}, g);
    }
    if (o.baustelle) {
      var fh = h * 1.15;
      snLinie(g, x0, y0, x0, y0 - fh, SN_SCHMAL);
      snEl("polygon", {points: [x0, y0 - fh, x0 + ri * fh * 0.62, y0 - fh * 0.78,
        x0, y0 - fh * 0.56].join(" ").replace(/,/g, " "),
        fill: "currentColor", stroke: "none"}, g);
    }

    /* Wo das erste Symbol steht: ein Stück hinter dem Knick. */
    var xSym = x0 + ri * (laenge * 0.45);

    function seite(angabe, yLinie, richtung) {
      if (!angabe) return;
      var art = SN_SYMBOLE[angabe.art];
      if (!art) return;
      var b = art.zeichne(g, xSym, yLinie, h, richtung);
      if (angabe.zusatz && SN_ZUSATZ[angabe.zusatz]) {
        SN_ZUSATZ[angabe.zusatz].zeichne(g, xSym, yLinie, h, richtung, b);
      }
      /* Die Nahtdicke steht vor dem Symbol, die Stückelung dahinter - und
         zwar auf der Seite des Symbols, damit die Schrift nicht auf der
         Bezugslinie liegt. */
      var yText = yLinie + (richtung < 0 ? -h * 0.25 : h * 1.1);
      if (angabe.mass) {
        snTxt(g, xSym - b / 2 - 4, yText, angabe.mass,
          {anker: "end", groesse: h * 0.85});
      }
      if (angabe.hinten) {
        snTxt(g, xSym + b / 2 + 4, yText, angabe.hinten,
          {anker: "start", groesse: h * 0.85});
      }
    }

    if (o.kombi && SN_KOMBI[o.kombi]) {
      var teile = SN_KOMBI[o.kombi].teile;
      var b1 = SN_SYMBOLE[teile[0]].zeichne(g, xSym, y0, h, -1);
      SN_SYMBOLE[teile[1]].zeichne(g, xSym, y0, h, 1);
      /* Beim kombinierten Symbol steht die Angabe über der Linie - unter ihr
         sitzt schon die zweite Hälfte des Symbols. */
      if (o.mass) {
        snTxt(g, xSym - b1 / 2 - 4, y0 - h * 0.25, o.mass,
          {anker: "end", groesse: h * 0.85});
      }
      if (o.hinten) {
        snTxt(g, xSym + b1 / 2 + 4, y0 - h * 0.25, o.hinten,
          {anker: "start", groesse: h * 0.85});
      }
    } else {
      seite(o.pfeilseite, y0, o.strichOben ? 1 : -1);
      seite(o.gegenseite, yStrich, o.strichOben ? -1 : 1);
    }

    /* Die Gabel am Ende: zwei kurze Striche, dahinter die Zeilen. */
    if (o.gabel && o.gabel.length) {
      var gh = h * 0.7;
      snLinie(g, xEnde, y0, xEnde + ri * gh, y0 - gh, SN_SCHMAL);
      snLinie(g, xEnde, y0, xEnde + ri * gh, y0 + gh, SN_SCHMAL);
      o.gabel.forEach(function (zeile, n) {
        snTxt(g, xEnde + ri * (gh + 5),
          y0 - (o.gabel.length - 1) * h * 0.55 + n * h * 1.1 + h * 0.3, zeile,
          {anker: ri > 0 ? "start" : "end", groesse: h * 0.82});
      });
    }

    return g;
  }

  /* ---------- der Stoß im Schnitt ----------
   *
   * Damit neben dem Sinnbild steht, was es bedeutet: zwei Bleche und die
   * Naht dazwischen. Die Naht wird ausgefüllt gezeichnet, wie im
   * Tabellenbuch auf Seite 128.
   *
   *   o.art     "i" | "v" | "y" | "dv" | "kehl" | "dkehl" | "hv"
   *   o.x, o.y  linke obere Ecke des unteren Blechs
   *   o.t       Blechdicke
   *   o.breite  Breite der Darstellung
   */
  function schweissStoss(eltern, o) {
    var g = snEl("g", {"class": "stoss"}, eltern);
    var t = o.t || 24, b = o.breite || 150, x = o.x, y = o.y;
    var m = x + b / 2;
    var naht = function (punkte) {
      snEl("polygon", {points: punkte.map(function (p) {
        return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "),
        fill: "currentColor", stroke: "none"}, g);
    };

    if (o.art === "kehl" || o.art === "dkehl") {
      /* T-Stoß: ein stehendes Blech auf einem liegenden. */
      snKasten(g, x, y + t, b, t, SN_BREIT);
      snKasten(g, m - t / 2, y - t * 2, t, t * 3, SN_BREIT);
      var a = o.a || t * 0.7;
      naht([[m - t / 2, y + t], [m - t / 2 - a * 1.4, y + t], [m - t / 2, y + t - a * 1.4]]);
      if (o.art === "dkehl") {
        naht([[m + t / 2, y + t], [m + t / 2 + a * 1.4, y + t], [m + t / 2, y + t - a * 1.4]]);
      }
      return g;
    }

    /* Stumpfstoß: zwei Bleche nebeneinander, dazwischen die Fuge. */
    var spalt = o.art === "i" ? t * 0.14 : 0;
    snKasten(g, x, y, b / 2 - spalt / 2, t, SN_BREIT);
    snKasten(g, m + spalt / 2, y, b / 2 - spalt / 2, t, SN_BREIT);

    if (o.art === "i") {
      naht([[m - spalt / 2, y], [m + spalt / 2, y],
            [m + spalt / 2, y + t], [m - spalt / 2, y + t]]);
    } else if (o.art === "v") {
      var oeff = t * 0.75;
      naht([[m - oeff, y], [m + oeff, y], [m, y + t]]);
    } else if (o.art === "y") {
      /* Die Y-Naht hat unten einen Steg - daran erkennt man sie neben der
         V-Naht. Er muss deshalb breit genug sein, um sichtbar zu bleiben. */
      var oy = t * 0.72, steg = t * 0.36, sb = t * 0.16;
      naht([[m - oy, y], [m + oy, y], [m + sb, y + t - steg],
            [m + sb, y + t], [m - sb, y + t], [m - sb, y + t - steg]]);
    } else if (o.art === "dv") {
      var d = t * 0.55;
      naht([[m - d, y], [m + d, y], [m, y + t / 2], [m + d, y + t],
            [m - d, y + t], [m, y + t / 2]]);
    } else if (o.art === "hv") {
      var hb = t * 0.9;
      naht([[m, y], [m + hb, y], [m, y + t]]);
    }
    return g;
  }

  /* Der Name eines Symbols - für Rückmeldungen und Lösungen. */
  function schweissName(art) {
    if (SN_SYMBOLE[art]) return SN_SYMBOLE[art].name;
    if (SN_KOMBI[art]) return SN_KOMBI[art].name;
    return art;
  }

  /* ---------- was nach aussen sichtbar ist ---------- */
  welt.SN_H = SN_H;
  welt.SN_SYMBOLE = SN_SYMBOLE;
  welt.SN_KOMBI = SN_KOMBI;
  welt.SN_ZUSATZ = SN_ZUSATZ;
  welt.schweissSinnbild = schweissSinnbild;
  welt.schweissStoss = schweissStoss;
  welt.schweissName = schweissName;
}(typeof window !== "undefined" ? window : this));
