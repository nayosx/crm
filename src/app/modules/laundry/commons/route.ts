  export const ToBackLaundry = (status:string):string => {
    let pathToBack:string = '';
    switch(status) {
      case 'PENDING':
        pathToBack = 'laundry/scheduler';
        break;
      case 'STARTED':
        pathToBack = 'laundry/scheduler';
        break;
      case 'IN_PROGRESS':
        pathToBack = 'laundry/work-in-progress';
        break;
      case 'READY_FOR_DELIVERY':
        pathToBack = 'laundry/delivery';
        break;
      case 'DELIVERED':
        break;
      case 'CANCELLED':
        break;
      default:
        pathToBack = 'laundry';
    }

    return pathToBack;
  }