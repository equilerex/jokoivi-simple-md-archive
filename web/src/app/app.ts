import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  imports: [CommonModule, FormsModule, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly loginUsername = signal('');
  protected readonly loginPassword = signal('');
  protected readonly loginError = signal<string | null>(null);
  protected readonly loginSubmitting = signal(false);

  protected login(): void {
    const username = this.loginUsername().trim();
    const password = this.loginPassword();
    if (!username || !password) {
      this.loginError.set('Enter both username and password');
      return;
    }

    this.loginSubmitting.set(true);
    this.loginError.set(null);

    this.authService
      .login(username, password)
      .pipe(finalize(() => this.loginSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.loginPassword.set('');
          if (this.router.url === '/') {
            void this.router.navigateByUrl('/notes', { replaceUrl: true });
          }
        },
        error: () => {
          this.loginError.set('Invalid credentials');
        },
      });
  }
}
