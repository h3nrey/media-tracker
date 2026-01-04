import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListDetails } from './list-details';

describe('ListDetails', () => {
  let component: ListDetails;
  let fixture: ComponentFixture<ListDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
