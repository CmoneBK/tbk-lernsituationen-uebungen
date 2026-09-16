/* Das Zeichnungsblatt einer Welle - alles, was die Fertigung braucht.
 *
 * Eingebunden wird der Baustein von Hand, hinter den drei Zeichenbausteinen
 * und vor dem eigenen Skript der Seite:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/wellen.js"></script>
 *     <script src="../../assets/drehteil.js"></script>
 *     <script src="../../assets/wellenblatt.js"></script>
 *
 * Aufruf:
 *
 *     wellenblatt(document.getElementById("blatt"), WELLEN.spannwelle);
 *
 * Warum es das gibt: Eine Übung zeigt immer nur den Ausschnitt, um den es
 * ihr geht - die eine mit Rautiefen, die nächste mit Benennungen. Wer das
 * ganze Paket bearbeitet, braucht daneben ein Blatt, auf dem jedes Maß
 * steht. Es entsteht vollständig aus `assets/wellen.js`; keine Zahl wird
 * hier ein zweites Mal geschrieben.
 *
 * Drei Teile:
 *
 *   1. die Gesamtansicht - alle Längen unter dem Teil (`masseUnten`),
 *      damit über dem Teil Platz für Benennungen, Radien und Rautiefen
 *      bleibt. Nur deshalb dürfen `masse` und `bezeichnungen` hier in ein
 *      Bild; siehe den Hinweis bei `wellenBezeichnungen`.
 *   2. die Einzelheit der Nut - Breite und Tiefe sind so klein, dass sie in
 *      der Ansicht nicht lesbar wären.
 *   3. die Angaben, die kein Maß in der Ansicht sind: Werkstoff, Rohteil,
 *      Grenzmaße der Passungen, Nutgrund, Gewindefreistich, Rautiefen.
 *
 * Über-bemaßt wird nichts. Ein Maß, das sich aus zwei anderen ergibt (die
 * Bundlänge etwa aus 48 und 58), gehört nach DIN ISO 129-1 nicht noch
 * einmal in die Zeichnung - auch dann nicht, wenn jemand "alle Maße"
 * verlangt. Vollständig heißt eindeutig, nicht doppelt.
 */
"use strict";

/* Eine Zahl mit Komma und fester Stellenzahl. */
function blattZahl(x, stellen){
  return x.toFixed(stellen === undefined ? 0 : stellen).replace(".", ",");
}

/* Der Stil steht in einem Block, nicht in style-Attributen: Er soll den
   Farben der Seite folgen, und `var(--bg)` im style-Attribut verschluckt
   jsdom - die Prüfung sähe dann etwas anderes als der Browser. */
function wellenblattStil(){
  if(document.getElementById("wellenblattStil")) return;
  var s = document.createElement("style");
  s.id = "wellenblattStil";
  s.textContent =
    ".wellenblatt figure{margin:0 0 18px}"
    + ".wellenblatt figure svg{width:100%;height:auto}"
    + ".wellenblatt figcaption{font-size:13px;margin-top:6px;"
    + "color:var(--muted,#5f5f5a)}"
    + ".wellenblatt .blatt-einzelheit{max-width:330px}"
    + ".wellenblatt .blatt-zweiriss{max-width:620px}"
    + ".wellenblatt .ungedeckt{font-style:italic;color:var(--muted,#5f5f5a)}"
    + ".wellenblatt table{width:100%;border-collapse:collapse;"
    + "font-size:14px;margin:0}"
    + ".wellenblatt th,.wellenblatt td{text-align:left;vertical-align:top;"
    + "padding:7px 10px 7px 0;border-top:1px solid var(--border,#e3e3df)}"
    + ".wellenblatt th{width:12em;font-weight:600;white-space:nowrap}"
    + "@media(max-width:520px){.wellenblatt th{width:auto;display:block;"
    + "border-top:1px solid var(--border,#e3e3df);padding-bottom:0}"
    + ".wellenblatt td{display:block;border-top:0;padding-top:2px}}";
  document.head.appendChild(s);
}

