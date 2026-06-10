import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = 'jurisflow-web';
  showRouterOutlet = true;

  constructor(private router: Router) {
    setTimeout(() => {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.showRouterOutlet =
            event.url === '/login' ||
            event.url === '/cadastro' ||
            event.url === '/plataforma' ||
            event.url.startsWith('/plataforma/');
        }
      });
    }, 0);
  }
}
