import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-brand">Angular Bench</div>
      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/table" routerLinkActive="active">Table</a>
        <a routerLink="/form" routerLinkActive="active">Form</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
        <a routerLink="/settings" routerLinkActive="active">Settings</a>
        <a routerLink="/notifications" routerLinkActive="active">Notifications</a>
        <a routerLink="/search" routerLinkActive="active">Search</a>
        <a routerLink="/about" routerLinkActive="active">About</a>
        @if (authService.isAuthenticated()) {
          <a (click)="authService.logout()" style="cursor: pointer;">Logout</a>
        }
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  constructor(public authService: AuthService) {}
}
