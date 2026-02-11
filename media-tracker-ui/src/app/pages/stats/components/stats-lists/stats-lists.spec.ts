import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsLists } from './stats-lists';

describe('StatsLists', () => {
  let component: StatsLists;
  let fixture: ComponentFixture<StatsLists>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsLists]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatsLists);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
