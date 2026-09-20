import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../../../account/services/account.service';
import { ScrollService } from '../../services/scroll-service';
@Component({
  imports: [RouterLink],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  profileMenuOpen = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target as Node);

    if (!clickedInside) {
      this.closeProfileMenu();
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeProfileMenu();
    this.closeMobileMenu();
  }

  isLoggedIn(): boolean {
    return this.accountService.isAuthenticated();
  }

  isTeacher(): boolean {
    const user = this.accountService.currentUser();
    if (!user) return false;
    if (user.role?.toLowerCase() === 'teacher') return true;
    if (user.roles?.some((r) => r.toLowerCase() === 'teacher')) return true;
    return false;
  }

  navigateToMyCourses(): void {
    this.closeProfileMenu();
    this.closeMobileMenu();
    if (this.isTeacher()) {
      this.router.navigate(['/manage-courses']);
    } else {
      this.router.navigate(['/my-courses']);
    }
  }

  toggleProfileMenu(event?: Event): void {
    event?.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  closeProfileMenu(): void {
    this.profileMenuOpen = false;
  }

  closeMobileMenu(): void {
    const collapseEl = this.elementRef.nativeElement.querySelector('#navbarResponsive');

    if (!collapseEl) {
      return;
    }

    collapseEl.classList.remove('show');
    collapseEl.setAttribute('aria-expanded', 'false');
    const toggleBtn = this.elementRef.nativeElement.querySelector('.navbar-toggler');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  logout(): void {
    this.accountService.logout().subscribe({
      next: () => {
        this.closeProfileMenu();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.closeProfileMenu();
        this.router.navigate(['/auth/login']);
      },
    });
  }


  // ================== Smooth Scrolling ==================
  private scrollService = inject(ScrollService);

  scrollTo(sectionId: string): void {
    this.scrollService.scrollToSection(sectionId);
  }
}
