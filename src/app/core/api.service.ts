import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, defer, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiError, ApiInfo, HealthReport, RunResult } from './models';

export interface RunParams {
  endpoint?: string;
  path?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getCatalog(): Observable<ApiInfo[]> {
    return this.http.get<ApiInfo[]>(`${this.base}/catalog`).pipe(
      map((catalog) =>
        catalog
          .filter((api) => !DISABLED_API_IDS.has(api.id))
          .map((api) => ({ ...api, officialUrl: OFFICIAL_URL_BY_ID[api.id] ?? api.externalUrl })),
      ),
    );
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
    const sourcePath = params?.endpoint ?? api.localEndpoint;
    let path = sourcePath.replace(/^\/api\/v1/, '');
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
  countries: { path: { name: 'spain' } },
  posts: { path: { id: '1' } },
  meals: {},
  sports: { query: 'competition=PD' },
  news: { query: 'q=mundo&language=es' },
  photos: { query: 'query=mountains' },
  qrcode: { query: 'data=https%3A%2F%2Fgithub.com&size=300x300' },
  holidays: { query: 'country=ES' },
  hn: { query: 'type=top&limit=20' },
  github: { path: { username: 'torvalds' } },
  books: { query: 'title=clean+code' },
  characters: { path: { id: '1' } },
};

const DISABLED_API_IDS = new Set(['crypto', 'pokemon', 'ai', 'cats', 'dictionary', 'exchange']);

const OFFICIAL_URL_BY_ID: Record<string, string> = {
  weather: 'https://open-meteo.com/',
  movies: 'https://developer.themoviedb.org/docs',
  music:
    'https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/',
  countries: 'https://restcountries.com/',
  meals: 'https://www.themealdb.com/api.php',
  cocktails: 'https://www.thecocktaildb.com/',
  photos: 'https://unsplash.com/developers',
  sports: 'https://www.football-data.org/',
  space: 'https://api.nasa.gov/',
  users: 'https://randomuser.me/',
  github: 'https://docs.github.com/en/rest',
  books: 'https://openlibrary.org/developers/api',
  news: 'https://newsapi.org/docs',
  characters: 'https://rickandmortyapi.com/',
  qrcode: 'https://goqr.me/api/',
  holidays: 'https://date.nager.at/',
  trivia: 'https://opentdb.com/',
  hn: 'https://github.com/HackerNews/API',
  dota: 'https://docs.opendota.com/',
};
