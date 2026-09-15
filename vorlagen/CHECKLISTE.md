# Checkliste: neues Material anlegen

Was eine neue Übung, ein Training oder eine Lernsituation beachten muss, damit
alles Drumherum von selbst funktioniert: zuschneiden, nach Bildungsgang
vorwählen, als PDF oder Word mitnehmen, hell und dunkel, Rücklink.

**Die Regel dahinter:** Nichts davon wird von Hand eingebaut. Der Build trägt
die Bausteine nach, und die Bausteine lesen den Aufbau der Seite. Wer sich an
den Aufbau hält, bekommt alles geschenkt — wer davon abweicht, verliert es
stillschweigend.

Ausführlich steht das meiste in der [README](../README.md); hier steht es
zum Abhaken.

---

## Kurzfassung

1. `vorlagen/uebung.html` bzw. `vorlagen/lernsituation.html` kopieren.
2. Titel nach `Bereich: Unterkategorie - Name`.
3. Alles in `<main>`, gegliedert mit `h2` (Teil) und `<details>` (Aufgabe).
4. Zeichnungen als **SVG**, nicht als CSS-Grafik — und nach
   [ZEICHNUNGSREGELN.md](ZEICHNUNGSREGELN.md), wenn es eine technische
   Zeichnung sein soll.
5. Bedienung mit `data-druck="weg"` kennzeichnen.
6. Zahlen aus dem Tabellenbuch, Beleg in `tabellenbuch/daten.json`.
7. Nur, was **nicht** überall hingehört, bekommt `data-bg-ohne`.
8. Keine festen Farben — die drei Themenregeln nutzen.
9. Keine externen Ressourcen. Keine Ausnahme.
10. `node build/build.mjs`, dann `--check`, dann committen.

---

## 1. Gerüst

| Muss | Warum |
| --- | --- |
| `<main>` um den ganzen Inhalt | Ohne `main` bauen sich weder „Übung anpassen" noch „Herunterladen" auf — beide suchen dort und tun sonst gar nichts. |
| `<header>` mit `h1` und `p.lead` | Kopf von PDF und Word-Datei. |
| `<title>` nach der Konvention | Steuert Bereich, Kategorie und Kartenname in der Übersicht. |
| `<meta name="description">` | Zweite Zeile auf der Karte. |
| `<meta name="dauer" content="20 min">` | Erscheint auf der Paketseite. |

Nicht selbst einbauen: `back-nav.js`, `thema.js`, `bildungsgang.js`, `qr.js`,
`baukasten.js`, `pdf.js`, `export.js`, `zahlenfeld.js`. Der Build trägt sie mit
der richtigen Pfadtiefe nach.

## 2. Gliederung — davon hängt fast alles ab

```html
<main>
  <h2><span class="nr">1</span>Die Bausteine</h2>
  <p>…</p>
  <details><summary>a) Warum steht dort keine Werkstoffangabe?</summary>
    <p>…</p>
  </details>
</main>
```

* **`h2` ist ein Teil.** Abwählbar, nummeriert, und beim Zuschnitt zählt die
  Nummer lückenlos weiter.
* **`<details>` ist eine Aufgabe.** Einzeln abwählbar; beim Ausgeben wird das
  `summary` zur Aufgabenzeile und der Rest zur Lösung.
* **Mindestens zwei `h2`.** Bei weniger baut der Baukasten nichts auf — es gäbe
  ja nichts zu wählen.
* **Ein Auflösungsblock, der erst nach einem Klick erscheint, gehört unter
  `h3`.** Als `h2` wäre er ein abwählbarer Teil, und die Nummerierung hätte eine
  Lücke, solange er verborgen ist.
* **Ein Teil, der in einem eigenen `div` steckt** (weil er erst später
  erscheint), braucht seine `h2` **innerhalb** dieses `div`. Der Baukasten hält
  bei einem Geschwister an, das eine `h2` enthält — so landet der Block beim
  richtigen Teil.

### Überschriften später umformulieren?

Die Kennung in einem geteilten Link (`?ohne=…`) ist ein Streuwert über die
Überschrift. Wird sie umformuliert, findet ein alter Link diesen Teil nicht
mehr — dann erscheint er **wieder**, statt dass der falsche verschwindet. Das
ist die harmlosere Richtung, aber man sollte es wissen.

## 3. Zeichnungen

