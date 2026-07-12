import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

let configured = false;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
  );
}

export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}
