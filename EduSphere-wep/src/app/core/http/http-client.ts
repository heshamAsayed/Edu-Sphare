import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export function getHttpClient() {
  return inject(HttpClient);
}
