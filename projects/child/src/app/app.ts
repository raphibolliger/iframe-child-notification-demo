import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { isEmbedded } from './embedding';
import { NOTIFICATION_MODES, NotificationModeStore } from './notification-mode';
import { Notifications } from './notifications';
import { ParentViewport } from './parent-viewport';

interface Order {
  id: number;
  customer: string;
  status: string;
}

const CUSTOMERS = [
  'Muster AG',
  'Berger & Söhne',
  'Alpenblick GmbH',
  'Huber Logistik',
  'Seeland Bau',
];
const STATUSES = ['offen', 'in Bearbeitung', 'bereit zum Versand'];

@Component({
  selector: 'child-root',
  imports: [MatButtonModule, MatCardModule, MatRadioModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly notifications = inject(Notifications);

  protected readonly isEmbedded = isEmbedded;
  protected readonly modes = NOTIFICATION_MODES;
  protected readonly mode = inject(NotificationModeStore).mode;
  protected readonly visibleArea = inject(ParentViewport).visibleArea;
  protected readonly orders: Order[] = Array.from({ length: 40 }, (_, i) => ({
    id: 1001 + i,
    customer: CUSTOMERS[i % CUSTOMERS.length],
    status: STATUSES[i % STATUSES.length],
  }));

  protected save(order: Order): void {
    this.notifications
      .show(`Auftrag #${order.id} gespeichert`, 'Rückgängig')
      .subscribe(() =>
        this.notifications.show(`Speichern von Auftrag #${order.id} rückgängig gemacht`),
      );
  }
}
