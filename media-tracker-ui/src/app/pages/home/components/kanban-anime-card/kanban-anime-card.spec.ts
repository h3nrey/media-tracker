import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KanbanAnimeCard } from './kanban-anime-card';

describe('KanbanAnimeCard', () => {
  let component: KanbanAnimeCard;
  let fixture: ComponentFixture<KanbanAnimeCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanAnimeCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KanbanAnimeCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
