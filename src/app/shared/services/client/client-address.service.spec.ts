import { TestBed } from '@angular/core/testing';

import { ClientAddressService } from './client-address.service';

describe('ClientAddressService', () => {
  let service: ClientAddressService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientAddressService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
