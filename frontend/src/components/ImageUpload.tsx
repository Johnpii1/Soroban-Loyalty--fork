"use client";

import React, { useState, useRef } from "react";

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
}

export function ImageUpload({ onFileSelect }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2MB");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Invalid file type. Only JPEG, PNG and WebP are allowed.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileSelect(file);
    } else {
      setPreview(null);
      onFileSelect(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="image-upload">
      <label className="form-label">Campaign Banner (optional)</label>
      <div className="upload-container">
        {preview ? (
          <div className="preview-container">
            <img src={preview} alt="Preview" className="image-preview" />
            <button type="button" onClick={handleRemove} className="btn-remove">
              &times;
            </button>
          </div>
        ) : (
          <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
            <div className="upload-icon">📁</div>
            <span>Click to upload image (JPEG, PNG, WebP)</span>
            <span className="upload-subtext">Max size: 2MB</span>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
        />
      </div>

      <style jsx>{`
        .image-upload { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 8px; font-size: 0.875rem; color: var(--text-secondary); }
        .upload-container {
          border: 2px dashed var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-surface);
          transition: border-color 0.2s;
        }
        .upload-container:hover { border-color: var(--accent); }
        .upload-placeholder {
          padding: 32px;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .upload-icon { font-size: 24px; }
        .upload-placeholder span { font-size: 0.875rem; color: var(--text-secondary); }
        .upload-subtext { font-size: 0.75rem !important; opacity: 0.6; }
        .preview-container { position: relative; width: 100%; aspect-ratio: 16/9; }
        .image-preview { width: 100%; height: 100%; object-fit: cover; }
        .btn-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .btn-remove:hover { background: rgba(0,0,0,0.8); }
      `}</style>
    </div>
  );
}
