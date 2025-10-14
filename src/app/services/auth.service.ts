import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

// Interfaces for response DTOs
export interface LoginResponseData {
  expireDate: string;
  token: string;
}

export interface CustomeResponse<T> {
  data: T;
  message: string | null;
  internalMessage: string | null;
  status: number;
}

export interface LoginRequest {
  email?: string;
  password?: string;
}

export interface RegisterRequest {
  userName?: string;
  email?: string;
  password?: string;
  userImage?: File | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://dchatapp.runasp.net/api/Auth'; // Your base API URL
  private authTokenSubject = new BehaviorSubject<string | null>(null);
  public authToken$ = this.authTokenSubject.asObservable(); // Expose as observable

  constructor(private http: HttpClient, private router: Router) {
    // Load token from localStorage on service initialization
    this.loadToken();
  }

  private loadToken() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      this.authTokenSubject.next(token);
    }
  }

  getToken(): string | null {
    return this.authTokenSubject.value;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    // Basic check: token exists and is not expired (you'd typically decode it for expiration)
    return !!token && !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    // Implement actual token expiration check here.
    // For now, a simple placeholder.
    // You would parse the JWT token and check the 'exp' claim.
    // Example using jwt-decode (install with npm install jwt-decode):
    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      if (decodedToken && decodedToken.exp) {
        const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
        return Date.now() >= expirationTime;
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    return true; // Assume expired if decoding fails or exp not found
  }


  login(credentials: LoginRequest): Observable<CustomeResponse<LoginResponseData>> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<CustomeResponse<LoginResponseData>>(`${this.apiUrl}/Login`, credentials, { headers }).pipe(
      tap(response => {
        if (response.status === 200 && response.data?.token) {
          localStorage.setItem('jwt_token', response.data.token);
          this.authTokenSubject.next(response.data.token);
          console.log('Login successful, token stored.');
        } else {
          console.log('Login failed:', response.message);
        }
      })
    );
  }

  register(formData: FormData): Observable<CustomeResponse<boolean>> {
    // No 'Content-Type' header needed for FormData; HttpClient sets it automatically
    return this.http.post<CustomeResponse<boolean>>(`${this.apiUrl}/Register`, formData);
  }

  logout(): Observable<CustomeResponse<boolean>> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });
    return this.http.post<CustomeResponse<boolean>>(`${this.apiUrl}/Logout`, {}, { headers }).pipe(
      tap(() => {
        localStorage.removeItem('jwt_token');
        this.authTokenSubject.next(null);
        this.router.navigate(['/login']); // Redirect to login after logout
        console.log('Logged out successfully.');
      })
    );
  }
}