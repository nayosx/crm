import { LaundryServiceCompact, LaundryServiceStatus } from '@shared/interfaces/laundry-service.interface';

export const LaundryStatusLabelMap: Record<LaundryServiceStatus, string> = {
  PENDING: 'Pendiente',
  STARTED: 'Iniciado',
  IN_PROGRESS: 'En proceso',
  READY_FOR_DELIVERY: 'Listo para entrega',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
};

export const LaundryServiceLabelMap: Record<LaundryServiceCompact['service_label'], string> = {
  NORMAL: 'Normal',
  EXPRESS: 'Exprés'
};

export const LaundrySocketQueueTexts = {
  headerTitle: 'Monitoreo en tiempo real',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  reconnecting: 'Reconectando',
  pendingTitle: 'Pendientes',
  readyTitle: 'Listos para entrega',
  clientColumn: 'Cliente',
  serviceColumn: 'Servicio',
  statusColumn: 'Estado',
  actionsColumn: 'Acciones',
  openDetailAriaLabel: 'Abrir detalle',
  pendingEmpty: 'Sin servicios pendientes en cola.',
  readyEmpty: 'Sin servicios listos para entrega.',
  socketTransportError: 'Error de transporte del socket',
  joinPendingError: 'No se pudo conectar a la cola de pendientes.',
  joinReadyError: 'No se pudo conectar a la cola de listos para entrega.'
} as const;

export const LaundryPendingQueueTexts = {
  kicker: 'Lavanderia',
  title: 'Pendientes',
  subtitle: 'Cola en vivo para el equipo operativo. Esta vista se actualiza por socket.',
  totalEyebrow: 'Total activo',
  totalTitle: 'Servicios pendientes',
  addressLabel: 'Direccion',
  createdByLabel: 'Creado por',
  orderLabel: 'Orden',
  unnamedClient: 'Cliente sin nombre',
  noAddress: 'Sin direccion registrada',
  systemUser: 'Sistema',
  openDetail: 'Abrir detalle',
  empty: 'No hay servicios pendientes en este momento.'
} as const;
