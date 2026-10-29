# iFrame-Notification Demo

Prototyp für folgendes Problem: Eine Angular-App läuft in einem `<iframe>` innerhalb einer anderen
Angular-App. [iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) (v5) macht das
iframe immer so hoch wie seinen Inhalt, darum scrollt nur der Parent. Notifications im iframe
(Angular Material Snackbar oben rechts) verschwinden, sobald man im Parent nach unten scrollt.

Der Prototyp stellt das Problem nach und zeigt drei Lösungsansätze. Zwischen den Ansätzen kann man
direkt im iframe umschalten.

**Live-Demo:** https://raphibolliger.github.io/iframe-child-notification-demo/

## Lokal starten

Voraussetzung: Node 22.22.3+ oder 24.15+ (siehe `.nvmrc`).

```bash
npm ci
npm start
```

- Parent (bindet das Child ein): http://localhost:4200
- Child standalone: http://localhost:4300

Parent und Child laufen auf unterschiedlichen Ports und damit auf unterschiedlichen Origins. Wie in
Produktion ist das iframe also cross-origin, und die Apps können nur per `postMessage`
miteinander reden.

Den Modus wählt man im iframe oder direkt über die URL, z.B. http://localhost:4200/?mode=bridge
(`none`, `resizer`, `bridge`, `parent`).

## Build und GitHub Pages

```bash
npm run build
```

baut den Parent nach `dist/pages` und das Child nach `dist/pages/child` (die Reihenfolge im Script
ist wichtig, weil der Parent-Build `dist/pages` zuerst leert). `dist/pages` ist damit direkt die
fertige Seite. Beide Apps verwenden eine relative Base-URL (`./`) und laufen deshalb unter jedem
Pfad, z.B. unter `/iframe-child-notification-demo/` auf GitHub Pages.

Der Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) baut und deployt bei jedem
Push auf `main`. Dafür muss in den Repository-Settings unter _Pages_ als Source «GitHub Actions»
gewählt sein.

Unterschied zu lokal: Auf GitHub Pages liegen Parent und Child unter derselben Origin, weil eine
Pages-Seite nur eine Domain hat. Am Problem und an den Lösungen ändert das nichts, die Apps reden
trotzdem nur per `postMessage` miteinander. Wo die Apps einander finden, steht in
[`environment.ts`](projects/shared/environment.ts) (Pages) und
[`environment.development.ts`](projects/shared/environment.development.ts) (lokal).

![Übersicht](docs/01-uebersicht.png)

## Das Problem

```
 Parent-Fenster                          iframe (durch iframe-resizer ~2800px hoch)
┌──────────────────────────┐            ┌──────────────────────────┐
│ fixer Header             │            │            [Snackbar] ◄──── "oben rechts" im Child
├──────────────────────────┤            │                          │    = Oberkante des iframes
│                          │            │                          │
│                          │  scrollt   │          ...             │
│   sichtbarer Teil des    │ ◄────────► │                          │
│   iframes                │            │   #1026  [Speichern]  ◄──── hier wurde geklickt
│                          │            │          ...             │
└──────────────────────────┘            └──────────────────────────┘
```

Die Snackbar ist ein CDK-Overlay mit `position: fixed`. `fixed` bezieht sich auf den Viewport des
eigenen Dokuments, und für das Child-Dokument ist das iframe der Viewport. Weil iframe-resizer das
iframe so hoch wie den ganzen Inhalt macht, ist «oben rechts im Viewport» die Oberkante des iframes.
Hat der Parent darüber hinaus gescrollt, wird die Notification zwar angezeigt, aber ausserhalb des
sichtbaren Bereichs.

Standalone ist der Viewport das Browserfenster, dort funktioniert alles wie gewohnt.

Das Child kann das nicht alleine lösen: Es weiss nicht, wo das iframe im Parent liegt und wie weit
der Parent gescrollt ist. Cross-origin hat es keinen Zugriff auf `window.parent`.

![Problem](docs/02-problem.png)

