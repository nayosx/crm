import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { WeightPricingProfile, WeightPricingTier, WeightPricingTierPayload } from '../../interfaces/weight-pricing.interface';
import { WeightPricingApiService } from '../../services/weight-pricing-api.service';

@Component({
  selector: 'app-weight-pricing-tiers-page',
  imports: [
    ReactiveFormsModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    CurrencyPipe
  ],
  providers: [MessageService],
  templateUrl: './weight-pricing-tiers.component.html',
  styleUrl: './weight-pricing-tiers.component.scss'
})
export class WeightPricingTiersComponent implements OnInit {
  private readonly weightPricingApi = inject(WeightPricingApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly profiles = signal<WeightPricingProfile[]>([]);
  readonly tiers = signal<WeightPricingTier[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = new FormGroup({
    profileId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    label: new FormControl('', { nonNullable: true }),
    minWeightLb: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    maxWeightLb: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    rank: new FormControl(1, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadData();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      profileId: null,
      label: '',
      minWeightLb: 0,
      maxWeightLb: 0,
      price: 0,
      rank: 1,
      isActive: true
    });
    this.drawerVisible.set(true);
  }

  openEdit(tier: WeightPricingTier): void {
    this.editingId.set(tier.id);
    this.form.reset({
      profileId: tier.profile_id,
      label: tier.label ?? '',
      minWeightLb: Number(tier.min_weight_lb),
      maxWeightLb: Number(tier.max_weight_lb),
      price: Number(tier.price),
      rank: tier.rank ?? 1,
      isActive: tier.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: WeightPricingTierPayload = {
      profile_id: this.form.controls.profileId.value!,
      label: this.form.controls.label.value || null,
      min_weight_lb: this.form.controls.minWeightLb.value,
      max_weight_lb: this.form.controls.maxWeightLb.value,
      price: this.form.controls.price.value,
      rank: this.form.controls.rank.value,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.weightPricingApi.updateTier(this.editingId()!, payload)
      : this.weightPricingApi.createTier(payload);

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el tier.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Tier de pricing actualizado.' });
      this.loadData();
    });
  }

  profileName(profileId: number): string {
    return this.profiles().find((item) => item.id === profileId)?.name ?? String(profileId);
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      profiles: this.weightPricingApi.listProfiles({ page: 1, per_page: 300 }),
      tiers: this.weightPricingApi.listTiers({ page: 1, per_page: 500 })
    }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of(null))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.profiles.set(result.profiles.items);
      this.tiers.set(result.tiers.items);
    });
  }
}
