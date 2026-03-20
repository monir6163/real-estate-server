export interface TErrorSources {
  path: string;
  message: string;
}
export interface TErrorResponse {
  statusCode?: number;
  success: boolean;
  message: string;
  errors: TErrorSources[];
  error?: unknown;
  stack?: string;
}
