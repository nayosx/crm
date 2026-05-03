import {
  LaundryServiceSummaryExtra,
  LaundryServiceSummaryItem,
  LaundryServiceSummaryResponse,
  LaundryServiceSummaryWeightDetail
} from '@shared/interfaces/laundry-service.interface';
import { LaundryServiceLabelMap, LaundryStatusLabelMap } from '@shared/i18n/laundry-ui-texts';

export type LaundryTransactionPrefill = {
  detail: string;
  amount: string;
};

export function buildLaundryWhatsAppSummary(summary: LaundryServiceSummaryResponse): string {
  const lines: string[] = [
    `*Resumen servicio #${summary.laundry_service.id}*`,
    `*Cliente:* ${summary.client.name}`,
    `*Programado:* ${formatLaundryDate(summary.laundry_service.scheduled_pickup_at)}`,
    `*Estado:* ${LaundryStatusLabelMap[summary.laundry_service.status]}`,
    `*Tipo:* ${LaundryServiceLabelMap[summary.laundry_service.service_label]}`,
    ''
  ];

  const automaticLines = summary.automatic_items.map((item) =>
    `- ${item.service_name}: ${formatLaundryMoney(itemSubtotal(item))} (${formatLaundryQuantity(item.quantity)} x ${formatLaundryMoney(item.applied_price)})`
  );

  if (automaticLines.length) {
    lines.push('*Servicios automáticos:*');
    lines.push(...automaticLines);
    lines.push('');
  }

  if (showWeightServiceSummary(summary)) {
    const weight = summary.weight_service_detail;
    lines.push('*Lavado por peso:*');
    lines.push(`- Subtotal: ${formatLaundryMoney(summary.summary.weight_service_subtotal)}`);

    if (weight) {
      lines.push(`- Peso: ${formatLaundryQuantity(weight.weight_lb)} lb`);
    }

    lines.push('');
  }

  const manualLines = summary.manual_items
    .filter((item) => hasVisibleItemValues(item))
    .map((item) =>
      [
        `- ${manualSummaryLabel(summary.manual_items, item)}: ${formatLaundryMoney(itemSubtotal(item))}`,
        `(${formatLaundryQuantity(item.quantity)} x ${formatLaundryMoney(manualUnitCatalogPrice(item))})`,
        hasCommercialDiscount(item) ? `base ${formatLaundryMoney(item.catalog_price)}` : '',
        hasCommercialDiscount(item) ? `ahorro ${formatLaundryMoney(item.discount_amount)}` : '',
        item.discount_rule?.name ? `regla ${item.discount_rule.name}` : ''
      ].filter(Boolean).join(' ')
    );

  if (manualLines.length) {
    lines.push('*Servicios manuales:*');
    lines.push(...manualLines);
    lines.push('');
  }

  const extraLines = summary.extras
    .filter((extra) => hasVisibleExtraValues(extra))
    .map((extra) =>
      `- ${extra.extra_name}: ${formatLaundryMoney(toNumericValue(extra.subtotal))} (${formatLaundryQuantity(extra.quantity)} x ${formatLaundryMoney(extra.unit_price)})`
    );

  if (extraLines.length) {
    lines.push('*Extras:*');
    lines.push(...extraLines);
    lines.push('');
  }

  lines.push(`*Total general:* ${formatLaundryMoney(summary.summary.grand_total)}`);
  return lines.join('\n').trim();
}

export function buildLaundryTransactionPrefill(summary: LaundryServiceSummaryResponse): LaundryTransactionPrefill {
  return {
    detail: buildLaundryTransactionDetailHtml(summary),
    amount: toNumericValue(summary.summary.grand_total).toFixed(2)
  };
}

