import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { API_CONFIG } from '../../../../core/config/api-config';
import { getHttpClient } from '../../../../core/http/http-client';

@Component({
  selector: 'app-payment-callback',
  template: `
    <main class="payment-callback" aria-live="polite">
      <h1>{{ isConfirming() ? 'Confirming your payment...' : 'Payment could not be confirmed' }}</h1>
      @if (!isConfirming()) {
        <p>{{ errorMessage() }}</p>
        <button type="button" (click)="goToCourses()">Back to courses</button>
      }
    </main>
  `,
})
export class PaymentCallback implements OnInit {
  private readonly http = getHttpClient();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isConfirming = signal(true);
  readonly errorMessage = signal('Please try again or contact support.');

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParams;
    let params = new HttpParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      params = params.set(key, value);
    });

    this.http.post(`${API_CONFIG.BASE_URL}/Payment/confirm`, null, {
      params,
      withCredentials: true,
    }).subscribe({
      next: () => this.router.navigate(['/profile/me'], { queryParams: { tab: 'paid' } }),
      error: (error) => {
        console.error('Payment confirmation failed:', error);
        this.isConfirming.set(false);
        this.errorMessage.set(error.error?.message || 'Payment confirmation failed.');
      },
    });
  }

  goToCourses(): void {
    this.router.navigate(['/profile/me'], { queryParams: { tab: 'available' } });
  }
}
