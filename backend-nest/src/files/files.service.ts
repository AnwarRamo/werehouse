import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';

const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.odt': ['application/vnd.oasis.opendocument.text'],
  '.rtf': ['application/rtf', 'text/rtf'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
};

const GENERIC_MIME_TYPES = new Set(['application/octet-stream', 'binary/octet-stream']);

export const GENERAL_FILE_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);

type ListedGeneralFile = {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: string | null;
  size: number;
  extension: string;
  uploadedAt: string;
};

type StoredGeneralFileMetadata = {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: string;
  uploadedBy: string | null;
};

@Injectable()
export class FilesService {
  private readonly uploadRoot = resolve(process.cwd(), 'tmp', 'uploads', 'general');

  async uploadGeneralFile(file: Express.Multer.File, userId?: string) {
    this.assertUploadableFile(file);

    const originalName = this.sanitizeFileName(file.originalname || 'upload.bin');
    const extension = extname(originalName).toLowerCase();
    this.assertAllowedMimeType(extension, file.mimetype);

    const uploadedAt = new Date();
    const bucket = `${uploadedAt.getUTCFullYear()}-${String(uploadedAt.getUTCMonth() + 1).padStart(2, '0')}`;
    const id = randomUUID();
    const storedName = `${id}${extension}`;
    const absoluteDirectory = join(this.uploadRoot, bucket);
    const absolutePath = join(absoluteDirectory, storedName);
    const metadataAbsolutePath = join(absoluteDirectory, this.getMetadataFileName(id));
    const relativePath = `tmp/uploads/general/${bucket}/${storedName}`;
    const size = file.size ?? file.buffer.length;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const uploadedAtIso = uploadedAt.toISOString();

    const metadata: StoredGeneralFileMetadata = {
      id,
      originalName,
      storedName,
      path: relativePath,
      mimeType: file.mimetype,
      size,
      checksum,
      uploadedAt: uploadedAtIso,
      uploadedBy: userId || null,
    };

    try {
      await mkdir(absoluteDirectory, { recursive: true });
      await Promise.all([
        writeFile(absolutePath, file.buffer),
        writeFile(metadataAbsolutePath, JSON.stringify(metadata), 'utf8'),
      ]);
    } catch {
      throw new InternalServerErrorException('Failed to persist uploaded file');
    }

    return {
      message: 'File uploaded successfully',
      file: {
        id,
        originalName,
        storedName,
        path: relativePath,
        mimeType: file.mimetype,
        size,
        checksum,
        uploadedAt: uploadedAtIso,
        uploadedBy: userId || null,
      },
    };
  }

  async listGeneralFiles(page = 1, limit = 20) {
    const normalizedPage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
    const normalizedLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(100, Math.trunc(limit)))
      : 20;

    const files = await this.collectStoredFiles();
    const total = files.length;
    const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));
    const safePage = Math.min(normalizedPage, totalPages);
    const start = (safePage - 1) * normalizedLimit;
    const items = files.slice(start, start + normalizedLimit);

    return {
      files: items,
      pagination: {
        page: safePage,
        limit: normalizedLimit,
        total,
        totalPages,
      },
    };
  }

  private async collectStoredFiles(): Promise<ListedGeneralFile[]> {
    let buckets: Array<{ name: string; isDirectory: () => boolean }> = [];

    try {
      buckets = await readdir(this.uploadRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    const filesByBucket = await Promise.all(
      buckets
        .filter((bucket) => bucket.isDirectory())
        .map(async (bucket) => {
          const bucketPath = join(this.uploadRoot, bucket.name);

          let entries: Array<{ name: string; isFile: () => boolean }> = [];
          try {
            entries = await readdir(bucketPath, { withFileTypes: true });
          } catch {
            return [] as ListedGeneralFile[];
          }

          const files = await Promise.all(
            entries
              .filter((entry) => entry.isFile())
              .map(async (entry) => {
                const extension = extname(entry.name).toLowerCase();
                if (!ALLOWED_FILE_TYPES[extension]) {
                  return null;
                }

                const absolutePath = join(bucketPath, entry.name);

                try {
                  const fileStats = await stat(absolutePath);
                  const id = extension
                    ? entry.name.slice(0, Math.max(0, entry.name.length - extension.length))
                    : entry.name;
                  const metadata = await this.readStoredMetadata(bucketPath, id);

                  const uploadedAt =
                    typeof metadata?.uploadedAt === 'string' && !Number.isNaN(Date.parse(metadata.uploadedAt))
                      ? metadata.uploadedAt
                      : fileStats.mtime.toISOString();

                  const mimeType =
                    typeof metadata?.mimeType === 'string' && metadata.mimeType.trim()
                      ? metadata.mimeType
                      : (ALLOWED_FILE_TYPES[extension] || [null])[0];

                  const originalName =
                    typeof metadata?.originalName === 'string' && metadata.originalName.trim()
                      ? metadata.originalName
                      : entry.name;

                  const recordedSize = Number(metadata?.size);
                  const size = Number.isFinite(recordedSize) && recordedSize > 0
                    ? recordedSize
                    : fileStats.size;

                  return {
                    id,
                    originalName,
                    storedName: entry.name,
                    path: `tmp/uploads/general/${bucket.name}/${entry.name}`,
                    mimeType,
                    size,
                    extension,
                    uploadedAt,
                  } as ListedGeneralFile;
                } catch {
                  return null;
                }
              }),
          );

          return files.filter((item): item is ListedGeneralFile => item !== null);
        }),
    );

    return filesByBucket
      .flat()
      .sort((left, right) => {
        const leftTime = Date.parse(left.uploadedAt);
        const rightTime = Date.parse(right.uploadedAt);
        return rightTime - leftTime;
      });
  }

  private assertUploadableFile(file?: Express.Multer.File) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is required');
    }

    const extension = extname(String(file.originalname || '')).toLowerCase();
    if (!extension || !ALLOWED_FILE_TYPES[extension]) {
      throw new BadRequestException(
        `Unsupported file type. Allowed extensions: ${GENERAL_FILE_EXTENSIONS.join(', ')}`,
      );
    }
  }

  private assertAllowedMimeType(extension: string, mimeType?: string) {
    const normalizedMime = String(mimeType || '').toLowerCase();
    const allowedMimeTypes = ALLOWED_FILE_TYPES[extension] || [];

    if (!normalizedMime) {
      throw new BadRequestException('File MIME type is missing');
    }

    if (
      !allowedMimeTypes.includes(normalizedMime) &&
      !GENERIC_MIME_TYPES.has(normalizedMime)
    ) {
      throw new BadRequestException(
        `MIME type ${normalizedMime} is not allowed for ${extension} files`,
      );
    }
  }

  private sanitizeFileName(name: string) {
    const safeBaseName = basename(name).replace(/[^a-zA-Z0-9._()\- ]+/g, '_').trim();
    const normalizedName = safeBaseName || 'upload.bin';

    if (normalizedName.length <= 120) {
      return normalizedName;
    }

    const extension = extname(normalizedName);
    const stem = normalizedName.slice(0, normalizedName.length - extension.length);
    const maxStemLength = Math.max(1, 120 - extension.length);

    return `${stem.slice(0, maxStemLength)}${extension}`;
  }

  private getMetadataFileName(fileId: string) {
    return `${fileId}.meta.json`;
  }

  private async readStoredMetadata(bucketPath: string, fileId: string) {
    const metadataPath = join(bucketPath, this.getMetadataFileName(fileId));

    try {
      const raw = await readFile(metadataPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoredGeneralFileMetadata>;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }
}
