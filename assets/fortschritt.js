/* Der Stand des Ausfüllens - gemerkt auf dem Gerät, sonst nirgends.
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
 * Was gespeichert wird
 * --------------------
 * Nur, was der Nutzer selbst eingetippt oder angeklickt hat, und nur im
 * `localStorage` des eigenen Geräts. Kein Cookie, keine Kennung, nichts
 * wird gesendet, kein Dritter ist beteiligt. Der Stand ist auf einem
 * anderen Gerät nicht da - das ist Absicht und die Grenze dieser Stufe.
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
 * irgendwo eingesetzt.
 *
 * Wer etwas ausnehmen will, setzt `data-merken="nein"` an das Feld oder an
 * einen Container darum - so bleiben die Rückmeldung und der
 * Wettkampf-Code außen vor.
 */
(function () {
  'use strict';

  var VORNE = 'tbk:stand:';
  var AUS = 'tbk:stand-aus';
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

  /* Ein Schlüssel je Seite. Die Suchanfrage gehört nicht dazu - dieselbe
     Übung mit anderem Bildungsgang ist dieselbe Übung. */
  var name = VORNE + location.pathname.replace(/\/index\.html$/, '/');

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

  /* ---------- lesen und schreiben ---------- */

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

  /* ---------- die Zeile, die es sagt ---------- */

  var zeile = null, text = null;

  function hinweis() {
    if (zeile) return zeile;
    zeile = document.createElement('p');
    zeile.className = 'fussnote';
    zeile.id = 'standHinweis';
    zeile.setAttribute('data-druck', 'weg');
    zeile.style.margin = '0 0 18px';

    text = document.createElement('span');
    zeile.appendChild(text);

    var ziel = document.querySelector('main') || document.body;
    ziel.insertBefore(zeile, ziel.firstChild);
    return zeile;
  }

  function knopf(beschriftung, tun) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'knopf leise';
    b.style.marginLeft = '8px';
    b.style.fontSize = '13px';
    b.style.padding = '4px 10px';
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
      zeigen();
    }));
  }

  function wann(zeit) {
    var d = new Date(zeit);
    var heute = new Date();
    var zwei = function (n) { return (n < 10 ? '0' : '') + n; };
    var uhr = zwei(d.getHours()) + ':' + zwei(d.getMinutes());
    if (d.toDateString() === heute.toDateString()) return uhr + ' Uhr';
    return zwei(d.getDate()) + '.' + zwei(d.getMonth() + 1) + '. ' + uhr + ' Uhr';
  }

  /* ---------- sichern und wiederherstellen ---------- */

  var uhr = null;

  function sichern() {
    if (aus()) return;
    var liste = felder();
    if (!liste.length) return;
    var namen = schluessel(liste);

    var werte = {}, etwas = false;
    liste.forEach(function (e, i) {
      var v = inhalt(e);
      if (leer(e, v)) return;
      werte[namen[i]] = v;
      etwas = true;
    });

    /* Eine leere Seite braucht keinen Eintrag - und soll auch keinen
       Hinweis auslösen, der etwas verspricht. */
    if (!etwas) { loeschen(); return; }

    aufraeumen();
    schreiben({ zeit: Date.now(), abdruck: namen.join('|'), werte: werte });
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
    if (!paket || !paket.werte) return false;

    var liste = felder();
    var namen = schluessel(liste);

    /* Hat sich die Seite geändert, passt der alte Stand nicht mehr. Dann
       lieber nichts einsetzen als etwas Falsches. */
    if (paket.abdruck && paket.abdruck !== namen.join('|')) {
      loeschen();
      return false;
    }

    var gesetzt = 0;
    liste.forEach(function (e, i) {
      if (!(namen[i] in paket.werte)) return;
      setzen(e, paket.werte[namen[i]]);
      gesetzt++;
    });
    /* Kein Ereignis auslösen: Die Seiten lesen ihre Felder erst beim
       Prüfen aus, und ein künstliches „change" würde anderswo Dinge
       anstoßen, die niemand angestoßen hat. */
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
