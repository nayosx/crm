import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaundryDetailComponent } from './laundry-detail.component';

describe('LaundryDetailComponent', () => {
  let component: LaundryDetailComponent;
  let fixture: ComponentFixture<LaundryDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaundryDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaundryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
