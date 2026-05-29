export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type RequiresKey = 'NONE' | 'OPTIONAL' | 'REQUIRED';
export type HealthStatus = 'UP' | 'DOWN' | 'SKIPPED';

export interface ApiInfo {
  id: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  requiresKey: RequiresKey;
  localEndpoint: string;
  externalUrl: string;
  description: string;
  officialUrl: string;
}

export interface ApiHealth {
  id: string;
  name: string;
  category: string;
  status: HealthStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  error: string | null;
}

export interface HealthReport {
  checkedAt: string;
  total: number;
  up: number;
  down: number;
  skipped: number;
  totalTimeMs: number;
  results: ApiHealth[];
}

export interface ApiError {
  status: number;
  message: string;
  path: string;
  timestamp: string;
}

export interface RunResult {
  ok: boolean;
  httpStatus: number;
  elapsedMs: number;
  data: unknown;
  error: ApiError | null;
}
