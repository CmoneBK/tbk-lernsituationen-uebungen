/* Strukturnetz und Montagereihenfolge.
 *
 * Eingebunden mit einer Zeile vor dem eigenen Skript der Seite:
 *
 *     <script src="../../assets/montageplan.js"></script>
 *
 * Dieselbe Datei liegt in zwei Repos (Material und Werkzeuge) - wird sie
 * geändert, gehört sie in beide kopiert, wie assets/thema.js auch.
 *
 * Der Baustein macht zwei Dinge und sonst nichts:
 *
 *   1. Er zeichnet ein Strukturnetz: Rechteck für Fertigungsteile, Oval für
 *      Normteile, volle Linie für fest, unterbrochene für beweglich
 *      verbunden. Auf Wunsch lässt er den Lernenden die Linienart selbst
 *      bestimmen.
 *   2. Er nimmt eine Montagereihenfolge entgegen und hält sie gegen die
 *      Vorrangbeziehungen.
 *
 * Was er NICHT macht: Er kennt keine Presse und kein Getriebe. Die Teile,
 * die Verbindungen und die Vorrangbeziehungen kommen von außen - so lässt
 * sich derselbe Baustein für jede Baugruppe verwenden.
 *
 * Der eine Satz, um den es geht: EINE MONTAGEREIHENFOLGE IST NICHT DIE
 * EINZIGE. Ob das Gesenk vor oder nach den Ständern kommt, ist gleichgültig;
 * dass die Feder vor dem Stempelhalter auf den Bolzen muss, ist es nicht.
 * Deshalb wird hier nie gegen eine hinterlegte Musterfolge geprüft, sondern
 * immer gegen die Vorrangbeziehungen - und wer eine andere gültige Folge
 * findet, hat recht.
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function sv(name, attr, eltern) {
    var e = document.createElementNS(NS, name);
    for (var k in attr) if (attr.hasOwnProperty(k)) e.setAttribute(k, attr[k]);
    if (eltern) eltern.appendChild(e);
    return e;
  }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ======================================================================
     1  DAS STRUKTURNETZ
     ----------------------------------------------------------------------
     o = {
       teile:  [{pos, kurz, art:"fertigung"|"norm"}],
       kanten: [{a, b, art:"fest"|"beweglich", warum}],
       lage:   {pos: {x, y}}   in einem Raster von 0 bis 100,
       raten:  true            die Linienarten sind verdeckt und werden
                               vom Lernenden bestimmt
     }
     ====================================================================== */
  function netz(zielId, o) {
    var ziel = document.getElementById(zielId);
    if (!ziel) return null;
    ziel.textContent = '';

    var B = 940, H = 620, RAND = 70;
    var svg = sv('svg', {viewBox: '0 0 ' + B + ' ' + H, role: 'img',
      'aria-label': 'Strukturnetz der Baugruppe mit ' + o.teile.length
        + ' Teilen: Rechtecke sind Fertigungsteile, Ovale sind Normteile; '
        + 'eine volle Linie heißt fest verbunden, eine unterbrochene Linie '
        + 'beweglich verbunden'}, ziel);

    function px(x) { return RAND + x / 100 * (B - 2 * RAND); }
    function py(y) { return RAND + y / 100 * (H - 2 * RAND); }

    var gKanten = sv('g', {}, svg);
    var gKnoten = sv('g', {}, svg);
    var linien = {};

    /* Wie breit ist der Kasten eines Teils? Die Kanten muessen es wissen:
       Sie enden am Rand des Kastens und nicht in seiner Mitte - sonst laufen
       sie unter der Beschriftung hindurch, und dort ist eine Linie so gut
       wie nicht vorhanden. */
    function kasten(t) {
      return {w: Math.max(104, beschriftung(t).length * 8.2 + 26), h: 40};
    }
    function beschriftung(t) { return t.pos + '  ' + t.kurz; }
    function teilVon(pos) {
      for (var i = 0; i < o.teile.length; i++) {
        if (o.teile[i].pos === pos) return o.teile[i];
      }
      return null;
    }

    /* Der Punkt, an dem die Verbindungslinie den Kasten verlaesst. Fuer das
       Oval wird dieselbe Rechnung benutzt - der Unterschied ist kleiner als
       die Strichbreite. */
    function rand(mitte, ziel, k) {
      var dx = ziel.x - mitte.x, dy = ziel.y - mitte.y;
      var l = Math.hypot(dx, dy) || 1;
      var hw = k.w / 2 + 3, hh = k.h / 2 + 3;
      var t1 = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
      var t2 = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
      var f = Math.min(t1, t2);
      return {x: mitte.x + dx * f, y: mitte.y + dy * f};
    }

    o.kanten.forEach(function (k, i) {
      var a = o.lage[k.a], b = o.lage[k.b];
      if (!a || !b) return;
      var ta = teilVon(k.a), tb = teilVon(k.b);
      var pa = {x: px(a.x), y: py(a.y)}, pb = {x: px(b.x), y: py(b.y)};
      var va = rand(pa, pb, kasten(ta)), vb = rand(pb, pa, kasten(tb));
      var l = sv('line', {x1: va.x, y1: va.y, x2: vb.x, y2: vb.y,
        stroke: 'currentColor', 'stroke-width': 2,
        'stroke-linecap': 'round'}, gKanten);
      if (!o.raten && k.art === 'beweglich') {
        l.setAttribute('stroke-dasharray', '12 7');
      }
      if (o.raten) l.setAttribute('opacity', 0.35);
      linien[i] = l;
    });

    o.teile.forEach(function (t) {
      var p = o.lage[t.pos];
      if (!p) return;
      var x = px(p.x), y = py(p.y);
      var k = kasten(t), w = k.w, h = k.h;
      var g = sv('g', {'class': 'knoten', 'data-pos': t.pos}, gKnoten);
      if (t.art === 'norm') {
        /* Oval = Normteil. Was man kauft, ist rund; was man fertigt, eckig -
           eine Eselsbrücke, die trägt. */
        sv('ellipse', {cx: x, cy: y, rx: w / 2, ry: h / 2,
          fill: 'var(--card, #fff)', stroke: 'currentColor',
          'stroke-width': 2}, g);
      } else {
        sv('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 3,
          fill: 'var(--card, #fff)', stroke: 'currentColor',
          'stroke-width': 2}, g);
      }
      /* Nummer und Benennung stehen in einem Text. Zwei Texte waeren
         schoener gesetzt, aber der kleine oben links saesse genau auf der
         Umrisslinie seines eigenen Kastens - und das liest sich schlecht. */
      var tx = sv('text', {x: x, y: y + 5, 'text-anchor': 'middle',
        'font-size': 14, fill: 'currentColor'}, g);
      tx.textContent = beschriftung(t);
    });

    return {svg: svg, linien: linien};
  }

  /* ======================================================================
     2  DIE MONTAGEREIHENFOLGE
     ----------------------------------------------------------------------
     Kein Ziehen mit der Maus. Wer eine Reihenfolge baut, klickt das Teil an,
     das als nächstes an die Reihe kommt; ein Klick auf das zuletzt gesetzte
     nimmt es zurück. Das geht mit der Tastatur genauso wie mit dem Finger,
     und es sagt genauer, was gemeint ist, als ein halb gezogenes Kästchen.

     o = {
       teile:   [{pos, kurz, art}],
       vorrang: [{vorher, nachher, warum}],
       sofort:  true   jeder Fehlgriff wird sofort erklärt (Übungsmodus)
                false  alles wird angenommen, geprüft wird am Schluss
       onStand:   function(gesetzt, fertig){}
       onSetzen:  function(pos){}    ein Teil ist dazugekommen
       onZurueck: function(pos){}    eines wurde zurückgenommen
     }
     ====================================================================== */
  function reihenfolge(zielId, o) {
    var ziel = document.getElementById(zielId);
    if (!ziel) return null;
    ziel.textContent = '';

    var gesetzt = [];
    var vorrat = el('div', 'mp-vorrat');
    var plan = el('ol', 'mp-plan');
    var rueck = el('p', 'mp-rueck');
    rueck.hidden = true;

    var kopf = el('p', 'mp-kopf');
    ziel.appendChild(kopf);
    ziel.appendChild(vorrat);
    ziel.appendChild(el('p', 'mp-zwischen', 'Der Montageplan:'));
    ziel.appendChild(plan);
    ziel.appendChild(rueck);

    var knoepfe = {};
    o.teile.forEach(function (t) {
      var b = el('button', 'mp-teil');
      b.type = 'button';
      b.dataset.pos = t.pos;
      b.innerHTML = '<span class="mp-nr">' + t.pos + '</span>' + t.kurz;
      if (t.art === 'norm') b.classList.add('norm');
      b.addEventListener('click', function () { setzen(t.pos); });
      vorrat.appendChild(b);
      knoepfe[t.pos] = b;
    });

    /* Darf dieses Teil jetzt? Wenn nicht: welche Bedingung fehlt? */
    function hindernis(pos) {
      for (var i = 0; i < o.vorrang.length; i++) {
        var v = o.vorrang[i];
        if (v.nachher === pos && gesetzt.indexOf(v.vorher) < 0) return v;
      }
      return null;
    }

    function teilVon(pos) {
      for (var i = 0; i < o.teile.length; i++) {
        if (o.teile[i].pos === pos) return o.teile[i];
      }
      return null;
    }

    function melden(art, html) {
      rueck.className = 'mp-rueck ' + art;
      rueck.innerHTML = html;
      rueck.hidden = false;
    }

    function setzen(pos) {
      if (gesetzt.indexOf(pos) >= 0) return;
      var h = o.sofort ? hindernis(pos) : null;
      if (h) {
        var v = teilVon(h.vorher), n = teilVon(h.nachher);
        melden('nein', '<strong>Noch nicht.</strong> '
          + (n ? n.kurz : h.nachher) + ' braucht '
          + (v ? v.kurz : h.vorher) + ' vorher. ' + h.warum);
        knoepfe[pos].classList.add('zuckt');
        window.setTimeout(function () {
          knoepfe[pos].classList.remove('zuckt');
        }, 500);
        return;
      }
      gesetzt.push(pos);
      zeichnen();
      if (typeof o.onSetzen === 'function') o.onSetzen(pos);
      if (gesetzt.length === o.teile.length) {
        var fehler = pruefen(gesetzt, o.vorrang);
        if (fehler) {
          var a = teilVon(fehler.vorher), b = teilVon(fehler.nachher);
          melden('nein', '<strong>Der Plan geht so nicht auf.</strong> '
            + (a ? a.kurz : '') + ' muss vor ' + (b ? b.kurz : '')
            + ' eingebaut werden. ' + fehler.warum);
        } else {
          melden('ja', '<strong>Das ist eine gültige Reihenfolge.</strong> '
            + 'Nicht <em>die</em> &ndash; es gibt viele. Deine verletzt keine '
            + 'einzige Vorrangbeziehung, und mehr wird von einem '
            + 'Montageplan nicht verlangt.');
        }
        if (typeof o.onStand === 'function') o.onStand(gesetzt, !fehler);
      } else {
        rueck.hidden = true;
        if (typeof o.onStand === 'function') o.onStand(gesetzt, false);
      }
    }

    function zurueck() {
      if (!gesetzt.length) return;
      var weg = gesetzt.pop();
      rueck.hidden = true;
      if (typeof o.onZurueck === 'function') o.onZurueck(weg);
      zeichnen();
      if (typeof o.onStand === 'function') o.onStand(gesetzt, false);
    }

    function zeichnen() {
      plan.textContent = '';
      gesetzt.forEach(function (pos, i) {
        var t = teilVon(pos);
        var li = el('li');
        li.innerHTML = '<span class="mp-nr">' + pos + '</span>'
          + (t ? t.kurz : pos);
        if (i === gesetzt.length - 1) {
          var b = el('button', 'mp-weg', 'zurück');
          b.type = 'button';
          b.addEventListener('click', zurueck);
          li.appendChild(b);
        }
        plan.appendChild(li);
      });
      o.teile.forEach(function (t) {
        knoepfe[t.pos].disabled = gesetzt.indexOf(t.pos) >= 0;
      });
      kopf.textContent = gesetzt.length + ' von ' + o.teile.length
        + ' Positionen eingeplant.';
    }

    zeichnen();

    return {
      stand: function () { return gesetzt.slice(); },
      vonVorn: function () {
        gesetzt = [];
        rueck.hidden = true;
        zeichnen();
      }
    };
  }

  /* Prüft eine fertige Folge gegen die Vorrangbeziehungen und gibt den
     ersten Verstoß zurück - nicht alle: Wer den ersten behebt, sieht die
     übrigen ohnehin neu. */
  function pruefen(folge, vorrang) {
    var platz = {};
    folge.forEach(function (pos, i) { platz[pos] = i; });
    for (var i = 0; i < vorrang.length; i++) {
      var v = vorrang[i];
      if (platz[v.vorher] === undefined || platz[v.nachher] === undefined) {
        continue;
      }
      if (platz[v.vorher] > platz[v.nachher]) return v;
    }
    return null;
  }

  /* Wie viele Reihenfolgen sind überhaupt gültig? Die Zahl beantwortet die
     Frage, die jede Klasse stellt: "Gibt es nur eine richtige Lösung?" Sie
     wird abgezählt, nicht geschätzt - und bei mehr als der Schranke wird
     abgebrochen, weil die Antwort dann ohnehin "sehr viele" lautet. */
  function wieVieleFolgen(teile, vorrang, schranke) {
    var grenze = schranke || 200000;
    var alle = teile.map(function (t) { return t.pos; });
    var noetig = {};
    alle.forEach(function (p) { noetig[p] = []; });
    vorrang.forEach(function (v) {
      if (noetig[v.nachher]) noetig[v.nachher].push(v.vorher);
    });

    var zahl = 0, abgebrochen = false;
    function weiter(gesetzt, offen) {
      if (abgebrochen) return;
      if (!offen.length) {
        zahl++;
        if (zahl >= grenze) abgebrochen = true;
        return;
      }
      for (var i = 0; i < offen.length; i++) {
        var p = offen[i];
        var frei = noetig[p].every(function (q) {
          return gesetzt.indexOf(q) >= 0;
        });
        if (!frei) continue;
        weiter(gesetzt.concat([p]),
          offen.slice(0, i).concat(offen.slice(i + 1)));
        if (abgebrochen) return;
      }
    }
    weiter([], alle);
    return {zahl: zahl, abgebrochen: abgebrochen};
  }

  global.Montageplan = {
    netz: netz,
    reihenfolge: reihenfolge,
    pruefen: pruefen,
    wieVieleFolgen: wieVieleFolgen
  };
}(typeof window !== 'undefined' ? window : this));
