import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Navbar } from '../../../features/home/components/navbar/navbar';
import { Footer } from '../../../features/home/components/footer/footer';
import { RestrictedCard } from '../../../features/restricted';

@Component({
  selector: 'app-restricted-page',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, RestrictedCard],
  templateUrl: './restricted-page.html',
  styleUrl: './restricted-page.css',
})
export class RestrictedPage implements OnInit {
  private route = inject(ActivatedRoute);

  courseId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.courseId.set(params.get('courseId'));
    });
  }
}
