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

  const traverseFileTree = async (item: any, path: string = ''): Promise<File[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          Object.defineProperty(file, 'customRelativePath', {
            value: path + file.name
          });
          resolve([file]);
        });
      } else if (item.isDirectory) {
        let dirReader = item.createReader();
        let files: File[] = [];
        
        const readEntries = () => {
          dirReader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              resolve(files);
            } else {
              const promises = entries.map(entry => traverseFileTree(entry, path + item.name + "/"));
              const results = await Promise.all(promises);
              files = files.concat(...results);
              readEntries();
            }
          });
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.items) {
        const items = Array.from(e.dataTransfer.items).map(item => item.webkitGetAsEntry()).filter(Boolean);
        let allFiles: File[] = [];
        for (const item of items) {
            const files = await traverseFileTree(item);
            allFiles = allFiles.concat(files);
        }
        
        const imageFiles = allFiles.filter(f => f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|avif)$/i));
        if (imageFiles.length > 0) {
          onFilesSelected(imageFiles);
        }
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|avif)$/i));
        onFilesSelected(imageFiles);
      }
    },
    [onFilesSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|avif)$/i));
        onFilesSelected(imageFiles);
        e.target.value = "";
      }
    },
    [onFilesSelected]
  );
  
  const handleDirectoryPicking = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // @ts-ignore
      if (window.showDirectoryPicker) {
        // @ts-ignore
        const directoryHandle = await window.showDirectoryPicker();
        const files: File[] = [];
        
        async function scanDirectory(dirHandle: any, currentPath: string = '') {
          for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|avif)$/i)) {
                 Object.defineProperty(file, 'customRelativePath', {
                   value: currentPath + file.name
                 });
                 files.push(file);
              }
            } else if (entry.kind === 'directory') {
              await scanDirectory(entry, currentPath + entry.name + '/');
            }
          }
        }
        
        await scanDirectory(directoryHandle, '');
        if (files.length > 0) {
          onFilesSelected(files, directoryHandle);
        }
      } else {
        alert("您的浏览器不支持直接选择文件夹，请使用拖拽文件夹的方式。");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('User cancelled directory picker');
        return;
      }
      console.error(err);
      alert("无法打开文件夹选择器。这通常是因为安全限制（例如您正在预览窗口中操作）。\n\n请点击页面右上角（分享按钮旁边）的【在新标签页里打开（Open in new tab）】按钮即可正常使用！");
    }
  }, [onFilesSelected]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full transition-colors text-center border-b border-[#D1D1CB]",
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
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleChange}
        title=""
      />
      
      <div className="relative z-20 flex flex-col items-center gap-4 pointer-events-none px-4">
        {isDragActive ? (
          <p className="text-base font-bold uppercase tracking-widest">
            松开以处理文件夹或文件
          </p>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm font-bold tracking-widest text-[#666]">
                 支持拖拽整个文件夹或多个文件 (AVIF, PNG, JPG, WEBP)
              </p>
            </div>
            
            <button 
              onClick={handleDirectoryPicking}
              className="pointer-events-auto border border-[#D1D1CB] bg-white px-6 py-3 text-sm font-bold tracking-widest hover:border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              点击或拖拽上传
            </button>
          </>
        )}
      </div>
    </div>
  );
}
