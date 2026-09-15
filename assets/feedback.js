/* Rückmeldung zu einem Inhalt - Eingabe und Absenden.
 *
 * Eingebunden wird der Baustein in jeder Inhaltsseite mit einer Zeile
 * unmittelbar vor dem schließenden body-Tag:
 *
 *     <script src="../assets/feedback.js"></script>
 *
 * build/build.mjs trägt sie automatisch nach, falls sie in einer neuen Datei
 * fehlt. Dieselbe Datei liegt in zwei Repos (Material und Werkzeuge) - wird
 * sie geändert, gehört sie in beide kopiert, wie assets/thema.js auch.
 *
 * Was hier entsteht und was nicht (siehe docs/FEEDBACK-API.md):
 *   - Wir bauen die Eingabe: annehmen, absenden, Rückmeldung geben.
 *   - Wir bauen nicht: Speicherung, Anzeige, Moderation, Auswertung. Das
 *     macht die Sammelstelle unter /api/. Abgegebenes Feedback wird nie
 *     öffentlich angezeigt.
 *
 * Drei Regeln, die nicht verhandelbar sind:
 *   - Kein Name, keine personenbezogenen Daten. Erlaubt sind Rolle,
 *     Kategorie und ein freiwilliger Freitext.
 *   - Trackingfrei: kein externes Skript, keine Schrift von außen, kein
 *     Cookie, kein localStorage.
 *   - Alles unter derselben Herkunft, also ein gewöhnliches fetch.
 *
 * Der Spamschutz der Sammelstelle misst die Zeit ab dem Token. Das Token
 * wird deshalb erst geholt, wenn das Formular geöffnet wird - nicht beim
 * Laden der Seite. Wer zu schnell absendet, bekommt "too fast" zurück; dann
 * wartet der Baustein kurz und schickt dasselbe Token noch einmal, statt den
 * Nutzer mit einer Fehlermeldung zu behelligen.
 *
 * Auf einer lokal geöffneten Datei gibt es keine Sammelstelle. Dort
 * erscheint der Block gar nicht erst - ein Knopf, der nur zu einer
 * Fehlermeldung führt, ist schlechter als keiner.
 */
