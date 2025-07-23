import { TestBed } from '@angular/core/testing';

import { LaundryNotesService } from './laundry-notes.service';

describe('LaundryNotesService', () => {
  let service: LaundryNotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LaundryNotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
