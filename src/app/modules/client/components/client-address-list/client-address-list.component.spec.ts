import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientAddressListComponent } from './client-address-list.component';

describe('ClientAddressListComponent', () => {
  let component: ClientAddressListComponent;
  let fixture: ComponentFixture<ClientAddressListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientAddressListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientAddressListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
