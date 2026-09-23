import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminSidebar, DashTab } from '../../../features/dashboard/components/admin-sidebar/admin-sidebar';
import { OverviewTab }           from '../../../features/dashboard/components/overview-tab/overview-tab';
import { TeachersTab }           from '../../../features/dashboard/components/teachers-tab/teachers-tab';
import { SiteStructureTab }      from '../../../features/dashboard/components/site-structure-tab/site-structure-tab';
import { FinancialReportTab }    from '../../../features/dashboard/components/financial-report-tab/financial-report-tab';


@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    AdminSidebar,
    OverviewTab,
    TeachersTab,
    SiteStructureTab,
    FinancialReportTab,
  ],
  templateUrl: './admin-dashboard-page.html',
  styleUrl:    './admin-dashboard-page.css',
})
export class AdminDashboardPage {
  activeTab = signal<DashTab>('overview');

  onTabChange(tab: DashTab): void {
    this.activeTab.set(tab);
  }
}
