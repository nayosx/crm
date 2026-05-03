import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaundryEditComponent } from './laundry-edit.component';

describe('LaundryEditComponent', () => {
  let component: LaundryEditComponent;
  let fixture: ComponentFixture<LaundryEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaundryEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaundryEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
