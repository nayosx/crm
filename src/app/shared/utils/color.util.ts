export const LaundryStatusColorMap: Record<string, string> = {
  PENDING: 'text-yellow-800 bg-yellow-100',
  STARTED: 'text-blue-800 bg-blue-100',
  IN_PROGRESS: 'text-cyan-800 bg-cyan-100',
  READY_FOR_DELIVERY: 'text-indigo-800 bg-indigo-100',
  DELIVERED: 'text-green-800 bg-green-100',
  CANCELLED: 'text-red-800 bg-red-100'
};

export const getLaundryStatusSeverity = (status: string): 'info' | 'success' | 'warning' | 'danger' | undefined => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'STARTED':
    case 'IN_PROGRESS':
      return 'info';
    case 'READY_FOR_DELIVERY':
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return undefined;
  }
};
