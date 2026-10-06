import { APIRequestContext, APIResponse } from '@playwright/test';

type RequestOptions = {
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  multipart?: Record<string, string | number | boolean | { name: string; mimeType: string; buffer: Buffer }>;
};

/** Thin wrapper that adds a fresh Clerk Bearer token to every request (the app does the same via authorizedFetch). */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly getToken: () => Promise<string>,
  ) {}

  private async send(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, options: RequestOptions = {}): Promise<APIResponse> {
    const token = await this.getToken();
    return this.request[method](path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
    });
  }

  get = (path: string, options?: RequestOptions) => this.send('get', path, options);
  post = (path: string, options?: RequestOptions) => this.send('post', path, options);
  put = (path: string, options?: RequestOptions) => this.send('put', path, options);
  patch = (path: string, options?: RequestOptions) => this.send('patch', path, options);
  delete = (path: string, options?: RequestOptions) => this.send('delete', path, options);
}
