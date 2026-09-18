# Was offen ist

**Stand:** 18.09.2026

Diese Liste sammelt Arbeiten, die begonnen und bewusst nicht zu Ende geführt
wurden — weil der Mechanismus stand, die Anwendung auf den Rest des Materials
aber eine eigene Runde braucht. Sie ist nach Dringlichkeit sortiert, und was
erledigt ist, wird hier gestrichen und nicht abgehakt.

**Beide dringenden Punkte sind erledigt und gestrichen:** der Quellennachweis
auf allen Seiten mit fremden Zahlen, und die Bildungsgang-Zuordnung für
Drehprozess, Schweißen, Löten/Kleben, Fügeverfahren und die vier übrigen
Lernsituationen. Damit trägt **jede** Einheit des Materials ihre Zuordnung.

Was jetzt noch hier steht, wartet auf etwas von außen oder ist eine
Ermessensfrage — nichts davon hält etwas anderes auf.

---

## 1. Eine Seite des Tabellenbuchs fehlt noch

`tabellenbuch/daten.json` führt unter `_luecken`, wonach gesucht wurde und was
das Buch nicht hergibt. Zwei Einträge sind keine Lücke des Buches, sondern
eine des Speichers — die Seiten sind noch nicht abgelesen:

| Fehlt | Wofür gebraucht |
| --- | --- |
| **Dichtungswerkstoffe mit zulässiger Pressung** | Die Mindestpressung einer Flachdichtung, F<sub>K</sub> = p<sub>min</sub> · A<sub>Dicht</sub>. Die Lernsituation „Der Gehäusedeckel“ rechnet solange mit einer Herstellerangabe (4 N/mm²) und sagt das auch dazu. |
| **Messmittel und Prüfmittelfähigkeit** | Die Ablesungen der Messmittel und die Regel, wie fein ein Messmittel zu einer Toleranz sein muss. Steht im Kapitel 6 vor Seite 334; die Scans beginnen erst dort. |

Beides ist beim Nutzer angefordert. Solange es fehlt, ist der jeweilige Wert
im Material als Herstellerangabe bzw. als Faustregel gekennzeichnet — er steht
nicht als Buchwert da, den es nicht gibt.

---

## 2. Eine Ermessensfrage in der Lektion Schraubverbindungen

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
