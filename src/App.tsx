import React, { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { UploadZone } from "./components/UploadZone";
import { SettingsPanel } from "./components/SettingsPanel";
import { FileList } from "./components/FileList";
import { AppSettings, ImageFile } from "./types";
import { DownloadCloud, Play, Loader2 } from "lucide-react";

const MIME_TO_EXT: Record<string, string> = {
  "image/avif": "avif",
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export default function App() {
  const [files, setFiles] = useState<ImageFile[]>([]);
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

  const handleFilesAdded = (newFiles: File[]) => {
    const newImageFiles: ImageFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7) + Date.now().toString(),
      originalFile: file,
      originalName: file.name,
      newName: getNewName(file.name, settings),
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

  const convertSingleImage = async (fileRec: ImageFile): Promise<Blob> => {
    const formData = new FormData();
    formData.append("image", fileRec.originalFile);
    formData.append("targetFormat", settings.targetFormat);
    formData.append("quality", String(settings.quality));

    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}: Failed to convert image`);
    }

    return await response.blob();
  };

  const startConversion = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    
    for (const f of pendingFiles) {
      setFiles((prev) => prev.map(item => item.id === f.id ? { ...item, status: 'processing', newName: getNewName(item.originalName, settings) } : item));
      try {
        const blob = await convertSingleImage(f);
        setFiles((prev) => prev.map(item => item.id === f.id ? { ...item, status: 'done', blob } : item));
      } catch (err: any) {
        setFiles((prev) => prev.map(item => item.id === f.id ? { ...item, status: 'error', error: err.message } : item));
      }
      
      await new Promise(r => setTimeout(r, 10));
    }
    
    setIsProcessing(false);
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
      zip.file(f.newName, f.blob!);
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
                disabled={files.length === 0 || !hasPending || isProcessing}
                className="w-full h-16 bg-black text-white font-bold flex items-center justify-between px-6 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg tracking-widest uppercase">开始转换任务 {files.length > 0 && `(${files.filter(f => f.status === 'pending' || f.status === 'error').length})`}</span>
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
              </button>

              <button
                onClick={handleDownloadAllZip}
                disabled={!hasDone || isProcessing}
                className="w-full h-12 bg-white border border-[#D1D1CB] text-[#1A1A1A] font-bold flex items-center justify-center px-6 hover:border-black hover:bg-[#F9F9F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
              >
                <DownloadCloud className="w-5 h-5 mr-2" />
                下载全部为 ZIP
              </button>
          </div>
        </aside>
      </main>

      <footer className="h-10 px-8 bg-[#EBEBE6] border-t border-[#D1D1CB] flex items-center justify-between text-[10px] font-medium tracking-widest uppercase text-[#8A8A85] shrink-0">
        <div>磁盘空间剩余: 无限制 (基于浏览器内存)</div>
        <div>版本 1.0.4 - 引擎: AOMedia 3.1.2</div>
      </footer>
    </div>
  );
}
