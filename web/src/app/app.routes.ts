import { Route, UrlMatcher, UrlSegment } from '@angular/router';
import { NotesPageComponent } from './notes-page.component';

const notesPathMatcher: UrlMatcher = (segments: UrlSegment[]) => {
  if (segments[0]?.path !== 'notes') {
    return null;
  }

  return {
    consumed: segments,
  };
};

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'notes',
  },
  {
    matcher: notesPathMatcher,
    component: NotesPageComponent,
  },
];
