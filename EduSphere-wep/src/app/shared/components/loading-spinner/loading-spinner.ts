import { Component, input } from '@angular/core';

type SpinnerSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.css',
})
export class LoadingSpinner {
  readonly isLoading = input(false);
  readonly size = input<SpinnerSize>('medium');
  readonly loadingText = input('');
}