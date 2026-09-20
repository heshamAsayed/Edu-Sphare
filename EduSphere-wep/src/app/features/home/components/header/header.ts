import { AfterViewInit, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollService } from '../../services/scroll-service';
// import particlesJS from 'particles.js';

declare const particlesJS: any;

@Component({
  imports: [RouterLink],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})



export class Header implements AfterViewInit {
  
  ngAfterViewInit(): void {
    this.initParticles();
  }

  private initParticles(): void {

    particlesJS('particles-js', {
      particles: {
        number: {
          value: 200,
          density: {
            enable: true,
            value_area: 800
          }
        },

        color: {
          // value: '#8a7b7b'
          value: '#fff'
        },

        shape: {
          type: 'circle',
          stroke: {
            width: 0,
            color: '#000000'
          }
        },

        opacity: {
          value: 0.5,
          random: false,
          anim: {
            enable: false
          }
        },

        size: {
          value: 15,
          random: true,
          anim: {
            enable: false
          }
        },

        line_linked: {
          enable: true,
          distance: 110,
          color: '#fff',
          opacity: 1,
          width: 1
        },

        move: {
          enable: true,
          speed: 10,
          direction: 'none',
          random: true,
          straight: false,
          out_mode: 'out',
          attract: {
            enable: false
          }
        }
      },

      interactivity: {
        detect_on: 'canvas',

        events: {
          onhover: {
            enable: true,
            mode: 'repulse'
          },

          onclick: {
            enable: true,
            mode: 'push'
          },

          resize: true
        },

        modes: {
          repulse: {
            distance: 150
          },

          push: {
            particles_nb: 4
          }
        }
      },

      retina_detect: true
    });
  }


  // ================== Smooth Scrolling ==================
  private scrollService = inject(ScrollService);
  
    scrollTo(sectionId: string): void {
      this.scrollService.scrollToSection(sectionId);
    }
}
