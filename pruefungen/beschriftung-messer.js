/* Misst die Beschriftungen aller Zeichnungen einer Seite - im Browser.
 *
 * Diese Datei läuft nicht in node, sondern wird von test-beschriftung.js in
 * eine Kopie der Seite eingehängt und dort von Chrome ausgeführt. Nur im
 * Browser steht, wie breit eine Zeile wirklich ist und wo eine Kurve
 * verläuft; jsdom weiß beides nicht.
 *
 * Drei Fragen je Text:
 *
 *   1. Liegt er auf einer Linie?   Die Geometrie wird abgetastet - jede
 *      Kante in Punkte zerlegt, dann gezählt, wie viele davon im Rahmen des
 *      Textes liegen. Füllflächen zählen nur, wenn sie schraffiert sind:
 *      Eine Benennung in einer glatten Fläche ist gewollt, eine auf dem
 *      Strichwerk einer Schnittfläche nicht.
 *   2. Liegt er auf einem anderen Text?
 *   3. Steht er über den Rand der Zeichnung hinaus - oder ist er so klein,
 *      dass ihn niemand liest?
 *
 * Gemessen wird in jedem Reiter, bei jeder Kachel, auf mehreren Stufen jedes
 * Reglers und zusätzlich in der Normdarstellung. Das ist nötig, weil eine
 * Beschriftung, die im Ruhezustand frei steht, während der Bewegung auf
 * einem Teil liegen kann - oder mit ihm aus dem Bild wandert.
 *
 * Ausgenommen ist Text mit paint-order="stroke", also mit einer Kontur in
 * der Hintergrundfarbe dahinter. In einem Schaubild bewegen sich die
 * Kennlinien mit den Reglern und lassen sich nicht zuverlässig umgehen;
 * dort verschwindet die Linie hinter der Schrift, statt sie zu zerschneiden.
 */
