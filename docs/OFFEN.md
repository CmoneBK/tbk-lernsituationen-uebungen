# Was offen ist

**Stand:** 18.09.2026

Diese Liste sammelt Arbeiten, die begonnen und bewusst nicht zu Ende geführt
wurden — weil der Mechanismus stand, die Anwendung auf den Rest des Materials
aber eine eigene Runde braucht. Sie ist nach Dringlichkeit sortiert, und was
erledigt ist, wird hier gestrichen und nicht abgehakt.

**Erledigt und gestrichen:** der Quellennachweis auf allen Seiten mit fremden
Zahlen, und die Bildungsgang-Zuordnung für Drehprozess, Schweißen,
Löten/Kleben, Fügeverfahren und die vier übrigen Lernsituationen. Damit
trägt **jede** Einheit des Materials ihre Zuordnung.

Neu offen ist Punkt 1: Der Schalter „ohne Tabellenbuch“ ist fertig gebaut und
geprüft, das Material ist erst zum Teil daraufhin ausgezeichnet.

---

## 1. Die Auszeichnung „ohne Tabellenbuch“ auf das übrige Material ausweiten

`assets/tabellenbuch.js` steht: drei Zustände, der Schalter an drei Stellen,
die Anbindung an Baukasten und Lektion, die Prüfung
`pruefungen/test-ohne-tabellenbuch.js` und die Doku in der README. **Offen ist
die Auszeichnung des Materials.**

Ausgezeichnet sind bisher:

| Seite | Was |
| --- | --- |
| Übung Schrauben 3 „Wohin geht das Drehmoment?“ | Aufgabe d) `noetig` + Auszug (A s, F M,zul, M A für M8/M10/M12) |
| Übung Drehprozess 6 „Auf welches Maß wird geschlichtet?“ | Auszug der Grenzabmaße (drei Nennmaßbereiche, H7/g6/h6/n6) |
| Übung Drehprozess 2 „Vom Werkstoff zur Schnittgeschwindigkeit“ | ganze Seite `noetig` |
| Übung Drehprozess 5 „Wie lange dauert das?“ | ganze Seite `noetig` |
| Training Drehprozess 3 „Startwert ablesen“ | ganze Seite `noetig` |
| Training Schrauben 7 „Im Tabellenbuch nachschlagen“ | ganze Seite `noetig` |

### Was das Durchgehen schon ergeben hat

**Die Arbeit ist kleiner, als die Zahl 86 vermuten lässt.** Von den Seiten mit
Tabellenbuch-Bezug bringen die allermeisten ihre Zahlen selbst mit: Die
Übung „Den Lötspalt wählen“ baut die Spaltbreitentabelle aus eigenen Daten,
die Trainings erzeugen ihre Aufgaben samt Werten, und die „Nachschlagen:“-
Hinweise in den Lösungswegen sagen nur, **wo** die Zahl im Buch stünde. Das
ist kein Bedarf, das ist eine Herkunftsangabe.

Wer das Buch wirklich braucht, **sagt es im Auftrag** – „Das Tabellenbuch
gehört aufgeschlagen daneben“. Genau danach lässt sich suchen, und genau
diese Seiten sind oben abgearbeitet. Es bleibt der zweite, feinere Durchgang:
einzelne Teilaufgaben, die eine Zahl verlangen, die nirgends auf der Seite
steht – so wie Aufgabe d) der Schraubenübung 3.

### Zwei Lücken im Speicher, die Auszüge verhindern

`tabellenbuch/daten.json` fehlen zwei Abschnitte, ohne die sich kein belegter
Auszug bauen lässt (siehe auch Punkt 2):

* die **Vergütungsstähle** mit R m nach Walzdurchmesser – gebraucht für
  Übung Drehprozess 2, Abschnitt 1;
* die **Messmittel-Ablesungen** – gebraucht für Übung Drehprozess 7.

Solange sie fehlen, tragen diese Seiten `meta tb="noetig"` und fallen ohne
Buch weg, statt einen Auszug anzubieten. Das ist die ehrlichere von beiden
Möglichkeiten.

### Wo ein Auszug bewusst nicht hilft

