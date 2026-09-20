import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountSummary } from '../../models';

@Component({
  selector: 'app-user-profile-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile-header.html',
  styleUrl: './user-profile-header.css',
})
export class UserProfileHeader {
  user = input<AccountSummary | null>(null);
  schoolName = input<string>('');
  stageName = input<string>('');
  yearName = input<string>('');

  logout = output<void>();

  userInitial = computed(() => {
    const name = this.user()?.name;
    return name ? name.trim().charAt(0).toUpperCase() : 'U';
  });
}
