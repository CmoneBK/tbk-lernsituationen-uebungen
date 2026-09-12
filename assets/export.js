/* Übungen als PDF oder als Word-Datei mitnehmen.
 *
 * Eingebunden mit einer Zeile vor dem schließenden body-Tag:
 *
 *     <script src="../../assets/export.js"></script>
 *
 * Ausgegeben wird genau der Stand, der gerade auf dem Bildschirm steht -
 * einschließlich der Auswahl aus "Übung anpassen" und der Werte, die jemand in
 * die Rechner eingetragen hat. Was sich auf Papier nicht bedienen lässt
 * (Schieberegler, Schrittfolgen, Selbstkontrollen), erscheint deshalb so, wie
 * es zuletzt eingestellt war.
 *
 * Zwei Wege, bewusst unterschiedlich:
 *
 *   PDF   über den Druckdialog des Browsers ("Als PDF speichern"). Das gibt
 *         gestochen scharfe Zeichnungen, weil der Browser die SVG direkt setzt,
 *         und braucht keine mitgelieferte Fremdbibliothek.
 *   Word  als HTML-Dokument mit der Endung .doc, das Word öffnet und weiter
 *         bearbeitet. Die Zeichnungen werden dafür in Bilder umgewandelt -
 *         Word stellt SVG in diesem Format nicht zuverlässig dar.
 *
 * Die Lösungen lassen sich unter die Aufgaben setzen oder ans Ende sammeln.
 */
