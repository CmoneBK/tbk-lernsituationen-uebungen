# Was offen ist

**Stand:** 18.09.2026

Diese Liste sammelt Arbeiten, die begonnen und bewusst nicht zu Ende geführt
wurden — weil der Mechanismus stand, die Anwendung auf den Rest des Materials
aber eine eigene Runde braucht. Sie ist nach Dringlichkeit sortiert, und was
erledigt ist, wird hier gestrichen und nicht abgehakt.

---

## 1. Quellennachweis auf das übrige Material ausweiten — **dringend**

`assets/quellen.js` steht und wird von der Wälzlager-Einheit benutzt: Zwei
Meta-Felder im Kopf einer Seite, und unter der Seite erscheint die
Quellenzeile.

```html
<meta name="quellen" content="tabellenbuch fachkunde-im katalog">
<meta name="normen" content="DIN 625-1, DIN 628-1">
```

**Offen ist die Anwendung auf alle übrigen Einheiten.** Wo Zahlen aus dem
Tabellenbuch Metall stehen, gehört der Verweis auf den Europa-Verlag dazu.
Betroffen sind mindestens:

| Ort | was dort steht |
| --- | --- |
| Lektion Schraubverbindungen (`tools/`) | Tabelle M4…M36 mit d, P, s, k, dw, Dh — reine Normwerte, geringes Risiko, Verweis fehlt trotzdem |
| Übungen und Trainings Schraubverbindungen | Spannungsquerschnitte, Festigkeitsklassen, Anziehdrehmomente |
| Drehprozess (Übungen, Trainings, Lektion) | Schnittdaten, Plattenbezeichnungen, Rautiefen |
| Schweißen, Löten und Kleben | Verfahrensnummern, Richtwerte, Lote, Klebstoffe |
| Lernsituationen | durchgängig |

**Die Regel dazu** steht im Kopfkommentar von `assets/quellen.js`:

* Normmaße dürfen stehen, mit der **Norm** als Quelle.
* Kennwerte, die kein Normwert sind (Tragzahlen etwa), gehören in die
  Aufgabe oder stehen als kleine Auswahl mit dem Hinweis auf den
  Herstellerkatalog.
* Zusammenstellungen eines Verlags werden gekürzt auf das, was gebraucht
  wird, und tragen ihren Nachweis.

Beim Durchgehen ist also nicht nur das Meta-Feld zu setzen, sondern auch zu
prüfen, ob irgendwo eine Verlagstabelle vollständig nachgebaut ist.

---

## 2. Bildungsgänge für die übrigen Einheiten — **dringend**

Getaggt sind bisher nur **Schraubverbindungen** und **Wälzlager**. Ohne
Attribut heißt: gehört überall dazu — und das stimmt für die folgenden
Einheiten nicht.

| Einheit | Stand |
| --- | --- |
| Montageplanung | geprüft, bleibt bewusst ohne Attribut (steht wörtlich in der Anlage B, rechnet nirgends) |
| **Drehprozess** | ungetaggt, und hier liegt der Kern |
| **Schweißen** | teilweise: zwei Karten der Lektion sind getaggt, Übungen und Trainings nicht |
| **Löten und Kleben** | ungetaggt |
| **Fügeverfahren (Überblick)** | ungetaggt |
| Lernsituationen Antriebswelle, Abtriebswelle, Biegepresse, Lagerbock | ungetaggt |

### Der konkrete Anknüpfungspunkt

Die Rechenübungen des Drehprozesses hängen an **AS 2.3** der Anlage B
(„technologische Daten ermitteln und berechnen“). **Diese AS fehlt der
HS10-Stufe ganz** — sie ist einer der drei Unterschiede zwischen HS10 und
FOR, die als Tabelle im Plan stehen (siehe `bildungsgaenge/README.md`,
Befund 2).

### Warum das anders liegt als bei den Lagern

Bei den Wälzlagern ließ sich das Rechnen abwählen, weil es auf eigenen
Seiten steht: Übung 5 und ein Reiter der Lektion, sonst nichts. **Beim
Drehprozess steckt das Rechnen mitten in den Übungen** — Schnittgeschwindigkeit,
Vorschub, Hauptnutzungszeit sind nicht die Zugabe, sie sind die Übung.

Ein `data-bg-ohne` an einzelnen Abschnitten würde dort Löcher hinterlassen
statt eine kürzere Übung zu ergeben. Für die HS10-Stufe sind deshalb
**abgespeckte Alternativfassungen** zu prüfen: dieselbe Situation, aber
ablesen und auswählen statt rechnen — so, wie es die Lernsituation
„Gehäusedeckel“ mit ihrem „Weg B — im Tabellenbuch nachgesehen“ neben dem
gerechneten Weg A schon vormacht.

Zu entscheiden ist dabei, ob eine solche Fassung

* eine eigene Seite wird (`…-hs10.html`, mit `bg-ohne` am Original), oder
* ein Abschnitt in derselben Seite, der die Rechnung ersetzt statt sie
  wegzulassen.

Der zweite Weg ist der bessere, wenn er sich ohne Doppelpflege bauen lässt —
beim Gehäusedeckel funktioniert er.