(function () {
  'use strict';

  var BEFUNDE = [];
  var ZUSTAND = '';
  var GESEHEN = { bilder: {}, texte: 0, messungen: 0, uebersprungen: {} };

  function r(e) { return e.getBoundingClientRect(); }

  function ueberlapp(a, b) {
    var x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    var y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return (x > 0 && y > 0) ? x * y : 0;
  }

  /* Ein Element in Punkte zerlegen - in Bildschirmkoordinaten, damit sie
     sich mit den Textrahmen vergleichen lassen. */
  function punkte(e) {
    var m = e.getScreenCTM();
    if (!m) return [];
    var aus = [];
    function add(x, y) { aus.push([m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]); }
    var L = 0;
    try { L = e.getTotalLength ? e.getTotalLength() : 0; } catch (err) { L = 0; }
    if (L > 0) {
      var n = Math.max(2, Math.min(900, Math.ceil(L / 1.5)));
      for (var i = 0; i <= n; i++) {
        var p;
        try { p = e.getPointAtLength(L * i / n); } catch (err2) { break; }
        add(p.x, p.y);
      }
    }
    /* Schraffierte Flächen zählen auch innen: Dort steht Strichwerk. */
    var f = (e.getAttribute('fill') || '').trim();
    if (f.indexOf('url(') === 0 && e.isPointInFill) {
      var b;
      try { b = e.getBBox(); } catch (err3) { return aus; }
      var s = 4;
      for (var x = b.x; x <= b.x + b.width; x += s) {
        for (var y = b.y; y <= b.y + b.height; y += s) {
          var pt = e.ownerSVGElement.createSVGPoint();
          pt.x = x; pt.y = y;
          try { if (e.isPointInFill(pt)) add(x, y); } catch (err4) { /* egal */ }
        }
      }
    }
    return aus;
  }

  function rahmen(e) {
    try {
      var b = e.getBBox();
      return ' [' + Math.round(b.x) + ',' + Math.round(b.y) + ' '
        + Math.round(b.width) + 'x' + Math.round(b.height) + ']';
    } catch (err) { return ''; }
  }

  function beschreiben(e) {
    var t = e.tagName.toLowerCase();
    if (t === 'line') {
      return 'Linie ' + Math.round(e.getAttribute('x1')) + ',' + Math.round(e.getAttribute('y1'))
        + ' - ' + Math.round(e.getAttribute('x2')) + ',' + Math.round(e.getAttribute('y2'));
    }
    if (t === 'path') return 'Pfad' + rahmen(e) + ' ' + (e.getAttribute('d') || '').slice(0, 26);
    return t + rahmen(e);
  }

  function messen() {
    [].slice.call(document.querySelectorAll('svg')).forEach(function (svg, nr) {
      var sr = r(svg);
      var kennung = svg.id || ('svg#' + nr);
      if (sr.width < 20 || sr.height < 20) {             /* nicht sichtbar */
        GESEHEN.uebersprungen[kennung] =
          Math.round(sr.width) + 'x' + Math.round(sr.height);
        return;
      }

      var texte = [].slice.call(svg.querySelectorAll('text')).filter(function (t) {
        if (!t.textContent.trim()) return false;
        var tr = r(t);
        return tr.width > 0.5 && tr.height > 0.5;
      });
      if (!texte.length) return;
      GESEHEN.bilder[kennung] = 1;
      GESEHEN.texte += texte.length;
      GESEHEN.messungen++;

      /* Geometrie einsammeln - ohne Muster- und Markerdefinitionen. */
      var geo = [];
      [].slice.call(svg.querySelectorAll('line,rect,circle,ellipse,path,polygon,polyline'))
        .forEach(function (e) {
          if (e.closest('defs') || e.closest('marker') || e.closest('pattern')) return;
          var st = (e.getAttribute('stroke') || 'none');
          var f = (e.getAttribute('fill') || 'none').trim();
          if (st === 'none' && f.indexOf('url(') !== 0) return;  /* nur Füllung: erlaubt */
          var pp = punkte(e);
          if (pp.length) geo.push({ e: e, p: pp });
        });

      texte.forEach(function (t) {
        /* Text mit Kontur in der Hintergrundfarbe bleibt lesbar, auch wenn
           eine Linie hindurchläuft. */
        if (t.getAttribute('paint-order') === 'stroke') return;
        var tr = r(t);
        /* Etwas Luft: Ein Text, der eine Linie nur streift, stört nicht. */
        var k = { left: tr.left + 1.5, right: tr.right - 1.5,
                  top: tr.top + 1.5, bottom: tr.bottom - 1.5 };
        if (k.right <= k.left || k.bottom <= k.top) return;

        var treffer = null, meiste = 0;
        geo.forEach(function (g) {
          var n = 0;
          for (var i = 0; i < g.p.length; i++) {
            var p = g.p[i];
            if (p[0] >= k.left && p[0] <= k.right && p[1] >= k.top && p[1] <= k.bottom) n++;
          }
          if (n > meiste) { meiste = n; treffer = g.e; }
        });
        if (meiste >= 4) {
          BEFUNDE.push({ art: 'Text auf Geometrie', svg: kennung, zustand: ZUSTAND,
            text: t.textContent.trim().slice(0, 34) + rahmen(t),
            was: beschreiben(treffer), n: meiste });
        }

        /* Rand der Zeichnung */
        if (tr.left < sr.left - 0.5 || tr.right > sr.right + 0.5
          || tr.top < sr.top - 0.5 || tr.bottom > sr.bottom + 0.5) {
          BEFUNDE.push({ art: 'Text steht ueber den Rand', svg: kennung, zustand: ZUSTAND,
            text: t.textContent.trim().slice(0, 40),
            was: 'links ' + Math.round(tr.left - sr.left) + ' rechts '
              + Math.round(sr.right - tr.right) + ' oben ' + Math.round(tr.top - sr.top)
              + ' unten ' + Math.round(sr.bottom - tr.bottom) });
        }

        /* Schriftgröße */
        var gr = parseFloat(getComputedStyle(t).fontSize);
        if (gr && gr < 8) {
          BEFUNDE.push({ art: 'Schrift zu klein', svg: kennung, zustand: ZUSTAND,
            text: t.textContent.trim().slice(0, 40), was: gr.toFixed(1) + ' px' });
        }
      });

      /* Text auf Text */
      for (var i = 0; i < texte.length; i++) {
        for (var j = i + 1; j < texte.length; j++) {
          var a = r(texte[i]), b = r(texte[j]);
          var u = ueberlapp(a, b);
          if (!u) continue;
          var klein = Math.min(a.width * a.height, b.width * b.height);
          if (u > klein * 0.22) {
            BEFUNDE.push({ art: 'Text auf Text', svg: kennung, zustand: ZUSTAND,
              text: texte[i].textContent.trim().slice(0, 30),
              was: texte[j].textContent.trim().slice(0, 30),
              n: Math.round(u / klein * 100) });
          }
        }
      }
    });
  }

  function reiter() {
    var kn = [].slice.call(document.querySelectorAll('[role=tab], .reiter button, nav button'));
    if (!kn.length) kn = [].slice.call(document.querySelectorAll('button[aria-selected]'));
    return kn;
  }

  function regler() {
    return [].slice.call(document.querySelectorAll('input[type=range]'))
      .filter(function (s) { return s.offsetParent !== null; });
  }

  /* Schalter innerhalb eines Reiters - die Kacheln, mit denen ein Verfahren
     ausgewählt wird, und die Antwortbilder der Übungen. Ohne sie wird nur
     das erste Bild jedes Reiters gemessen. Knöpfe, die etwas anderes tun
     als umschalten, bleiben aus. */
  function schalter() {
    return [].slice.call(document.querySelectorAll(
      'button[aria-pressed], .kachel, button[data-id], button[data-t], '
      + 'button.figur, button.karte, button.wahl, button.option'))
      .filter(function (b) {
        return b.offsetParent !== null
          && !/herunterladen|anpassen|kopieren|abspielen|starten|prüfen|weiter|zurück/i
               .test(b.textContent);
      }).slice(0, 40);
  }

  function stufen(name) {
    var rg = regler();
    if (!rg.length) { ZUSTAND = name; messen(); return; }
    [0, 0.5, 1].forEach(function (f) {
      rg.forEach(function (s) {
        var lo = parseFloat(s.min || 0), hi = parseFloat(s.max || 100);
        s.value = String(lo + (hi - lo) * f);
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
      ZUSTAND = name + ' / Regler ' + Math.round(f * 100) + '%';
      messen();
    });
  }

  /* Was zugeklappt ist, hat keine Größe und wird nicht gemessen. In den
     Übungen und Lernsituationen stecken die meisten Zeichnungen in
     details-Blöcken; sie werden deshalb früh aufgeklappt, damit der Browser
     sie bis zur Messung fertig gesetzt hat. */
  function aufklappen() {
    [].slice.call(document.querySelectorAll('details')).forEach(function (d) {
      d.open = true;
    });
  }

  /* Schaltet Normdarstellung und Schraffur ein: Erst dort liegt Strichwerk
     in den Flächen, und ein Text darauf ist unleserlich. */
  function haken() {
    return [].slice.call(document.querySelectorAll('input[type=checkbox]'))
      .filter(function (c) {
        var l = c.closest('label');
        var t = (l ? l.textContent : '') + ' ' + (c.id || '');
        return /norm|schraffur/i.test(t) && c.offsetParent !== null;
      });
  }

  function durchgang() {
    var kn = reiter();
    if (!kn.length) kn = [null];
    kn.forEach(function (b) {
      var name = '-';
      if (b) {
        try { b.click(); } catch (e) { return; }
        name = b.textContent.trim().slice(0, 24);
      }
      var sch = schalter().filter(function (x) { return x !== b; });
      if (!sch.length) { stufen(name); return; }
      sch.forEach(function (x) {
        try { x.click(); } catch (e2) { return; }
        /* Erklärteile erscheinen oft erst nach der Wahl - und sind dann
           wieder zugeklappt. */
        aufklappen();
        stufen(name + ' / ' + x.textContent.trim().slice(0, 22));
      });
    });
  }

  function lauf() {
    durchgang();
    var h = haken();
    if (h.length) {
      h.forEach(function (c) {
        if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      ZUSTAND = 'Norm';
      durchgang();
    }
    /* Doppelte zusammenfassen: Derselbe Text auf derselben Linie in mehreren
       Zuständen ist ein Befund, nicht vier. */
    var gesehen = {}, kurz = [];
    BEFUNDE.forEach(function (b) {
      var s = b.art + '|' + b.svg + '|' + b.text + '|' + b.was;
      if (gesehen[s]) { gesehen[s].mehr = (gesehen[s].mehr || 1) + 1; return; }
      gesehen[s] = b; kurz.push(b);
    });
    var uebs = Object.keys(GESEHEN.uebersprungen);
    kurz.unshift({ art: 'geprueft', svg: Object.keys(GESEHEN.bilder).length + ' Zeichnungen',
      zustand: GESEHEN.messungen + ' Messungen', text: GESEHEN.texte + ' Texte',
      was: uebs.length ? ('uebersprungen: ' + uebs.slice(0, 6).map(function (k) {
        return k + ' ' + GESEHEN.uebersprungen[k]; }).join(', ')) : '' });
    var pre = document.createElement('pre');
    pre.id = '__befunde';
    pre.textContent = JSON.stringify(kurz);
    document.body.appendChild(pre);
  }

  if (document.readyState === 'complete') { aufklappen(); setTimeout(lauf, 1200); }
  else window.addEventListener('load', function () {
    aufklappen(); setTimeout(lauf, 1200);
  });
}());