/* Die Angaben, die kein Maß in der Ansicht sind. Jede Zeile ein Paar
   [Überschrift, Inhalt]; der Inhalt darf Auszeichnung enthalten. */
function wellenblattAngaben(w){
  var z = [], i;

  z.push(["Werkstoff", w.werkstoff
    + (w.werkstoffnummer ? " (" + w.werkstoffnummer + ")" : "")
    + (w.zustand ? ", " + w.zustand : "")]);

  if(w.rohteil){
    z.push(["Rohteil", "Ø" + blattZahl(w.rohteil.d) + " × "
      + blattZahl(w.rohteil.laenge) + " mm"]);
  }

  /* Die Passungen mit ihren Grenzmaßen. Das Mittenmaß steht dabei, weil auf
     Toleranzmitte geschlichtet wird - nicht auf das Nennmaß. */
  (w.toleranzen || []).forEach(function(t){
    var hoch = t.nennmass + t.es / 1000, tief = t.nennmass + t.ei / 1000;
    z.push(["Ø" + blattZahl(t.nennmass) + " " + t.klasse,
      blattZahl(tief, 3) + " bis " + blattZahl(hoch, 3) + " mm"
      + " &middot; Mitte " + blattZahl((hoch + tief) / 2, 4) + " mm"]);
  });

  if(w.gewinde){
    z.push(["Gewinde", w.gewinde.bezeichnung + ", Länge "
      + blattZahl(w.gewinde.bis - w.gewinde.von, 1) + " mm"]);
  }

  if(w.gewindefreistich){
    var f = w.gewindefreistich;
    z.push(["Gewindefreistich", f.norm + " &middot; Ø" + blattZahl(f.dg, 1)
      + " &middot; Länge " + blattZahl(f.bis - f.von, 1) + " mm"
      + " &middot; r = " + blattZahl(f.r, 1) + " mm bei P = "
      + blattZahl(f.P, 1) + " mm"]);
  }

  /* Sicherungsringnuten nach DIN 471 (Tabellenbuch Seite 287): Nutbreite m,
     Nutgrund d2 und die Mindeststegbreite n. Wo das Buch den Durchmesser
     nicht in seiner Auswahl führt, steht das dabei - geraten wird nicht. */
  (w.nuten || []).forEach(function(n){
    var d2 = n.d2 !== undefined ? n.d2 : n.d - 2 * n.tiefe;
    z.push(["Nut " + n.marke,
      "Breite " + blattZahl(n.breite, 1)
      + (n.breiteToleranz ? " " + n.breiteToleranz : "")
      + " &middot; Nutgrund Ø" + blattZahl(d2, 1)
      + (n.d2Toleranz ? " " + n.d2Toleranz : "")
      + (n.nMin ? " &middot; Steg mindestens " + blattZahl(n.nMin, 1) : "")
      + " &middot; linke Flanke bei " + blattZahl(n.bei, 1) + " mm"
      + (n.ring ? " &middot; " + n.ring : "")
      + (n.ungedeckt
         ? ' <em class="ungedeckt">' + n.ungedeckt + "</em>" : "")]);
  });

  (w.laengsnuten || []).forEach(function(n){
    z.push(["Passfedernut", (n.norm ? n.norm + " &middot; " : "")
      + "b = " + blattZahl(n.breite, 1)
      + (n.breiteToleranz ? " " + n.breiteToleranz : "")
      + " &middot; t<sub>1</sub> = " + blattZahl(n.tiefe, 1)
      + (n.tiefeToleranz ? " " + n.tiefeToleranz : "")
      + " &middot; Länge " + blattZahl(n.bis - n.von, 1)
      + (n.laengeToleranz ? " " + n.laengeToleranz : "")
      + " ab " + blattZahl(n.von, 1) + " mm"
      + (n.sitz ? " &middot; " + n.sitz : "")]);
  });

  (w.bohrungen || []).forEach(function(b){
    z.push(["Bohrung", (b.norm || ("Ø" + blattZahl(b.d, 1)))
      + (b.bis < w.laenge ? " &middot; Sackloch" : " &middot; durchgehend")]);
  });

  if(w.zentrierbohrungen){
    var zb = w.zentrierbohrungen;
    var wie = {darf: "darf am Fertigteil vorhanden sein",
               erforderlich: "am Fertigteil erforderlich",
               nicht: "darf am Fertigteil nicht vorhanden sein"}[zb.art];
    z.push(["Zentrierbohrungen",
      "links " + (zb.links || "–") + " &middot; rechts "
      + (zb.rechts || "–") + (wie ? " &middot; " + wie : "")]);
  }

  (w.freistiche || []).forEach(function(f){
    z.push(["Freistich", f.norm + " an der Schulter " + f.schulter]);
  });

  if((w.rundungen || []).length){
    var r = w.rundungen.map(function(x){
      return "R" + blattZahl(x.r, x.r === Math.round(x.r) ? 0 : 1)
        + " bei " + blattZahl(x.bei, 0) + " mm";
    });
    z.push(["Innenrundungen", r.join(" &middot; ")]);
  }

  if(w.kleinsterInnenradius !== undefined){
    z.push(["Engste Innenrundung", "r<sub>w</sub> = "
      + blattZahl(w.kleinsterInnenradius,
                  w.kleinsterInnenradius === Math.round(w.kleinsterInnenradius)
                    ? 0 : 1)
      + " mm" + (w.woher ? " &ndash; " + w.woher : "")]);
  }

  var rau = (w.rauheiten || []).map(function(x){
    return x.text + " am Ø" + blattZahl(x.d);
  });
  if(w.allgemeineRautiefe !== undefined){
    rau.push("sonst Rz " + blattZahl(w.allgemeineRautiefe));
  }
  if(rau.length) z.push(["Rautiefen", rau.join(" &middot; ")]);

  z.push(["Kanten", "gebrochen " + blattZahl(WELLEN_FASE, 1)
    + " × 45° an den Stirnflächen und an den Absätzen nach unten"]);

  return z;
}

