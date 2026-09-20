import { Component } from '@angular/core';
import { Navbar } from "../../../features/home/components/navbar/navbar";
import { Courses } from "../../../features/courses/components/courses/courses";
// import { NgClass } from "../../../../../node_modules/@angular/common/types/_common_module-chunk";
import { Footer } from "../../../features/home/components/footer/footer";

@Component({
  imports: [Navbar, Courses, Footer],
  selector: 'app-coursespage',
  styleUrl: './coursespage.css',
  templateUrl: './coursespage.html',
})
export class Coursespage {}
