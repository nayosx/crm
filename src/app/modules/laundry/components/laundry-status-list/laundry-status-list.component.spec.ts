import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaundryStatusListComponent } from './laundry-status-list.component';

describe('LaundryStatusListComponent', () => {
  let component: LaundryStatusListComponent;
  let fixture: ComponentFixture<LaundryStatusListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaundryStatusListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaundryStatusListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
