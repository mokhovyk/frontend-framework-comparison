import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import type { RouterBenchmarkHooks } from 'shared-data';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

declare global {
  interface Window {
    __benchmark?: RouterBenchmarkHooks;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private loadTime = performance.now();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.loadTime = performance.now();
      });

    this.exposeBenchmarkHooks();
  }

  private exposeBenchmarkHooks(): void {
    const self = this;
    window.__benchmark = {
      async navigateTo(path: string) {
        const start = performance.now();
        await self.router.navigateByUrl(path);
        // Wait for rendering
        return new Promise<number>((resolve) => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              resolve(performance.now() - start);
            }, 0);
          });
        });
      },
      getLoadTime() {
        return self.loadTime;
      },
    };
  }
}
