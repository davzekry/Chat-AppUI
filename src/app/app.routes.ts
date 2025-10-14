import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { AuthGuard } from './guards/auth.guard'; // We'll create this soon

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] }, // Protect the home route
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Default route
  { path: '**', redirectTo: '/login' } // Wildcard route for any other invalid path
];