export function buildLaundryTransactionDetailHtml(summary: LaundryServiceSummaryResponse): string {
  const sections: string[] = [];

  sections.push(`
    <p><strong>Resumen servicio #${escapeHtml(String(summary.laundry_service.id))}</strong></p>
    <p><strong>Cliente:</strong> ${escapeHtml(summary.client.name)}</p>
    <p><strong>Programado:</strong> ${escapeHtml(formatLaundryDate(summary.laundry_service.scheduled_pickup_at))}</p>
    <p><strong>Estado:</strong> ${escapeHtml(LaundryStatusLabelMap[summary.laundry_service.status])}</p>
    <p><strong>Tipo:</strong> ${escapeHtml(LaundryServiceLabelMap[summary.laundry_service.service_label])}</p>
  `);

  const automaticLines = summary.automatic_items.map((item) =>
    `${item.service_name}: ${formatLaundryMoney(itemSubtotal(item))} (${formatLaundryQuantity(item.quantity)} x ${formatLaundryMoney(item.applied_price)})`
  );

  if (automaticLines.length) {
    sections.push(buildHtmlListSection('Servicios automáticos', automaticLines));
  }

  if (showWeightServiceSummary(summary)) {
    const weightLines = [`Subtotal: ${formatLaundryMoney(summary.summary.weight_service_subtotal)}`];
    const weight = summary.weight_service_detail;

    if (weight) {
      weightLines.push(`Peso: ${formatLaundryQuantity(weight.weight_lb)} lb`);
    }

    sections.push(buildHtmlListSection('Lavado por peso', weightLines));
  }

  const manualLines = summary.manual_items
    .filter((item) => hasVisibleItemValues(item))
    .map((item) =>
      [
        `${manualSummaryLabel(summary.manual_items, item)}: ${formatLaundryMoney(itemSubtotal(item))}`,
        `(${formatLaundryQuantity(item.quantity)} x ${formatLaundryMoney(manualUnitCatalogPrice(item))})`,
        hasCommercialDiscount(item) ? `base ${formatLaundryMoney(item.catalog_price)}` : '',
        hasCommercialDiscount(item) ? `ahorro ${formatLaundryMoney(item.discount_amount)}` : '',
        item.discount_rule?.name ? `regla ${item.discount_rule.name}` : ''
      ].filter(Boolean).join(' ')
    );

  if (manualLines.length) {
    sections.push(buildHtmlListSection('Servicios manuales', manualLines));
  }

  const extraLines = summary.extras
    .filter((extra) => hasVisibleExtraValues(extra))
    .map((extra) =>
      `${extra.extra_name}: ${formatLaundryMoney(toNumericValue(extra.subtotal))} (${formatLaundryQuantity(extra.quantity)} x ${formatLaundryMoney(extra.unit_price)})`
    );

  if (extraLines.length) {
    sections.push(buildHtmlListSection('Extras', extraLines));
  }

  sections.push(`<p><strong>Total general:</strong> ${escapeHtml(formatLaundryMoney(summary.summary.grand_total))}</p>`);

  return sections.join('');
}

function manualSummaryLabel(items: LaundryServiceSummaryItem[], item: LaundryServiceSummaryItem): string {
  const variants = new Set(
    items
      .filter((manualItem) => hasVisibleItemValues(manualItem))
      .filter((manualItem) => manualItem.service_id === item.service_id)
      .map((manualItem) => manualItem.service_variant_name)
      .filter((variantName): variantName is string => Boolean(variantName))
  );

  return variants.size > 1 && item.service_variant_name
    ? `${item.service_name} - ${item.service_variant_name}`
    : item.service_name;
}

function showWeightServiceSummary(summary: LaundryServiceSummaryResponse): boolean {
  const subtotal = toNumericValue(summary.summary.weight_service_subtotal);
  const weight = toNumericValue(summary.weight_service_detail?.weight_lb);
  return subtotal > 0 || weight > 0;
}

function itemSubtotal(item: LaundryServiceSummaryItem | LaundryServiceSummaryWeightDetail): number {
  if (usesCommercialSubtotal(item as LaundryServiceSummaryItem)) {
    return toNumericValue((item as LaundryServiceSummaryItem).applied_price);
  }

  return toNumericValue(item.quantity) * toNumericValue((item as LaundryServiceSummaryItem).applied_price);
}

function usesCommercialSubtotal(item: LaundryServiceSummaryItem): boolean {
  return item.unit_catalog_price != null || item.discount_amount != null || item.discount_rule != null;
}

function manualUnitCatalogPrice(item: LaundryServiceSummaryItem): string | number {
  return item.unit_catalog_price ?? item.applied_price;
}

function hasCommercialDiscount(item: LaundryServiceSummaryItem): boolean {
  return toNumericValue(item.discount_amount) > 0;
}

function hasVisibleItemValues(item: LaundryServiceSummaryItem): boolean {
  return toNumericValue(item.quantity) > 0 || toNumericValue(item.applied_price) > 0;
}

function hasVisibleExtraValues(extra: LaundryServiceSummaryExtra): boolean {
  return toNumericValue(extra.quantity) > 0 || toNumericValue(extra.unit_price) > 0 || toNumericValue(extra.subtotal) > 0;
}

function toNumericValue(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLaundryMoney(value: string | number | null | undefined): string {
  return `$${toNumericValue(value).toFixed(2)}`;
}

function formatLaundryQuantity(value: string | number | null | undefined): string {
  const numericValue = toNumericValue(value);
  return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(2);
}

function formatLaundryDate(value: string | null | undefined): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function buildHtmlListSection(title: string, lines: string[]): string {
  const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<p><strong>${escapeHtml(title)}:</strong></p><ul>${items}</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
