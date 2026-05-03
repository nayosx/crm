import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForcepComponent } from './forcep.component';

describe('ForcepComponent', () => {
  let component: ForcepComponent;
  let fixture: ComponentFixture<ForcepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForcepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForcepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
