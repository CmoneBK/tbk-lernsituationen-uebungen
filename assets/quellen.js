/* Woher die Zahlen stammen - sichtbar unter der Seite.
 *
 * Eingebunden wie die übrigen Bausteine am Ende der Seite:
 *
 *     <script src="../../assets/quellen.js"></script>
 *
 * Die Seite sagt oben, was sie benutzt hat:
 *
 *     <meta name="quellen" content="tabellenbuch katalog">
 *     <meta name="normen" content="DIN 623-1, DIN 625-1">
 *
 * Daraus entsteht eine Zeile über der Fußzeile. Ohne das Meta-Feld passiert
 * nichts - eine Seite ohne fremde Zahlen braucht keinen Nachweis.
 *
 * Warum das sein muss: Normmaße sind frei - sie stehen in der Norm und in
 * jedem Herstellerkatalog. Die Zusammenstellung eines Verlags ist es nicht.
 * Wer eine Tabelle aus einem Tabellenbuch nachbaut, übernimmt die Arbeit,
 * die jemand hineingesteckt hat: welche Zeilen, welche Spalten, welche
 * Auswahl. Deshalb gilt in diesem Material:
 *
 *   - Normmaße dürfen stehen, mit der Norm als Quelle.
 *   - Kennwerte, die kein Normwert sind - Tragzahlen etwa -, gehören in
 *     die Aufgabe oder stehen als kleine Auswahl mit dem Hinweis, dass der
 *     Herstellerkatalog gilt.
 *   - Zusammenstellungen eines Verlags werden gekürzt auf das, was
 *     gebraucht wird, und tragen ihren Nachweis.
 *
 * Dieselbe Datei liegt in zwei Repos - wird sie geändert, gehört sie in
 * beide kopiert.
 */
(function () {
  'use strict';

  var TEXTE = {
    tabellenbuch: 'Zahlen und Rechenwege nach <em>Tabellenbuch Metall</em>, '
      + 'Europa-Lehrmittel.',
    fachkunde_im: 'Fachliche Grundlage: <em>Fachkenntnisse '
      + 'Industriemechaniker LF 5–15</em>, Verlag Handwerk und Technik.',
    katalog: 'Tragzahlen C und C₀ sind Richtwerte zum Üben. '
      + 'Für eine Auslegung gilt der Katalog des Lagerherstellers.',
    hersteller: 'Kennwerte einzelner Erzeugnisse stehen im Katalog des '
      + 'Herstellers; die Werte hier sind Richtwerte zum Üben.'
  };

  function feld(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? (m.getAttribute('content') || '').trim() : '';
  }

  function aufbauen() {
    var wunsch = feld('quellen');
    var normen = feld('normen');
    if (!wunsch && !normen) return;

    var teile = [];
    if (normen) {
      teile.push('Maße und Bezeichnungen nach ' + normen + '.');
    }
    wunsch.split(/\s+/).forEach(function (k) {
      var t = TEXTE[k.replace(/-/g, '_')];
      if (t && teile.indexOf(t) < 0) teile.push(t);
    });
    if (!teile.length) return;

    var p = document.createElement('p');
    p.className = 'quellen';
    p.setAttribute('data-druck', 'bleibt');
    p.innerHTML = '<strong>Quellen:</strong> ' + teile.join(' ');

    /* Über die Fußzeile, damit es beim Ausdruck mitkommt. In den Werkzeugen
       liegt die Fußzeile im Wrapper, in Übungen und Trainings daneben. */
    var fuss = document.querySelector('footer');
    if (fuss && fuss.parentNode) {
      fuss.parentNode.insertBefore(p, fuss);
    } else {
      document.body.appendChild(p);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aufbauen);
  } else { aufbauen(); }
}());