/* Baut das Blatt in `ziel`. o = {s} für den Maßstab der Ansicht. */
function wellenblatt(ziel, w, o){
  o = o || {};
  wellenblattStil();
  ziel.classList.add("wellenblatt");
  ziel.textContent = "";

  var vorne = "blatt-" + w.id + "-";

  /* ---------- 1. Die Gesamtansicht ---------- */
  var f1 = document.createElement("figure");
  f1.id = vorne + "ansicht";
  ziel.appendChild(f1);

  /* 5,8 Bildpunkte je Millimeter, wie in den Übungen. Der Maßstab ist keine
     Geschmacksfrage: `ab` und `hoch` der Hinweislinien stehen in
     Bildpunkten, die Lage der Merkmale wächst aber mit `s`. Bei 5,2 lief
     die Hinweislinie der R1 durch die Angabe „Rz 6,3“ - gemessen, nicht
     vermutet, siehe pruefungen/test-beschriftung.js. */
  var op = {s: o.s || 5.8, masse: true, masseUnten: true,
            bezeichnungen: true, rauheiten: true, radien: true,
            zentrierbohrungen: true, einzelheiten: true};
  var g = wellenGroesse(w, op);
  var svg = bild(f1.id, g.breite, g.hoehe,
    "Gesamtzeichnung der " + w.name + " mit allen Maßen",
    "<strong>" + w.name + "</strong> &ndash; alle Längen unter dem Teil, "
    + "die Durchmesser senkrecht. Darüber Benennungen, Rundungen und "
    + "Rautiefen. Maße in mm.");
  op.x = g.x; op.y = g.y;
  zeichneWelle(svg, w, op);

  /* ---------- 2. Die Einzelheit der Nut ---------- */
  if((w.nuten || []).length){
    var f2 = document.createElement("figure");
    f2.id = vorne + "nut";
    f2.className = (w.nuten.length > 1
      && !(w.nuten[0].tiefe === w.nuten[1].tiefe))
      ? "blatt-zweiriss" : "blatt-einzelheit";
    ziel.appendChild(f2);

    var marken = w.nuten.map(function(n){ return n.marke; });
    var gleich = w.nuten.every(function(n){
      return n.breite === w.nuten[0].breite && n.tiefe === w.nuten[0].tiefe;
    });
    /* Zehnfach gegenüber der Ansicht - der Maßstab steht nach Seite 74 am
       Bild, und er muss ein glatter sein.

       Gezeichnet wird jede Nut, die sich von der ersten unterscheidet:
       Nut A und Nut B der Antriebswelle sitzen auf verschiedenen
       Durchmessern und sind deshalb verschieden tief. Eine Einzelheit fuer
       beide waere gelogen. */
    var vergr = 10, ge = nutEinzelheitGroesse(w, {s: op.s * vergr});
    var zeigen = gleich ? [w.nuten[0]] : w.nuten;
    var s2 = bild(f2.id, ge.breite * zeigen.length, ge.hoehe,
      "Einzelheit der Sicherungsringnut, stark vergrößert",
      "<strong>Einzelheit " + marken.join(" und ") + "</strong> "
      + (gleich
         ? "&ndash; beide Nuten haben dieselbe Form. "
         : "&ndash; die Nuten sitzen auf verschiedenen Durchmessern und "
           + "sind deshalb verschieden tief. ")
      + "Nutgrund und Lage stehen in der Tabelle.");
    zeigen.forEach(function(n2, i){
      zeichneNutEinzelheit(s2, w, {marke: n2.marke, s: ge.s,
                                   x: ge.x + i * ge.breite, y: ge.y,
                                   massstab: vergr});
    });
  }

  /* ---------- 2b. Der Querschnitt durch die Passfedernut ---------- */
  if((w.laengsnuten || []).length){
    var f3 = document.createElement("figure");
    f3.id = vorne + "quernut";
    f3.className = "blatt-zweiriss";
    ziel.appendChild(f3);

    var n3 = w.laengsnuten[0];
    var q = nutQuerschnittGroesse(w, {s: 8});
    var dr = nutDraufsichtGroesse(w, {s: 8});
    var s3 = bild(f3.id, q.breite + dr.breite, Math.max(q.hoehe, dr.hoehe),
      "Querschnitt und Draufsicht der Passfedernut",
      "<strong>Querschnitt und Draufsicht der Passfedernut</strong> "
      + "&ndash; Breite und Tiefe liegen quer zur Achse, die runden Enden "
      + "sieht man nur von oben. Die gestrichelte Linie über der Nut ist "
      + "die gedachte Mantelfläche, von der t<sub>1</sub> angetragen wird."
      + (n3.norm ? " Dazu gehört die " + n3.norm + "." : ""));
    zeichneNutQuerschnitt(s3, w, {s: 8, x: q.x, y: q.y});
    zeichneNutDraufsicht(s3, w, {s: 8, x: q.breite + dr.x, y: dr.y});
  }

  /* ---------- 3. Die übrigen Angaben ---------- */
  var tab = document.createElement("table");
  var kopf = document.createElement("caption");
  kopf.hidden = true;
  kopf.textContent = "Angaben zur " + w.name;
  tab.appendChild(kopf);
  var koerper = document.createElement("tbody");
  wellenblattAngaben(w).forEach(function(zeile){
    var tr = document.createElement("tr");
    var th = document.createElement("th");
    th.scope = "row";
    th.innerHTML = zeile[0];
    var td = document.createElement("td");
    td.innerHTML = zeile[1];
    tr.appendChild(th);
    tr.appendChild(td);
    koerper.appendChild(tr);
  });
  tab.appendChild(koerper);
  ziel.appendChild(tab);
  return ziel;
}
