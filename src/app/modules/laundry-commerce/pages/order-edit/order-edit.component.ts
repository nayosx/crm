import { Component } from '@angular/core';
import { OrderUpsertComponent } from '../order-upsert/order-upsert.component';

@Component({
  selector: 'app-order-edit-page',
  imports: [OrderUpsertComponent],
  template: '<app-order-upsert-page mode="edit" />'
})
export class OrderEditComponent {}
