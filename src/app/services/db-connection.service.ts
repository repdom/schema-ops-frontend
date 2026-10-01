import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const AES_KEY_HEX = '0000000000000000000000000000000000000000000000000000000000000000'; // replace with real key

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

@Injectable({ providedIn: 'root' })
export class DbConnectionService {
  private http = inject(HttpClient);

  async connect(jdbcUrl: string, username: string, password: string, schemaName?: string): Promise<void> {
    const payload = JSON.stringify({ jdbcUrl, username, password, ...(schemaName ? { schemaName } : {}) });

    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey('raw', hexToBytes(AES_KEY_HEX), 'AES-GCM', false, ['encrypt']);
    const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));
    const encryptedPayload = btoa(String.fromCharCode(...iv, ...new Uint8Array(ct)));

    await this.http.post('/api/connect', { encryptedPayload }).toPromise();
  }
}
