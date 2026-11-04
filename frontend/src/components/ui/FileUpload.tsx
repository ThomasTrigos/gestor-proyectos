import React, { useState } from 'react';
import { UploadCloud, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect?: (file: File | undefined) => void;
  onDriveLinkChange?: (link: string) => void;
  maxSizeMB?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onDriveLinkChange,
  maxSizeMB = 5,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [driveLink, setDriveLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo supera los ${maxSizeMB} MB. Cárgalo en Google Drive y pega el enlace abajo.`);
        setSelectedFile(null);
        if (onFileSelect) onFileSelect(undefined);
        return;
      }
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDriveLink(val);
    if (onDriveLinkChange) onDriveLinkChange(val);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors rounded-xl p-5 text-center bg-slate-50/50">
        <input
          type="file"
          className="hidden"
          id="file-upload"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
          <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
          <span className="text-sm font-medium text-slate-700">
            {selectedFile ? selectedFile.name : 'Haz clic para seleccionar archivo'}
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Límite de hasta {maxSizeMB} MB por archivo
          </span>
        </label>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {onDriveLinkChange && (
        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
            O pega un enlace de Google Drive / Almacenamiento en la nube:
          </label>
          <input
            type="url"
            value={driveLink}
            onChange={handleLinkChange}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      )}
    </div>
  );
};
