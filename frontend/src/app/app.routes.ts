import { Routes } from '@angular/router';
import { AuthViewComponent } from './auth-view.component';
import { ChatViewComponent } from './chat-view.component';

export const routes: Routes = [
  { path: '', component: AuthViewComponent },
  { path: 'chat', component: ChatViewComponent },
];
