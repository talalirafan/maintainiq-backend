import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { getCloudinary, isCloudinaryConfigured } from '../../cloudinary/client.js';

export interface UploadedEvidence {
  url: string;
  publicId?: string;
  resourceType: 'image' | 'video' | 'raw';
  mimeType?: string;
  originalName?: string;
  bytes?: number;
}

function detectResourceType(mimeType?: string): 'image' | 'video' | 'raw' {
  if (!mimeType) return 'raw';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
}

export class UploadService {
  async uploadEvidence(file: Express.Multer.File): Promise<UploadedEvidence> {
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const resourceType = detectResourceType(file.mimetype);
    const maxBytes = env.maxUploadSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new AppError(`File exceeds ${env.maxUploadSizeMb}MB limit`, 400);
    }

    if (isCloudinaryConfigured()) {
      const cloudinary = getCloudinary();
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
        bytes: number;
        resource_type: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${env.cloudinary.folder}/evidence`,
            resource_type: resourceType === 'raw' ? 'auto' : resourceType,
          },
          (error, uploaded) => {
            if (error || !uploaded) {
              reject(error ?? new Error('Upload failed'));
              return;
            }
            resolve({
              secure_url: uploaded.secure_url,
              public_id: uploaded.public_id,
              bytes: uploaded.bytes,
              resource_type: uploaded.resource_type,
            });
          },
        );
        stream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
        mimeType: file.mimetype,
        originalName: file.originalname,
        bytes: result.bytes,
      };
    }

    // Local fallback when Cloudinary is not configured (development)
    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'evidence');
    await mkdir(uploadsDir, { recursive: true });
    const ext = path.extname(file.originalname) || '';
    const filename = `${randomUUID()}${ext}`;
    await writeFile(path.join(uploadsDir, filename), file.buffer);

    return {
      url: `${env.apiBaseUrl}/uploads/evidence/${filename}`,
      publicId: `local/${filename}`,
      resourceType,
      mimeType: file.mimetype,
      originalName: file.originalname,
      bytes: file.size,
    };
  }
}

export const uploadService = new UploadService();
