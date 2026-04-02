import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ServiceCategory } from '../../interfaces/category.interface';
import { LaundryCommercialService } from '../../interfaces/service.interface';
import { WeightPricingProfile, WeightPricingProfilePayload } from '../../interfaces/weight-pricing.interface';
import { CategoryApiService } from '../../services/category-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { WeightPricingApiService } from '../../services/weight-pricing-api.service';

@Component({
  selector: 'app-weight-pricing-profiles-page',
  imports: [
    ReactiveFormsModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './weight-pricing-profiles.component.html',
  styleUrl: './weight-pricing-profiles.component.scss'
})
export class WeightPricingProfilesComponent implements OnInit {
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly weightPricingApi = inject(WeightPricingApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly profiles = signal<WeightPricingProfile[]>([]);
  readonly services = signal<LaundryCommercialService[]>([]);
  readonly categories = signal<ServiceCategory[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly strategyOptions = [{ label: 'MAX_REVENUE', value: 'MAX_REVENUE' }];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    serviceId: new FormControl<number | null>(null),
    categoryId: new FormControl<number | null>(null),
    strategy: new FormControl('MAX_REVENUE', { nonNullable: true, validators: [Validators.required] }),
    allowManualOverride: new FormControl(false, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadData();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      serviceId: null,
      categoryId: null,
      strategy: 'MAX_REVENUE',
      allowManualOverride: false,
      notes: '',
      isActive: true
    });
    this.drawerVisible.set(true);
  }

  openEdit(profile: WeightPricingProfile): void {
    this.editingId.set(profile.id);
    this.form.reset({
      name: profile.name,
      serviceId: profile.service_id ?? null,
      categoryId: profile.category_id ?? null,
      strategy: profile.strategy,
      allowManualOverride: profile.allow_manual_override,
      notes: profile.notes ?? '',
      isActive: profile.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: WeightPricingProfilePayload = {
      name: this.form.controls.name.value,
      service_id: this.form.controls.serviceId.value,
      category_id: this.form.controls.categoryId.value,
      strategy: this.form.controls.strategy.value,
      allow_manual_override: this.form.controls.allowManualOverride.value,
      notes: this.form.controls.notes.value || null,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.weightPricingApi.updateProfile(this.editingId()!, payload)
      : this.weightPricingApi.createProfile(payload);

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el perfil.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Perfil de pricing actualizado.' });
      this.loadData();
    });
  }

  serviceName(serviceId?: number | null): string {
    if (!serviceId) {
      return '-';
    }

    return this.services().find((item) => item.id === serviceId)?.name ?? String(serviceId);
  }

  categoryName(categoryId?: number | null): string {
    if (!categoryId) {
      return '-';
    }

    return this.categories().find((item) => item.id === categoryId)?.name ?? String(categoryId);
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      profiles: this.weightPricingApi.listProfiles({ page: 1, per_page: 300 }),
      services: this.servicesApi.list({ page: 1, per_page: 300 }),
      categories: this.categoriesApi.list({ page: 1, per_page: 200 })
    }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of(null))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.profiles.set(result.profiles.items);
      this.services.set(result.services.items);
      this.categories.set(result.categories.items);
    });
  }
}
