import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseDetailsPage } from './course-details-page';

describe('CourseDetailsPage', () => {
  let component: CourseDetailsPage;
  let fixture: ComponentFixture<CourseDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseDetailsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CourseDetailsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
