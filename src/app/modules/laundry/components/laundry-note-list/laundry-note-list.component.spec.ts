import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaundryNoteListComponent } from './laundry-note-list.component';

describe('LaundryNoteListComponent', () => {
  let component: LaundryNoteListComponent;
  let fixture: ComponentFixture<LaundryNoteListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaundryNoteListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaundryNoteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
