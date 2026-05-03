import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientPhoneInputComponent } from './client-phone-input.component';

describe('ClientPhoneInputComponent', () => {
  let component: ClientPhoneInputComponent;
  let fixture: ComponentFixture<ClientPhoneInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientPhoneInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientPhoneInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
