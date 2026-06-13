import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

@Injectable()
export class StorageService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  async save(
    data: Buffer,
    options: { originalName?: string; extension?: string; contentType?: string } = {},
  ) {
    await mkdir(this.uploadDir, { recursive: true });
    const inferred = options.originalName ? extname(options.originalName) : '';
    const extension = options.extension ?? inferred ?? '.bin';
    const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;
    const storageKey = `${Date.now()}-${crypto.randomUUID()}${safeExtension}`;
    await writeFile(join(this.uploadDir, storageKey), data);
    const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    return {
      storageKey,
      url: `${publicBaseUrl}/uploads/${storageKey}`,
    };
  }
}
