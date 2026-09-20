import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeftSideAuth } from './left-side-auth';

describe('LeftSideAuth', () => {
  let component: LeftSideAuth;
  let fixture: ComponentFixture<LeftSideAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftSideAuth],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftSideAuth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
