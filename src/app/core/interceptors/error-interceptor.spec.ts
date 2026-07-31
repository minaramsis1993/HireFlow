import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { errorInterceptor, SKIP_ERROR_NOTIFICATION } from '@core/interceptors/error-interceptor';
import { NotificationService } from '@core/services/notification-service';

/** Counts what would have been shown, so no spec opens a real snackbar. */
class FakeNotificationService {
  readonly errors: string[] = [];

  error(message: string): void {
    this.errors.push(message);
  }
}

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let notifications: FakeNotificationService;

  beforeEach(() => {
    notifications = new FakeNotificationService();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('reports a failure once and rethrows it', async () => {
    const pending = firstValueFrom(http.get('/things'));
    controller.expectOne('/things').flush('nope', { status: 500, statusText: 'Error' });

    await expectAsync(pending).toBeRejected();
    expect(notifications.errors).toEqual(['Request failed (500). Please try again.']);
  });

  it('says so when the server cannot be reached', async () => {
    const pending = firstValueFrom(http.get('/things'));
    controller.expectOne('/things').error(new ProgressEvent('error'));

    await expectAsync(pending).toBeRejected();
    expect(notifications.errors).toEqual(['Cannot reach the server. Check your connection.']);
  });

  it('says nothing on success', async () => {
    const pending = firstValueFrom(http.get('/things'));
    controller.expectOne('/things').flush({ ok: true });

    await pending;
    expect(notifications.errors).toEqual([]);
  });

  // CV screening puts the failure on the evaluation card itself.
  it('stays quiet for a request that opts out', async () => {
    const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);
    const pending = firstValueFrom(http.get('/things', { context }));
    controller.expectOne('/things').flush('nope', { status: 500, statusText: 'Error' });

    await expectAsync(pending).toBeRejected();
    expect(notifications.errors).toEqual([]);
  });
});
