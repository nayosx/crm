import { TestBed } from '@angular/core/testing';

import { ClientPhoneFacadeService } from './client-phone-facade.service';

describe('ClientPhoneFacadeService', () => {
  let service: ClientPhoneFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientPhoneFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
