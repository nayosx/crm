import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientPhoneListComponent } from './client-phone-list.component';

describe('ClientPhoneListComponent', () => {
  let component: ClientPhoneListComponent;
  let fixture: ComponentFixture<ClientPhoneListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientPhoneListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientPhoneListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
