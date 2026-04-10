import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import {
  LaundryDeliveryQuote,
  LaundryServiceCommercialDetailPayload,
  LaundryServiceCreatePayload,
  LaundryServiceHeaderPayload,
  LaundryServiceResp,
  LaundryServicePagination,
  LaundryServiceStatus,
  LaundryServiceSummaryResponse,
  LaundryServiceUpdatePayload,
  LaundryServiceWithMessages,
  LaundryServiceLitePagination,
  LaundryServiceDetailPagination,
  LaundryServiceCompactPagination
} from '@shared/interfaces/laundry-service.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class LaundryService {
  private legacyBaseUrl = `${environment.API}/laundry_services`;
  private v2BaseUrl = `${environment.API}/v2/laundry_services`;

  constructor(private http: HttpClient) { }

  getAll(params?: {
    page?: number;
    per_page?: number;
    client_id?: number;
    status?: LaundryServiceStatus;
  }): Observable<LaundryServicePagination> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<LaundryServicePagination>(this.v2BaseUrl, { params: httpParams });
  }

  getLite(params: {
    page?: number;
    per_page?: number;
    status: LaundryServiceStatus;
    client_id?: number;
  }): Observable<LaundryServiceLitePagination> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.getAll({
      page: params.page,
      per_page: params.per_page,
      client_id: params.client_id,
      status: params.status
    }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((item) => ({
          id: item.id,
          scheduled_pickup_at: item.scheduled_pickup_at,
          status: item.status,
          service_label: item.service_label,
          client: item.client ?? {
            id: item.client_id ?? 0,
            name: 'Cliente no definido'
          },
          created_by_user: {
            name: item.created_by_user?.name ?? item.created_by?.name ?? 'Sistema'
          }
        }))
      }))
    );
  }

  getDetail(params: {
    page?: number;
    per_page?: number;
    status: LaundryServiceStatus;
    client_id?: number;
  }): Observable<LaundryServiceDetailPagination> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.getAll({
      page: params.page,
      per_page: params.per_page,
      client_id: params.client_id,
      status: params.status
    }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((item) => ({
          id: item.id,
          scheduled_pickup_at: item.scheduled_pickup_at,
          status: item.status,
          service_label: item.service_label,
          client: {
            id: item.client?.id ?? item.client_id ?? 0,
            name: item.client?.name ?? 'Cliente no definido',
            email: item.client?.email,
            document_id: item.client?.document_id,
            is_deleted: item.client?.is_deleted,
            phones: item.client?.phones ?? []
          },
          client_address: item.client_address ?? {
            id: item.client_address_id ?? 0,
            client_id: item.client_id ?? 0,
            address_text: 'Sin dirección registrada',
            is_primary: false
          },
          transaction: item.transaction ? ({ ...item.transaction } as any) : null,
          weight_lb: item.weight_lb ?? null,
          notes: item.notes ?? null,
          items: item.items ?? [],
          extras: item.extras ?? [],
          items_total: item.items_total ?? null,
          extras_total: item.extras_total ?? null,
          grand_total: item.grand_total ?? null,
          created_by_user: {
            name: item.created_by_user?.name ?? item.created_by?.name ?? 'Sistema'
          }
        }))
      }))
    );
  }


  getCompact(params: {
    page?: number;
    per_page?: number;
    status?: LaundryServiceStatus;
    client_id?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
  }): Observable<LaundryServiceCompactPagination> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.getAll({
      page: params.page,
      per_page: params.per_page,
      client_id: params.client_id,
      status: params.status
    }).pipe(
      map((response) => ({
        ...response,
        items: response.items
          .map((item) => ({
            id: item.id,
            pending_order: item.pending_order ?? undefined,
            service_label: item.service_label,
            status: item.status,
            created_at: item.created_at,
            created_by_user: {
              name: item.created_by_user?.name ?? item.created_by?.name ?? 'Sistema'
            },
            created_by_user_id: item.created_by_user?.id ?? item.created_by?.id ?? 0,
            client: item.client ?? {
              id: item.client_id ?? 0,
              name: 'Cliente no definido'
            },
            client_id: item.client_id ?? item.client?.id ?? 0,
            client_address_id: item.client_address_id ?? item.client_address?.id ?? 0,
            client_address: item.client_address ?? null,
            has_transaction: Boolean(item.transaction_id ?? item.transaction)
          }))
          .sort((a, b) => {
            if (params.sort_by === 'pending_order') {
              const ao = a.pending_order ?? Number.MAX_SAFE_INTEGER;
              const bo = b.pending_order ?? Number.MAX_SAFE_INTEGER;
              if (ao !== bo) {
                return params.sort_dir === 'desc' ? bo - ao : ao - bo;
              }
            }

            return a.id - b.id;
          })
      }))
    );
  }

  getById(id: number): Observable<LaundryServiceResp> {
    return forkJoin({
      service: this.http.get<LaundryServiceResp>(`${this.v2BaseUrl}/${id}`),
      summary: this.getSummary(id).pipe(catchError(() => of(null)))
    }).pipe(
      map(({ service, summary }) => {
        if (!summary) {
          return service;
        }

        const weightDetail = summary.weight_service_detail;
        const mergedClient = service.client
          ? {
              ...service.client,
              phones: summary.client_phones ?? service.client.phones ?? []
            }
          : {
              id: summary.client.id,
              name: summary.client.name,
              phones: summary.client_phones ?? []
            };

        return {
          ...service,
          scheduled_pickup_at: summary.laundry_service.scheduled_pickup_at ?? service.scheduled_pickup_at,
          status: summary.laundry_service.status ?? service.status,
          service_label: summary.laundry_service.service_label ?? service.service_label,
          fulfillment_type: summary.laundry_service.fulfillment_type ?? service.fulfillment_type,
          transaction_id: summary.laundry_service.transaction_id ?? service.transaction_id,
          notes: summary.laundry_service.notes ?? service.notes ?? null,
          client: mergedClient as LaundryServiceResp['client'],
          client_address: summary.client_address ?? service.client_address ?? undefined,
          weight_lb: weightDetail ? Number(weightDetail.weight_lb) : service.weight_lb ?? null,
          items: weightDetail?.garments?.map((item) => ({
            garment_type_id: item.garment_type_id,
            quantity: Number(item.quantity),
            unit_type: 'UNIT',
            unit_price: null,
            notes: null,
            garment_type: item.garment_type_name
              ? {
                  id: item.garment_type_id,
                  name: item.garment_type_name
                }
              : undefined
          })) ?? service.items ?? [],
          extras: summary.extras.map((extra) => ({
            service_extra_type_id: extra.extra_id,
            quantity: extra.quantity,
            unit_price: Number(extra.unit_price),
            notes: null,
            service_extra_type: {
              id: extra.extra_id,
              code: '',
              name: extra.extra_name
            }
          })),
          items_total: Number(summary.summary.weight_service_subtotal ?? service.items_total ?? 0),
          extras_total: Number(summary.summary.extras_subtotal ?? service.extras_total ?? 0),
          grand_total: Number(summary.summary.grand_total ?? service.grand_total ?? 0)
        };
      })
    );
  }

  getSummary(id: number): Observable<LaundryServiceSummaryResponse> {
    return this.http.get<LaundryServiceSummaryResponse>(`${this.v2BaseUrl}/${id}/summary`);
  }

  create(data: LaundryServiceCreatePayload): Observable<LaundryServiceResp> {
    return this.http.post<LaundryServiceResp>(this.v2BaseUrl, data);
  }

  update(id: number, data: LaundryServiceUpdatePayload): Observable<LaundryServiceResp> {
    return this.http.put<LaundryServiceResp>(`${this.v2BaseUrl}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.v2BaseUrl}/${id}`);
  }

  updateStatus(id: number, status: LaundryServiceStatus): Observable<LaundryServiceResp> {
    return this.update(id, { status });
  }

  updateHeader(id: number, payload: LaundryServiceHeaderPayload): Observable<LaundryServiceSummaryResponse> {
    return this.http.patch<LaundryServiceSummaryResponse>(`${this.v2BaseUrl}/${id}/header`, payload);
  }

  updateCommercialDetail(
    id: number,
    payload: LaundryServiceCommercialDetailPayload
  ): Observable<LaundryServiceSummaryResponse> {
    return this.http.patch<LaundryServiceSummaryResponse>(`${this.v2BaseUrl}/${id}/commercial-detail`, payload);
  }

  getWeightQuote(params: {
    weight_lb: number;
    has_other_services?: boolean | null;
  }): Observable<Record<string, unknown>> {
    let httpParams = new HttpParams()
      .set('weight_lb', String(params.weight_lb));

    if (params.has_other_services != null) {
      httpParams = httpParams.set('has_other_services', String(params.has_other_services));
    }

    return this.http.get<Record<string, unknown>>(`${this.v2BaseUrl}/weight-quote`, { params: httpParams });
  }

  getDeliveryQuote(params: {
    fulfillment_type: LaundryDeliveryQuote['fulfillment_type'];
    distance_km: number;
    manual_delivery_fee?: number | null;
  }): Observable<LaundryDeliveryQuote> {
    let httpParams = new HttpParams()
      .set('fulfillment_type', params.fulfillment_type)
      .set('distance_km', String(params.distance_km));

    if (params.manual_delivery_fee != null) {
      httpParams = httpParams.set('manual_delivery_fee', String(params.manual_delivery_fee));
    }

    return this.http.get<LaundryDeliveryQuote>(`${this.v2BaseUrl}/delivery-quote`, { params: httpParams });
  }


  getWithMessages(id: number): Observable<LaundryServiceWithMessages> {
    return this.http.get<LaundryServiceWithMessages>(`${this.v2BaseUrl}/${id}/notes`);
  }

  reorderPending(ids: number[]): Observable<{ message?: string }> {
    return this.http.patch<{ message?: string }>(`${this.legacyBaseUrl}/pending/reorder`, { ids });
  }
}
