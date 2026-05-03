import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientAddressInputComponent } from './client-address-input.component';

describe('ClientAddressInputComponent', () => {
  let component: ClientAddressInputComponent;
  let fixture: ComponentFixture<ClientAddressInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientAddressInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientAddressInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
