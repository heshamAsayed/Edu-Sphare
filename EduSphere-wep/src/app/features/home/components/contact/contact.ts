import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ContactInfo {
  icon: string;
  label: string;
  value: string;
}

interface SocialLink {
  icon: string;
  name: string;
  url: string;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-contact',
  styleUrl: './contact.css',
  templateUrl: './contact.html',
})
export class Contact {
  // ================== Static Data (no backend) ==================

  title = 'Get in Touch';
  subtitle = 'Contact Us';
  description = 'Have a question about a school, a course, or your account? Reach out and our team will get back to you.';

  contactInfo: ContactInfo[] = [
    { icon: 'fa-map-marker', label: 'Address', value: '12 El Nasr Street, Cairo, Egypt' },
    { icon: 'fa-phone', label: 'Phone', value: '+20 100 123 4567' },
    { icon: 'fa-envelope', label: 'Email', value: 'support@example.com' },
    { icon: 'fa-clock-o', label: 'Working Hours', value: 'Sun - Thu, 9:00 AM - 6:00 PM' }
  ];

  socialLinks: SocialLink[] = [
    { icon: 'fa-facebook', name: 'Facebook', url: 'https://facebook.com' },
    { icon: 'fa-twitter', name: 'Twitter', url: 'https://twitter.com' },
    { icon: 'fa-instagram', name: 'Instagram', url: 'https://instagram.com' },
    { icon: 'fa-linkedin', name: 'LinkedIn', url: 'https://linkedin.com' }
  ];

  // ================== Contact Form (static, no backend) ==================

  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  onSubmit(): void {
    // No backend connected yet - this just simulates a submission for now
    alert(
      `Message ready to send:\n\n` +
      `Name: ${this.formData.name}\n` +
      `Email: ${this.formData.email}\n` +
      `Subject: ${this.formData.subject}\n` +
      `Message: ${this.formData.message}`
    );

    this.formData = { name: '', email: '', subject: '', message: '' };
  }
}