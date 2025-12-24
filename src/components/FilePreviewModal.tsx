'use client';

import { useEffect, useRef } from 'react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
  fileType: 'csv' | 'json';
  downloadUrl: string;
  downloadLabel: string;
  closeLabel: string;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileName,
  content,
  fileType,
  downloadUrl,
  downloadLabel,
  closeLabel,
}: FilePreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format JSON content for display
  const displayContent = fileType === 'json'
    ? formatJson(content)
    : content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-medium truncate">{fileName}</h3>
          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              download={fileName}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {downloadLabel}
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {closeLabel}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className={`text-sm font-mono whitespace-pre-wrap break-all ${
            fileType === 'json' ? 'text-neutral-800 dark:text-neutral-200' : ''
          }`}>
            {displayContent}
          </pre>
        </div>
      </div>
    </div>
  );
}

function formatJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}
