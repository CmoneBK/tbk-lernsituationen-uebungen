# Strukturnetz und Montageplan

`assets/montageplan.js` — der Baustein hinter der Montageeinheit.
Zeichengleich in beiden Repos, wie `assets/thema.js` auch.

---

## 1. Warum es ihn gibt

Die Montageplanung hat einen Kern, an dem jede Unterrichtsstunde hängt:

> **Eine Montagereihenfolge ist nicht *die* Reihenfolge.**

Ob das Biegegesenk vor oder nach den Ständern montiert wird, ist
gleichgültig. Dass die Feder vor dem Stempelhalter auf den Bolzen muss, ist
es nicht. Wer das in eine Übung gießt, darf nicht gegen eine Musterlösung
prüfen — er muss gegen die **Vorrangbeziehungen** prüfen. Sonst lernt die
Klasse eine Folge auswendig und hat nichts verstanden.

Genau das macht dieser Baustein, und sonst nichts. Er kennt keine Presse und
kein Getriebe: Teile, Verbindungen und Vorrangbeziehungen kommen von außen.

---

## 2. Was hineingeht

```js
var TEILE = [
  {pos: 1, kurz: "Grundplatte", art: "fertigung"},
  {pos: 8, kurz: "Druckfeder",  art: "norm"}
];

var STRUKTUR = [
  {a: 1, b: 2, art: "fest",      warum: "Die Ständer stehen auf der Platte."},
  {a: 2, b: 3, art: "beweglich", warum: "Die Welle dreht sich darin."}
];

var VORRANG = [
  {vorher: 6, nachher: 8, warum: "Die Feder wird auf den Bolzen gesteckt."}
];

var LAGE = { 1: {x: 56, y: 50}, 2: {x: 12, y: 28} };   /* Raster 0 … 100 */
```

`warum` ist kein Beiwerk. Eine Bedingung ohne Grund ist eine Behauptung, und
eine Behauptung lernt man auswendig. Die Prüfung verlangt deshalb mindestens
zwanzig Zeichen.

---

## 3. Das Strukturnetz

```js
Montageplan.netz("netz", {teile: TEILE, kanten: STRUKTUR, lage: LAGE});
```

| Zeichen | Bedeutung |
| --- | --- |
| Rechteck | Fertigungsteil — entsteht in der Werkstatt |
| Oval | Normteil — wird bestellt |
| volle Linie | berühren sich, ohne sich zu bewegen |
| unterbrochene Linie | berühren sich und bewegen sich gegeneinander |
| keine Linie | kein Kontakt |

**Die Linien enden am Rand der Kästchen, nicht in ihrer Mitte.** Das ist
keine Feinheit: Eine Linie, die unter einer Beschriftung hindurchläuft, ist
so gut wie nicht vorhanden — man sieht sie an beiden Seiten des Wortes
auftauchen und liest sie als zwei Linien.

**Die Lage der Kästchen wird nachgemessen, nicht nach Augenmaß gesetzt.**
`pruefungen/test-montage.js` rechnet mit denselben Bildpunkten, in denen
gezeichnet wird, und hält drei Dinge fest: kein Kästchen überdeckt ein
anderes, jedes bleibt im Bild, und keine Verbindungslinie läuft durch ein
fremdes Kästchen. Wer eine Lage verschiebt, bekommt sofort gesagt, was dabei
kaputtgeht.

Dass sich *Linien* kreuzen, ist dagegen erlaubt und meist unvermeidlich: Die
Grundplatte berührt fast alles. Das ist keine schlechte Zeichnung, sondern
die Aussage.

---

## 4. Die Reihenfolge

```js
var plan = Montageplan.reihenfolge("plan", {
  teile:   TEILE,
  vorrang: VORRANG,
  sofort:  true,             // false: erst am Schluss prüfen
  onSetzen:  function(pos){ … },
  onZurueck: function(pos){ … },
  onStand:   function(gesetzt, fertig){ … }
});
plan.stand();      // die gesetzten Positionen
plan.vonVorn();
```

**Kein Ziehen mit der Maus.** Wer eine Reihenfolge baut, klickt das Teil an,
das als nächstes an die Reihe kommt; ein Knopf am zuletzt gesetzten nimmt es
zurück. Das geht mit der Tastatur genauso wie mit dem Finger — und es sagt
genauer, was gemeint ist, als ein halb gezogenes Kästchen.

Zwei Betriebsarten, und beide werden gebraucht:

* `sofort: true` — jeder Fehlgriff wird abgelehnt und begründet.
  **So läuft es an der Maschine.** Dort merkt man es auch sofort, nur
  unangenehmer.
* `sofort: false` — alles wird angenommen, geprüft wird am Schluss, und
  genannt wird der *erste* Verstoß. **So plant man am Schreibtisch.**

