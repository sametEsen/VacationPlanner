import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  UserBalance,
  HolidayRequest,
  CompanyHoliday,
  PublicHoliday,
  HREmailDraft,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = this.resolveApiBaseUrl();

  private resolveApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return environment.apiUrl;
    }

    const serverBase = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.['API_BASE_URL'];
    return serverBase || 'http://127.0.0.1:3000/api';
  }

  login(email: string, password: string): Observable<{ user: User }> {
    return this.http.post<{ user: User }>(`${this.base}/auth/login`, { email, password });
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<{ user: User }>(`${this.base}/auth/me`).pipe(map((response) => response.user));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/logout`, {});
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; loginRequired: boolean }> {
    return this.http.post<{ success: boolean; loginRequired: boolean }>(`${this.base}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  // --- Users ---
  getUsers(): Observable<User[]> {
    return this.http.get<Array<User & { _id?: string }>>(`${this.base}/users`).pipe(
      map((users) => users.map((user) => ({
        ...user,
        id: user.id || user._id || '',
      }))),
    );
  }

  getMyBalance(): Observable<UserBalance> {
    return this.http.get<UserBalance>(`${this.base}/users/me/balance`);
  }

  // --- Holiday Requests ---
  getAllRequests(): Observable<HolidayRequest[]> {
    return this.http.get<HolidayRequest[]>(`${this.base}/requests`);
  }

  getMyRequests(): Observable<HolidayRequest[]> {
    return this.http.get<HolidayRequest[]>(`${this.base}/requests/mine`);
  }

  submitRequest(payload: {
    startDate: string;
    endDate: string;
    reason?: string;
  }): Observable<HolidayRequest> {
    return this.http.post<HolidayRequest>(`${this.base}/requests`, payload);
  }

  updateRequest(requestId: string, payload: {
    startDate: string;
    endDate: string;
    reason?: string;
  }): Observable<HolidayRequest> {
    return this.http.patch<HolidayRequest>(`${this.base}/requests/${requestId}`, payload);
  }

  deleteRequest(requestId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/requests/${requestId}`);
  }

  approveRequest(requestId: string): Observable<HolidayRequest> {
    return this.http.patch<HolidayRequest>(`${this.base}/requests/${requestId}/approve`, {});
  }

  rejectRequest(requestId: string): Observable<HolidayRequest> {
    return this.http.patch<HolidayRequest>(`${this.base}/requests/${requestId}/reject`, {});
  }

  getHREmailDraft(requestId: string): Observable<HREmailDraft> {
    return this.http.get<HREmailDraft>(`${this.base}/requests/${requestId}/hr-email`);
  }

  sendHREmail(requestId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/requests/${requestId}/send-hr`, {});
  }

  updateUser(userId: string, payload: { name: string; email: string; role: string; totalHolidayDays: number }): Observable<User> {
    return this.http.put<User>(`${this.base}/users/${userId}`, payload);
  }

  addUser(payload: { name: string; email: string; role: string; totalHolidayDays: number }): Observable<{ user: User; temporaryPassword: string }> {
    return this.http.post<{ user: User; temporaryPassword: string }>(`${this.base}/users`, payload);
  }

  deleteUser(userId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/users/${userId}`);
  }

  // --- Holidays ---
  getPublicHolidays(year: number): Observable<PublicHoliday[]> {
    return this.http.get<PublicHoliday[]>(`${this.base}/holidays/public/${year}`);
  }

  getCompanyHolidays(year: number): Observable<CompanyHoliday[]> {
    return this.http.get<CompanyHoliday[]>(`${this.base}/holidays/company/${year}`);
  }

  addCompanyHoliday(name: string, date: string): Observable<CompanyHoliday> {
    return this.http.post<CompanyHoliday>(`${this.base}/holidays/company`, { name, date });
  }

  deleteCompanyHoliday(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/holidays/company/${id}`);
  }
}
