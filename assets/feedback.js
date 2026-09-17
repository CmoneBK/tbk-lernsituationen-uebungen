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
 * Wie sie erscheint: als kleiner Knopf neben dem Hell-Dunkel-Schalter, und
 * erst auf Klick als Fenster über der Seite. Vorher stand das Formular
 * offen unter dem Inhalt - es nahm dort Platz weg, den der Inhalt braucht,
 * und wirkte wie eine Aufgabe, die noch zu erledigen ist.
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
 * wird deshalb erst geholt, wenn das Fenster geöffnet wird - nicht beim
 * Laden der Seite. Wer zu schnell absendet, bekommt "too fast" zurück; dann
 * wartet der Baustein kurz und schickt dasselbe Token noch einmal, statt den
 * Nutzer mit einer Fehlermeldung zu behelligen.
 *
 * Auf einer lokal geöffneten Datei gibt es keine Sammelstelle. Dort
 * erscheint der Knopf gar nicht erst - einer, der nur zu einer
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

  /* Der Knopf sieht aus wie der Hell-Dunkel-Schalter daneben und trägt
     dessen Farben - deshalb dieselben festen Werte und dasselbe !important:
     Die Seiten bringen sehr unterschiedliche Designs mit, und ein globales
     "* { ... }" würde sonst dazwischenfunken.
     Das Fenster dagegen steht über der Seite und nimmt ihre Farben, wo es
     sie gibt. */
  var STIL = ''
    + '#tbk-feedback-auf{position:fixed!important;top:14px!important;'
      + 'z-index:2147483646!important;display:inline-flex!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'width:33px!important;height:33px!important;padding:0!important;'
      + 'border-radius:999px!important;cursor:pointer!important;'
      + 'color:#1a1a1a!important;background:rgba(255,255,255,.92)!important;'
      + 'border:1px solid rgba(0,0,0,.14)!important;'
      + 'box-shadow:0 1px 3px rgba(0,0,0,.18)!important;'
      + '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'
    + '#tbk-feedback-auf:hover{border-color:rgba(0,0,0,.32)!important}'
    + '#tbk-feedback-auf:focus-visible{outline:2px solid #2b6cb0!important;'
      + 'outline-offset:2px!important}'
    + '#tbk-feedback-auf svg{width:17px!important;height:17px!important;'
      + 'display:block!important}'
    + '@media (prefers-color-scheme:dark){'
      + ' :root:not([data-thema="hell"]) #tbk-feedback-auf{color:#ececec!important;'
      + ' background:rgba(30,30,33,.92)!important;'
      + ' border-color:rgba(255,255,255,.18)!important}}'
    + ':root[data-thema="dunkel"] #tbk-feedback-auf{color:#ececec!important;'
      + ' background:rgba(30,30,33,.92)!important;'
      + ' border-color:rgba(255,255,255,.18)!important}'
    + '@media print{#tbk-feedback-auf,#tbk-feedback{display:none!important}}'

    /* Das Fenster liegt in der obersten Ebene und damit ausserhalb der
       Seite. Im Werkzeug-Repo entsteht der dunkle Modus durch einen Filter
       ueber die ganze Seite - der greift hier nicht, das Fenster bliebe hell.
       Deshalb die zweite Fassung: Wo die Seite eigene Farben mitbringt,
       gewinnen die; wo nicht, richtet sich die Vorgabe danach, wie die Seite
       gerade aussieht. */
    + '#tbk-feedback{width:min(520px,calc(100vw - 32px));padding:0;border:0;'
      + 'border-radius:14px;background:transparent;color:var(--fg,#1a1a1a);'
      + 'font-family:inherit}'
    /* Hier stehen feste Werte, keine Variablen der Seite: Deren Farben sind
       fuer die ungefilterte, helle Darstellung geschrieben - dunkel wird sie
       erst durch den Filter, und der greift im Fenster nicht. Es sind
       dieselben Werte, die assets/uebung.css fuer den dunklen Modus setzt. */
    + ':root[data-thema-effektiv="dunkel"] #tbk-feedback{color:#ececec}'
    + ':root[data-thema-effektiv="dunkel"] #tbk-feedback .tbkfb-kasten{'
      + 'background:#1e1e21;border-color:#2c2c30}'
    + ':root[data-thema-effektiv="dunkel"] #tbk-feedback p,'
      + ':root[data-thema-effektiv="dunkel"] #tbk-feedback legend{color:#a0a0a0}'
    + ':root[data-thema-effektiv="dunkel"] #tbk-feedback select,'
      + ':root[data-thema-effektiv="dunkel"] #tbk-feedback textarea{'
      + 'background:#151517;border-color:#2c2c30;color:#ececec}'
    + ':root[data-thema-effektiv="dunkel"] #tbk-feedback .tbkfb-zu:hover{'
      + 'background:#2c2c30}'
    + '#tbk-feedback::backdrop{background:rgba(0,0,0,.45)}'
    + '#tbk-feedback .tbkfb-kasten{border:1px solid var(--border,#e3e3df);'
      + 'border-radius:14px;background:var(--card,#fff);padding:20px 22px;'
      + 'box-shadow:0 10px 40px rgba(0,0,0,.28)}'
    + '#tbk-feedback .tbkfb-kopf{display:flex;align-items:flex-start;gap:12px}'
    + '#tbk-feedback h2{margin:0;font-size:1.05rem;font-weight:700;flex:1}'
    + '#tbk-feedback .tbkfb-zu{flex:0 0 auto;width:30px;height:30px;padding:0;'
      + 'border:0;border-radius:999px;background:transparent;color:inherit;'
      + 'font:inherit;font-size:1.3rem;line-height:1;cursor:pointer}'
    + '#tbk-feedback .tbkfb-zu:hover{background:var(--bg,#f2f2f0)}'
    + '#tbk-feedback p{margin:6px 0 0;font-size:.9rem;color:var(--muted,#5f5f5a)}'
    + '#tbk-feedback form{margin-top:16px;display:grid;gap:12px}'
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
    + '#tbk-feedback textarea{min-height:96px;resize:vertical}'
    + '#tbk-feedback .tbkfb-senden{justify-self:start;padding:9px 18px;border:0;'
      + 'border-radius:999px;background:var(--accent,#2b6cb0);color:#fff;'
      + 'font:inherit;font-weight:600;font-size:.9rem;cursor:pointer}'
    + '#tbk-feedback .tbkfb-senden[disabled]{opacity:.55;cursor:default}'
    + '#tbk-feedback .tbkfb-hinweis{font-size:.85rem;min-height:1.2em;margin:0}'
    + '#tbk-feedback .tbkfb-fehler{color:#b91c1c}'
    + '#tbk-feedback .tbkfb-hp{position:absolute;left:-9999px;width:1px;'
      + 'height:1px;overflow:hidden}';

  var style = document.createElement('style');
  style.id = 'tbk-feedback-style';
  style.textContent = STIL;
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

  /* ---------------- der Knopf ---------------- */

  var auf = el('button', {
    type: 'button', id: 'tbk-feedback-auf',
    title: 'Rückmeldung zu dieser Seite geben',
    'aria-label': 'Rückmeldung zu dieser Seite geben',
    'aria-haspopup': 'dialog',
  });
  auf.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    + ' aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9'
    + 'L3 20.5l1.5-4.1A8.4 8.4 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4z"/>'
    + '</svg>';
  document.body.appendChild(auf);

  /* Der Knopf steht links neben dem Hell-Dunkel-Schalter. Dessen Breite
     wechselt mit der Beschriftung ("System", "Hell", "Dunkel") und fällt auf
     schmalen Geräten ganz weg - der Abstand wird deshalb gemessen und nicht
     geraten. */
  function einordnen() {
    var schalter = document.getElementById('tbk-thema');
    var breit = schalter ? schalter.getBoundingClientRect().width : 0;
    auf.style.setProperty('right', (breit ? breit + 14 + 8 : 14) + 'px', 'important');
  }
  einordnen();
  window.addEventListener('resize', einordnen);
  /* thema.js meldet jeden Wechsel - dabei ändert sich die Beschriftung. */
  document.addEventListener('tbk-thema', einordnen);
  /* Und dann die Zeitfrage: thema.js baut den Schalter erst bei
     DOMContentLoaded, dieser Baustein läuft davor - am Ende des body, aber
     noch während des Parsens. Beim ersten Messen ist der Schalter also gar
     nicht da, die Breite ist 0, und der Knopf setzt sich auf right:14px -
     genau dorthin, wo gleich der Schalter erscheint. Er liegt dann darunter
     und ist unsichtbar.

     Ein setTimeout(0) reichte dagegen nicht: Der Parser unterbricht sich bei
     langen Seiten, und dann läuft der Timer vor DOMContentLoaded. Deshalb
     wird an den beiden Stellen nachgemessen, an denen der Schalter sicher
     steht - thema.js hat sich früher eingetragen und baut zuerst. */
  document.addEventListener('DOMContentLoaded', einordnen);
  window.addEventListener('load', einordnen);

  /* ---------------- das Fenster ---------------- */

  var fenster = el('dialog', {
    id: 'tbk-feedback', 'data-druck': 'weg',
    /* Der Fortschrittsbaustein laesst diesen Block aus: Eine Rueckmeldung
       ist Text, der gesendet werden soll - kein Stand, den man wiederfinden
       moechte. */
    'data-merken': 'nein',
    'aria-labelledby': 'tbk-feedback-titel',
  }, document.body);

  var kasten = el('div', { 'class': 'tbkfb-kasten' }, fenster);
  var kopf = el('div', { 'class': 'tbkfb-kopf' }, kasten);
  el('h2', { id: 'tbk-feedback-titel', text: 'Stimmt hier etwas nicht?' }, kopf);
  var zu = el('button', {
    type: 'button', 'class': 'tbkfb-zu', 'aria-label': 'Fenster schließen',
    text: '×',
  }, kopf);
  el('p', {
    text: 'Kurze Rückmeldung zu dieser Seite – ohne Namen, ohne Anmeldung. '
      + 'Sie geht nur an die Lehrkraft, die das Material pflegt.',
  }, kasten);

  var form = el('form', { method: 'dialog', novalidate: 'novalidate' }, kasten);

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

  function oeffnen() {
    if (fenster.open) return;
    if (fenster.showModal) fenster.showModal();
    else fenster.setAttribute('open', 'open');
    /* Erst jetzt das Token holen: Die Sammelstelle misst ab hier, wie lange
       das Formular offen war. */
    if (!marke) tokenHolen();
    var erstes = form.querySelector('input[name="role"]');
    if (erstes) erstes.focus();
  }

  function schliessen() {
    if (fenster.close) fenster.close();
    else fenster.removeAttribute('open');
    auf.focus();
  }

  auf.addEventListener('click', oeffnen);
  zu.addEventListener('click', schliessen);
  /* Klick auf den Hintergrund schließt ebenfalls. Das Fenster selbst füllt
     nur den Kasten aus; alles daneben ist Hintergrund. */
  fenster.addEventListener('click', function (e) {
    if (e.target === fenster) schliessen();
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
    var fertig = el('button', {
      type: 'button', 'class': 'tbkfb-senden', text: 'Schließen',
    }, form);
    fertig.addEventListener('click', schliessen);
    fertig.focus();
    /* Ein zweites Mal gibt es hier nichts mehr zu sagen. */
    auf.disabled = true;
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
    /* method="dialog" würde das Fenster schließen - hier wird gesendet. */
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
}());
