const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    publicId: string;
    format: string;
    size: number;
    width?: number;
    height?: number;
  };
}

export interface MultipleUploadResponse {
  success: boolean;
  message: string;
  data: {
    files: Array<{
      originalName: string;
      url: string;
      publicId: string;
      format: string;
      size: number;
      width?: number;
      height?: number;
    }>;
    errors?: Array<{
      file: string;
      error: string;
    }>;
  };
}

class UploadService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async uploadSingle(file: File, folder: string = 'avatars'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${API_BASE_URL}/upload/single`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload file');
    }

    return await response.json();
  }

  async uploadMultiple(files: File[], folder: string = 'general'): Promise<MultipleUploadResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('folder', folder);

    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload files');
    }

    return await response.json();
  }

  async deleteFile(publicId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/upload/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Delete failed' }));
      throw new Error(error.message || 'Failed to delete file');
    }

    return await response.json();
  }

  async uploadAvatar(file: File): Promise<string> {
    const result = await this.uploadSingle(file, 'avatars');
    return result.data.url;
  }

  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a valid image file (JPEG, PNG, or WebP)',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image size must be less than 5MB',
      };
    }

    return { valid: true };
  }

  async compressImage(file: File, maxWidth: number = 800): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        
        img.onerror = () => reject(new Error('Image loading failed'));
      };
      
      reader.onerror = () => reject(new Error('File reading failed'));
    });
  }
}

export const uploadService = new UploadService();
