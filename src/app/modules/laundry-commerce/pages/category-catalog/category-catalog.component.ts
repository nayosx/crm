import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ServiceCategory, ServiceCategoryPayload } from '../../interfaces/category.interface';
import { CategoryApiService } from '../../services/category-api.service';

@Component({
  selector: 'app-category-catalog-page',
  imports: [
    ReactiveFormsModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './category-catalog.component.html',
  styleUrl: './category-catalog.component.scss'
})
export class CategoryCatalogComponent implements OnInit {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly categories = signal<ServiceCategory[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly statusOptions = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false }
  ];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true, validators: [Validators.required] })
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', code: '', description: '', isActive: true });
    this.drawerVisible.set(true);
  }

  openEdit(category: ServiceCategory): void {
    this.editingId.set(category.id);
    this.form.reset({
      name: category.name,
      code: category.code ?? '',
      description: category.description ?? '',
      isActive: category.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: ServiceCategoryPayload = {
      name: this.form.controls.name.value,
      code: this.form.controls.code.value || null,
      description: this.form.controls.description.value || null,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.categoryApi.update(this.editingId()!, payload)
      : this.categoryApi.create(payload);

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la categoría.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Categoría actualizada correctamente.' });
      this.loadCategories();
    });
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.categoryApi.list({ page: 1, per_page: 200 }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of({ items: [], total: 0, pages: 0, current_page: 1, per_page: 200 }))
    ).subscribe((response) => this.categories.set(response.items));
  }
}