_Modus «Ohne Fix»: Nach dem Klick auf «Speichern» bei #1026 wird die Notification angezeigt, liegt
aber rund 1500px weiter oben an der Oberkante des iframes._

## Lösungen

### Fix A: Overlays in den sichtbaren Bereich verschieben

Das Child bekommt laufend mitgeteilt, welcher Teil des iframes gerade im Parent sichtbar ist. Per CSS
wird dann der Wrapper der globalen CDK-Overlays (`.cdk-global-overlay-wrapper`) genau über diesen
Bereich gelegt ([`styles.scss`](projects/child/src/styles.scss)):

```scss
html.parent-viewport-sync .cdk-global-overlay-wrapper {
  top: var(--parent-viewport-top);
  height: var(--parent-viewport-height);
}
```

Die Snackbar selbst wird ganz normal geöffnet (`verticalPosition: 'top'`,
`horizontalPosition: 'end'`), sie richtet sich nur an einem kleineren «virtuellen Viewport» aus.
Den Wrapper verwenden alle Overlays mit `GlobalPositionStrategy`, das betrifft also auch `MatDialog`
(Dialoge werden im sichtbaren Bereich zentriert, im Demo nicht eingebaut). Menüs, Selects und
Autocomplete hängen an ihrem Auslöser-Element und bleiben unverändert.

Die Berechnung steckt in [`parent-viewport.ts`](projects/child/src/app/parent-viewport.ts). Für die
Herkunft der Position gibt es zwei Varianten:

#### A1: iframe-resizer `getParentProps()` (nur das Child ändern)

Der Parent-Teil von iframe-resizer kann dem Child bereits melden, wo das iframe im Viewport liegt:
`window.parentIFrame.getParentProps(callback)` liefert u.a. `iframe.top` und `viewport.height`, bei
jedem Scroll und Resize neu. Im Parent muss nichts geändert werden.

Einschränkungen:

- iframe-resizer hört nur auf Scroll und Resize des **Windows**. Scrollt im Parent ein innerer
  Container (typisch bei `mat-sidenav-container`, dort scrollt `mat-sidenav-content`), kommen beim
  Scrollen keine Updates. Getestet: Die Snackbar bleibt dann beim Scrollen zurück und verschwindet.
- Fixe Elemente im Parent (Header) kennt iframe-resizer nicht. Das Child muss deren Höhe selber
  wissen (`PARENT_HEADER_HEIGHT`).

#### A2: Viewport-Bridge (kleine Erweiterung im Parent)

Eine Direktive im Parent
([`viewport-bridge.directive.ts`](projects/parent/src/app/viewport-bridge.directive.ts)) schickt bei
Scroll und Resize (höchstens einmal pro Frame) per `postMessage` die Oberkante des iframes, die
Unterkante des fixen Headers und die Unterkante des Viewports.

- Funktioniert mit jedem Scroll-Container, weil der Scroll-Listener im Capture-Modus auf `document`
  hängt. Getestet mit einem inneren Scroll-Container wie bei `mat-sidenav`.
- Der Parent kennt seinen Header selber, das Child muss nichts über das Parent-Layout wissen.
- Im Parent ist es nur ein Attribut auf dem iframe:

```html
<iframe [src]="childUrl" hostIframeResizer hostViewportBridge [fixedHeader]="header"></iframe>
```

**Gemeinsamer Nachteil von A1 und A2:** Beim Scrollen verschiebt der Browser das iframe sofort, die
Korrektur im Child kommt aber erst ein bis zwei Frames später per Message. Bei schnellem Scrollen
zieht die Snackbar deshalb leicht nach. Sobald nicht mehr gescrollt wird, steht sie wieder richtig.

![Fix A2](docs/03-fix-a2.png)

_Modus «Fix A2»: Die Snackbar steht unter dem fixen Header des Parents und bleibt beim
Weiterscrollen dort._

### Fix B: Der Parent zeigt die Notification an

