import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Stat {
  icon: string;
  value: string;
  label: string;
}

interface Value {
  icon: string;
  title: string;
  description: string;
}

interface TeamMember {
  name: string;
  role: string;
  color: string;
}



@Component({
  imports: [CommonModule],
  selector: 'app-about',
  styleUrl: './about.css',
  templateUrl: './about.html',
})

export class About {

  // ================== Static Data (no backend) ==================

  title = 'About Us';
  subtitle = 'Learning without limits';
  description =
    'We are an online education platform connecting students across multiple schools ' +
    'with high-quality courses covering every stage, from primary to secondary and beyond. ' +
    'Our mission is to make learning accessible, engaging, and effective for every student.';

  stats: Stat[] = [
    { icon: 'fa-university', value: '5+', label: 'Schools' },
    { icon: 'fa-users', value: '12,000+', label: 'Students' },
    { icon: 'fa-graduation-cap', value: '250+', label: 'Teachers' },
    { icon: 'fa-play-circle', value: '3,000+', label: 'Video Lessons' }
  ];

  values: Value[] = [
    {
      icon: 'fa-bullseye',
      title: 'Our Mission',
      description: 'Deliver accessible, high-quality education to every student, everywhere.'
    },
    {
      icon: 'fa-eye',
      title: 'Our Vision',
      description: 'Become the leading online learning platform in the region.'
    },
    {
      icon: 'fa-heart',
      title: 'Our Values',
      description: 'Quality, integrity, and putting students first in everything we build.'
    }
  ];

  team: TeamMember[] = [
    { name: 'Ahmed Youssef', role: 'Founder & CEO', color: '#4f46e5' },
    { name: 'Mona Adel', role: 'Head of Curriculum', color: '#0ea5e9' },
    { name: 'Karim Hassan', role: 'Lead Developer', color: '#16a34a' },
    { name: 'Salma Tarek', role: 'Student Success Manager', color: '#db2777' }
  ];

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}