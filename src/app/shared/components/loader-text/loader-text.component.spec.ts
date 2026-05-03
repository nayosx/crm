import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoaderTextComponent } from './loader-text.component';

describe('LoaderTextComponent', () => {
  let component: LoaderTextComponent;
  let fixture: ComponentFixture<LoaderTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoaderTextComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoaderTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
