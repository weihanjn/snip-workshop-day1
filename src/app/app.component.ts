import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SnipLink, SnipService } from './snip.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly snipService = inject(SnipService);

  readonly url = signal('');
  readonly links = signal<SnipLink[]>([]);
  readonly latestLink = signal<SnipLink | null>(null);
  readonly error = signal('');
  readonly isLoading = signal(false);

  ngOnInit() {
    this.loadLinks();
  }

  createLink() {
    const url = this.url().trim();
    this.error.set('');
    this.latestLink.set(null);

    if (!this.isHttpUrl(url)) {
      this.error.set('Enter a valid URL starting with http:// or https://.');
      return;
    }

    this.isLoading.set(true);
    this.snipService.createLink(url).subscribe({
      next: (link) => {
        this.latestLink.set(link);
        this.url.set('');
        this.loadLinks();
      },
      error: (err: unknown) => {
        this.error.set(this.errorMessage(err));
        this.isLoading.set(false);
      },
    });
  }

  private loadLinks() {
    this.snipService.listLinks().subscribe({
      next: (links) => {
        this.links.set(links);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(this.errorMessage(err));
        this.isLoading.set(false);
      },
    });
  }

  private isHttpUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private errorMessage(err: unknown) {
    if (err instanceof HttpErrorResponse) {
      return err.error?.error || 'Could not reach the Snip backend.';
    }
    return 'Something went wrong. Please try again.';
  }
}
