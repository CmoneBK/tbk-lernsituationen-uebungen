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
 *   Word  als Web-Archiv (MHTML) mit der Endung .doc, das Word öffnet und
 *         weiterbearbeitet. Die Zeichnungen werden dafür in Bilder umgewandelt
 *         und als eigene Teile mitgeschickt: Word lädt keine Bilder aus
 *         data:-Adressen, wohl aber Teile eines Archivs.
 *
 * Die Lösungen lassen sich unter die Aufgaben setzen oder ans Ende sammeln.
 */
(function () {
  'use strict';


  /* Um welche Art Seite es geht, steht im Pfad. Das ist unabhängig davon, wie
     die Seite selbst überschrieben ist, und stimmt auch lokal und auf GitHub
     Pages. */
  var TYP = /\/trainings\//.test(location.pathname) ? 'Training'
    : /\/lernsituationen\//.test(location.pathname) ? 'Lernsituation'
    : 'Übung';

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

  /* Auswahlfelder, die eine Antwort verlangen, werden auf Papier zu Kästchen
     zum Ankreuzen. Erkennbar an data-druck="ankreuzen" an der Auswahl selbst -
     die Felder für Gewinde, Festigkeitsklasse und dergleichen bleiben davon
     unberührt, sie tragen nur einen eingestellten Wert. */
  function ankreuzen() {
    var zurueck = [];
    sichtbar(haupt().querySelectorAll('select[data-druck="ankreuzen"]'))
      .forEach(function (sel) {
        var liste = document.createElement('ul');
        liste.className = 'ex-ankreuzen';
        [].slice.call(sel.options).forEach(function (o) {
          /* Ein Platzhalter ohne Wert ist keine Antwortmöglichkeit. */
          if (!o.value) return;
          var li = document.createElement('li');
          var kasten = document.createElement('span');
          kasten.className = 'ex-kasten' + (o.selected ? ' an' : '');
          li.appendChild(kasten);
          li.appendChild(document.createTextNode(o.text));
          liste.appendChild(li);
        });

        var platz = document.createElement('span');
        sel.replaceWith(platz);
        platz.replaceWith(liste);
        zurueck.push(function () { liste.replaceWith(sel); });
      });
    return function () { zurueck.forEach(function (f) { f(); }); };
  }

  /* Baut die Seite für die Ausgabe um und liefert die Umkehrung zurück. */
  function aufbereiten(modus) {
    var zurueck = [ankreuzen()];
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

  function svgZuBild(svg, breite, art) {
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
        try {
          fertig({
            daten: art === 'jpeg' ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png'),
            w: c.width, h: c.height
          });
        } catch (e) { fertig(null); }
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
      /* Ein leeres Feld wird zur Schreiblinie - auf Papier soll man es
         ausfüllen können, statt eine Lücke zu sehen. */
      span.textContent = wert || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0';
      if (!wert) span.style.borderBottom = '1px solid #999';
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

  /* Base64 in Zeilen zu 76 Zeichen - so will es MIME. */
  function base64Zeilen(b64) {
    return (b64.match(/.{1,76}/g) || []).join('\r\n');
  }

  function textAlsBase64(text) {
    return base64Zeilen(btoa(unescape(encodeURIComponent(text))));
  }

  /* Ein Web-Archiv aus dem HTML und den Bildern. Die Bilder stehen als eigene
     Teile darin; das HTML verweist mit einfachen Dateinamen darauf, die sich
     gegen die Adresse des HTML-Teils auflösen. Genau so legt Word seine
     eigenen "Webseite, einzelne Datei" an. */
  function webArchiv(html, bilder) {
    var grenze = '----=_TBK_Unterrichtsmaterial';
    var basis = 'file:///C:/tbk/';
    var teile = [
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; type="text/html"; boundary="' + grenze + '"',
      '',
      'Dieses Dokument ist ein Web-Archiv. Es öffnet sich in Word und in jedem Browser.',
      ''
    ];

    function teil(kopf, inhalt) {
      teile.push('--' + grenze);
      kopf.forEach(function (z) { teile.push(z); });
      teile.push('');
      teile.push(inhalt);
      teile.push('');
    }

    teil([
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
      'Content-Location: ' + basis + 'uebung.htm'
    ], textAlsBase64(html));

    bilder.forEach(function (b) {
      teil([
        'Content-Type: image/png',
        'Content-Transfer-Encoding: base64',
        'Content-Location: ' + basis + b.name
      ], base64Zeilen(b.b64));
    });

    teile.push('--' + grenze + '--');
    teile.push('');
    return teile.join('\r\n');
  }

  function wordDatei(modus, melden) {
    var auf = aufbereiten(modus);
    var quelle = haupt();
    var svgs = sichtbar(quelle.querySelectorAll('svg'));

    /* Wer die Seite im dunklen Modus liest, bekäme sonst weiße Striche auf
       weißem Papier: Die Zeichnungen übernehmen beim Rastern die Farben, die
       gerade gelten. Also für die Dauer der Umwandlung auf hell schalten. */
    document.documentElement.classList.add('ex-hell');

    melden('Zeichnungen werden umgewandelt …');

    Promise.all(svgs.map(function (s) { return svgZuBild(s, 620); }))
      .then(function (rohbilder) {
        document.documentElement.classList.remove('ex-hell');

        var bilder = [];
        var kopie = quelle.cloneNode(true);
        var kopien = [].slice.call(kopie.querySelectorAll('svg'));
        var roh = [].slice.call(quelle.querySelectorAll('svg'));

        roh.forEach(function (s, i) {
          var stelle = kopien[i];
          if (!stelle) return;
          var k = svgs.indexOf(s);
          if (k === -1 || !rohbilder[k]) { stelle.remove(); return; }

          var name = 'bild' + (bilder.length + 1) + '.png';
          bilder.push({
            name: name,
            b64: rohbilder[k].daten.replace(/^data:image\/png;base64,/, '')
          });

          var img = document.createElement('img');
          img.setAttribute('src', name);
          /* Gerastert wird doppelt so fein wie dargestellt - im Dokument zählt
             die halbe Größe, sonst sprengt das Bild die Seite. */
          img.setAttribute('width', Math.round(rohbilder[k].w / 2));
          img.setAttribute('height', Math.round(rohbilder[k].h / 2));
          stelle.replaceWith(img);
        });

        saeubern(kopie);

        var kopf = document.querySelector('header');
        var kopfHtml = kopf ? saeubern(kopf.cloneNode(true)).innerHTML : '';

        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
          + 'xmlns:w="urn:schemas-microsoft-com:office:word" '
          + 'xmlns="http://www.w3.org/TR/REC-html40"><head>'
          + '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
          + '<title>' + document.title.replace(/</g, '&lt;') + '</title>'
          + '<style>' + WORD_CSS + '</style></head><body>'
          + kopfHtml
          + '<p class="ex-hinweis">Ausdruck aus dem Unterrichtsmaterial von t-bk.de. '
          + 'Diese Seite ist eigentlich interaktiv &ndash; Schieberegler, Eingabefelder '
          + 'und Schrittfolgen stehen hier so, wie sie beim Erzeugen dieser Datei '
          + 'eingestellt waren.</p>'
          + kopie.innerHTML
          + '</body></html>';

        auf();
        speichern(webArchiv(html, bilder), 'application/msword', '.doc');
        melden('');
      })
      .catch(function () {
        document.documentElement.classList.remove('ex-hell');
        auf();
        melden('Die Datei konnte nicht erzeugt werden.');
      });
  }

  /* Datei anbieten. Der Umweg über einen Link ist der einzige Weg, dem Browser
     einen Dateinamen mitzugeben. */
  function speichern(inhalt, typ, endung) {
    /* Kein BOM davor: Ein Web-Archiv beginnt mit seinen MIME-Kopfzeilen,
       sonst erkennt Word es nicht. Die Textteile darin tragen ihre
       Codierung selbst. */
    var blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = dateiname() + endung;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
  }

  /* ---------- PDF als Datei ---------- */

  /* Aus einer data:-Adresse die reinen Bytes holen. */
  function bytesAusDatenUrl(url) {
    var roh = atob(url.split(',')[1]);
    var b = new Uint8Array(roh.length);
    for (var i = 0; i < roh.length; i++) b[i] = roh.charCodeAt(i);
    return b;
  }

  /* Einen Block in Textläufe zerlegen; fett und kursiv bleiben erhalten. */
  function laeufe(el) {
    var aus = [];
    (function gehe(k, fett, kursiv) {
      [].slice.call(k.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var t = n.nodeValue.replace(/\s+/g, ' ');
          if (t) aus.push({ text: t, fett: fett, kursiv: kursiv });
          return;
        }
        if (n.nodeType !== 1 || n.hidden) return;
        var name = n.tagName;
        if (name === 'BR') { aus.push({ text: ' ', fett: fett, kursiv: kursiv }); return; }
        gehe(n,
          fett || name === 'STRONG' || name === 'B' || name === 'TH',
          kursiv || name === 'EM' || name === 'I');
      });
    })(el, false, false);
    return aus;
  }

  var BLOECKE = 'H1,H2,H3,P,LI,TABLE,IMG,HR,FIGCAPTION';

  /* Die aufbereitete Seite einmal von oben nach unten durchgehen und in das
     PDF schreiben. Bewusst schlicht: Überschriften, Absätze, Listen, Tabellen,
     Zeichnungen. Für ein Arbeitsblatt reicht das. */
  function pdfAufbauen(p, wurzel, bilderNachSvg) {
    var gesehen = [];

    function tabelle(tab) {
      var zeilen = [].slice.call(tab.rows);
      zeilen.forEach(function (r) {
        var zellen = [].slice.call(r.cells);
        var text = zellen.map(function (c) {
          return c.textContent.replace(/\s+/g, ' ').trim();
        }).filter(Boolean).join('  ·  ');
        if (!text) return;
        p.absatz([{ text: text, fett: r.parentNode.tagName === 'THEAD' }],
                 { groesse: 9.5, abstand: 2, einzug: 10 });
      });
      p.abstand(4);
    }

    [].slice.call(wurzel.querySelectorAll(BLOECKE)).forEach(function (el) {
      if (versteckt(el)) return;
      /* Nichts doppelt setzen, was schon in einem erledigten Block steckt. */
      for (var i = 0; i < gesehen.length; i++) {
        if (gesehen[i].contains(el)) return;
      }

      var name = el.tagName;
      if (name === 'TABLE') { gesehen.push(el); tabelle(el); return; }

      if (name === 'IMG') {
        var nr = Number(el.getAttribute('data-bild'));
        var b = bilderNachSvg[nr];
        if (b) p.bild(b.bytes, b.w, b.h, 430);
        return;
      }

      if (name === 'HR') { p.linie(); return; }

      var stuecke = laeufe(el);
      if (!stuecke.length) return;

      if (name === 'H1') { p.ueberschrift(stuecke.map(function (x) { return x.text; }).join(''), 1); return; }
      if (name === 'H2') { p.ueberschrift(stuecke.map(function (x) { return x.text; }).join(''), 2); return; }
      if (name === 'H3') { p.ueberschrift(stuecke.map(function (x) { return x.text; }).join(''), 3); return; }
      if (name === 'LI') {
        var kasten = el.querySelector('.ex-kasten');
        p.absatz(stuecke, { einzug: 16, zeichen: kasten ? '[  ]' : '\u00b7', abstand: 2 });
        return;
      }
      if (name === 'FIGCAPTION') {
        p.absatz(stuecke, { groesse: 8.5, abstand: 6, einzug: 10 });
        return;
      }
      p.absatz(stuecke);
    });
  }

  function pdfDatei(modus, melden) {
    if (typeof window.tbkPdf !== 'function') {
      melden('Der PDF-Baustein fehlt.');
      return;
    }
    var auf = aufbereiten(modus);
    var quelle = haupt();
    var svgs = sichtbar(quelle.querySelectorAll('svg'));

    document.documentElement.classList.add('ex-hell');
    melden('Das PDF wird gebaut …');

    Promise.all(svgs.map(function (s) { return svgZuBild(s, 620, 'jpeg'); }))
      .then(function (rohbilder) {
        document.documentElement.classList.remove('ex-hell');

        /* Die Zeichnungen in der Arbeitskopie durch Platzhalter ersetzen, die
           auf das jeweilige Bild verweisen. */
        var kopie = quelle.cloneNode(true);
        var kopien = [].slice.call(kopie.querySelectorAll('svg'));
        var roh = [].slice.call(quelle.querySelectorAll('svg'));
        var bilder = {};

        roh.forEach(function (s, i) {
          var stelle = kopien[i];
          if (!stelle) return;
          var k = svgs.indexOf(s);
          if (k === -1 || !rohbilder[k]) { stelle.remove(); return; }
          var nr = Object.keys(bilder).length;
          bilder[nr] = {
            bytes: bytesAusDatenUrl(rohbilder[k].daten),
            w: rohbilder[k].w, h: rohbilder[k].h
          };
          var platz = document.createElement('img');
          platz.setAttribute('data-bild', String(nr));
          stelle.replaceWith(platz);
        });

        /* Bedienelemente heraus, Eingaben zu Text - wie bei Word. */
        saeubern(kopie);

        var p = window.tbkPdf();
        var kopf = document.querySelector('header');
        if (kopf) {
          var h1 = kopf.querySelector('h1');
          if (h1) p.ueberschrift(h1.textContent.trim(), 1);
          var lead = kopf.querySelector('.lead');
          if (lead) p.absatz([{ text: lead.textContent.replace(/\s+/g, ' ').trim(), kursiv: true }]);
        }
        p.absatz([{ text: 'Ausdruck aus dem Unterrichtsmaterial von t-bk.de. Diese '
          + 'Seite ist eigentlich interaktiv – Schieberegler, Eingabefelder und '
          + 'Schrittfolgen stehen hier so, wie sie beim Erzeugen dieser Datei '
          + 'eingestellt waren.',
          kursiv: true }], { groesse: 8.5 });
        p.linie();

        pdfAufbauen(p, kopie, bilder);

        auf();
        speichern(p.fertig(), 'application/pdf', '.pdf');
        melden('');
      })
      .catch(function (e) {
        document.documentElement.classList.remove('ex-hell');
        auf();
        melden('Das PDF konnte nicht erzeugt werden.');
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
    /* Mit dem Attribut, damit diese Regel auch das ausdrücklich gewählte
       dunkle Thema aussticht - :root[data-thema="dunkel"] waere sonst
       spezifischer. */
    + ':root, :root[data-thema]{--bg:#fff;--fg:#111;--muted:#555;--card:#fff;--border:#bbb;'
    + '--border-stark:#888;--accent:#164e8a;--accent-fg:#fff;--shadow:none}'
    /* Ohne diese Angabe lassen Browser Hintergrundfarben beim Drucken weg -
       und damit genau die Information, die in gefärbten Balken und Bändern
       steckt (Streuband, Drehmomentaufteilung, Zonen). */
    + '*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}'
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
    + '.ex-ankreuzen{list-style:none;margin:6px 0 0;padding:0}'
    + '.ex-ankreuzen li{display:flex;gap:9px;align-items:flex-start;margin:0 0 5px}'
    + '.ex-kasten{flex:0 0 auto;width:13px;height:13px;margin-top:3px;'
    + 'border:1.4px solid currentColor;border-radius:2px;position:relative}'
    + '.ex-kasten.an::after{content:"";position:absolute;left:2px;top:2px;'
    + 'right:2px;bottom:2px;background:currentColor}'
    /* Nur waehrend des Rasterns gesetzt; hoehere Spezifitaet als :root, damit
       sie die Vorgaben aus assets/uebung.css sicher ueberschreibt. */
    + 'html.ex-hell, html.ex-hell[data-thema]{--bg:#fff;--fg:#111;--muted:#555;--card:#fff;--border:#bbb;'
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
    /* Nicht vom Fortschrittsbaustein merken lassen: Wohin die Loesungen
       beim Drucken kommen, ist eine Einstellung fuer diesen Ausdruck -
       kein Stand, den jemand wiederfinden moechte. */
    tafel.setAttribute('data-merken', 'nein');
    tafel.hidden = true;
    tafel.setAttribute('role', 'dialog');
    tafel.setAttribute('aria-label', TYP + ' herunterladen');
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
      + 'Bildschirm steht &ndash; auch die Auswahl aus <em>' + TYP + ' anpassen</em>. '
      + 'Schieberegler, Eingabefelder und Schrittfolgen lassen sich auf Papier '
      + 'nicht bedienen; sie erscheinen mit den zuletzt eingestellten Werten. '
      + 'Teile, die noch ausgeblendet sind, kommen nicht mit.</p>'
      + '<div class="ex-knoepfe">'
      + '<button type="button" id="ex-pdf-datei">PDF herunterladen</button>'
      + '<button type="button" id="ex-pdf" class="leise">Drucken / als PDF</button>'
      + '<button type="button" id="ex-word" class="leise">Als Word</button>'
      + '</div>'
      + '<p class="bk-hinweis" style="margin:10px 0 0">Der Weg über den '
      + 'Druckdialog gibt das schönere Ergebnis &ndash; dort als Ziel '
      + '„Als PDF speichern“ wählen. Der Download kommt ohne Dialog aus und '
      + 'setzt schlichter.</p>'
      + '<p id="ex-stand"></p>';

    leiste().appendChild(knopf);
    document.body.appendChild(tafel);

    function modus() {
      return tafel.querySelector('input[name="ex-modus"]:checked').value;
    }
    function melden(text) { tafel.querySelector('#ex-stand').textContent = text; }

    tafel.querySelector('#ex-pdf-datei').addEventListener('click', function () {
      pdfDatei(modus(), melden);
    });
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