(function () {
  'use strict';

  if (document.getElementById('tbk-feedback')) return;
  /* Ohne Server keine Sammelstelle. */
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  var self = document.currentScript
    || document.querySelector('script[src$="assets/feedback.js"]');
  var daten = (self && self.dataset) || {};

  var API = daten.api || '/api/feedback.php';
  /* Zur Zuordnung genügen Pfad und Titel - eine eigene Kennung vergeben wir
     nicht. Steht auf einer Seite mehr als ein Inhalt, sagen data-pfad und
     data-titel, welcher gemeint ist. */
  var PFAD = daten.pfad || location.pathname;
  var TITEL = daten.titel || (document.title || '').trim() || location.pathname;

  var ROLLEN = [
    ['schueler', 'Schüler:in'],
    ['lehrkraft', 'Lehrkraft'],
  ];
  var KATEGORIEN = [
    ['fehler', 'Fehler / etwas stimmt nicht'],
    ['verstaendnis', 'Verständnisproblem'],
    ['vorschlag', 'Vorschlag / Idee'],
    ['lob', 'Lob'],
    ['sonstiges', 'Sonstiges'],
  ];

  /* Die Seiten bringen unterschiedliche Paletten mit. Der Block nimmt
     deshalb die Farben der Seite, wo es sie gibt, und sonst eine helle
     Vorgabe - im dunklen Modus der Werkzeuge kehrt deren Filter sie mit um. */
  var css = ''
    + '#tbk-feedback{margin:32px auto 8px;padding:0 20px;max-width:900px;'
      + 'font-family:inherit;color:var(--fg,#1a1a1a)}'
    + '#tbk-feedback .tbkfb-kasten{border:1px solid var(--border,#e3e3df);'
      + 'border-radius:12px;background:var(--card,#fff);padding:16px 18px}'
    + '#tbk-feedback h2{margin:0 0 4px;font-size:1rem;font-weight:700}'
    + '#tbk-feedback p{margin:0;font-size:.9rem;color:var(--muted,#5f5f5a)}'
    + '#tbk-feedback .tbkfb-auf{margin-top:12px;padding:8px 16px;'
      + 'border:1px solid var(--border-stark,#cbd5e1);border-radius:999px;'
      + 'background:transparent;color:inherit;font:inherit;font-weight:600;'
      + 'font-size:.9rem;cursor:pointer}'
    + '#tbk-feedback .tbkfb-auf:hover{border-color:var(--accent,#2b6cb0)}'
    + '#tbk-feedback form{margin-top:14px;display:grid;gap:12px}'
    + '#tbk-feedback fieldset{margin:0;padding:0;border:0;display:flex;'
      + 'flex-wrap:wrap;gap:6px 18px;align-items:center}'
    + '#tbk-feedback legend{padding:0;font-size:.85rem;font-weight:600;'
      + 'color:var(--muted,#5f5f5a)}'
    + '#tbk-feedback label{font-size:.9rem;display:inline-flex;gap:6px;'
      + 'align-items:center}'
    + '#tbk-feedback .tbkfb-zeile{display:grid;gap:4px}'
    + '#tbk-feedback select,#tbk-feedback textarea{width:100%;box-sizing:border-box;'
      + 'padding:8px 10px;border:1px solid var(--border,#e3e3df);border-radius:8px;'
      + 'background:var(--bg,#fff);color:inherit;font:inherit;font-size:.9rem}'
    + '#tbk-feedback textarea{min-height:88px;resize:vertical}'
    + '#tbk-feedback .tbkfb-senden{justify-self:start;padding:9px 18px;border:0;'
      + 'border-radius:999px;background:var(--accent,#2b6cb0);color:#fff;'
      + 'font:inherit;font-weight:600;font-size:.9rem;cursor:pointer}'
    + '#tbk-feedback .tbkfb-senden[disabled]{opacity:.55;cursor:default}'
    + '#tbk-feedback .tbkfb-hinweis{font-size:.85rem;min-height:1.2em}'
    + '#tbk-feedback .tbkfb-fehler{color:#b91c1c}'
    + '#tbk-feedback .tbkfb-hp{position:absolute;left:-9999px;width:1px;'
      + 'height:1px;overflow:hidden}'
    + '@media print{#tbk-feedback{display:none}}';

  var style = document.createElement('style');
  style.id = 'tbk-feedback-style';
  style.textContent = css;
  document.head.appendChild(style);

  function el(name, attr, eltern) {
    var e = document.createElement(name);
    for (var k in attr) {
      if (!attr.hasOwnProperty(k)) continue;
      if (k === 'text') e.textContent = attr[k];
      else e.setAttribute(k, attr[k]);
    }
    if (eltern) eltern.appendChild(e);
    return e;
  }

  var block = el('section', {
    id: 'tbk-feedback',
    /* Der Block steht außerhalb von main und wird deshalb ohnehin nicht
       mitgedruckt; das Kennzeichen sagt es zusätzlich ausdrücklich. */
    'data-druck': 'weg',
    'aria-labelledby': 'tbk-feedback-titel',
  });
  var kasten = el('div', { 'class': 'tbkfb-kasten' }, block);
  el('h2', { id: 'tbk-feedback-titel', text: 'Stimmt hier etwas nicht?' }, kasten);
  el('p', {
    text: 'Kurze Rückmeldung zu dieser Seite – ohne Namen, ohne Anmeldung. '
      + 'Sie geht nur an die Lehrkraft, die das Material pflegt.',
  }, kasten);

  var auf = el('button', {
    type: 'button', 'class': 'tbkfb-auf', 'aria-expanded': 'false',
    text: 'Rückmeldung geben',
  }, kasten);

  var form = el('form', { hidden: 'hidden', novalidate: 'novalidate' }, kasten);

  var rollen = el('fieldset', {}, form);
  el('legend', { text: 'Ich bin' }, rollen);
  ROLLEN.forEach(function (r, i) {
    var lab = el('label', {}, rollen);
    var inp = el('input', { type: 'radio', name: 'role', value: r[0] }, lab);
    if (i === 0) inp.checked = true;
    lab.appendChild(document.createTextNode(r[1]));
  });

  var katZeile = el('div', { 'class': 'tbkfb-zeile' }, form);
  el('label', { 'for': 'tbkfb-kategorie', text: 'Worum geht es?' }, katZeile);
  var kat = el('select', { id: 'tbkfb-kategorie', name: 'category' }, katZeile);
  KATEGORIEN.forEach(function (k) {
    el('option', { value: k[0], text: k[1] }, kat);
  });

  var textZeile = el('div', { 'class': 'tbkfb-zeile' }, form);
  el('label', { 'for': 'tbkfb-text', text: 'Was genau? (freiwillig)' }, textZeile);
  el('textarea', {
    id: 'tbkfb-text', name: 'message', maxlength: '2000',
    placeholder: 'Zum Beispiel: welche Aufgabe, welche Stelle im Bild, was nicht passt.',
  }, textZeile);

  /* Honigtopf: Wer ihn ausfüllt, ist kein Mensch. Er wird aus dem Sichtfeld
     geschoben, nicht auf display:none gesetzt - das erkennen manche
     Sendeprogramme. */
  var hpHuelle = el('div', { 'class': 'tbkfb-hp', 'aria-hidden': 'true' }, form);
  el('input', {
    type: 'text', name: 'hp', tabindex: '-1', autocomplete: 'off',
  }, hpHuelle);

  var senden = el('button', {
    type: 'submit', 'class': 'tbkfb-senden', text: 'Absenden',
  }, form);
  var hinweis = el('p', {
    'class': 'tbkfb-hinweis', role: 'status', 'aria-live': 'polite',
  }, form);

  var marke = null;          /* das geholte Token samt Zeitstempel */
  var laeuft = false;

  function tokenHolen() {
    return fetch(API + '?action=token', { credentials: 'same-origin' })
      .then(function (a) { return a.json(); })
      .then(function (d) {
        if (d && d.token) { marke = d; return true; }
        return false;
      })
      .catch(function () { return false; });
  }

  auf.addEventListener('click', function () {
    var zu = form.hidden;
    form.hidden = !zu;
    auf.setAttribute('aria-expanded', zu ? 'true' : 'false');
    /* Derselbe Knopf schliesst wieder - dann soll er auch so heissen. */
    auf.textContent = zu ? 'Abbrechen' : 'Rückmeldung geben';
    if (!zu) return;
    /* Erst jetzt das Token holen: Die Sammelstelle misst ab hier, wie lange
       das Formular offen war. */
    if (!marke) tokenHolen();
    var erstes = form.querySelector('input[name="role"]');
    if (erstes) erstes.focus();
  });

  function melden(text, fehler) {
    hinweis.textContent = text;
    hinweis.className = 'tbkfb-hinweis' + (fehler ? ' tbkfb-fehler' : '');
  }

  function koerper() {
    var b = new URLSearchParams();
    var rolle = form.querySelector('input[name="role"]:checked');
    b.set('role', rolle ? rolle.value : '');
    b.set('category', kat.value);
    b.set('message', form.querySelector('textarea[name="message"]').value);
    b.set('hp', form.querySelector('input[name="hp"]').value);
    b.set('ts', marke.ts);
    b.set('token', marke.token);
    b.set('path', PFAD);
    b.set('title', TITEL);
    return b.toString();
  }

  function danke() {
    while (form.firstChild) form.removeChild(form.firstChild);
    el('p', { text: 'Danke für deine Rückmeldung.' }, form);
    auf.hidden = true;
  }

  /* versuch zählt mit, damit die beiden Wiederholungen - zu schnell
     abgeschickt, Token abgelaufen - nicht in eine Schleife laufen. */
  function absenden(versuch) {
    laeuft = true;
    senden.disabled = true;
    return fetch(API, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: koerper(),
    })
      .then(function (a) { return a.json().catch(function () { return null; }); })
      .then(function (d) {
        if (d && d.ok) { danke(); return; }
        var fehler = (d && d.error) || '';
        /* Zu schnell ausgefüllt: Das Token bleibt gültig, es fehlt nur die
           Zeit. Einmal kurz warten und dasselbe noch einmal schicken. */
        if (fehler === 'too fast' && versuch < 2) {
          melden('Einen Augenblick …');
          return new Promise(function (weiter) {
            setTimeout(function () { weiter(absenden(versuch + 1)); }, 2600);
          });
        }
        if ((fehler === 'bad token' || fehler === 'token expired') && versuch < 2) {
          return tokenHolen().then(function (gut) {
            if (gut) return absenden(versuch + 1);
            melden('Konnte nicht gesendet werden – bitte später erneut.', true);
          });
        }
        if (fehler === 'rate limit') {
          melden('Zu viele Einsendungen – bitte später noch einmal.', true);
          return;
        }
        if (fehler === 'bad role' || fehler === 'bad category') {
          melden('Bitte Rolle und Kategorie auswählen.', true);
          return;
        }
        melden('Konnte nicht gesendet werden – bitte später erneut.', true);
      })
      .catch(function () {
        melden('Netzwerkfehler – bitte später erneut.', true);
      })
      .then(function () {
        laeuft = false;
        if (form.querySelector('.tbkfb-senden')) senden.disabled = false;
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (laeuft) return;
    if (!marke) {
      melden('Einen Augenblick …');
      tokenHolen().then(function (gut) {
        if (gut) absenden(1);
        else melden('Konnte nicht gesendet werden – bitte später erneut.', true);
      });
      return;
    }
    melden('');
    absenden(1);
  });

  /* Ans Ende des Inhalts, aber vor den Fußbereich: Dort sucht man eine
     Rückmeldung, wenn man mit der Seite durch ist. */
  var fuss = document.querySelector('footer');
  if (fuss && fuss.parentNode) fuss.parentNode.insertBefore(block, fuss);
  else document.body.appendChild(block);
}());
