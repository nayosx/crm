import { Component, ViewEncapsulation, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LaundryServiceCompact, LaundryServiceStatus } from '@shared/interfaces/laundry-service.interface';
import { DataView } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from "primeng/button";
import { SelectModule } from 'primeng/select';

type PerPageOption = {
  label: string;
  value: number;
};

@Component({
  selector: 'app-laundry-status-list',
  imports: [CommonModule, FormsModule, DataView, TagModule, ButtonModule, SelectModule],
  templateUrl: './laundry-status-list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryStatusListComponent implements OnInit, OnChanges {
  @Input() status!: LaundryServiceStatus;
  @Output() select = new EventEmitter<LaundryServiceCompact>();

  items = signal<LaundryServiceCompact[]>([]);
  total = signal(0);
  loading = signal(false);

  page = signal(1);
  perPage = signal(10);
  rows = signal(1);
  perPageOptions: PerPageOption[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: 'Todos', value: -1 }
  ];

  constructor(private laundryService: LaundryService) {}

  ngOnInit(): void {
    this.fetch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['status'] || changes['status'].firstChange) {
      return;
    }

    this.page.set(1);
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    const perPage = this.resolvePerPage();

    this.laundryService.getCompact({
      page: this.page(),
      per_page: perPage,
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

  refresh(): void {
    this.page.set(1);
    this.fetch();
  }

  onPerPageChange(value: number): void {
    this.perPage.set(value);
    this.page.set(1);
    this.fetch();
  }

  onLazyLoad(event: any): void {
    const rows = event.rows ?? this.perPage();
    const first = event.first ?? 0;
    const currentPage = Math.floor(first / rows) + 1;

    if (isNaN(currentPage) || isNaN(rows)) {
      console.error("onLazyLoad recibió NaN:", event);
      return;
    }

    this.page.set(currentPage);
    this.perPage.set(rows);
    this.fetch();
  }


  onSelect(item: LaundryServiceCompact): void {
    this.select.emit(item);
  }


  trackById(index: number, item: LaundryServiceCompact) {
  return item.id;
}

  private resolvePerPage(): number {
    if (this.perPage() !== -1) {
      return this.perPage();
    }

    return this.total() > 0 ? this.total() : 1000;
  }

  
}
