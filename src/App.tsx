import React, { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { UploadZone } from "./components/UploadZone";
import { SettingsPanel } from "./components/SettingsPanel";
import { FileList } from "./components/FileList";
import { AppSettings, ImageFile } from "./types";
import { DownloadCloud, Play, Loader2, RefreshCw } from "lucide-react";

const MIME_TO_EXT: Record<string, string> = {
  "image/avif": "avif",
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export default function App() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [sourceDirHandle, setSourceDirHandle] = useState<any>(null);
  const [settings, setSettings] = useState<AppSettings>({
    targetFormat: "image/avif",
    quality: 0.8,
    prefix: "",
    suffix: "",
    findStr: "",
    replaceStr: "",
    casing: "none",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [needsReconvert, setNeedsReconvert] = useState(false);
  const prevSettingsRef = useRef(settings);

  const getNewName = useCallback((originalName: string, config: AppSettings) => {
    const extIdx = originalName.lastIndexOf(".");
    const baseName = extIdx !== -1 ? originalName.slice(0, extIdx) : originalName;

    let newBase = baseName;
    if (config.findStr) {
      newBase = newBase.split(config.findStr).join(config.replaceStr);
    }

    if (config.casing === "capitalizeFirst") {
      newBase = newBase.charAt(0).toUpperCase() + newBase.slice(1);
    } else if (config.casing === "titleCase") {
      newBase = newBase.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
      });
    } else if (config.casing === "upper") {
      newBase = newBase.toUpperCase();
    } else if (config.casing === "lower") {
      newBase = newBase.toLowerCase();
    }

    newBase = `${config.prefix}${newBase}${config.suffix}`;
    const ext = MIME_TO_EXT[config.targetFormat] || "avif";

    return `${newBase}.${ext}`;
  }, []);

  useEffect(() => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.status === "done" || f.status === "processing") return f;
        return {
          ...f,
          newName: getNewName(f.originalName, settings),
        };
      })
    );
  }, [settings, getNewName]);

  useEffect(() => {
    if (JSON.stringify(settings) !== JSON.stringify(prevSettingsRef.current)) {
      prevSettingsRef.current = settings;
      if (files.some(f => f.status === "done" || f.status === "error")) {
        setNeedsReconvert(true);
      }
    }
  }, [settings, files]);

  const handleFilesAdded = (newFiles: File[], dirHandle?: any) => {
    if (dirHandle) {
      setSourceDirHandle(dirHandle);
    } else {
      setSourceDirHandle(null);
    }
    const newImageFiles: ImageFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7) + Date.now().toString(),
      originalFile: file,
      originalName: file.name,
      newName: getNewName(file.name, settings),
      // @ts-ignore
      relativePath: file.customRelativePath || file.webkitRelativePath || file.name,
      status: "pending",
      previewUrl: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...newImageFiles]);
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx !== -1 && prev[idx].previewUrl) {
         URL.revokeObjectURL(prev[idx].previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearAll = () => {
    files.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  };

  const convertSingleImage = async (fileRec: ImageFile): Promise<{blob: Blob, ext: string}> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(fileRec.originalFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        canvas.toBlob((blob) => {
          if (blob) {
            if (blob.type === 'image/png' && settings.targetFormat !== 'image/png') {
              canvas.toBlob((fallbackBlob) => {
                if (fallbackBlob && fallbackBlob.type === 'image/webp') {
                  resolve({ blob: fallbackBlob, ext: 'webp' });
                } else {
                  resolve({ blob, ext: 'png' });
                }
              }, 'image/webp', settings.quality);
            } else {
              const ext = blob.type.split('/')[1] || settings.targetFormat.split('/')[1];
              resolve({ blob, ext: ext === 'jpeg' ? 'jpg' : ext });
            }
          } else {
            reject(new Error("Conversion failed. Format might not be supported natively by your browser."));
          }
        }, settings.targetFormat, settings.quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for local conversion"));
      };
      img.src = url;
    });
  };

  const startConversion = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    let currentFiles = files;
    if (needsReconvert) {
      currentFiles = currentFiles.map(f => ({ ...f, status: 'pending' as const, blob: undefined }));
      setFiles(currentFiles);
      setNeedsReconvert(false);
    }

    const pendingFiles = currentFiles.filter(f => f.status === 'pending' || f.status === 'error');
    
    for (const f of pendingFiles) {
      setFiles((prev) => prev.map(item => item.id === f.id ? { ...item, status: 'processing' } : item));
      try {
        const { blob, ext } = await convertSingleImage(f);
        
        const originalBaseName = f.originalName.substring(0, f.originalName.lastIndexOf('.'));
        const originalBase = originalBaseName || f.originalName;
        
        let newBase = originalBase;
        if (settings.findStr) {
          newBase = newBase.split(settings.findStr).join(settings.replaceStr);
        }
        if (settings.casing === "capitalizeFirst") {
          newBase = newBase.charAt(0).toUpperCase() + newBase.slice(1);
        } else if (settings.casing === "titleCase") {
          newBase = newBase.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
        } else if (settings.casing === "upper") {
          newBase = newBase.toUpperCase();
        } else if (settings.casing === "lower") {
          newBase = newBase.toLowerCase();
        }
        
        const finalName = `${settings.prefix}${newBase}${settings.suffix}.${ext}`;
        
        setFiles((prev) => prev.map(item => item.id === f.id ? { ...item, status: 'done', blob, newName: finalName } : item));
      } catch (err: any) {
        setFiles((prev) => prev.map(item => item.id === f.id ? { ...item, status: 'error', error: err.message } : item));
      }
      
      await new Promise(r => setTimeout(r, 10)); // Yield for UI update
    }
    
    setIsProcessing(false);
  };

  const handleSaveToDirectory = async (mode: 'replace' | 'copy') => {
    let destDirHandle: any = null;
    try {
      // @ts-ignore
      if (!window.showDirectoryPicker) {
        alert("您的浏览器不支持直接写入文件夹功能，请使用“下载 ZIP”。");
        return;
      }

      if (mode === 'replace') {
        if (!sourceDirHandle) {
          alert("由于您是拖拽上传或选择的文件，因此我们没有原文件夹的写入权限。请使用“平移到新文件夹”。");
          return;
        }
        destDirHandle = sourceDirHandle;
        if ((await destDirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
          if ((await destDirHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
            console.log("Write permission denied for source directory");
            return;
          }
        }
      } else {
        // @ts-ignore
        destDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
      alert("无法打开文件夹选择器。这通常是因为安全限制（例如您正在预览窗口中操作）。\n\n请在新标签页中打开使用直接保存功能！");
      return;
    }

    const doneFiles = files.filter(f => f.status === 'done' && f.blob);
    for (const f of doneFiles) {
      const rawPath = f.relativePath || f.originalName;
      const pathParts = rawPath.split('/').filter(Boolean);
      pathParts[pathParts.length - 1] = f.newName || f.originalName;

      let currentDirHandle = destDirHandle;
      try {
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentDirHandle = await currentDirHandle.getDirectoryHandle(pathParts[i], { create: true });
        }
        
        const fileHandle = await currentDirHandle.getFileHandle(pathParts[pathParts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(f.blob);
        await writable.close();

        if (mode === 'replace' && f.originalName !== f.newName) {
          try {
            await currentDirHandle.removeEntry(f.originalName);
          } catch (delErr) {
            console.warn("未能删除原文件", f.originalName, delErr);
          }
        }
      } catch (writeErr) {
        console.error("Error writing to relative path, falling back. ", writeErr);
        try {
          const fileHandle = await destDirHandle.getFileHandle(f.newName || f.originalName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(f.blob);
          await writable.close();
        } catch (fbErr) {
          console.error("Fallback write failed", fbErr);
        }
      }
    }
    
    alert(`成功保存 ${doneFiles.length} 个文件到文件夹！`);
  };

  const handleDownloadSingle = (file: ImageFile) => {
    if (!file.blob) return;
    saveAs(file.blob, file.newName);
  };

  const handleDownloadAllZip = async () => {
    const doneFiles = files.filter(f => f.status === 'done' && f.blob);
    if (doneFiles.length === 0) return;

    const zip = new JSZip();
    doneFiles.forEach(f => {
      const rawPath = f.relativePath || f.originalName;
      const pathParts = rawPath.split('/').filter(Boolean);
      pathParts[pathParts.length - 1] = f.newName || f.originalName;
      zip.file(pathParts.join('/'), f.blob!);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Avified_Export_${new Date().getTime()}.zip`);
  };

  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error');
  const hasDone = files.some(f => f.status === 'done');
  
  const totalSize = files.reduce((acc, curr) => acc + curr.originalFile.size, 0);
  const formattedSize = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="h-screen w-full bg-[#F4F4F1] text-[#1A1A1A] flex flex-col font-sans overflow-hidden selection:bg-[#D1D1CB]">
      <header className="h-16 px-6 lg:px-8 border-b border-[#D1D1CB] flex items-center justify-between bg-white/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-black text-xl italic">A</div>
          <h1 className="text-2xl font-bold tracking-tighter">
            AVIFIED <span className="text-xs font-normal tracking-widest text-[#8A8A85] ml-2 italic hidden sm:inline-block">专业图像转换</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column */}
        <section className="flex-1 min-w-0 border-b lg:border-b-0 lg:border-r border-[#D1D1CB] flex flex-col bg-white lg:bg-white/30 overflow-hidden">
          <div className="p-6 flex justify-between items-end border-b border-[#D1D1CB] shrink-0">
            <div>
              <h2 className="text-3xl font-serif italic leading-none">待处理队列</h2>
              <p className="text-xs text-[#8A8A85] mt-1 uppercase tracking-widest">
                已选择 {files.length} 个文件 {files.length > 0 && `· 共 ${formattedSize} MB`}
              </p>
            </div>
            {files.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={isProcessing}
                  className="px-4 py-2 hover:bg-black hover:text-white border border-black text-[#1A1A1A] transition-colors text-xs font-bold disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#1A1A1A] uppercase tracking-widest"
                >
                  清空队列
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col w-full relative">
            <UploadZone onFilesSelected={handleFilesAdded} compact={files.length > 0} />
            <FileList files={files} onRemove={handleRemove} onDownloadToken={handleDownloadSingle} />
          </div>
        </section>

        {/* Right Column */}
        <aside className="w-full lg:w-[400px] xl:w-[480px] shrink-0 bg-white flex flex-col p-6 lg:p-8 gap-8 overflow-y-auto">
          <SettingsPanel settings={settings} setSettings={setSettings} />
          
          <div className="mt-auto pt-8 flex flex-col gap-4">
             <button
                onClick={startConversion}
                disabled={files.length === 0 || (!hasPending && !needsReconvert) || isProcessing}
                className={`w-full h-16 ${needsReconvert ? "bg-[#0055FF]" : "bg-black"} text-white font-bold flex items-center justify-center px-6 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin shrink-0 mr-3" /> : (needsReconvert ? <RefreshCw className="w-6 h-6 shrink-0 mr-3" /> : <Play className="w-6 h-6 fill-current shrink-0 mr-3" />)}
                <span className="text-lg tracking-widest uppercase">
                  {needsReconvert ? "重新转换" : "开始转换"}
                </span>
              </button>

             <div className="flex gap-2">
                <button
                  onClick={() => setShowReplaceModal(true)}
                  disabled={!hasDone || isProcessing}
                  title="在原文件夹覆盖原文件（如果文件后缀更改，则会尝试删除原文件）"
                  className="w-1/4 h-12 bg-[#FFF3F3] text-[#D80000] border border-[#FFD6D6] font-bold flex items-center justify-center hover:bg-[#FFE6E6] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs tracking-widest uppercase truncate px-2">风险: 替换原文件</span>
                </button>
                <button
                  onClick={() => handleSaveToDirectory('copy')}
                  disabled={!hasDone || isProcessing}
                  title="将转换后的结果保存到一个新的文件夹副本中"
                  className="flex-1 h-12 bg-white text-black border border-black font-bold flex items-center justify-center px-4 hover:bg-[#F9F9F7] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs tracking-widest uppercase truncate ml-2">平移到新文件夹</span>
                </button>
                <button
                  onClick={handleDownloadAllZip}
                  disabled={!hasDone || isProcessing}
                  className="w-[120px] h-12 bg-white text-black border border-[#D1D1CB] font-bold flex items-center justify-center gap-2 hover:bg-[#F9F9F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DownloadCloud className="w-4 h-4 shrink-0" />
                  <span className="text-xs tracking-widest uppercase truncate relative top-[1px]">ZIP下载</span>
                </button>
              </div>
          </div>
        </aside>
      </main>

      <footer className="h-10 px-8 bg-[#EBEBE6] border-t border-[#D1D1CB] flex items-center justify-between text-[10px] font-medium tracking-widest uppercase text-[#8A8A85] shrink-0">
        <div>磁盘空间剩余: 无限制 (基于浏览器内存)</div>
        <div>版本 1.0.4 - 引擎: AOMedia 3.1.2</div>
      </footer>

      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl border border-black">
            <h3 className="text-xl font-bold mb-4 text-[#D80000]">⚠️ 风险操作确认</h3>
            <p className="text-sm text-[#1A1A1A] mb-6 leading-relaxed">
              此操作将会用转换后的文件<strong>不可恢复地覆盖</strong>您的原文件（如果格式改变，还可能尝试删除原文件）。建议您在执行此操作前已做好备份。
            </p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setShowReplaceModal(false)}
                className="px-6 py-2 border border-[#D1D1CB] font-bold text-sm tracking-widest uppercase hover:bg-[#F4F4F1] transition-colors text-[#1A1A1A]"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setShowReplaceModal(false);
                  handleSaveToDirectory('replace');
                }}
                className="px-6 py-2 bg-[#D80000] text-white font-bold text-sm tracking-widest uppercase hover:bg-[#a60000] transition-colors"
              >
                确认替换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
