import { TestBed } from '@angular/core/testing';

import { LaundryServiceBody } from './laundry.service';

describe('LaundryService', () => {
  let service: LaundryServiceBody;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LaundryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
