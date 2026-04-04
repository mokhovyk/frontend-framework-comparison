import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  goToFirst(): void {
    this.pageChange.emit(1);
  }

  goToPrev(): void {
    this.pageChange.emit(this.currentPage() - 1);
  }

  goToNext(): void {
    this.pageChange.emit(this.currentPage() + 1);
  }

  goToLast(): void {
    this.pageChange.emit(this.totalPages());
  }

  onPageInput(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value)) {
      this.pageChange.emit(value);
    }
  }
}
