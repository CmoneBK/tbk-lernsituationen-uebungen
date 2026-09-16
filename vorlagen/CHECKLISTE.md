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

**Ist es eine technische Zeichnung, gilt `vorlagen/ZEICHNUNGSREGELN.md` ohne
Abzug — und dort besonders Abschnitt 6.1: vollständig bemaßt, aber nirgends
doppelt.** Kurzfassung für eine Welle:

* Zeichnen mit `masse` + `masseUnten` + `radien` + `bezeichnungen` +
  `rauheiten`. Ohne `masseUnten` laufen die Hinweislinien in die obere
  Maßkette; das ist der Grund, warum die Ebenen früher nicht zusammen durften.
* Rundungen und Freistiche kommen aus `rundungen`/`freistiche` in
  `assets/wellen.js`. Fehlt dort die Lage (`ab`, `hoch`), setzt der Baustein
  sie zur schlankeren Seite — nachmessen mit `test-beschriftung.js`.
* Quer zur Achse liegende Maße brauchen einen eigenen Riss:
  `zeichneNutQuerschnitt()` für die Passfedernut, `zeichneNutEinzelheit()` für
  Sicherungsringnuten.
* `assets/wellenblatt.js` baut das ganze Blatt auf einmal — Ansicht,
  Einzelheiten und die Tabelle der Angaben, die kein Maß sind. Ein Übungspaket
  bekommt es über `"zeichnung"` in seiner `info.json`.
* Gegenprobe: `node pruefungen/test-drehprozess.js`, Abschnitt
  „Vollstaendig bemasst“.

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

**Auf der Paketseite stehen sie in zwei Bereichen**, denn es sind zweierlei
Dinge: eine **Lektion** arbeitet ein Thema in Kapiteln durch, eine
**Simulation** rechnet einen Fall. Beides kommt aus `info.json`:

```json
"werkzeuge": [
  { "datei": "fertigungstechnik-zerspanung-drehprozess-planen.html",
    "name": "Drehprozess planen", "art": "lektion" },
  { "datei": "fertigungstechnik-hauptnutzungszeit-beim-drehen.html",
    "name": "Hauptnutzungszeit beim Drehen", "art": "simulation" }
]
```

* `art` ist **abzuschreiben, nicht zu raten**: Sie steht im
  `<meta name="art">` der Werkzeugseite selbst. Der Build kann dort nicht
  nachsehen — das Werkzeug-Repo ist beim Ausliefern nicht da. Dass beide
  übereinstimmen, prüft `test-lektionen.js`.
* Der **Namenszusatz fällt weg**: kein „Lektion …“, kein „Werkzeug …“. Das
  sagt schon die Überschrift des Bereichs. Auch das wird geprüft.
* Reihenfolge: Lektionen zuerst — erst durcharbeiten, dann rechnen.

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

Sieger und Punktestand kommen von selbst: Wo die API aus
[docs/WETTKAMPF-API.md](../docs/WETTKAMPF-API.md) antwortet, meldet jedes
Gerät seinen Stand und bekommt dafür die Rangliste zurück — mit Namen, die
der Server vergibt. Antwortet sie nicht (lokal geöffnet, GitHub Pages, kein
Netz), zeigt jedes Gerät am Ende einen Ergebniscode aus sechs Zeichen, und
wer ihn am Anzeigegerät einträgt, steht in der Liste. Beides ohne Namensfeld
und ohne Speicher. `pruefungen/test-wettkampf.js` prüft beide Wege nach.

## 10. Der gemerkte Stand

`assets/fortschritt.js` merkt sich, was jemand ausgefüllt hat — im
`localStorage` des eigenen Geräts, sonst nirgends. Der Build trägt den Baustein
nach, sobald eine Seite Felder zum Ausfüllen hat. **Trainings bleiben außen
vor:** Dort ist jede Runde eine neue Aufgabe, und eine wiederhergestellte
Antwort gehörte zur Aufgabe von gestern.

Zu tun ist dafür nichts — außer in zwei Fällen:

* **Was nicht gemerkt werden soll**, bekommt `data-merken="nein"` — am Feld
  oder an einem Container darum. So bleiben die Rückmeldung (Text, der
  gesendet werden soll), der Wettkampf-Code (gehört zu genau dieser Runde),
  die Bildungsgangauswahl und die Druckeinstellung außen vor.
* **Felder ohne `id`** werden über ihre laufende Nummer wiedergefunden. Das
  geht, solange sich die Seite nicht ändert; ändert sie sich, wird der alte
  Stand verworfen statt irgendwo eingesetzt. Wer es sicherer haben will, gibt
  erzeugten Feldern eine `id`.

### Auf einem anderen Gerät

Derselbe Baustein bietet einen Knopf **„Auf anderem Gerät weiterarbeiten"**.
Dahinter liegt ein Code und eine selbst gewählte vierstellige PIN — der
Vertrag steht in `docs/FORTSCHRITT-API.md`.

Auch dafür ist nichts zu tun. Zwei Dinge sind aber gut zu wissen:

* **Der Server wird nur auf Knopfdruck gefragt.** Beim Ausfüllen geht nichts
  hinaus, auch nicht beim Aufmachen der Tafel. Wer es nachsehen will:
  `pruefungen/test-fortschritt-api.js` fängt jeden Netzweg ab.
* **Die Seitenkennung hängt nicht am Auslieferungspfad.** Sie wird aus dem
  Skriptpfad abgeleitet, damit ein Code von t-bk.de auf GitHub Pages
  dieselbe Seite wiederfindet. Wer eine Seite verschiebt oder umbenennt,
  trennt sie damit von ihrem gespeicherten Stand — das ist der Preis dafür,
  dass keine Kennung im Dokument steht.

Lokal per Doppelklick geöffnet (`file:`) fehlt der Knopf. Es gibt dort keinen
Server, und ein Knopf, der nichts halten kann, ist schlimmer als keiner.

## 11. Trackingfrei — ohne Ausnahme

Keine Schrift, kein Skript, kein Bild von einem fremden Server. Kein CDN, keine
Einbettung, kein Zählpixel. Alles liegt im Repo, alle Pfade sind relativ.

Auch der gemerkte Stand ist kein Bruch damit: Er wird nicht gesendet, trägt
keine Kennung und ist kein Cookie. Die Prüfung `test-fortschritt.js` fängt
jeden Netzweg ab und sieht nach, dass keiner benutzt wird.

## 12. Vor dem Committen

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
