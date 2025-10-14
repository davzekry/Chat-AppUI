import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Adjust path as needed

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // Import RouterLink for navigation
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    this.errorMessage = null; // Clear previous errors
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          if (response.status === 200 && response.data?.token) {
            this.router.navigate(['/home']); // Route to chat application page
          } else {
            this.errorMessage = response.message || 'Login failed. Please check your credentials.';
          }
        },
        error: (err) => {
          console.error('Login error:', err);
          this.errorMessage = 'An error occurred during login. Please try again.';
          if (err.status === 404 && err.error?.message) { // Check for specific backend message
            this.errorMessage = err.error.message;
          }
        }
      });
    } else {
      this.errorMessage = 'Please enter valid email and password.';
    }
  }
}