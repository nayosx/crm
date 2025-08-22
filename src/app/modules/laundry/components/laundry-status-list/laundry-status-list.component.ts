import { Component, ViewEncapsulation, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LaundryServiceCompact, LaundryServiceStatus } from '@shared/interfaces/laundry-service.interface';
import { DataView } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from "primeng/button";

@Component({
  selector: 'app-laundry-status-list',
  imports: [CommonModule, DataView, TagModule, ButtonModule],
  templateUrl: './laundry-status-list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryStatusListComponent {
  @Input() status!: LaundryServiceStatus;
  @Output() select = new EventEmitter<LaundryServiceCompact>();

  items = signal<LaundryServiceCompact[]>([]);
  total = signal(0);
  loading = signal(false);

  page = signal(1);
  perPage = signal(5);
  rows = signal(1);

  constructor(private laundryService: LaundryService) {}

  fetch(): void {
    this.loading.set(true);
    this.laundryService.getCompact({
      page: this.page(),
      per_page: this.perPage(),
      status: this.status
    }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);

        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
      }
    });
  }

onPageChange(event: any): void {
  this.page.set(event.page + 1);
  this.perPage.set(event.rows);
  this.fetch();
}

onLazyLoad(event: any): void {
    const currentPage = Math.floor(event.first / event.rows) + 1;

    if (isNaN(currentPage) || isNaN(event.rows)) {
      console.error("onLazyLoad recibió NaN:", event);
      return;
    }

    this.page.set(currentPage);
    this.perPage.set(event.rows);
    this.fetch();
  }


  onSelect(item: LaundryServiceCompact): void {
    this.select.emit(item);
  }


  trackById(index: number, item: LaundryServiceCompact) {
  return item.id;
}


  
}