import { Component, signal, OnInit } from '@angular/core';
import { LoadingSkeletonComponent } from '../components/loading-skeleton/loading-skeleton.component';
import { createMockApi } from 'shared-data';

interface Notification {
  id: number;
  message: string;
  read: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [LoadingSkeletonComponent],
  template: `
    <div class="page-header">
      <h1>Notifications</h1>
      <p>{{ notifications().length }} notifications ({{ unreadCount() }} unread)</p>
    </div>

    @if (loading()) {
      <app-loading-skeleton></app-loading-skeleton>
    } @else {
      <div class="notification-list">
        @for (n of notifications(); track n.id) {
          <div
            class="notification-item"
            [class.unread]="!n.read"
            (click)="markRead(n)"
          >
            {{ n.message }}
          </div>
        }
      </div>
    }
  `,
})
export class NotificationsComponent implements OnInit {
  readonly loading = signal(true);
  readonly notifications = signal<Notification[]>([]);

  get unreadCount(): () => number {
    return () => this.notifications().filter((n) => !n.read).length;
  }

  ngOnInit(): void {
    const api = createMockApi(50);
    api.fetchNotifications(500).then((res) => {
      this.notifications.set(res.data);
      this.loading.set(false);
    });
  }

  markRead(notification: Notification): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
  }
}
