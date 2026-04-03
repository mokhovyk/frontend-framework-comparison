import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    <div>
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton skeleton-line" style="width: 80%;"></div>
      <div class="skeleton skeleton-line" style="width: 60%;"></div>
      <div class="skeleton skeleton-line" style="width: 90%;"></div>
      <div class="skeleton skeleton-line" style="width: 50%;"></div>
    </div>
  `,
})
export class LoadingSkeletonComponent {}
