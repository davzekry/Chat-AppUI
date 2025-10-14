import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { CustomeResponse } from '../../app/interfaces/chat.interface'; // Use the central interface

// Specific auth interfaces (can be moved to auth.interfaces.ts if preferred)
export interface LoginResponseData {
  expireDate: string;
  token: string;
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
  private apiUrl = 'https://dchatapp.runasp.net/api/Auth';
  private authTokenSubject = new BehaviorSubject<string | null>(null);
  public authToken$ = this.authTokenSubject.asObservable();

  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.loadToken();
    }
  }

  private loadToken() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      this.authTokenSubject.next(token);
    }
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return this.authTokenSubject.value;
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    if (!this.isBrowser) {
      return true;
    }
    try {
      const decodedToken: any = JSON.parse(atob(token.split('.')[1]));
      if (decodedToken && decodedToken.exp) {
        const expirationTime = decodedToken.exp * 1000;
        return Date.now() >= expirationTime;
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
    return true;
  }

  login(credentials: LoginRequest): Observable<CustomeResponse<LoginResponseData>> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<CustomeResponse<LoginResponseData>>(`${this.apiUrl}/Login`, credentials, { headers }).pipe(
      tap(response => {
        if (response.status === 200 && response.data?.token) {
          if (this.isBrowser) {
            localStorage.setItem('jwt_token', response.data.token);
          }
          this.authTokenSubject.next(response.data.token);
          console.log('Login successful, token stored.');
        } else {
          console.log('Login failed:', response.message);
        }
      })
    );
  }

  register(formData: FormData): Observable<CustomeResponse<boolean>> {
    return this.http.post<CustomeResponse<boolean>>(`${this.apiUrl}/Register`, formData);
  }

  logout(): Observable<CustomeResponse<boolean>> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });
    return this.http.post<CustomeResponse<boolean>>(`${this.apiUrl}/Logout`, {}, { headers }).pipe(
      tap(() => {
        if (this.isBrowser) {
          localStorage.removeItem('jwt_token');
        }
        this.authTokenSubject.next(null);
        this.router.navigate(['/login']);
        console.log('Logged out successfully.');
      })
    );
  }

  getCurrentUserId(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    const token = this.getToken();
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        // Corrected property access with bracket notation
        return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null;
      } catch (e) {
        console.error('Failed to decode token for user ID:', e);
        return null;
      }
    }
    return null;
  }

  getCurrentUserName(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    const token = this.getToken();
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        // Corrected property access with bracket notation
        return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || null;
      } catch (e) {
        console.error('Failed to decode token for user name:', e);
        return null;
      }
    }
    return null;
  }
}