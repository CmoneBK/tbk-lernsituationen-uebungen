# Prüfungen

Was hier liegt, prüft das Material, bevor es jemand im Unterricht sieht.
Jede Datei ist ein eigenes Programm, das eine Sorte Fehler sucht und am Ende
sagt, ob es fündig wurde.

```
npm install          einmalig: jsdom und die QR-Vergleichsbibliothek
npm run pruefen      alle Prüfungen nacheinander
node pruefungen/alle.js zeichn      nur die, deren Name "zeichn" enthält
node pruefungen/test-zeichnungen.js einzeln, mit voller Ausgabe
```

`alle.js` startet jede Prüfung in einem eigenen Prozess. Das ist kein
Selbstzweck: Die Prüfungen bauen die Seiten mit **jsdom** auf, also mit einem
Browser ohne Bildschirm, und ein Fenster, das offen bleibt, würde sonst alle
folgenden aufhalten.

## Was jede Prüfung sucht

| Datei | Sucht nach |
| --- | --- |
| `test.js` | Übungen zu den Schraubverbindungen: laufen sie, nehmen sie Eingaben an, stimmt die Rückmeldung? |
| `test-assets.js` | Bausteine in `assets/`: lösen ihre Verweise auf, zeigen Rücklink und Werkzeug-Link auf etwas, das es gibt? |
| `test-beschriftung.js` | Liegt eine Beschriftung im Weg? Misst jeden Text jeder Zeichnung im Browser - gegen Strichwerk, gegen anderen Text, gegen den Bildrand; in jedem Reiter, auf mehreren Stufen jeder Bewegung und in der Normdarstellung. Braucht Chrome. |
| `test-backnav.js` | Der Rücklink: überall derselbe Knopf, nur Beschriftung und Ziel wechseln. |
| `test-baukasten.js` | „Übung anpassen“: Knopf da, Tafel öffnet, Zahl der abwählbaren Teile stimmt. |
| `test-bilder.js` | Übung 1 „Eine Bezeichnung lesen“: zeigen die drei Teile ihre Zeichnungen? |
| `test-bildungsgang.js` | Wählt man einen Bildungsgang, bleibt nur, was der Bildungsplan hergibt — und ändern lässt es sich trotzdem. |
| `test-ermittlung.js` | Bereich „Ermittlung“ im Werkzeug: liefert er die Zeilen des Tabellenbuchs und rechnet er dessen Beispiele nach? |
| `test-export.js` | Herunterladen als PDF und Word: entstehen die Dateien, tragen sie die Inhalte, halten sie ihr Format ein? |
| `test-feedback.js` | Die Rückmeldung an den Inhalten: erscheint der Block auf jeder Seite, kommt das Token erst beim Öffnen, schickt das Formular die verabredeten Felder – und bleibt es bei Rolle, Kategorie und Freitext, ohne Speicher und ohne fremden Server? |
| `test-fuegen.js` | Das Material zum Überblick über die Fügeverfahren. |
| `test-lektionen.js` | Die vier Lektionen: gemeinsamer Aufbau, Fachbegriffe, Anpassen, Herunterladen. |
| `test-lernsituation.js` | Die Lernsituation: Zeichnungen, Ergebnisprüfung, und die Bausteine sprechen von „Lernsituation“, nicht von „Übung“. |
| `test-qr.js` | Vergleicht den selbst gebauten QR-Encoder Modul für Modul mit der Bibliothek `qrcode`. |
| `test-sechskant.js` | Sechskant-Andeutung an Kopf und Mutter und die Zeichnung „Die Schraube allein“. |
| `test-tabellenbuch.js` | Stimmt jede Zahl mit dem Europa-Tabellenbuch Metall überein? |
| `test-thema.js` | Umschalter hell/dunkel: überall da, merkt sich die Wahl, lässt die Ausgabe in Ruhe. |
| `test-training1.js` | Begriffstraining: Schwierigkeit, Modus, Umfang, und kommt jeder Ablenker aus der vorgesehenen Quelle? |
| `test-trainings.js` | Die Trainings: laufen sie, zählen sie richtig, heißen die Bausteine dort „Training“? |
| `test-uebersicht.js` | Die Werkzeug-Übersicht: zwei Haupt-Tabs, Suche nur im offenen Tab. |
| `test-werkzeug.js` | Rechnet das Werkzeug dieselben Werte wie das Tabellenbuch — und läuft es noch? |
| `test-wettkampf.js` | Der Wettkampf: gleicher Code, gleiche Aufgabenfolge auf jedem Gerät; Runden, Ergebnis und QR-Code; kein Speicher, kein Netz, und `Math.random` gehört danach wieder der Seite. |
| `test-zahlenfeld.js` | Mausrad in Zahlenfeldern: ändert den Wert, hält die Seite an, lässt fremde Felder in Ruhe. |
| **`test-zeichnungen.js`** | **Alle Zeichnungen gegen `vorlagen/ZEICHNUNGSREGELN.md`.** Siehe unten. |