* **Immer SVG.** Nur SVG wird für PDF und Word gerastert. Eine Grafik aus
  `div`s mit CSS-Höhen sieht im Browser gut aus und fehlt auf dem Papier
  ersatzlos.
* `assets/zeichnen.js` bringt Maßpfeile, Schraffur und Diagrammachsen mit.
* Beschriftung als `<text>` im SVG, nicht als HTML daneben — sonst steht sie im
  Export woanders.
* Im SVG `currentColor` nutzen, wo die Farbe nur Kontrast ist. Dann zieht der
  Dunkelmodus mit.
* `viewBox` setzen, keine festen `width`/`height` — sonst bricht es auf dem
  Telefon.

## 4. Ausgabe: PDF, Word, Druck

| Kennzeichnung | Wirkung auf Papier |
| --- | --- |
| `data-druck="weg"` | Element kommt nicht mit — Bedienleisten, Abspielknöpfe, Hinweise zur Bedienung. |
| `data-druck="text"` | Die Beschriftung einer Schaltfläche **ist** der Inhalt (z. B. die Bausteine einer Schraubenbezeichnung). |
| `data-druck="ankreuzen"` | Ein `<select>`, das eine Antwort verlangt, wird zu Kästchen zum Ankreuzen. |

Weiter:

* **Schieberegler mit `<output>` direkt daneben.** Dann erscheint nur der
  Ausgabewert mit Einheit — sonst steht dort zweimal dieselbe Zahl.
* **Loser Text in einem `div`** bekommt beim Ausgeben automatisch einen Absatz.
  Trotzdem besser gleich `<p>` schreiben.
* **Griechische Buchstaben werden im PDF ausgeschrieben** (α → `alpha`, π →
  `pi`). Die eingebauten PDF-Schriften können nur WinAnsi. μ ist die Ausnahme,
  das gibt es als Mikrozeichen.
* **Ausgegeben wird der Stand auf dem Bildschirm.** Schieberegler und
  Schrittfolgen erscheinen mit den zuletzt eingestellten Werten — das ist
  gewollt und steht als Hinweis über der Datei.

## 5. Bildungsgang

* **Kein Attribut heißt: gehört überall dazu.** Das ist die richtige Vorgabe.
  Nur was zu hoch, zu speziell oder im Plan schlicht nicht vorgesehen ist,
  bekommt eine Ausnahme.

```html
<h2 data-bg-ohne="bfs-hs10 bfs-for">Der Weg, einmal ausgeschrieben</h2>
<summary data-bg-ohne="bfs-hs10">2. Eine 8.8 M12 reißt bei etwa 67 kN …</summary>
<meta name="bg-ohne" content="bfs-hs10 bfs-for">   <!-- ganze Seite -->
```

* Schlüssel: `bfs-hs10`, `bfs-for`, `hbfs-c2`, `fos-c3`, `im`, `zm`, `tech`.
* **Jede Entscheidung gehört begründet** in `bildungsgaenge/README.md` — mit der
  Stelle im Bildungsplan, auf die sie sich stützt. Der Ordner liegt außerhalb
  von Git; ohne die Begründung ist die Zuordnung in einem halben Jahr nicht mehr
  nachvollziehbar.
* Die Zuordnung ist eine Auslegung, keine Ableitung. Das sagt auch das
  Info-Symbol neben der Wahl — bitte nicht so tun, als stünde es wörtlich im
  Plan.

## 6. Hell und dunkel

Drei Regeln, immer in dieser Reihenfolge — `assets/uebung.css` macht es vor:

```css
:root                                    /* helle Farben */
@media (prefers-color-scheme:dark){
  :root:not([data-thema="hell"]){ … }    /* dunkle Farben */
}
:root[data-thema="dunkel"]{ … }          /* dunkle Farben, ausdrücklich */
```

* Keine festen Farben im Inhalt — nur `var(--…)`.
* Eine Farbe nie **nur** im Media-Block definieren, sonst fehlt sie dem hellen
  Thema.
* Der Ausdruck ist immer hell; dafür sorgt `assets/export.js`.

## 7. Zahlen, Formeln, Quellen

* **Jede Zahl und jeder Rechenweg stammt aus dem Tabellenbuch Metall
  (Europa-Verlag)** — dem Buch, das die Schüler auf dem Tisch haben. Belegt wird
  das in `tabellenbuch/daten.json`; `test-tabellenbuch.js` hält das Material
  dagegen.
