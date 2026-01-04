import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimesDetails } from './animes-details';

describe('AnimesDetails', () => {
  let component: AnimesDetails;
  let fixture: ComponentFixture<AnimesDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimesDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimesDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
