import { Component, computed, effect, input, model, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination<T> {
  readonly items = input<T[]>([]);
  readonly itemsPerPage = input(9);
  readonly currentPage = model(1);
  readonly pagedItems = output<T[]>();

  readonly totalPages = computed(() => {
    const pageSize = Math.max(1, this.itemsPerPage());
    return Math.max(1, Math.ceil(this.items().length / pageSize));
  });

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  readonly activePage = computed(() =>
    Math.min(Math.max(1, this.currentPage()), this.totalPages()),
  );

  readonly currentPageItems = computed(() => {
    const pageSize = Math.max(1, this.itemsPerPage());
    const start = (this.activePage() - 1) * pageSize;
    return this.items().slice(start, start + pageSize);
  });

  constructor() {
    effect(() => {
      this.pagedItems.emit(this.currentPageItems());
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.activePage()) {
      this.currentPage.set(page);
    }
  }

  previousPage(): void {
    this.goToPage(this.activePage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.activePage() + 1);
  }
}