* Steht ein Wert dort nicht, wird die Seite angefordert — nicht geschätzt.
* **Eine Gleichung je Zeile.** Kein Malpunkt als Trenner zwischen zwei
  Gleichungen.
* **Einheiten an die Faktoren**, nicht ans Ergebnis. Längen im Quadrat tragen
  ihre Einheit mit.
* Wo es einen Weg über das Tabellenbuch gibt (nachschlagen statt rechnen),
  gehört er dazu — für die Bildungsgänge, die nicht rechnen, ist er der
  eigentliche Weg.

## 8. Werkzeug-Links

```html
<a class="werkzeug" data-werkzeug="maschinenelemente-schrauben-schraubverbindungen.html"
   data-fach="1">Werkzeug öffnen</a>
```

Den `href` setzt `assets/werkzeug-link.js` je nach Umgebung (t-bk.de, GitHub
Pages, lokal). Nie fest verdrahten.

## 9. Wettkampf (nur Trainings)

Ein Training kann gegeneinander gespielt werden: Alle mit demselben Code
bekommen dieselben Aufgaben in derselben Reihenfolge. Dafür genügt eine
Zusage — `build/build.mjs` bindet `assets/wettkampf.js` daraufhin selbst ein.

```js
window.TBK_WETTKAMPF = {
  neu: function(){ neuerDurchgang(); },   /* Pflicht: von vorn beginnen */
  runden: 10,                             /* nur ohne eigenen Durchgang */
  ergebnisAn: "ende"                      /* nur mit eigenem Durchgang */
};
```

* **`neu`** muss einen vollständigen neuen Durchgang starten. Alles, was die
  Aufgabenfolge bestimmt, muss dabei aus `Math.random()` kommen — der Baustein
  ersetzt es durch einen Würfel mit festem Startwert. Wer sich Aufgaben beim
  Laden einmal merkt und später nur durchreicht, würfelt für alle anderen
  falsch.
* **Zählt der Baustein mit** (`runden` gesetzt), meldet jede beantwortete
  Aufgabe sich:
  ```js
  document.dispatchEvent(new CustomEvent("tbk-runde", {detail:{richtig:true}}));
  ```
* **Zählt die Seite selbst** (feste Rundenzahl, eigene Uhr, eigenes
  Ergebnisbild), bleibt `runden` weg. Dann sagt sie am Ende einmal Bescheid
  und nennt mit `ergebnisAn` die `id` ihres Ergebnisblocks — dorthin hängt der
  Baustein den Ergebniscode:
  ```js
  document.dispatchEvent(new CustomEvent("tbk-durchgang-ende",
    {detail:{richtig: richtig, gesamt: runde.length}}));
  ```

Sieger und Punktestand entstehen ohne Anmeldung und ohne Server: Jedes Gerät
zeigt am Ende einen Ergebniscode aus sechs Zeichen, und wer ihn am
Anzeigegerät einträgt, steht in der Rangliste. Dort steht kein Name — nur der
Code. `pruefungen/test-wettkampf.js` prüft das alles nach.

## 10. Trackingfrei — ohne Ausnahme

Keine Schrift, kein Skript, kein Bild von einem fremden Server. Kein CDN, keine
Einbettung, kein Zählpixel. Alles liegt im Repo, alle Pfade sind relativ.

## 11. Vor dem Committen

```bash
node build/build.mjs          # Übersicht und Bausteine nachziehen
node build/build.mjs --check  # Exit 1, wenn etwas offen ist
```

Dazu die Prüfläufe im Scratchpad, soweit vorhanden — mindestens die, die das
angefasste Thema betreffen. Und einmal wirklich ansehen: Ein Test, der die
Existenz einer CSS-Regel prüft, sagt nichts darüber, ob sie greift.

---

## Und die Lektionen?

Die liegen im Werkzeug-Repo (`CmoneBK-Unterrichtsmaterial`) und folgen einem
eigenen, aber verwandten Aufbau: Reiterleiste, `<section class="panel">` je
Reiter, `<div class="karte">` mit `h2`, darin Abschnitte unter `h3`. Drei
Stufen sind wählbar. Einzelheiten stehen im README dort; `data-bg-ohne`,
`data-druck` und die Themenregeln gelten wortgleich.
