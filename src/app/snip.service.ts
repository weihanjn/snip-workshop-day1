import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface SnipLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SnipService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/links';

  createLink(url: string) {
    return this.http.post<SnipLink>(this.apiUrl, { url });
  }

  listLinks() {
    return this.http.get<SnipLink[]>(this.apiUrl);
  }
}
