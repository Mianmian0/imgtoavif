import React, { useCallback, useState } from "react";
import { cn } from "@/src/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
}

export function UploadZone({ onFilesSelected, compact }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(Array.from(e.dataTransfer.files));
      }
    },
    [onFilesSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full transition-colors text-center cursor-pointer border-b border-[#D1D1CB]",
        compact ? "py-6 min-h-[100px]" : "flex-1 min-h-[300px]",
        isDragActive
          ? "bg-[#EBEBE6] text-black"
          : "hover:bg-[#F9F9F7] text-[#1A1A1A]"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="image/*,.avif,.webp"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleChange}
        title=""
      />
      
      <div className="flex flex-col items-center gap-2 pointer-events-none px-4">
        {isDragActive ? (
          <p className="text-base font-bold uppercase tracking-widest">
            松开以上传文件
          </p>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-widest">
              添加图像文件
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
              支持拖拽 或 点击上传 (AVIF, PNG, JPG, WEBP)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
