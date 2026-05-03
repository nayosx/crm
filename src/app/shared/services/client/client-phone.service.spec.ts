import { TestBed } from '@angular/core/testing';

import { ClientPhoneService } from './client-phone.service';

describe('ClientPhoneService', () => {
  let service: ClientPhoneService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientPhoneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
