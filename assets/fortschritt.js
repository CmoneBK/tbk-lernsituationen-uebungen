/* Der Stand des Ausfüllens - auf dem Gerät, und auf Wunsch auch anderswo.
 *
 * Eingebunden wird der Baustein wie die übrigen, mit einer Zeile vor dem
 * schließenden body-Tag:
 *
 *     <script src="../assets/fortschritt.js"></script>
 *
 * build/build.mjs trägt sie nach, sobald eine Seite Felder zum Ausfüllen
 * hat - bei Trainings absichtlich nicht (siehe unten).
 *
 * Warum es ihn gibt
 * -----------------
 * Eine Lernsituation hat über hundert Eingabefelder. Bis hierher überlebte
 * kein einziges einen Seitenwechsel: Wer auf „Übersicht" klickte, ein
 * Werkzeug öffnete und zurückkam oder dessen Tablet den Hintergrund-Tab
 * verwarf, fing von vorn an. Das ist kein Bedienfehler - Tablets geben
 * Hintergrund-Tabs bei Speicherknappheit regelmäßig frei.
 *
 * Zwei Stufen
 * -----------
 * 1. **Auf dem Gerät.** Läuft immer und von selbst, im `localStorage`.
 *    Kein Cookie, keine Kennung, nichts wird gesendet, kein Dritter.
 * 2. **Auf einem anderen Gerät.** Nur auf ausdrücklichen Knopfdruck, über
 *    einen Code und eine selbst gewählte PIN - wie in VALIS. Der Vertrag
 *    dazu steht in `docs/FORTSCHRITT-API.md`.
 *
 * Die PIN wird **nie** gespeichert, auch nicht auf dem Gerät. Sie lebt in
 * einer Variablen, solange die Seite offen ist, und ist danach weg. Der
 * Code dagegen wird gemerkt - sonst tippt man ihn bei jedem Sichern neu.
 *
 * Trainings bleiben außen vor: Dort erzeugt jede Runde eine neue Aufgabe,
 * und eine wiederhergestellte Antwort gehörte zur Aufgabe von gestern. Das
 * wäre schlimmer als gar nichts.
 *
 * Wie ein Feld wiedergefunden wird
 * --------------------------------
 * Über seine `id`, und wo keine steht, über die laufende Nummer unter den
 * Feldern ohne id. Damit sich eine geänderte Seite nicht an alten Werten
 * verschluckt, wird die Liste aller Schlüssel als Fingerabdruck
 * mitgespeichert. Passt er nicht mehr, wird der alte Stand verworfen statt
 * irgendwo eingesetzt - auf dem Gerät wie vom Server.
 *
 * Wer etwas ausnehmen will, setzt `data-merken="nein"` an das Feld oder an
 * einen Container darum - so bleiben die Rückmeldung, der Wettkampf-Code
 * und die Felder dieses Bausteins selbst außen vor.
 */
