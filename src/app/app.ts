import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { A11yFab } from './shared/a11y-fab/a11y-fab';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, A11yFab],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('api-playground-dashboard');
}
