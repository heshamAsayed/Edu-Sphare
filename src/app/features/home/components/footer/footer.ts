import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FooterLink {
  label: string;
  url: string;
  icon: string;
}

interface SocialLink {
  icon: string;
  name: string;
  url: string;
}

@Component({
  imports: [CommonModule],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {

  // ================== Static Data (no backend) ==================

  currentYear = new Date().getFullYear();

  brandName = 'EduPlatform';
  brandDescription =
    'An online learning platform connecting students across multiple schools with high-quality courses for every stage.';

  quickLinks: FooterLink[] = [
    { label: 'Home', url: '/', icon: 'fa-home' },
    { label: 'About', url: '/about', icon: 'fa-info-circle' },
    { label: 'Courses', url: '/courses', icon: 'fa-book' },
    { label: 'Contact', url: '/contact', icon: 'fa-envelope' }
  ];

  accountLinks: FooterLink[] = [
    { label: 'Login', url: '/login', icon: 'fa-sign-in' },
    { label: 'Register', url: '/register', icon: 'fa-user-plus' },
    { label: 'My Profile', url: '/profile', icon: 'fa-user' }
  ];

  socialLinks: SocialLink[] = [
    { icon: 'fa-facebook', name: 'Facebook', url: 'https://facebook.com' },
    { icon: 'fa-twitter', name: 'Twitter', url: 'https://twitter.com' },
    { icon: 'fa-instagram', name: 'Instagram', url: 'https://instagram.com' },
    { icon: 'fa-linkedin', name: 'LinkedIn', url: 'https://linkedin.com' }
  ];
}