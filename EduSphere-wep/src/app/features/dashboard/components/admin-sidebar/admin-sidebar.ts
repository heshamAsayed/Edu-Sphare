import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AccountService } from '../../../account/services/account.service';

export type DashTab = 'overview' | 'teachers' | 'structure' | 'report';

interface NavItem {
  id: DashTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-sidebar.html',
  styleUrl:    './admin-sidebar.css',
})
export class AdminSidebar {
  private readonly router = inject(Router);
  private readonly account = inject(AccountService);

  readonly activeTab = input<DashTab>('overview');
  readonly tabChange = output<DashTab>();

  readonly navItems: NavItem[] = [
    { id: 'overview',  label: 'Overview',        icon: '▦'  },
    { id: 'teachers',  label: 'Teachers',         icon: '👨‍🏫' },
    { id: 'structure', label: 'Site Structure',   icon: '🏫' },
    { id: 'report',    label: 'Financial Report', icon: '📊' },
  ];

  select(tab: DashTab): void {
    this.tabChange.emit(tab);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.account.logout().subscribe({
      next:  () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login']),
    });
  }
}
