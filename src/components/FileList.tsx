import React from "react";
import { formatBytes } from "@/src/lib/utils";
import { ImageFile } from "@/src/types";

interface FileListProps {
  files: ImageFile[];
  onRemove: (id: string) => void;
  onDownloadToken: (file: ImageFile) => void;
}

export function FileList({ files, onRemove, onDownloadToken }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <table className="w-full text-left border-collapse table-fixed">
      <thead className="bg-[#EBEBE6] text-[10px] uppercase tracking-widest text-[#8A8A85] sticky top-0 z-10">
        <tr>
          <th className="px-6 py-2 font-semibold w-[35%]">文件名</th>
          <th className="px-4 py-2 font-semibold hidden md:table-cell w-[15%]">大小</th>
          <th className="px-4 py-2 font-semibold hidden sm:table-cell w-[10%]">状态</th>
          <th className="px-4 py-2 font-semibold w-[30%]">预览重命名</th>
          <th className="px-6 py-2 font-semibold text-right w-[10%]">操作</th>
        </tr>
      </thead>
      <tbody className="text-sm divide-y divide-[#EBEBE6] bg-transparent">
        {files.map((file) => {
          let statusText = "等待";
          let statusColor = "opacity-60";
          
          if (file.status === "processing") {
            statusText = "转换中";
            statusColor = "text-blue-600 font-bold opacity-100";
          } else if (file.status === "done") {
            statusText = "完成";
            statusColor = "text-green-600 font-bold opacity-100";
          } else if (file.status === "error") {
            statusText = "失败";
            statusColor = "text-red-600 font-bold opacity-100";
          }

          return (
            <tr key={file.id} className="hover:bg-[#F9F9F7] transition-colors group">
              <td className="px-6 py-4 font-medium truncate" title={file.originalName}>
                {file.originalName}
              </td>
              <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="opacity-60">{formatBytes(file.originalFile.size)}</span>
                  {file.blob && (
                    <span className="text-green-600 font-bold">
                      → {formatBytes(file.blob.size)}
                    </span>
                  )}
                </div>
              </td>
              <td className={`px-4 py-4 hidden sm:table-cell align-top`}>
                <div className={statusColor}>{statusText}</div>
                {file.status === "error" && file.error && (
                  <div className="text-[10px] font-normal leading-tight mt-1 text-red-500 overflow-hidden text-ellipsis whitespace-normal max-w-[120px]" title={file.error}>
                    {file.error}
                  </div>
                )}
              </td>
              <td className="px-4 py-4 italic truncate" title={file.newName}>
                {file.newName}
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap space-x-3">
                 {file.status === "done" && file.blob && (
                    <button 
                      onClick={() => onDownloadToken(file)}
                      className="text-xs uppercase font-bold tracking-widest hover:text-black text-[#8A8A85] transition-colors inline-block"
                    >
                      下载
                    </button>
                 )}
                 <button 
                  onClick={() => onRemove(file.id)}
                  className="text-xs uppercase font-bold tracking-widest hover:text-red-600 text-[#8A8A85] transition-colors inline-block"
                 >
                  移除
                 </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
