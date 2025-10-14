import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Adjust path as needed

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  selectedFile: File | null = null;
  registrationSuccess: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required], // Backend validator is flexible here, client-side can be stricter
      userImage: [null] // To store the file, though we'll send it via FormData
    });
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      // You might want to add client-side validation for file type/size here too
      // (matching your backend validator in RegisterCommandValidator)
    } else {
      this.selectedFile = null;
    }
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.registrationSuccess = false;

    if (this.registerForm.valid) {
      const formData = new FormData();
      formData.append('UserName', this.registerForm.get('userName')?.value);
      formData.append('Email', this.registerForm.get('email')?.value);
      formData.append('Password', this.registerForm.get('password')?.value);

      if (this.selectedFile) {
        formData.append('UserImage', this.selectedFile, this.selectedFile.name);
      }

      this.authService.register(formData).subscribe({
        next: (response) => {
          if (response.status === 200 && response.data === true) {
            this.registrationSuccess = true;
            setTimeout(() => {
              this.router.navigate(['/login']); // Route to login page on successful registration
            }, 3000); // Redirect after 3 seconds
          } else {
            this.errorMessage = response.message || 'Registration failed. Please try again.';
          }
        },
        error: (err) => {
          console.error('Registration error:', err);
          this.errorMessage = 'An error occurred during registration. Please try again.';
          // Check for specific backend validation errors
          if (err.error?.message) {
            this.errorMessage = err.error.message;
          }
        }
      });
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }
}