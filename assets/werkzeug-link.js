/* Links auf die interaktiven Werkzeuge - hostabhaengig aufgeloest.
 *
 * Werkzeuge und Material liegen in zwei getrennten Repos. Wo das Werkzeug zu
 * finden ist, haengt deshalb davon ab, wo die Seite gerade ausgeliefert wird:
 *
 *   t-bk.de        /werkzeuge/tools/<datei>
 *   GitHub Pages   die Pages-Adresse des Werkzeuge-Repos (anderes Repo!)
 *   lokal (file:)  Nachbarordner CmoneBK-Unterrichtsmaterial
 *
 * Eingebunden wird der Baustein wie der Ruecklink, mit einer Zeile vor dem
 * schliessenden body-Tag:
 *
 *     <script src="../assets/werkzeug-link.js"></script>
 *
 * Im Text dann nur noch das Ziel benennen - href entsteht hier:
 *
 *     <a class="werkzeug" data-werkzeug="maschinenelemente-schrauben-schraubverbindungen.html"
 *        data-fach="1">Werkzeug öffnen</a>
 *
 * Zusaetzliche Angaben (alle optional):
 *   data-fach="1"     Werkzeug startet mit Fachbegriffen statt Alltagssprache
 *   data-sym="1"      Werkzeug startet mit Formelzeichen
 *   data-reiter="…"   vorbereitet; wirkt erst, wenn das Werkzeug den Parameter
 *                     auswertet - bis dahin schadet er nicht
 *   data-neu="0"      im selben Tab oeffnen statt in einem neuen
 */
(function () {
  'use strict';

  // Basis des Werkzeuge-Repos, je nach Umgebung.
  var TBK   = '/werkzeuge/tools/';
  var PAGES = 'https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/tools/';

  var self = document.currentScript ||
    document.querySelector('script[src$="assets/werkzeug-link.js"]');
  // ".../assets/werkzeug-link.js" minus "assets/werkzeug-link.js" = Wurzel des
  // Materialbereichs - dieselbe Ableitung wie in back-nav.js.
  // self.src ist leer, wenn die Datei inline statt ueber src eingebunden
  // wird - dann bleibt es beim einfachen relativen Pfad.
  var wurzel = self && self.src ? new URL('../', self.src).href : '../';

  function basis() {
    if (location.protocol === 'file:') {
      // Beide Repos liegen lokal nebeneinander im selben Projektordner.
      return new URL('../CmoneBK-Unterrichtsmaterial/tools/', wurzel).href;
    }
    if (/(^|\.)github\.io$/.test(location.hostname)) return PAGES;
    return TBK;
  }

  function aufloesen(a) {
    var datei = a.dataset.werkzeug;
    if (!datei) return;

    var u = new URL(basis() + datei, location.href);
    if (a.dataset.fach)   u.searchParams.set('fach', a.dataset.fach);
    if (a.dataset.sym)    u.searchParams.set('sym', a.dataset.sym);
    if (a.dataset.reiter) u.searchParams.set('reiter', a.dataset.reiter);

    a.href = u.href;
    if (a.dataset.neu !== '0') {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  }

  function alle() {
    var links = document.querySelectorAll('a[data-werkzeug]');
    for (var i = 0; i < links.length; i++) aufloesen(links[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', alle);
  } else {
    alle();
  }

  // Fuer Seiten, die Links erst zur Laufzeit erzeugen.
  window.tbkWerkzeugLinks = alle;
})();
