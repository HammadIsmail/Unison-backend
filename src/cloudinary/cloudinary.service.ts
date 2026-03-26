import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary.response';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload returned no result'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  extractPublicIdFromUrl(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      let pathStr = parts[1];
      // Remove version if present (e.g., v1610000000/)
      if (pathStr.match(/^v\d+\//)) {
        pathStr = pathStr.replace(/^v\d+\//, '');
      }
      // Remove extension (e.g., .jpg)
      const lastDotIndex = pathStr.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        pathStr = pathStr.substring(0, lastDotIndex);
      }
      return pathStr;
    } catch {
      return null;
    }
  }

  async deleteImage(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
        if (error) return reject(error);
        if (result?.result !== 'ok') {
          return reject(new Error(`Cloudinary deletion failed for publicId "${publicId}": ${JSON.stringify(result)}`));
        }
        resolve(result);
      });
    });
  }
}
