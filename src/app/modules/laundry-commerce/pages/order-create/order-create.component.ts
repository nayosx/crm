import { Component } from '@angular/core';
import { OrderUpsertComponent } from '../order-upsert/order-upsert.component';

@Component({
  selector: 'app-order-create-page',
  imports: [OrderUpsertComponent],
  template: '<app-order-upsert-page mode="create" />'
})
export class OrderCreateComponent {}
