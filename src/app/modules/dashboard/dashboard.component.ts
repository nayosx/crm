import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import {
  TransactionFortnightSummaryItem,
  TransactionFortnightSummaryRange,
  TransactionFortnightSummaryResponse,
} from '@shared/interfaces/transaction.interface';
import { DialogLoadingService } from '@shared/services/dialog-loading.service';
import { TransactionService } from '@shared/services/transaction/transaction.service';
import { finalize } from 'rxjs/operators';

interface DashboardMetric {
  label: string;
  amount: number;
  severity: 'positive' | 'negative' | 'neutral';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    BaseChartDirective,
    ButtonModule,
    CardModule,
    DatePickerModule,
    MessageModule,
    ToastModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: [MessageService],
})
export class DashboardComponent {
  private readonly transactionService = inject(TransactionService);
  private readonly dialogLoadingService = inject(DialogLoadingService);
  private readonly messageService = inject(MessageService);

  startDate: Date | null = null;
  endDate: Date | null = null;
  isLoading = false;
  loadError = '';
  summaryItems: TransactionFortnightSummaryItem[] = [];
  appliedRange: TransactionFortnightSummaryRange | null = null;

  private readonly currencyFormatter = new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  readonly chartType: 'bar' = 'bar';
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Entradas',
        data: [],
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 28,
      },
      {
        label: 'Salidas',
        data: [],
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 28,
      },
    ],
  };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        callbacks: {
          label: (context) => `${context.dataset.label}: ${this.currencyFormatter.format(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.currencyFormatter.format(Number(value)),
        },
      },
    },
  };

  constructor() {
    this.applyChartTheme();
    this.loadSummary();
  }

  get metrics(): DashboardMetric[] {
    const totalIn = this.totalIn;
    const totalOut = this.totalOut;
    const balance = totalIn - totalOut;

    return [
      { label: 'Entradas', amount: totalIn, severity: 'positive' },
      { label: 'Salidas', amount: totalOut, severity: 'negative' },
      {
        label: 'Balance',
        amount: balance,
        severity: balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral',
      },
      {
        label: 'Quincenas analizadas',
        amount: this.summaryItems.length,
        severity: 'neutral',
      },
    ];
  }

  get totalIn(): number {
    return this.summaryItems.reduce((total, item) => total + this.parseAmount(item.in_total), 0);
  }

  get totalOut(): number {
    return this.summaryItems.reduce((total, item) => total + this.parseAmount(item.out_total), 0);
  }

  onApplyFilters(): void {
    if ((this.startDate && !this.endDate) || (!this.startDate && this.endDate)) {
      this.showValidationError('Debes seleccionar fecha inicio y fecha fin para aplicar el filtro.');
      return;
    }

    this.loadSummary();
  }

  onResetFilters(): void {
    this.startDate = null;
    this.endDate = null;
    this.loadError = '';
    this.loadSummary();
  }

  getBalance(item: TransactionFortnightSummaryItem): number {
    return this.parseAmount(item.in_total) - this.parseAmount(item.out_total);
  }

  getMetricClass(metric: DashboardMetric): string {
    switch (metric.severity) {
      case 'positive':
        return 'dashboard-metric dashboard-metric--positive';
      case 'negative':
        return 'dashboard-metric dashboard-metric--negative';
      default:
        return 'dashboard-metric dashboard-metric--neutral';
    }
  }

  private loadSummary(): void {
    this.isLoading = true;
    this.loadError = '';
    this.dialogLoadingService.show('Cargando dashboard financiero...');

    this.transactionService
      .getFortnightSummary(this.buildParams())
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.dialogLoadingService.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          this.applyResponse(response);
        },
        error: (error) => {
          const detail = this.extractErrorMessage(error);
          this.loadError = detail;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail,
          });
        },
      });
  }

  private applyResponse(response: TransactionFortnightSummaryResponse): void {
    this.appliedRange = response.range;
    this.summaryItems = response.items ?? [];
    this.chartData = {
      ...this.chartData,
      labels: this.summaryItems.map((item) => item.label),
      datasets: [
        {
          ...this.chartData.datasets[0],
          data: this.summaryItems.map((item) => this.parseAmount(item.in_total)),
        },
        {
          ...this.chartData.datasets[1],
          data: this.summaryItems.map((item) => this.parseAmount(item.out_total)),
        },
      ],
    };
  }

  private buildParams(): { start_date?: string; end_date?: string } | undefined {
    if (!this.startDate || !this.endDate) {
      return undefined;
    }

    return {
      start_date: this.formatDate(this.startDate),
      end_date: this.formatDate(this.endDate),
    };
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  private parseAmount(amount: string): number {
    const parsedAmount = Number.parseFloat(amount);
    return Number.isFinite(parsedAmount) ? parsedAmount : 0;
  }

  private applyChartTheme(): void {
    const computedStyles = getComputedStyle(document.documentElement);
    const textColor = this.readCssVar(computedStyles, '--p-text-color', '#e5e7eb');
    const mutedTextColor = this.readCssVar(computedStyles, '--p-text-muted-color', '#94a3b8');
    const borderColor = this.readCssVar(computedStyles, '--p-surface-700', '#334155');
    const panelColor = this.readCssVar(computedStyles, '--p-surface-900', '#0f172a');

    this.chartOptions = {
      ...this.chartOptions,
      plugins: {
        ...this.chartOptions.plugins,
        legend: {
          ...this.chartOptions.plugins?.legend,
          labels: {
            color: textColor,
          },
        },
        tooltip: {
          ...this.chartOptions.plugins?.tooltip,
          backgroundColor: panelColor,
          borderColor,
        },
      },
      scales: {
        x: {
          ...(this.chartOptions.scales?.['x'] ?? {}),
          ticks: {
            color: mutedTextColor,
          },
          grid: {
            color: borderColor,
            display: false,
          },
        },
        y: {
          ...(this.chartOptions.scales?.['y'] ?? {}),
          beginAtZero: true,
          ticks: {
            color: mutedTextColor,
            callback: (value) => this.currencyFormatter.format(Number(value)),
          },
          grid: {
            color: borderColor,
          },
        },
      },
    };
  }

  private readCssVar(computedStyles: CSSStyleDeclaration, name: string, fallback: string): string {
    const value = computedStyles.getPropertyValue(name).trim();
    return value || fallback;
  }

  private showValidationError(detail: string): void {
    this.loadError = detail;
    this.messageService.add({
      severity: 'warn',
      summary: 'Filtro incompleto',
      detail,
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: unknown }).error === 'object' &&
      (error as { error?: { error?: unknown } }).error &&
      typeof (error as { error?: { error?: unknown } }).error?.error === 'string'
    ) {
      return (error as { error: { error: string } }).error.error;
    }

    return 'No se pudo cargar el resumen de transacciones.';
  }
}
