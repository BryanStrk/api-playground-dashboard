import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, defer, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiError, ApiInfo, HealthReport, RunResult } from './models';

export interface RunParams {
  path?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getCatalog(): Observable<ApiInfo[]> {
    return this.http.get<ApiInfo[]>(`${this.base}/catalog`);
  }

  getHealth(): Observable<HealthReport> {
    return this.http.get<HealthReport>(`${this.base}/health`);
  }

  /**
   * Invokes a given API's local endpoint and normalises both success and
   * backend error envelopes into a single RunResult shape so the UI can
   * render either without special-casing.
   *
   * When `params` is provided it overrides the built-in sample defaults so
   * the interactive controls panel can re-run with user-supplied values.
   */
  runApi(api: ApiInfo, params?: RunParams): Observable<RunResult> {
    const { url, queryParams } = this.buildRunUrl(api, params);
    return defer(() => {
      const started = performance.now();
      return this.http.get(url, { observe: 'response', params: queryParams }).pipe(
        map((res) => ({
          ok: true,
          httpStatus: res.status,
          elapsedMs: Math.round(performance.now() - started),
          data: res.body,
          error: null as ApiError | null,
        })),
        catchError((err: HttpErrorResponse) =>
          of<RunResult>({
            ok: false,
            httpStatus: err.status,
            elapsedMs: Math.round(performance.now() - started),
            data: null,
            error: this.toApiError(err, api.localEndpoint),
          }),
        ),
      );
    });
  }

  private buildRunUrl(
    api: ApiInfo,
    params?: RunParams,
  ): { url: string; queryParams: HttpParams } {
    const fallback = params ? undefined : SAMPLE_INPUTS[api.id];
    let path = api.localEndpoint.replace(/^\/api\/v1/, '');
    path = path.replace(/\{(\w+)\}/g, (_, key) => {
      const fromParams = params?.path?.[key];
      const fromFallback = fallback?.path?.[key];
      return encodeURIComponent(fromParams ?? fromFallback ?? key);
    });
    const url = `${this.base}${path}`;

    let queryParams = new HttpParams();
    if (params?.query) {
      for (const [key, value] of Object.entries(params.query)) {
        if (value === null || value === undefined || value === '') continue;
        queryParams = queryParams.set(key, String(value));
      }
    } else if (fallback?.query) {
      for (const part of fallback.query.split('&')) {
        const [k, v] = part.split('=');
        if (k && v !== undefined) queryParams = queryParams.set(k, decodeURIComponent(v));
      }
    }
    return { url, queryParams };
  }

  private toApiError(err: HttpErrorResponse, path: string): ApiError {
    const body = err.error as Partial<ApiError> | string | null;
    if (body && typeof body === 'object' && 'message' in body) {
      return {
        status: body.status ?? err.status,
        message: body.message ?? err.message,
        path: body.path ?? path,
        timestamp: body.timestamp ?? new Date().toISOString(),
      };
    }
    return {
      status: err.status,
      message: err.message || 'Unknown error',
      path,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Minimal sample inputs per catalog id so "Run" works out of the box.
 * `path` substitutes {placeholder} segments; `query` is appended verbatim.
 */
interface SampleInput {
  path?: Record<string, string>;
  query?: string;
}

const SAMPLE_INPUTS: Record<string, SampleInput> = {
  weather: { query: 'city=Madrid' },
  music: { query: 'term=daft+punk&limit=5' },
  crypto: { query: 'ids=bitcoin,ethereum&vs=usd' },
  pokemon: { path: { name: 'pikachu' } },
  countries: { path: { name: 'spain' } },
  posts: { path: { id: '1' } },
  meals: { query: 'name=arrabiata' },
  sports: { query: 'name=Arsenal' },
  dictionary: { path: { word: 'hello' } },
  github: { path: { username: 'torvalds' } },
  books: { query: 'title=clean+code' },
  characters: { path: { id: '1' } },
};
