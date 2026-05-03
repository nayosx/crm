import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaundryNoteComponent } from './laundry-note.component';

describe('LaundryNoteComponent', () => {
  let component: LaundryNoteComponent;
  let fixture: ComponentFixture<LaundryNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaundryNoteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaundryNoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