Warum nur der erste? Wer ihn behebt, sieht die übrigen ohnehin neu.

---

## 5. Abzählen

```js
Montageplan.wieVieleFolgen(TEILE, VORRANG, 200000);
// → {zahl: 30, abgebrochen: false}
```

Die Zahl wird abgezählt, nicht geschätzt: Der Baustein geht alle Folgen
durch und bricht bei der Schranke ab. Für die Biegepresse sind es **30** von
12! = 479 001 600 — und diese beiden Zahlen nebeneinander beantworten die
Frage, die in jeder Klasse kommt, besser als jeder Satz.

Die 30 waren einmal 495. Dazwischen lagen drei Bedingungen, die nicht am
Werkstück hängen, sondern am Werkzeug: Ein Stift will mit dem Hammer
getrieben, ein Gesenk senkrecht auf zwei Stifte gesetzt und eine Schraube mit
einem Schlüssel angezogen werden. Unter dem Stempelhalter bleiben 31 mm — für
das Teil reicht das knapp, für die Hand nicht. Wer den Montageplan schreibt,
plant eben nicht nur Teile, sondern auch Platz.

Die Simulation „Montageplaner" lebt davon: Dort lassen sich einzelne
Vorrangbeziehungen abschalten, und die Zahl steigt sprunghaft. Der
abgeschaltete *Grund* verschwindet dadurch natürlich nicht — in der Werkstatt
würde man es erst merken, wenn das Teil nicht mehr an seinen Platz geht.

---

## 6. Wer ihn benutzt

| Ort | Baugruppe | wofür |
| --- | --- | --- |
| Lektion „Strukturnetz und Montageplan" | Bohrvorrichtung | Netz, Reihenfolge, Zahl |
| Simulation „Montageplaner" | Biegepresse | Bedingungen ein- und ausschalten |
| Übung 3 „Das Strukturnetz lesen" | Klappanschlag | Netz |
| Übung 5 „Die Reihenfolge planen" | Klappanschlag | Reihenfolge in beiden Betriebsarten |
| Lernsituation „Die Biegepresse" | Biegepresse | Netz, Planen, und das Montieren in 3D |

### Drei Baugruppen, nicht eine

| Baustein | globales Objekt | Positionen | wo sie steht |
| --- | --- | --- | --- |
| `assets/bohrvorrichtung.js` | `VORRICHTUNG` | 10 | Lektion |
| `assets/klappanschlag.js` | `ANSCHLAG` | 10 | Übungen |
| `assets/biegepresse.js` | `PRESSE` | 12 | Lernsituation, Simulation |

Der Grund ist didaktisch, nicht technisch: Wer die Übungen macht und danach
die Lernsituation bearbeitet, soll nicht dieselben Lösungen wiedererkennen.
Und jede zeigt etwas anderes. Die Presse übersetzt Kraft, die Vorrichtung
hält fest, der Anschlag dreht sich. Im Schnitt der Presse ist jeder Stift
längs geschnitten und bleibt blank; der Schwenkbolzen des Anschlags steht
quer und wird schraffiert. Wer beides gesehen hat, kennt die Regel und nicht
nur einen Fall.

Alle drei haben denselben Bauplan — `M`, `TEILE`, `STRUKTUR`, `NETZ_LAGE`,
`VORRANG`, `zeichnen()`, `teil()`, `darfDurchdringen()` —, und
`pruefungen/test-montage.js` prüft alle drei mit denselben Funktionen.
Ein 3D-Modell (`teile3d()`, `REIHENFOLGE`) hat nur die Presse.

Die gemeinsamen Zeichnungsteile — geschnittener Umriss, Positionsnummer,
Schnittmarke, Schriftfeld — stehen in `assets/zusammenstellung.js` und
werden vor der Baugruppe eingebunden.

Im letzten Fall führt der Montageplan-Baustein die Reihenfolge und
`assets/bauteil3d.js` zeigt sie: `onSetzen` ruft `szene.einsetzen()`.
Verbunden sind beide über die Positionsnummer — zu einer Position können
mehrere Körper gehören, die Exzenterwelle etwa ist ein Fertigungsteil, aber
drei Drehkörper.

---

## 7. Was noch fehlt

* **Der Vorranggraph als Bild.** Heute sieht man die Bedingungen als Liste.
  Ein gezeichneter Graph mit Pfeilen wäre die übliche Darstellung — und die
  Frage „wo ist der kritische Pfad?" ließe sich daran stellen.
* **Vormontagen.** Alle drei Baugruppen sind flach: zehn bis zwölf
  Positionen, eine Ebene. Ein Getriebe hat Vormontagen, und die will man als
  Block planen können.
* **Zeiten.** Ein Montageplan im Betrieb trägt Vorgabezeiten. Damit ließe
  sich fragen, welche der gültigen Reihenfolgen die schnellste ist.