Dazu `bericht-zeichnungen.js`: keine Prüfung, sondern eine Bestandsaufnahme.
Sie zählt auf, was in jeder Zeichnung steckt — Linienbreiten, Schraffuren,
Marker, Strichbilder. Gut, um sich einen Überblick zu verschaffen, bevor man
etwas ändert.

## Die Zeichnungsprüfung

`test-zeichnungen.js` ist die einzige Prüfung, die eine schriftlich
festgelegte Regel bewacht: `vorlagen/ZEICHNUNGSREGELN.md`. Dort steht, dass
es nur zwei Sorten Bild gibt — sichtbar keine technische Zeichnung, oder eine
zu hundert Prozent nach Norm. Nichts dazwischen.

Sie lädt jede Seite, zeichnet jedes Bild und prüft unter anderem:

1. höchstens zwei Linienbreiten je Zeichnung, im Verhältnis 2:1,
2. Maßlinien tragen gefüllte Pfeile, keine offenen Striche,
3. aneinandergrenzende Teile sind gegenläufig schraffiert,
4. Mittellinien sind Strichpunktlinien, und alle im selben Strichbild,
5. keine deckende Fläche knabbert einer breiten Kante die halbe Breite weg,
6. nichts ragt über den Rand der Zeichenfläche hinaus.

Zwei Listen im Kopf der Datei steuern sie:

- `KEINE_ZEICHNUNG` — Bilder der ersten Sorte: Diagramme und farbige
  Lehrgrafiken. Wer hier etwas einträgt, behauptet damit, dass niemand es für
  eine technische Zeichnung hält.
- `UEBERZEICHNET`, `GLEICHE_SCHRAFFUR_ERLAUBT` — die bewussten Abweichungen
  aus Abschnitt 8 der Zeichnungsregeln, namentlich.

**Wer eine Zeichnung ändert, lässt diese Prüfung laufen.** Sie geht beide
Repos durch und braucht dafür rund eine Viertelminute.

## Die Nachbarn

Ein Teil der Prüfungen sieht über das Material hinaus:

- **Werkzeug-Repo** `CmoneBK-Unterrichtsmaterial` — die Werkzeuge, auf die
  das Material verlinkt. Erwartet als Geschwisterordner.
- **Webseite** `Webseiten/TBK` — der Auslieferungsordner mit `deploy.sh`.

Beide dürfen fehlen. Eine Prüfung, die ihren Nachbarn nicht findet, sagt das
(`ohne Werkzeug-Repo: …`) und hört auf — das ist kein Fehler im Material.
Fehlt nur ein Teil, fällt auch nur der weg (`teilweise()` statt `dran()`).
Liegen sie woanders, sagen das zwei Umgebungsvariablen:

```
TBK_WERKZEUGE=/pfad/zu/CmoneBK-Unterrichtsmaterial
TBK_WEBSEITE=/pfad/zu/Webseiten/TBK
```

`orte.js` ist die einzige Stelle, die Pfade kennt. In den Prüfungen selbst
steht kein einziger.

## Eine neue Prüfung schreiben

Der Zuschnitt ist überall gleich, damit `alle.js` sie findet und auswerten
kann:

```js
/* Wonach diese Pruefung sucht - in einem Satz. */
const { MATERIAL } = require('./orte');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

// ... prüfen ...

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exitCode = fehler ? 1 : 0;
```

Drei Dinge zählen: Der Dateiname fängt mit `test` an, jede Einzelprüfung
schreibt eine Zeile mit `ok` oder `FEHLER`, und der Rückgabewert ist am Ende
1, wenn etwas gefunden wurde. Wer jsdom benutzt und Fenster offen lässt,
beendet sich am Schluss selbst — siehe `test-export.js`.