(function () {
  'use strict';

  /* Dieselbe Leiste wie der Baukasten; wer zuerst kommt, legt sie an. */
  function leiste() {
    var l = document.getElementById('tbk-leiste');
    if (!l) {
      l = document.createElement('div');
      l.id = 'tbk-leiste';
      document.body.appendChild(l);
    }
    return l;
  }

  function versteckt(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (n.hidden) return true;
    }
    return false;
  }

  function haupt() { return document.querySelector('main'); }

  function sichtbar(liste) {
    return [].slice.call(liste).filter(function (el) { return !versteckt(el); });
  }

  /* ---------- Aufbereiten ---------- */

  /* Zu welchem Teil gehört ein Element? Gezählt wird über die Nummer im
     Abzeichen, damit die Zuordnung auch nach einem Zuschnitt stimmt. */
  function teilNummer(el) {
    var h2s = sichtbar(haupt().querySelectorAll('h2'));
    var treffer = null;
    h2s.forEach(function (h) {
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) treffer = h;
    });
    if (!treffer) return '';
    var nr = treffer.querySelector('.nr');
    return nr ? 'Teil ' + nr.textContent : '';
  }

  /* Baut die Seite für die Ausgabe um und liefert die Umkehrung zurück. */
  function aufbereiten(modus) {
    var zurueck = [];
    var offene = sichtbar(haupt().querySelectorAll('details'));

    offene.forEach(function (d) {
      var vorher = d.open;
      zurueck.push(function () { d.open = vorher; });
    });

    if (modus === 'unten') {
      offene.forEach(function (d) { d.open = true; });
      return function () { zurueck.forEach(function (f) { f(); }); };
    }

    /* modus === "ende": Aufgabe bleibt stehen, die Lösung wandert nach hinten. */
    offene.forEach(function (d) {
      d.open = false;
      d.classList.add('ex-nur-aufgabe');
    });

    var abschnitt = document.createElement('section');
    abschnitt.id = 'ex-loesungen';
    var h2 = document.createElement('h2');
    h2.textContent = 'Lösungen';
    abschnitt.appendChild(h2);

    offene.forEach(function (d) {
      var s = d.querySelector('summary');
      var h3 = document.createElement('h3');
      var wo = teilNummer(d);
      h3.textContent = (wo ? wo + ' · ' : '')
        + (s ? s.textContent.replace(/\s+/g, ' ').trim() : 'Lösung');
      abschnitt.appendChild(h3);

      var block = document.createElement('div');
      [].slice.call(d.children).forEach(function (k) {
        if (k.tagName !== 'SUMMARY') block.appendChild(k.cloneNode(true));
      });
      abschnitt.appendChild(block);
    });

    haupt().appendChild(abschnitt);

    return function () {
      zurueck.forEach(function (f) { f(); });
      offene.forEach(function (d) { d.classList.remove('ex-nur-aufgabe'); });
      abschnitt.remove();
    };
  }

  /* ---------- PDF über den Druckdialog ---------- */

  function drucken(modus) {
    var auf = aufbereiten(modus);
    var fertig = false;
    function ende() {
      if (fertig) return;
      fertig = true;
      auf();
      window.removeEventListener('afterprint', ende);
    }
    window.addEventListener('afterprint', ende);
    /* Nicht jeder Browser meldet afterprint zuverlässig - als Netz ein Timer. */
    setTimeout(ende, 60000);

    /* Ein Tick Pause, damit der Umbau gezeichnet ist, bevor der Dialog kommt. */
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- Zeichnungen in Bilder ---------- */

  /* Word stellt eingebettete SVG nicht zuverlässig dar. Für die Word-Ausgabe
     werden sie deshalb gerastert. Dabei müssen alle Farben und Schriftgrößen
     fest eingetragen werden: currentColor und die CSS-Variablen der Seite
     gelten in einer freistehenden SVG-Datei nicht mehr. */
  var UEBERTRAGEN = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray',
    'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-size', 'font-family',
    'font-weight', 'text-anchor', 'display'];

  function svgFest(svg) {
    var kopie = svg.cloneNode(true);
    var quelle = svg.querySelectorAll('*');
    var ziel = kopie.querySelectorAll('*');
    for (var i = 0; i < quelle.length; i++) {
      var st = getComputedStyle(quelle[i]);
      UEBERTRAGEN.forEach(function (name) {
        var w = st.getPropertyValue(name);
        if (w && w !== 'none' || name === 'fill' || name === 'stroke') {
          ziel[i].setAttribute(name, w);
        }
      });
    }
    kopie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return kopie;
  }

  function svgZuBild(svg, breite) {
    return new Promise(function (fertig) {
      var vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
      var w = breite, h = Math.round(breite * vb[3] / vb[2]);
      var kopie = svgFest(svg);
      kopie.setAttribute('width', w);
      kopie.setAttribute('height', h);

      var text = new XMLSerializer().serializeToString(kopie);
      var bild = new Image();
      bild.onload = function () {
        var c = document.createElement('canvas');
        c.width = w * 2;
        c.height = h * 2;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(bild, 0, 0, c.width, c.height);
        try { fertig({ daten: c.toDataURL('image/png'), w: w, h: h }); }
        catch (e) { fertig(null); }
      };
      bild.onerror = function () { fertig(null); };
      bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
    });
  }

  /* ---------- Word ---------- */

  function dateiname() {
    var t = (document.title || 'uebung').replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ').trim();
    return t.slice(0, 80) || 'uebung';
  }

  var WORD_CSS = ''
    + '@page{size:A4;margin:2cm}'
    + 'body{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt;color:#000}'
    + 'h1{font-size:19pt;margin:0 0 6pt}'
    + 'h2{font-size:15pt;margin:18pt 0 4pt;border-top:1pt solid #999;padding-top:8pt}'
    + 'h3{font-size:12pt;margin:12pt 0 3pt}'
    + 'p{margin:0 0 6pt}'
    + 'ul,ol{margin:0 0 6pt 18pt}'
    + 'table{border-collapse:collapse;width:100%;font-size:10pt;margin:6pt 0}'
    + 'th,td{border:0.5pt solid #999;padding:4pt 6pt;text-align:left;vertical-align:top}'
    + 'th{background:#eee}'
    + '.box,.auftrag,.merksatz{border:0.5pt solid #999;padding:8pt 10pt;margin:8pt 0}'
    + '.herkunft{font-size:9pt;letter-spacing:.06em;text-transform:uppercase;color:#555}'
    + '.lead{color:#333}'
    + '.fussnote,.bk-hinweis{font-size:9pt;color:#555}'
    + '.ex-aufgabe{font-weight:bold;margin:8pt 0 4pt}'
    + 'img{max-width:100%}'
    + '.ex-hinweis{border:0.5pt solid #999;background:#f2f2f2;padding:8pt 10pt;margin:0 0 12pt;font-size:10pt}';

  /* Alles herausnehmen, was auf Papier nichts verloren hat. */
  function saeubern(wurzel) {
    ['script', '.schritte', '#tbk-leiste', '#bk-tafel', '#ex-tafel']
      .forEach(function (wahl) {
        [].slice.call(wurzel.querySelectorAll(wahl)).forEach(function (e) { e.remove(); });
      });
    /* Was ausdrücklich nicht auf Papier soll. */
    [].slice.call(wurzel.querySelectorAll('[data-druck="weg"]')).forEach(function (e) {
      e.remove();
    });

    /* Schaltflächen sind meist Bedienung und sagen auf Papier nichts - die
       fliegen raus. Zwei Ausnahmen: Steckt eine Zeichnung darin (in Übung 2
       sind die vier Schnitte anklickbar), bleibt der Inhalt. Und trägt die
       Schaltfläche data-druck="text", ist ihre Beschriftung selbst der Inhalt
       (etwa die Bausteine einer Schraubenbezeichnung). */
    [].slice.call(wurzel.querySelectorAll('button')).forEach(function (b) {
      if (b.querySelector('img, svg')) {
        var huelle = document.createElement('div');
        while (b.firstChild) huelle.appendChild(b.firstChild);
        b.replaceWith(huelle);
      } else if (b.dataset.druck === 'text') {
        var wort = document.createElement('strong');
        wort.textContent = b.textContent;
        b.replaceWith(wort);
      } else {
        b.remove();
      }
    });

    /* Die Nummer im Abzeichen klebt sonst am Titel: "1Die Bausteine". */
    [].slice.call(wurzel.querySelectorAll('.nr')).forEach(function (n) {
      n.replaceWith(document.createTextNode(n.textContent + '. '));
    });
    [].slice.call(wurzel.querySelectorAll('[hidden]')).forEach(function (e) { e.remove(); });
    /* Eingaben als Text festhalten - Word kann mit Formularfeldern nichts anfangen. */
    [].slice.call(wurzel.querySelectorAll('input,select,output,textarea')).forEach(function (e) {
      var wert = e.tagName === 'SELECT'
        ? (e.options[e.selectedIndex] || {}).text || ''
        : (e.value != null ? e.value : e.textContent);
      var span = document.createElement('strong');
      span.textContent = wert;
      e.replaceWith(span);
    });
    /* Aus dem Aufklapp-Element wird eine schlichte Überschrift. */
    [].slice.call(wurzel.querySelectorAll('details')).forEach(function (d) {
      var ersatz = document.createElement('div');
      [].slice.call(d.childNodes).forEach(function (k) {
        if (k.tagName === 'SUMMARY') {
          var p = document.createElement('p');
          p.className = 'ex-aufgabe';
          p.textContent = k.textContent;
          ersatz.appendChild(p);
        } else if (!d.classList.contains('ex-nur-aufgabe')) {
          ersatz.appendChild(k);
        }
      });
      d.replaceWith(ersatz);
    });
    return wurzel;
  }

  function wordDatei(modus, melden) {
    var auf = aufbereiten(modus);
    var quelle = haupt();
    var svgs = sichtbar(quelle.querySelectorAll('svg'));

    /* Wer die Seite im dunklen Modus liest, bekaeme sonst weisse Striche auf
       weissem Papier: Die Zeichnungen uebernehmen beim Rastern die Farben, die
       gerade gelten. Also fuer die Dauer der Umwandlung auf hell schalten. */
    document.documentElement.classList.add('ex-hell');

    melden('Zeichnungen werden umgewandelt …');

    Promise.all(svgs.map(function (s) { return svgZuBild(s, 620); }))
      .then(function (bilder) {
        document.documentElement.classList.remove('ex-hell');
        var kopie = quelle.cloneNode(true);
        /* Dieselbe Reihenfolge wie oben: die sichtbaren SVG der Kopie
           durchgehen und durch die Bilder ersetzen. */
        var kopien = [].slice.call(kopie.querySelectorAll('svg'));
        var roh = [].slice.call(quelle.querySelectorAll('svg'));
        roh.forEach(function (s, i) {
          var stelle = kopien[i];
          if (!stelle) return;
          var k = svgs.indexOf(s);
          if (k === -1 || !bilder[k]) { stelle.remove(); return; }
          var img = document.createElement('img');
          img.src = bilder[k].daten;
          img.width = bilder[k].w;
          img.height = bilder[k].h;
          stelle.replaceWith(img);
        });

        saeubern(kopie);

        var kopf = document.querySelector('header');
        var kopfHtml = kopf ? saeubern(kopf.cloneNode(true)).innerHTML : '';

        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
          + 'xmlns:w="urn:schemas-microsoft-com:office:word" '
          + 'xmlns="http://www.w3.org/TR/REC-html40"><head>'
          + '<meta charset="utf-8">'
          + '<title>' + document.title.replace(/</g, '&lt;') + '</title>'
          + '<style>' + WORD_CSS + '</style></head><body>'
          + kopfHtml
          + '<p class="ex-hinweis">Ausdruck aus dem Unterrichtsmaterial von t-bk.de. '
          + 'Die Übung ist eigentlich interaktiv &ndash; Schieberegler, Eingabefelder '
          + 'und Schrittfolgen stehen hier so, wie sie beim Erzeugen dieser Datei '
          + 'eingestellt waren.</p>'
          + kopie.innerHTML
          + '</body></html>';

        auf();

        var blob = new Blob(['﻿', html], { type: 'application/msword' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = dateiname() + '.doc';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 4000);
        melden('');
      })
      .catch(function () {
        document.documentElement.classList.remove('ex-hell');
        auf();
        melden('Die Datei konnte nicht erzeugt werden.');
      });
  }

  /* ---------- Oberfläche ---------- */

  var CSS = ''
    + '#ex-knopf{display:inline-flex;align-items:center;gap:8px;cursor:pointer;'
    + 'font:600 14px/1 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'
    + 'padding:11px 16px;border-radius:999px;color:#1a1a1a;background:#fff;'
    + 'border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,.18),0 10px 28px rgba(0,0,0,.16)}'
    + '#ex-knopf:hover{border-color:#2b6cb0;color:#2b6cb0}'
    + '#ex-knopf:focus-visible{outline:2px solid #1a1a1a;outline-offset:2px}'
    + '#ex-tafel{position:fixed;right:16px;bottom:74px;z-index:2147483647;'
    + 'width:min(360px,calc(100vw - 32px));max-height:min(76vh,640px);overflow:auto;'
    + 'background:var(--card,#fff);color:var(--fg,#1a1a1a);'
    + 'border:1px solid var(--border-stark,#cbd5e1);border-radius:14px;'
    + 'box-shadow:0 4px 12px rgba(0,0,0,.18),0 24px 60px rgba(0,0,0,.28);'
    + 'font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'
    + 'padding:18px 20px 20px}'
    + '#ex-tafel h2{font-size:16px;margin:0 0 4px;padding:0;border:0}'
    + '#ex-tafel p{margin:0 0 12px}'
    + '#ex-tafel fieldset{border:0;margin:0 0 14px;padding:0}'
    + '#ex-tafel legend{font-weight:700;padding:0;margin:0 0 6px}'
    + '#ex-tafel label{display:flex;gap:8px;align-items:flex-start;cursor:pointer;'
    + 'padding:5px 4px;border-radius:6px}'
    + '#ex-tafel label:hover{background:var(--bg,#f7f7f5)}'
    + '#ex-tafel input{margin:2px 0 0;flex:0 0 auto;accent-color:#2b6cb0}'
    + '.ex-warnung{border:1px solid var(--border-stark,#cbd5e1);border-radius:10px;'
    + 'padding:10px 12px;font-size:12.5px;color:var(--muted,#5f5f5a);margin:0 0 14px}'
    + '.ex-knoepfe{display:flex;gap:8px;flex-wrap:wrap}'
    + '.ex-knoepfe button{font:600 13px/1 inherit;cursor:pointer;padding:9px 14px;'
    + 'border-radius:999px;border:1px solid #2b6cb0;background:#2b6cb0;color:#fff}'
    + '.ex-knoepfe button.leise{background:none;color:inherit;'
    + 'border-color:var(--border-stark,#cbd5e1)}'
    + '.ex-knoepfe button:hover{filter:brightness(1.08)}'
    + '.ex-knoepfe button.leise:hover{border-color:#2b6cb0;color:#2b6cb0;filter:none}'
    + '#ex-stand{font-size:12.5px;color:var(--muted,#5f5f5a);margin:10px 0 0;min-height:1.2em}'
    + '#ex-schliessen{position:absolute;top:12px;right:14px;border:0;background:none;'
    + 'cursor:pointer;font:700 20px/1 inherit;color:var(--muted,#5f5f5a);padding:4px 6px}'
    + '@media (max-width:640px){#ex-tafel{right:8px;left:8px;bottom:74px;width:auto}}'
    /* Für die Ausgabe: helle Farben, keine Bedienelemente, keine Seitenumbrüche
       mitten in einer Zeichnung. */
    + '@media print{'
    + ':root{--bg:#fff;--fg:#111;--muted:#555;--card:#fff;--border:#bbb;'
    + '--border-stark:#888;--accent:#164e8a;--accent-fg:#fff;--shadow:none}'
    + 'body{background:#fff;color:#111}'
    + '#ex-tafel,#tbk-leiste,.schritte{display:none!important}'
    + 'header{padding-top:0!important}'
    + 'details{break-inside:avoid}'
    + 'details>summary{list-style:none;font-weight:700}'
    + 'details>summary::-webkit-details-marker{display:none}'
    + '.bild,figure,table{break-inside:avoid}'
    + 'h2,h3{break-after:avoid}'
    + '.box,.merksatz{box-shadow:none!important}'
    + '#ex-loesungen{break-before:page}'
    + '.ex-nur-aufgabe>*:not(summary){display:none!important}'
    + '}'
    + '.ex-nur-aufgabe>*:not(summary){display:none}'
    /* Nur waehrend des Rasterns gesetzt; hoehere Spezifitaet als :root, damit
       sie die Vorgaben aus assets/uebung.css sicher ueberschreibt. */
    + 'html.ex-hell{--bg:#fff;--fg:#111;--muted:#555;--card:#fff;--border:#bbb;'
    + '--border-stark:#888;--accent:#164e8a;--accent-fg:#fff;'
    + '--ok:#15803d;--warn:#a16207;--bad:#b91c1c;--shadow:none}';

  function bauen() {
    var stil = document.createElement('style');
    stil.textContent = CSS;
    document.head.appendChild(stil);

    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.id = 'ex-knopf';
    knopf.setAttribute('aria-expanded', 'false');
    knopf.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      + 'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
      + 'stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg><span>Herunterladen</span>';

    var tafel = document.createElement('div');
    tafel.id = 'ex-tafel';
    tafel.hidden = true;
    tafel.setAttribute('role', 'dialog');
    tafel.setAttribute('aria-label', 'Übung herunterladen');
    tafel.innerHTML =
      '<button type="button" id="ex-schliessen" aria-label="Schließen">&times;</button>'
      + '<h2>Herunterladen</h2>'
      + '<fieldset><legend>Lösungen</legend>'
      + '<label><input type="radio" name="ex-modus" value="unten" checked>'
      + '<span>direkt unter den Aufgaben</span></label>'
      + '<label><input type="radio" name="ex-modus" value="ende">'
      + '<span>gesammelt am Ende, auf eigener Seite</span></label>'
      + '</fieldset>'
      + '<p class="ex-warnung">Ausgegeben wird genau der Stand, der gerade auf dem '
      + 'Bildschirm steht &ndash; auch die Auswahl aus <em>Übung anpassen</em>. '
      + 'Schieberegler, Eingabefelder und Schrittfolgen lassen sich auf Papier '
      + 'nicht bedienen; sie erscheinen mit den zuletzt eingestellten Werten. '
      + 'Teile, die noch ausgeblendet sind, kommen nicht mit.</p>'
      + '<div class="ex-knoepfe">'
      + '<button type="button" id="ex-pdf">Als PDF</button>'
      + '<button type="button" id="ex-word" class="leise">Als Word</button>'
      + '</div>'
      + '<p id="ex-stand"></p>';

    leiste().appendChild(knopf);
    document.body.appendChild(tafel);

    function modus() {
      return tafel.querySelector('input[name="ex-modus"]:checked').value;
    }
    function melden(text) { tafel.querySelector('#ex-stand').textContent = text; }

    tafel.querySelector('#ex-pdf').addEventListener('click', function () {
      melden('Der Druckdialog öffnet sich – dort „Als PDF speichern“ wählen.');
      drucken(modus());
      setTimeout(function () { melden(''); }, 8000);
    });
    tafel.querySelector('#ex-word').addEventListener('click', function () {
      wordDatei(modus(), melden);
    });

    function oeffnen(an) {
      tafel.hidden = !an;
      knopf.setAttribute('aria-expanded', String(an));
      if (an) document.dispatchEvent(new CustomEvent('tbk-tafel', { detail: 'export' }));
      else melden('');
    }
    knopf.addEventListener('click', function () { oeffnen(tafel.hidden); });
    tafel.querySelector('#ex-schliessen').addEventListener('click', function () {
      oeffnen(false);
      knopf.focus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !tafel.hidden) { oeffnen(false); knopf.focus(); }
    });
    document.addEventListener('tbk-tafel', function (e) {
      if (e.detail !== 'export' && !tafel.hidden) oeffnen(false);
    });
  }

  function start() {
    if (!haupt()) return;
    bauen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
