import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchoolsSection } from './schools-section';

describe('SchoolsSection', () => {
  let component: SchoolsSection;
  let fixture: ComponentFixture<SchoolsSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolsSection],
    }).compileComponents();

    fixture = TestBed.createComponent(SchoolsSection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
