/* Übungen zusammenstellen und als Link weitergeben.
 *
 * Eingebunden mit einer Zeile vor dem schließenden body-Tag:
 *
 *     <script src="../../assets/qr.js"></script>
 *     <script src="../../assets/baukasten.js"></script>
 *
 * Wozu: Nicht jeder Teil einer Übung passt zu jeder Lerngruppe oder jedem
 * Bildungsgang. Über die Schaltfläche unten rechts lassen sich Teile und
 * einzelne Aufgaben abwählen; daraus entsteht ein Link (und ein QR-Code), der
 * die Übung genau so öffnet. Die Übung selbst bleibt unverändert - die Auswahl
 * steckt allein in der Adresse.
 *
 * Die Kennungen in der Adresse leiten sich aus den Überschriften ab, nicht aus
 * ihrer Reihenfolge. Wird eine Übung später umgestellt, zeigen alte Links
 * weiterhin auf dasselbe. Wird eine Überschrift umformuliert, findet der Link
 * sie nicht mehr - dann erscheint dieser Teil wieder, statt dass der falsche
 * verschwindet. Das ist die harmlosere Richtung.
 */
(function () {
  'use strict';

  var PARAM = 'ohne';

  /* ---------- Kennungen ---------- */

  /* Kurzer Streuwert (FNV-1a) über den Text der Überschrift. Vier Zeichen
     reichen; Doppelungen innerhalb einer Seite werden unten durchnummeriert. */
  function kennung(text) {
    var h = 0x811c9dc5;
    var t = text.replace(/\s+/g, ' ').trim().toLowerCase();
    for (var i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36).slice(0, 4);
  }

  /* Beschriftung einer Überschrift ohne die vorangestellte Nummer. */
  function beschriftung(el) {
    var k = el.cloneNode(true);
    var nr = k.querySelector('.nr');
    if (nr) nr.remove();
    return k.textContent.replace(/\s+/g, ' ').trim();
  }

  /* ---------- Aufbau der Seite lesen ---------- */

  /* Ein Teil ist eine h2-Überschrift mit allem, was ihr in ihrem eigenen
     Elternknoten bis zur nächsten h2 folgt. Das trägt auch die Übungen, bei
     denen ganze Abschnitte erst nach einem Klick erscheinen und deshalb in
     einem eigenen div stecken. */
  function aufbauLesen() {
    var haupt = document.querySelector('main');
    if (!haupt) return [];

    var teile = [];
    var vergeben = {};

    function eindeutig(roh) {
      var k = roh, n = 2;
      while (vergeben[k]) k = roh + (n++);
      vergeben[k] = true;
      return k;
    }

    [].slice.call(haupt.querySelectorAll('h2')).forEach(function (h2) {
      var knoten = [h2];
      var n = h2.nextElementSibling;
      while (n && n.tagName !== 'H2') {
        knoten.push(n);
        n = n.nextElementSibling;
      }

      var fragen = [];
      knoten.forEach(function (k) {
        if (k.tagName === 'DETAILS') fragen.push(k);
        else [].slice.call(k.querySelectorAll('details')).forEach(function (d) {
          fragen.push(d);
        });
      });

      teile.push({
        id: eindeutig(kennung(beschriftung(h2))),
        name: beschriftung(h2),
        kopf: h2,
        knoten: knoten,
        fragen: fragen.map(function (d) {
          var s = d.querySelector('summary');
          var name = s ? s.textContent.replace(/\s+/g, ' ').trim() : 'Aufgabe';
          return { id: eindeutig(kennung(name)), name: name, knoten: [d] };
        })
      });
    });

    return teile;
  }

  /* ---------- Anwenden ---------- */

  function ausLesen() {
    var aus = {};
    try {
      var p = new URLSearchParams(location.search).get(PARAM);
      if (p) p.split('.').forEach(function (k) { if (k) aus[k] = true; });
    } catch (e) { /* ohne Parameter bleibt alles sichtbar */ }
    return aus;
  }

  function anwenden(teile, aus) {
    var nr = 0;
    teile.forEach(function (t) {
      var wegTeil = !!aus[t.id];
      t.knoten.forEach(function (k) { k.hidden = wegTeil; });
      t.fragen.forEach(function (f) {
        f.knoten.forEach(function (k) { k.hidden = wegTeil || !!aus[f.id]; });
      });

      /* Die Nummern der übrigen Teile wieder lückenlos zählen. */
      var badge = t.kopf.querySelector('.nr');
      if (badge && !wegTeil) badge.textContent = String(++nr);
    });
  }

  function adresse(aus) {
    var u = new URL(location.href);
    var liste = Object.keys(aus).filter(function (k) { return aus[k]; });
    if (liste.length) u.searchParams.set(PARAM, liste.join('.'));
    else u.searchParams.delete(PARAM);
    return u.href;
  }

  /* ---------- QR-Code ---------- */

  function qrZeichnen(ziel, text) {
    ziel.textContent = '';
    if (typeof window.tbkQr !== 'function') return;

    var m;
    try { m = window.tbkQr(text); }
    catch (e) {
      var p = document.createElement('p');
      p.className = 'bk-hinweis';
      p.textContent = 'Der Link ist zu lang für einen QR-Code. Er lässt sich '
        + 'trotzdem kopieren.';
      ziel.appendChild(p);
      return;
    }

    var n = m.length, rand = 4, gesamt = n + 2 * rand;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + gesamt + ' ' + gesamt);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR-Code zu dieser Zusammenstellung');
    svg.setAttribute('shape-rendering', 'crispEdges');

    var hell = document.createElementNS(NS, 'rect');
    hell.setAttribute('width', gesamt);
    hell.setAttribute('height', gesamt);
    hell.setAttribute('fill', '#fff');
    svg.appendChild(hell);

    /* Eine einzige Pfadangabe statt tausender Rechtecke - das bleibt auch
       beim Tippen flüssig. */
    var d = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (m[y][x]) d.push('M' + (x + rand) + ' ' + (y + rand) + 'h1v1h-1z');
      }
    }
    var pfad = document.createElementNS(NS, 'path');
    pfad.setAttribute('d', d.join(''));
    pfad.setAttribute('fill', '#000');
    svg.appendChild(pfad);

    ziel.appendChild(svg);
  }

  /* ---------- Oberfläche ---------- */

  var CSS = ''
    + '#bk-knopf{position:fixed;right:16px;bottom:16px;z-index:2147483646;'
    + 'display:inline-flex;align-items:center;gap:8px;cursor:pointer;'
    + 'font:600 14px/1 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'
    + 'padding:11px 16px;border-radius:999px;color:#fff;background:#2b6cb0;'
    + 'border:1px solid #2b6cb0;box-shadow:0 2px 6px rgba(0,0,0,.2),0 10px 28px rgba(0,0,0,.18)}'
    + '#bk-knopf:hover{filter:brightness(1.08)}'
    + '#bk-knopf:focus-visible{outline:2px solid #1a1a1a;outline-offset:2px}'
    + '#bk-tafel{position:fixed;right:16px;bottom:74px;z-index:2147483647;'
    + 'width:min(390px,calc(100vw - 32px));max-height:min(76vh,680px);'
    /* Spalte statt einfachem Block: die Liste scrollt, Link und QR-Code
       bleiben unten stehen. Sie sind der Zweck des Fensters. */
    + 'display:flex;flex-direction:column;'
    + 'background:var(--card,#fff);color:var(--fg,#1a1a1a);'
    + 'border:1px solid var(--border-stark,#cbd5e1);border-radius:14px;'
    + 'box-shadow:0 4px 12px rgba(0,0,0,.18),0 24px 60px rgba(0,0,0,.28);'
    + 'font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'
    + 'padding:18px 20px 20px}'
    + '#bk-tafel h2{font-size:16px;margin:0 0 4px;padding:0;border:0}'
    + '#bk-tafel p{margin:0 0 12px}'
    + '.bk-hinweis{color:var(--muted,#5f5f5a);font-size:12.5px}'
    + '#bk-schliessen{position:absolute;top:12px;right:14px;border:0;background:none;'
    + 'cursor:pointer;font:700 20px/1 inherit;color:var(--muted,#5f5f5a);padding:4px 6px}'
    + '#bk-schliessen:hover{color:var(--fg,#1a1a1a)}'
    + '.bk-liste{list-style:none;margin:0 0 4px;padding:0 2px 0 0;'
    + 'overflow:auto;flex:1 1 auto;min-height:60px}'
    + '.bk-liste ul{list-style:none;margin:2px 0 8px;padding:0 0 0 26px}'
    + '.bk-liste li{margin:0 0 2px}'
    + '.bk-liste label{display:flex;gap:8px;align-items:flex-start;cursor:pointer;'
    + 'padding:3px 4px;border-radius:6px}'
    + '.bk-liste label:hover{background:var(--bg,#f7f7f5)}'
    + '.bk-liste input{margin:3px 0 0;flex:0 0 auto;accent-color:#2b6cb0}'
    + '.bk-teil > label{font-weight:700}'
    + '.bk-liste li.bk-aus > label{opacity:.5;text-decoration:line-through}'
    + '.bk-werkzeuge{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}'
    + '.bk-werkzeuge button{font:600 13px/1 inherit;cursor:pointer;padding:7px 12px;'
    + 'border-radius:999px;background:none;color:inherit;'
    + 'border:1px solid var(--border-stark,#cbd5e1)}'
    + '.bk-werkzeuge button:hover{border-color:#2b6cb0;color:#2b6cb0}'
    + '.bk-werkzeuge{flex:0 0 auto}'
    + '#bk-teilen{border-top:1px solid var(--border,#e3e3df);margin-top:4px;'
    + 'padding-top:12px;flex:0 0 auto}'
    + '#bk-link{width:100%;font:12.5px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
    + 'padding:8px 10px;border-radius:8px;color:inherit;background:var(--bg,#f7f7f5);'
    + 'border:1px solid var(--border-stark,#cbd5e1)}'
    + '#bk-qr{display:flex;justify-content:center;margin:14px 0 4px}'
    + '#bk-qr svg{width:148px;height:148px;border-radius:8px}'
    + '@media (max-width:640px){#bk-tafel{right:8px;left:8px;bottom:68px;width:auto;'
    + 'max-height:70vh}#bk-knopf{right:8px;bottom:8px}}'
    + '@media print{#bk-knopf,#bk-tafel{display:none!important}}';

  function bauen(teile) {
    var stil = document.createElement('style');
    stil.textContent = CSS;
    document.head.appendChild(stil);

    var aus = ausLesen();
    anwenden(teile, aus);

    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.id = 'bk-knopf';
    knopf.setAttribute('aria-expanded', 'false');
    knopf.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      + 'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
      + 'aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h7"/></svg>'
      + '<span>Übung anpassen</span>';

    var tafel = document.createElement('div');
    tafel.id = 'bk-tafel';
    tafel.hidden = true;
    tafel.setAttribute('role', 'dialog');
    tafel.setAttribute('aria-label', 'Übung anpassen');

    var liste = teile.map(function (t) {
      var kinder = t.fragen.map(function (f) {
        return '<li data-id="' + f.id + '"><label>'
          + '<input type="checkbox" data-id="' + f.id + '">'
          + '<span></span></label></li>';
      }).join('');
      return '<li class="bk-teil" data-id="' + t.id + '"><label>'
        + '<input type="checkbox" data-id="' + t.id + '">'
        + '<span></span></label>'
        + (kinder ? '<ul>' + kinder + '</ul>' : '')
        + '</li>';
    }).join('');

    tafel.innerHTML =
      '<button type="button" id="bk-schliessen" aria-label="Schließen">&times;</button>'
      + '<h2>Übung anpassen</h2>'
      + '<p class="bk-hinweis">Häkchen entfernen, um Teile wegzulassen. Die Auswahl '
      + 'wirkt sofort auf der Seite hinter diesem Fenster.</p>'
      + '<ul class="bk-liste">' + liste + '</ul>'
      + '<div class="bk-werkzeuge">'
      + '<button type="button" id="bk-alle">Alle wieder einblenden</button>'
      + '</div>'
      + '<div id="bk-teilen">'
      + '<p class="bk-hinweis" style="margin-bottom:6px">Link zu dieser Zusammenstellung:</p>'
      + '<input type="text" id="bk-link" readonly>'
      + '<div class="bk-werkzeuge" style="margin-top:8px;margin-bottom:0">'
      + '<button type="button" id="bk-kopieren">Link kopieren</button>'
      + '</div>'
      + '<div id="bk-qr"></div>'
      + '<p class="bk-hinweis">Der QR-Code führt auf dieselbe Zusammenstellung.</p>'
      + '</div>';

    document.body.appendChild(knopf);
    document.body.appendChild(tafel);

    /* Beschriftungen als Text setzen, nicht über innerHTML - die Überschriften
       können alles Mögliche enthalten. */
    teile.forEach(function (t) {
      tafel.querySelector('li[data-id="' + t.id + '"] > label > span').textContent = t.name;
      t.fragen.forEach(function (f) {
        tafel.querySelector('li[data-id="' + f.id + '"] > label > span').textContent = f.name;
      });
    });

    var kaestchen = [].slice.call(tafel.querySelectorAll('.bk-liste input'));

    function stand() {
      kaestchen.forEach(function (k) {
        k.checked = !aus[k.dataset.id];
        k.closest('li').classList.toggle('bk-aus', !!aus[k.dataset.id]);
      });
      /* Fragen eines abgewählten Teils sind ohnehin weg. */
      teile.forEach(function (t) {
        t.fragen.forEach(function (f) {
          var k = tafel.querySelector('input[data-id="' + f.id + '"]');
          k.disabled = !!aus[t.id];
        });
      });

      var href = adresse(aus);
      tafel.querySelector('#bk-link').value = href;
      qrZeichnen(tafel.querySelector('#bk-qr'), href);

      var weg = Object.keys(aus).length;
      knopf.querySelector('span').textContent = weg
        ? 'Übung anpassen (' + weg + ' weniger)'
        : 'Übung anpassen';
    }

    function aendern(id, an) {
      if (an) delete aus[id]; else aus[id] = true;
      anwenden(teile, aus);
      /* Die Adresse mitziehen, damit ein Neuladen den Stand behält. */
      try { history.replaceState(null, '', adresse(aus)); } catch (e) { /* file:// */ }
      stand();
    }

    kaestchen.forEach(function (k) {
      k.addEventListener('change', function () { aendern(k.dataset.id, k.checked); });
    });

    tafel.querySelector('#bk-alle').addEventListener('click', function () {
      Object.keys(aus).forEach(function (k) { delete aus[k]; });
      anwenden(teile, aus);
      try { history.replaceState(null, '', adresse(aus)); } catch (e) { /* file:// */ }
      stand();
    });

    tafel.querySelector('#bk-kopieren').addEventListener('click', function () {
      var feld = tafel.querySelector('#bk-link');
      feld.select();
      var knopfK = tafel.querySelector('#bk-kopieren');
      function melden(ok) {
        knopfK.textContent = ok ? 'Kopiert' : 'Bitte von Hand kopieren';
        setTimeout(function () { knopfK.textContent = 'Link kopieren'; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(feld.value).then(function () { melden(true); },
                                                       function () { melden(false); });
      } else {
        try { melden(document.execCommand('copy')); } catch (e) { melden(false); }
      }
    });

    function oeffnen(an) {
      tafel.hidden = !an;
      knopf.setAttribute('aria-expanded', String(an));
      if (an) stand();
    }
    knopf.addEventListener('click', function () { oeffnen(tafel.hidden); });
    tafel.querySelector('#bk-schliessen').addEventListener('click', function () {
      oeffnen(false);
      knopf.focus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !tafel.hidden) { oeffnen(false); knopf.focus(); }
    });

    stand();
  }

  function start() {
    var teile = aufbauLesen();
    if (teile.length < 2) return;      /* ohne Gliederung gibt es nichts zu wählen */
    bauen(teile);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