Das Child öffnet die Snackbar nicht selber, sondern schickt sie per `postMessage` an den Parent
([`notifications.ts`](projects/child/src/app/notifications.ts)). Der Parent öffnet sie mit seiner
eigenen `MatSnackBar`
([`notification-relay.directive.ts`](projects/parent/src/app/notification-relay.directive.ts)) und
meldet zurück, wenn sie geschlossen wurde und ob über die Aktion. So funktioniert auch
«Rückgängig» im Child.

- Echte Position im Parent-Viewport, nichts zieht beim Scrollen nach.
- Sieht aus wie die Notifications des Parents (gleiches Theme, nie zwei Snackbars gleichzeitig).
- Nur was sich serialisieren lässt: Text und eine Aktion. Eigene Snackbar-Komponenten
  (`openFromComponent`) gehen so nicht.
- Stärkere Kopplung: Der Parent muss das Protokoll kennen. Standalone braucht das Child einen
  Fallback auf die eigene Snackbar (im Demo umgesetzt).

![Fix B](docs/04-fix-b.png)

## Vergleich

|                                      | A1 getParentProps      | A2 Viewport-Bridge       | B Parent zeigt an        |
| ------------------------------------ | ---------------------- | ------------------------ | ------------------------ |
| Änderung im Parent                   | keine                  | Direktive auf dem iframe | Direktive auf dem iframe |
| Innerer Scroll-Container im Parent   | nein                   | ja                       | ja                       |
| Fixer Header im Parent               | Child muss Höhe kennen | ja                       | ja                       |
| Ruhig beim Scrollen                  | zieht leicht nach      | zieht leicht nach        | ja                       |
| Löst auch Dialoge im Child           | ja                     | ja                       | nein                     |
| Eigene Snackbar-Komponenten im Child | ja                     | ja                       | nein                     |

## Empfehlung

Wenn beide Apps angepasst werden können: **A2** als generelle Lösung. Die Änderung im Parent ist
klein und generisch (sie weiss nichts von Notifications), das Child behält seine Notifications
komplett selber, und Dialoge sind gleich mit gelöst.

**B** lohnt sich, wenn Notifications ohnehin einheitlich über den Parent laufen sollen oder das
Nachziehen beim Scrollen stört. **A1** ist die Option, wenn der Parent nicht angepasst werden kann
und dort das Window scrollt.

## Struktur

```
projects/
  shared/iframe-protocol.ts             postMessage-Protokoll (Message-Typen)
  shared/environment*.ts                URLs/Origins für Pages und lokal
  parent/src/app/
    app.html                            Host-Seite mit fixem Header und iframe
    iframe-resizer.directive.ts         Grundsetup: iframe-resizer, Parent-Teil
    viewport-bridge.directive.ts        Fix A2: meldet die Lage des iframes ans Child
    notification-relay.directive.ts     Fix B: zeigt Notifications des Childs an
  child/src/
    iframe-resizer-child.ts             Grundsetup: iframe-resizer, Child-Teil
    styles.scss                         Fix A: CSS für .cdk-global-overlay-wrapper
    app/parent-viewport.ts              Fix A1/A2: sichtbaren Bereich berechnen
    app/notifications.ts                Notification lokal oder via Parent (Fix B)
    app/notification-mode.ts            Modus-Umschaltung für die Demo
```

## Hinweise

- iframe-resizer 5 (`@iframe-resizer/parent` und `@iframe-resizer/child`) steht unter GPLv3 oder
  einer kommerziellen Lizenz. Das öffentliche Demo verwendet den Lizenz-Key `'GPLv3'` (daher der
  Lizenzhinweis in der Konsole), in einer Closed-Source-App gehört dort euer kommerzieller Key hin.
  `@iframe-resizer/angular` gibt es aktuell nur als Beta, darum bindet eine eigene kleine Direktive
  den Parent-Teil ein.
- Alle `postMessage`-Empfänger prüfen `event.origin` und `event.source`, gesendet wird immer an eine
  konkrete Ziel-Origin statt an `'*'`. Die Origins kommen im Demo aus den Environment-Dateien, in
  einer echten App aus der Konfiguration.
- Angular 22 und Angular Material 22. Die Komponenten nutzen Signals und damit den neuen
  Standard `OnPush`.
