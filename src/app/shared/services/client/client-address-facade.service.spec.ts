import { TestBed } from '@angular/core/testing';

import { ClientAddressFacadeService } from './client-address-facade.service';

describe('ClientAddressFacadeService', () => {
  let service: ClientAddressFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientAddressFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
