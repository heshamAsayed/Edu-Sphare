import { Component } from '@angular/core';
import { Navbar } from "../../../features/home/components/navbar/navbar";
import { Header } from "../../../features/home/components/header/header";
import { SchoolsSection } from "../../../features/home/components/schools-section/schools-section";
import { About } from "../../../features/home/components/about/about";
import { Contact } from "../../../features/home/components/contact/contact";
import { Footer } from "../../../features/home/components/footer/footer";
@Component({
  imports: [Navbar, Header, SchoolsSection, About, Contact, Footer],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {}
