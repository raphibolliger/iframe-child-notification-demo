import { Component, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatToolbarModule } from '@angular/material/toolbar';
import { environment } from '@shared/environment';
import { IframeResizerDirective } from './iframe-resizer.directive';
import { NotificationRelayDirective } from './notification-relay.directive';
import { ViewportBridgeDirective } from './viewport-bridge.directive';

@Component({
  selector: 'host-root',
  imports: [
    MatToolbarModule,
    IframeResizerDirective,
    ViewportBridgeDirective,
    NotificationRelayDirective,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly childUrl = new URL(environment.childUrl, document.baseURI).href;
  // Keeps the ?mode=... query param, so a mode can be preselected via the parent URL.
  protected readonly iframeSrc = inject(DomSanitizer).bypassSecurityTrustResourceUrl(
    this.childUrl + location.search,
  );
  protected readonly iframeHeight = signal<number | undefined>(undefined);
}