(function () {
  'use strict';

  var VORNE = 'tbk:stand:';
  var AUS = 'tbk:stand-aus';
  var CODE = 'tbk:stand-code';
  var API = '/api/fortschritt.php';
  var WARTE = 400;        // ms, bis nach der letzten Eingabe gespeichert wird
  var HOECHSTENS = 40;    // so viele Seiten werden gemerkt, dann die älteste weg

  /* Der Speicher kann fehlen: privates Fenster, gesperrte Website-Daten,
     manche Schulgeräte. Dann tut der Baustein nichts - und sagt auch
     nichts, denn versprechen kann er dort nichts. */
  function lager() {
    try {
      var l = window.localStorage;
      l.setItem('tbk:probe', '1');
      l.removeItem('tbk:probe');
      return l;
    } catch (e) {
      return null;
    }
  }

  var speicher = lager();
  if (!speicher) return;

  /* Die Kennung der Seite - ohne den Pfad, unter dem der Materialbereich
     gerade ausgeliefert wird. Sonst fände ein Code von t-bk.de auf GitHub
     Pages nichts wieder. Abgeleitet wie in back-nav.js aus dem eigenen
     Skriptpfad. */
  function seiteId() {
    /* Wie in back-nav.js: erst das laufende Skript, sonst die Einbindung
       im Dokument. Wird der Baustein inline eingesetzt (so prueft die
       Pruefung), hat das laufende Skript kein src. */
    var s = document.currentScript;
    if (!s || !s.src) {
      s = document.querySelector('script[src$="assets/fortschritt.js"]');
    }
    var pfad = location.pathname;
    if (s && s.src) {
      try {
        var wurzel = new URL('../', s.src).pathname;
        if (pfad.indexOf(wurzel) === 0) pfad = pfad.slice(wurzel.length);
      } catch (e) { /* dann eben der ganze Pfad */ }
    }
    pfad = pfad.replace(/^\/+/, '').replace(/\/index\.html$/, '/');
    /* Der Vertrag lässt nur [a-z0-9/_.-] zu und höchstens 160 Zeichen. */
    return pfad.toLowerCase().replace(/[^a-z0-9/_.-]/g, '-').slice(0, 160);
  }

  var kennung = seiteId();
  var name = VORNE + kennung;

  function aus() {
    try { return speicher.getItem(AUS) === '1'; } catch (e) { return false; }
  }

  /* ---------- die Felder ---------- */

  function bedienbar(e) {
    if (e.disabled) return false;
    var t = (e.type || '').toLowerCase();
    if (t === 'file' || t === 'password' || t === 'hidden'
      || t === 'submit' || t === 'button' || t === 'reset') return false;
    /* Regler tragen Einstellungen, keine Antworten - und sie haben immer
       einen Wert, wodurch jede Seite als „ausgefüllt" gälte. */
    if (t === 'range') return false;
    if (e.closest && e.closest('[data-merken="nein"]')) return false;
    return true;
  }

  function felder() {
    var alle = document.querySelectorAll('input, textarea, select');
    var raus = [];
    for (var i = 0; i < alle.length; i++) {
      if (bedienbar(alle[i])) raus.push(alle[i]);
    }
    return raus;
  }

  /* Der Schlüssel eines Feldes: seine id, sonst die laufende Nummer unter
     den Feldern ohne id. */
  function schluessel(liste) {
    var ohne = 0;
    return liste.map(function (e) {
      return e.id || (e.tagName.toLowerCase() + '#' + (ohne++));
    });
  }

  function inhalt(e) {
    var t = (e.type || '').toLowerCase();
    if (t === 'checkbox' || t === 'radio') return e.checked ? 1 : 0;
    return e.value;
  }

  function leer(e, wert) {
    var t = (e.type || '').toLowerCase();
    if (t === 'checkbox' || t === 'radio') return !wert;
    return wert === '' || wert === null || wert === undefined;
  }

  function setzen(e, wert) {
    var t = (e.type || '').toLowerCase();
    if (t === 'checkbox' || t === 'radio') { e.checked = !!wert; return; }
    /* Bei einem select nur setzen, was es auch zur Wahl gibt - sonst
       stünde dort nachher gar nichts. */
    if (e.tagName === 'SELECT') {
      for (var i = 0; i < e.options.length; i++) {
        if (e.options[i].value === wert) { e.value = wert; return; }
      }
      return;
    }
    e.value = wert;
  }

  /* Alles, was auf der Seite steht, als Paket. Null, wenn nichts da ist. */
  function paketBauen() {
    var liste = felder();
    if (!liste.length) return null;
    var namen = schluessel(liste);
    var werte = {}, etwas = false;
    liste.forEach(function (e, i) {
      var v = inhalt(e);
      if (leer(e, v)) return;
      werte[namen[i]] = v;
      etwas = true;
    });
    if (!etwas) return null;
    return { zeit: Date.now(), abdruck: namen.join('|'), werte: werte };
  }

  /* Ein Paket in die Felder einsetzen. Gibt die Zahl der gesetzten Felder
     zurück, oder -1, wenn der Fingerabdruck nicht mehr passt. */
  function paketEinsetzen(paket) {
    if (!paket || !paket.werte) return 0;
    var liste = felder();
    var namen = schluessel(liste);
    if (paket.abdruck && paket.abdruck !== namen.join('|')) return -1;
    var gesetzt = 0;
    liste.forEach(function (e, i) {
      if (!(namen[i] in paket.werte)) return;
      setzen(e, paket.werte[namen[i]]);
      gesetzt++;
    });
    /* Kein Ereignis auslösen: Die Seiten lesen ihre Felder erst beim
       Prüfen aus, und ein künstliches „change" würde anderswo Dinge
       anstoßen, die niemand angestoßen hat. */
    return gesetzt;
  }

  /* ---------- lesen und schreiben, auf dem Gerät ---------- */

  function lesen() {
    try {
      var roh = speicher.getItem(name);
      return roh ? JSON.parse(roh) : null;
    } catch (e) {
      return null;
    }
  }

  function aufraeumen() {
    /* Die ältesten Seiten zuerst - der Speicher ist klein, und ein Stand
       von vorletztem Halbjahr hilft niemandem. */
    var staende = [];
    for (var i = 0; i < speicher.length; i++) {
      var k = speicher.key(i);
      if (k && k.indexOf(VORNE) === 0) {
        var z = 0;
        try { z = (JSON.parse(speicher.getItem(k)) || {}).zeit || 0; } catch (e) {}
        staende.push({ k: k, z: z });
      }
    }
    staende.sort(function (a, b) { return a.z - b.z; });
    while (staende.length >= HOECHSTENS) {
      try { speicher.removeItem(staende.shift().k); } catch (e) {}
    }
  }

  function schreiben(paket) {
    try {
      speicher.setItem(name, JSON.stringify(paket));
      return true;
    } catch (e) {
      /* Voll: Platz schaffen und ein zweites Mal versuchen. Klappt auch
         das nicht, wird eben nichts gemerkt. */
      aufraeumen();
      try {
        speicher.setItem(name, JSON.stringify(paket));
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function loeschen() {
    try { speicher.removeItem(name); } catch (e) {}
  }

  /* ---------- der Server, wenn jemand ihn ausdrücklich will ---------- */

  /* Die PIN lebt nur hier, solange die Seite offen ist. Sie wird nirgends
     gespeichert - weder im localStorage noch in einem Feld, das der
     Fortschrittsbaustein sichert (die Tafel trägt data-merken="nein"). */
  var pin = null;

  function code() {
    try { return speicher.getItem(CODE) || null; } catch (e) { return null; }
  }
  function codeMerken(c) {
    try { if (c) speicher.setItem(CODE, c); else speicher.removeItem(CODE); }
    catch (e) {}
  }

  /* Dieselbe Bauart wie im Wettkampf-Baustein: sechs Sekunden Geduld, dann
     ist es eben nichts. Lokal geöffnet gar nicht erst fragen. */
  function ruf(daten, gut, schief) {
    if (location.protocol === 'file:' || typeof fetch !== 'function') {
      schief('kein netz');
      return;
    }
    var koerper = [];
    for (var k in daten) {
      if (daten.hasOwnProperty(k) && daten[k] !== '' && daten[k] !== null
        && daten[k] !== undefined) {
        koerper.push(encodeURIComponent(k) + '=' + encodeURIComponent(daten[k]));
      }
    }
    var vorbei = false;
    var wecker = setTimeout(function () {
      if (!vorbei) { vorbei = true; schief('zeit'); }
    }, 8000);
    function fertigMit(f) {
      return function (x) {
        if (vorbei) return;
        vorbei = true;
        clearTimeout(wecker);
        f(x);
      };
    }
    fetch(API, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: koerper.join('&') })
      .then(function (a) { return a.json(); })
      .then(fertigMit(function (d) {
        if (d && d.ok) gut(d);
        else schief((d && d.fehler) || 'kaputt');
      }))
      .catch(fertigMit(function () { schief('netz'); }));
  }

  /* Die Fehlerwerte des Vertrags in Sätze. „unbekannt" steht bewusst für
     beides - falscher Code und falsche PIN. Wer einen gültigen Code
     erraten hat, soll das nicht erfahren. */
  var SAETZE = {
    unbekannt: 'Code oder PIN stimmt nicht.',
    gesperrt: 'Zu viele Fehlversuche. Warte eine Minute und versuch es'
      + ' noch einmal.',
    zugross: 'Der Stand dieser Seite ist zu groß für den Server.',
    ungueltig: 'Die Eingabe passt nicht. PIN: genau vier Ziffern,'
      + ' Code: sechs Zeichen.',
    voll: 'Der Server konnte gerade keinen Code vergeben. Versuch es noch'
      + ' einmal.',
    zuviel: 'Zu schnell hintereinander gespeichert. Warte ein paar Sekunden.',
    'kein netz': 'Auf diesem Weg geöffnet gibt es keinen Server. Der Stand'
      + ' liegt weiter auf dem Gerät.',
    netz: 'Der Server antwortet nicht. Dein Stand liegt weiter auf dem'
      + ' Gerät.',
    zeit: 'Der Server antwortet nicht. Dein Stand liegt weiter auf dem'
      + ' Gerät.',
    kaputt: 'Da ist etwas schiefgegangen. Dein Stand liegt weiter auf dem'
      + ' Gerät.'
  };
  function satz(f) { return SAETZE[f] || SAETZE.kaputt; }

  /* ---------- die Zeile, die es sagt ---------- */

  var zeile = null, text = null, tafel = null, meldung = null;

  /* Die Regeln stehen in einem Stilblock, nicht in Inline-Stilen: Sie
     sollen den Farben der Seite folgen (hell wie dunkel), und ein
     `var(--bg)` im style-Attribut verschluckt jsdom - die Pruefung saehe
     dann etwas anderes als der Browser. */
  function stil() {
    if (document.getElementById('standStil')) return;
    var s = document.createElement('style');
    s.id = 'standStil';
    s.textContent =
      '#standHinweis{margin:0 0 18px}'
      + '#standHinweis button,#standTafel button{'
      + 'margin:0 8px 0 0;font-size:13px;padding:4px 10px}'
      + '#standTafel{margin:0 0 18px}'
      + '#standTafel p{margin:0 0 10px;font-size:14px}'
      + '#standTafel label{display:block;margin:0 0 10px;font-size:14px}'
      + '#standTafel input{display:block;margin-top:4px;padding:7px 9px;'
      + 'width:12em;max-width:100%;font:inherit;font-size:15px;'
      + 'box-sizing:border-box;color:inherit;background:var(--bg);'
      + 'border:1px solid var(--border-stark);border-radius:7px}'
      + '#standTafel .code{font-size:1.25em;letter-spacing:.12em}'
      + '#standTafel .leise{color:var(--muted)}'
      + '#standMeldung{margin:10px 0 0;font-size:14px;font-weight:600}'
      + '#standMeldung.schlimm{color:var(--bad)}';
    document.head.appendChild(s);
  }

  function hinweis() {
    if (zeile) return zeile;
    stil();
    zeile = document.createElement('p');
    zeile.className = 'fussnote';
    zeile.id = 'standHinweis';
    zeile.setAttribute('data-druck', 'weg');

    text = document.createElement('span');
    zeile.appendChild(text);

    var ziel = document.querySelector('main') || document.body;
    ziel.insertBefore(zeile, ziel.firstChild);
    return zeile;
  }

  function knopf(beschriftung, tun, haupt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = haupt ? 'knopf' : 'knopf leise';
    b.textContent = beschriftung;
    b.addEventListener('click', tun);
    return b;
  }

  function zeigen(was, wann) {
    hinweis();
    while (zeile.childNodes.length > 1) zeile.removeChild(zeile.lastChild);

    if (aus()) {
      text.textContent = 'Auf diesem Gerät wird nichts gemerkt.';
      zeile.appendChild(knopf('Doch merken', function () {
        try { speicher.removeItem(AUS); } catch (e) {}
        sichern();
        zeigen('gemerkt');
      }));
      return;
    }

    if (was === 'zurueck') {
      text.textContent = 'Dein Stand von ' + wann + ' wurde wiederhergestellt'
        + ' – er liegt nur auf diesem Gerät und wird nicht gesendet.';
    } else {
      text.textContent = 'Dein Stand wird auf diesem Gerät gemerkt, damit er'
        + ' einen Tabwechsel übersteht. Er wird nicht gesendet.';
    }

    zeile.appendChild(knopf('Eingaben löschen', function () {
      loeschen();
      felder().forEach(function (e) {
        var t = (e.type || '').toLowerCase();
        if (t === 'checkbox' || t === 'radio') e.checked = false;
        else e.value = '';
      });
      zeigen('gemerkt');
    }));

    zeile.appendChild(knopf('Nicht merken', function () {
      loeschen();
      try { speicher.setItem(AUS, '1'); } catch (e) {}
      tafelZu();
      zeigen();
    }));

    /* Lokal geöffnet gibt es keinen Server - dann auch keinen Knopf, der
       einen verspricht. */
    if (location.protocol !== 'file:' && typeof fetch === 'function') {
      zeile.appendChild(knopf('Auf anderem Gerät weiterarbeiten', tafelAuf));
    }
  }

  function wann(zeit) {
    var d = new Date(zeit);
    var heute = new Date();
    var zwei = function (n) { return (n < 10 ? '0' : '') + n; };
    var uhr = zwei(d.getHours()) + ':' + zwei(d.getMinutes());
    if (d.toDateString() === heute.toDateString()) return uhr + ' Uhr';
    return zwei(d.getDate()) + '.' + zwei(d.getMonth() + 1) + '. ' + uhr + ' Uhr';
  }

  /* ---------- die Tafel für den Server ---------- */

  function feld(art, beschriftung, id, laenge) {
    var w = document.createElement('label');
    w.appendChild(document.createTextNode(beschriftung));
    var e = document.createElement('input');
    e.type = art;
    e.id = id;
    e.maxLength = laenge;
    e.autocomplete = 'off';
    e.inputMode = art === 'password' ? 'numeric' : 'text';
    w.appendChild(e);
    return w;
  }

  function sagen(t, schlimm) {
    if (!meldung) return;
    meldung.textContent = t || '';
    meldung.className = schlimm ? 'schlimm' : '';
  }

  function tafelZu() {
    if (tafel && tafel.parentNode) tafel.parentNode.removeChild(tafel);
    tafel = null;
    meldung = null;
    pin = null;
  }

  function tafelAuf() {
    if (tafel) { tafelZu(); return; }

    tafel = document.createElement('div');
    tafel.className = 'box';
    tafel.id = 'standTafel';
    /* Weder drucken noch merken: Hier stehen Code und PIN. */
    tafel.setAttribute('data-druck', 'weg');
    tafel.setAttribute('data-merken', 'nein');

    zeichnen();
    zeile.parentNode.insertBefore(tafel, zeile.nextSibling);
    var erstes = tafel.querySelector('input');
    if (erstes) erstes.focus();
  }

  function absatz(inhaltHtml) {
    var p = document.createElement('p');
    p.innerHTML = inhaltHtml;
    return p;
  }

  function zeichnen() {
    if (!tafel) return;
    tafel.innerHTML = '';
    var c = code();

    if (!c) {
      tafel.appendChild(absatz(
        '<strong>Auf einem anderen Gerät weiterarbeiten.</strong> Du bekommst'
        + ' einen <strong>Code</strong> und wählst dir eine'
        + ' <strong>vierstellige PIN</strong>. Damit kannst du deinen Stand'
        + ' auf einem anderen Gerät wieder öffnen.'));
      tafel.appendChild(absatz(
        'Gespeichert werden nur deine Eingaben zu den Aufgaben. Kein Name,'
        + ' keine Klasse, keine Adresse. Nach <strong>60 Tagen</strong> ohne'
        + ' Zugriff wird alles automatisch gelöscht. Niemand außer dir kann'
        + ' hineinsehen – auch keine Lehrkraft.'));
      tafel.appendChild(feld('password', 'PIN (vier Ziffern)', 'standPin', 4));

      var reihe = document.createElement('p');
      var anlegen = knopf('Code anlegen', function () {
        var p = (document.getElementById('standPin') || {}).value || '';
        if (!/^[0-9]{4}$/.test(p)) {
          sagen('Die PIN muss aus genau vier Ziffern bestehen.', true);
          return;
        }
        pin = p;
        sagen('Einen Augenblick …');
        ruf({ action: 'neu', pin: pin }, function (d) {
          codeMerken(d.code);
          hochladen(function () { zeichnen(); });
        }, function (f) { pin = null; sagen(satz(f), true); });
      }, true);
      reihe.appendChild(anlegen);
      reihe.appendChild(knopf('Ich habe schon einen Code', function () {
        codeEingeben();
      }));
      reihe.appendChild(knopf('Abbrechen', tafelZu));
      tafel.appendChild(reihe);

    } else {
      tafel.appendChild(absatz(
        'Dein Code: <strong class="code">' + c + '</strong>'
        + '<br><span class="leise">Schreib ihn dir auf. Ohne Code und PIN'
        + ' kommst du nicht mehr an den Stand – wir können ihn nicht'
        + ' zurückholen.</span>'));
      if (!pin) {
        tafel.appendChild(feld('password', 'PIN', 'standPin', 4));
      }

      var reihe2 = document.createElement('p');

      var hoch = knopf('Stand hochladen', function () {
        if (!pinHolen()) return;
        sagen('Einen Augenblick …');
        hochladen(function () {
          sagen('Hochgeladen. Auf dem anderen Gerät: Code und PIN eingeben.');
        });
      }, true);
      reihe2.appendChild(hoch);

      reihe2.appendChild(knopf('Stand holen', function () {
        if (!pinHolen()) return;
        sagen('Einen Augenblick …');
        ruf({ action: 'holen', code: code(), pin: pin, seite: kennung },
          function (d) {
            if (!d.daten) {
              sagen('Zu dieser Seite liegt dort noch nichts.');
              return;
            }
            var paket;
            try { paket = JSON.parse(d.daten); } catch (e) { paket = null; }
            var gesetzt = paketEinsetzen(paket);
            if (gesetzt < 0) {
              sagen('Der gespeicherte Stand passt nicht mehr zu dieser'
                + ' Seite – sie wurde inzwischen geändert.', true);
              return;
            }
            if (!gesetzt) { sagen('Dort war nichts ausgefüllt.'); return; }
            schreiben(paket);
            sagen('Stand von ' + wann(paket.zeit || Date.now())
              + ' übernommen.');
          },
          function (f) { sagen(satz(f), true); });
      }));

      reihe2.appendChild(knopf('Alles löschen', function () {
        if (!pinHolen()) return;
        sagen('Einen Augenblick …');
        ruf({ action: 'loeschen', code: code(), pin: pin }, function () {
          codeMerken(null);
          pin = null;
          zeichnen();
          sagen('Auf dem Server ist nichts mehr. Auf diesem Gerät bleibt'
            + ' dein Stand, bis du ihn löschst.');
        }, function (f) { sagen(satz(f), true); });
      }));

      reihe2.appendChild(knopf('Schließen', tafelZu));
      tafel.appendChild(reihe2);
    }

    meldung = document.createElement('p');
    meldung.id = 'standMeldung';
    meldung.setAttribute('role', 'status');
    tafel.appendChild(meldung);
  }

  function codeEingeben() {
    if (!tafel) return;
    tafel.innerHTML = '';
    tafel.appendChild(absatz(
      '<strong>Stand von einem anderen Gerät holen.</strong> Gib den Code'
      + ' und die PIN ein, die du dort angelegt hast.'));
    tafel.appendChild(feld('text', 'Code (sechs Zeichen)', 'standCode', 6));
    tafel.appendChild(feld('password', 'PIN (vier Ziffern)', 'standPin', 4));

    var reihe = document.createElement('p');
    var holen = knopf('Stand holen', function () {
      var c = ((document.getElementById('standCode') || {}).value || '')
        .toUpperCase().replace(/[^0-9A-Z]/g, '');
      var p = (document.getElementById('standPin') || {}).value || '';
      if (c.length !== 6 || !/^[0-9]{4}$/.test(p)) {
        sagen('Der Code hat sechs Zeichen, die PIN vier Ziffern.', true);
        return;
      }
      pin = p;
      sagen('Einen Augenblick …');
      ruf({ action: 'holen', code: c, pin: pin, seite: kennung },
        function (d) {
          codeMerken(c);
          if (!d.daten) {
            zeichnen();
            sagen('Der Code stimmt. Zu dieser Seite liegt dort aber noch'
              + ' nichts.');
            return;
          }
          var paket;
          try { paket = JSON.parse(d.daten); } catch (e) { paket = null; }
          var gesetzt = paketEinsetzen(paket);
          zeichnen();
          if (gesetzt < 0) {
            sagen('Der gespeicherte Stand passt nicht mehr zu dieser Seite –'
              + ' sie wurde inzwischen geändert.', true);
            return;
          }
          if (!gesetzt) { sagen('Dort war nichts ausgefüllt.'); return; }
          schreiben(paket);
          sagen('Stand von ' + wann(paket.zeit || Date.now())
            + ' übernommen.');
        },
        function (f) { pin = null; sagen(satz(f), true); });
    }, true);
    reihe.appendChild(holen);
    reihe.appendChild(knopf('Abbrechen', tafelZu));
    tafel.appendChild(reihe);

    meldung = document.createElement('p');
    meldung.id = 'standMeldung';
    meldung.setAttribute('role', 'status');
    tafel.appendChild(meldung);

    var erstes = tafel.querySelector('input');
    if (erstes) erstes.focus();
  }

  /* Die PIN aus dem Feld holen, wenn sie nicht schon im Kopf steht. */
  function pinHolen() {
    if (pin) return true;
    var e = document.getElementById('standPin');
    var p = (e && e.value) || '';
    if (!/^[0-9]{4}$/.test(p)) {
      sagen('Die PIN muss aus genau vier Ziffern bestehen.', true);
      return false;
    }
    pin = p;
    return true;
  }

  function hochladen(fertig) {
    var paket = paketBauen();
    if (!paket) {
      sagen('Auf dieser Seite ist noch nichts ausgefüllt.');
      if (fertig) fertig();
      return;
    }
    schreiben(paket);
    ruf({ action: 'sichern', code: code(), pin: pin, seite: kennung,
      daten: JSON.stringify(paket) },
      function () {
        if (fertig) fertig();
        sagen('Hochgeladen. Auf dem anderen Gerät: Code und PIN eingeben.');
      },
      function (f) { sagen(satz(f), true); });
  }

  /* ---------- sichern und wiederherstellen, auf dem Gerät ---------- */

  var uhr = null;

  function sichern() {
    if (aus()) return;
    var paket = paketBauen();
    /* Eine leere Seite braucht keinen Eintrag - und soll auch keinen
       Hinweis auslösen, der etwas verspricht. */
    if (!paket) { loeschen(); return; }
    aufraeumen();
    schreiben(paket);
  }

  function gleichSichern() {
    if (uhr) { clearTimeout(uhr); uhr = null; }
    sichern();
  }

  function spaeterSichern() {
    if (uhr) clearTimeout(uhr);
    uhr = setTimeout(function () { uhr = null; sichern(); }, WARTE);
  }

  function zurueckholen() {
    var paket = lesen();
    if (!paket) return false;
    var gesetzt = paketEinsetzen(paket);
    /* Hat sich die Seite geändert, passt der alte Stand nicht mehr. Dann
       lieber nichts einsetzen als etwas Falsches. */
    if (gesetzt < 0) { loeschen(); return false; }
    return gesetzt > 0;
  }

  /* ---------- Anlauf ---------- */

  function los() {
    if (!felder().length) return;

    if (aus()) { zeigen(); return; }

    var paket = lesen();
    if (zurueckholen()) zeigen('zurueck', wann(paket.zeit));
    else zeigen('gemerkt');

    document.addEventListener('input', spaeterSichern, true);
    document.addEventListener('change', spaeterSichern, true);

    /* Der wichtigste Auslöser: Sobald der Tab in den Hintergrund geht,
       wird sofort gesichert. Genau dort verwerfen Tablets ihn. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') gleichSichern();
    });
    window.addEventListener('pagehide', gleichSichern);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', los);
  } else {
    los();
  }

  /* Für Seiten, die Felder erst später erzeugen. */
  window.tbkStandSichern = gleichSichern;
})();
