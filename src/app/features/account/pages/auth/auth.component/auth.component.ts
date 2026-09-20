import { Component } from '@angular/core';
import { LeftSideAuth } from '../../../components/left-side-auth/left-side-auth';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [LeftSideAuth, RouterOutlet],
  selector: 'app-auth.component',
  styleUrl: './auth.component.css',
  templateUrl: './auth.component.html',
}) 
export class AuthComponent {}
