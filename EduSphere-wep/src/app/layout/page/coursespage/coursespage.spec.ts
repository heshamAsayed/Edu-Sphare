import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Coursespage } from './coursespage';

describe('Coursespage', () => {
  let component: Coursespage;
  let fixture: ComponentFixture<Coursespage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coursespage],
    }).compileComponents();

    fixture = TestBed.createComponent(Coursespage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