Übung Drehprozess 2 geht durch **vier** Buchtabellen nacheinander. Jede davon
als Auszug daneben wäre der Nachbau eines halben Kapitels – genau die Grenze,
die `assets/quellen.js` zieht. Dieselbe Überlegung gilt für das Training
„Im Tabellenbuch nachschlagen“: Dort **ist** das Suchen im Buch die Aufgabe.
Beide Seiten fallen ohne Buch weg, und der Seitenhinweis sagt das auch.

---

## 2. Eine Seite des Tabellenbuchs fehlt noch

`tabellenbuch/daten.json` führt unter `_luecken`, wonach gesucht wurde und was
das Buch nicht hergibt. Drei Einträge sind keine Lücke des Buches, sondern
eine des Speichers — die Seiten sind noch nicht abgelesen:

| Fehlt | Wofür gebraucht |
| --- | --- |
| **Dichtungswerkstoffe mit zulässiger Pressung** | Die Mindestpressung einer Flachdichtung, F<sub>K</sub> = p<sub>min</sub> · A<sub>Dicht</sub>. Die Lernsituation „Der Gehäusedeckel“ rechnet solange mit einer Herstellerangabe (4 N/mm²) und sagt das auch dazu. |
| **Messmittel und Prüfmittelfähigkeit** | Die Ablesungen der Messmittel und die Regel, wie fein ein Messmittel zu einer Toleranz sein muss. Steht im Kapitel 6 vor Seite 334; die Scans beginnen erst dort. |
| **Vergütungsstähle mit R<sub>m</sub> nach Walzdurchmesser** | Die Zugfestigkeit von C25E & Co., abhängig vom Walzdurchmesser. Übung Drehprozess 2 schlägt sie nach; ohne den Abschnitt im Speicher lässt sich dafür kein belegter Auszug bauen. |

Beides ist beim Nutzer angefordert. Solange es fehlt, ist der jeweilige Wert
im Material als Herstellerangabe bzw. als Faustregel gekennzeichnet — er steht
nicht als Buchwert da, den es nicht gibt.

---

## 3. Eine Ermessensfrage in der Lektion Schraubverbindungen

„Warum dreht sich eine Schraube nicht von allein zurück?“ (Reiter Funktion)
erklärt die Selbsthemmung über Anstiegswinkel und Grenzwinkel der Reibung,
mit dem Faktor 1,155 aus dem Flankenwinkel. Anschaulich gemacht ist es über
die abgewickelte schiefe Ebene — aber es sind zwei Winkel und ein Faktor.

Für die HS10-Stufe ist das eine Ermessensfrage. **Derzeit bleibt es drin**,
weil die Frage selbst — warum sich eine Schraube nicht löst — an jeder
Werkbank gestellt wird. Wer anders entscheidet, setzt das Attribut und trägt
den Grund in `bildungsgaenge/README.md` nach.

---

## Zwei Muster, die sich bewährt haben

Wer die nächste Einheit zuordnet, findet hier den Weg, statt ihn neu zu
suchen:

1. **Nicht die Seite, sondern der Fall.** Wo eine Seite ihre Aufgaben als
   Datensatz führt (Trainings), bekommt der einzelne Fall ein Feld
   `ohne: ["bfs-hs10"]` und fällt aus dem Durchgang. Die Seite zählt dann eben
   zwölf statt sechzehn Fälle. Siehe die beiden Wälzlager-Bildertrainings.
2. **Nicht die Seite, sondern der Abschnitt.** Wo eine Übung in `h2`-Blöcke
   gegliedert ist, trägt der Block das Attribut `data-bg-ohne`. Der Baukasten
   nimmt eine `h2` mit allem, was ihr folgt, als ein Teil — feiner geht es
   nicht, und feiner muss es bisher auch nicht.

Eine **eigene abgespeckte Seite** (`…-hs10.html`) war bis heute nie nötig.
Zweimal sah es danach aus, beide Male trennte die Gliederung des Materials
ohnehin schon an der richtigen Stelle. Die Begründung dazu steht in
`bildungsgaenge/README.md` unter „Warum es doch keine abgespeckte
Rechenfassung gibt“.
