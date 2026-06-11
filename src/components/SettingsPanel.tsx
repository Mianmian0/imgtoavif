import React from 'react';
import { AppSettings } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export function SettingsPanel({ settings, setSettings }: SettingsPanelProps) {
  const handleSettingChange = (field: keyof AppSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const formats = [
    { id: 'image/avif', label: 'AVIF' },
    { id: 'image/jpeg', label: 'JPEG' },
    { id: 'image/png', label: 'PNG' },
    { id: 'image/webp', label: 'WEBP' },
  ];

  return (
    <div className="flex flex-col space-y-8 w-full select-none">
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A8A85] border-b border-[#D1D1CB] pb-2">
          转换格式
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => handleSettingChange('targetFormat', fmt.id)}
              className={cn(
                "h-12 border flex items-center justify-center font-bold text-sm transition-colors",
                settings.targetFormat === fmt.id
                  ? "bg-black text-white border-black"
                  : "border-[#D1D1CB] hover:border-black text-[#1A1A1A]"
              )}
            >
              转换为 {fmt.label}
            </button>
          ))}
        </div>

        {settings.targetFormat !== 'image/png' && (
          <div className="pt-2">
            <div className="flex justify-between text-[10px] font-medium opacity-50 uppercase mb-2">
              <label>图像质量</label>
              <span>{Math.round(settings.quality * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={settings.quality}
              onChange={(e) => handleSettingChange('quality', parseFloat(e.target.value))}
              className="w-full h-1 bg-[#D1D1CB] rounded-none appearance-none cursor-pointer accent-black outline-none"
            />
          </div>
        )}

        <div className="pt-2">
          <label className="text-[10px] font-medium opacity-50 uppercase block mb-2">图片缩放倍数</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((scaleOption) => (
              <button
                key={scaleOption}
                onClick={() => handleSettingChange('scale', scaleOption)}
                className={cn(
                  "h-9 text-xs border transition-colors font-medium",
                  settings.scale === scaleOption
                    ? "border-black bg-black text-white"
                    : "border-[#D1D1CB] text-[#1A1A1A] hover:border-black"
                )}
              >
                {scaleOption}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A8A85] border-b border-[#D1D1CB] pb-2">
          批量重命名
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium opacity-50 uppercase">前缀</label>
            <input
              type="text"
              value={settings.prefix}
              onChange={(e) => handleSettingChange('prefix', e.target.value)}
              placeholder="例如: AVIF_"
              className="w-full h-10 px-3 bg-[#F4F4F1] border-none focus:ring-1 focus:ring-black outline-none text-sm placeholder:text-[#8A8A85]/50 transition-shadow"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium opacity-50 uppercase">后缀</label>
            <input
              type="text"
              value={settings.suffix}
              onChange={(e) => handleSettingChange('suffix', e.target.value)}
              placeholder="例如: _v2"
              className="w-full h-10 px-3 bg-[#F4F4F1] border-none focus:ring-1 focus:ring-black outline-none text-sm placeholder:text-[#8A8A85]/50 transition-shadow"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-4">
          <label className="text-[10px] font-medium opacity-50 uppercase">查找并替换</label>
          <div className="flex border border-[#F4F4F1] focus-within:ring-1 focus-within:ring-black transition-shadow">
            <input
              type="text"
              value={settings.findStr}
              onChange={(e) => handleSettingChange('findStr', e.target.value)}
              placeholder="查找字符"
              className="w-1/2 h-10 px-3 bg-[#F4F4F1] border-r border-[#EBEBE6] outline-none text-sm placeholder:text-[#8A8A85]/50"
            />
            <input
              type="text"
              value={settings.replaceStr}
              onChange={(e) => handleSettingChange('replaceStr', e.target.value)}
              placeholder="替换为"
              className="w-1/2 h-10 px-3 bg-[#F4F4F1] outline-none text-sm placeholder:text-[#8A8A85]/50"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-medium opacity-50 uppercase block mb-2">字母大小写</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'capitalizeFirst', label: '首字大写' },
              { id: 'titleCase', label: '单词首字母大写' },
              { id: 'upper', label: '全部大写' },
              { id: 'lower', label: '全部小写' },
              { id: 'none', label: '不转换' }
            ].map((caseOption) => (
              <button
                key={caseOption.id}
                onClick={() => handleSettingChange('casing', caseOption.id)}
                className={cn(
                  "h-9 text-xs border transition-colors font-medium",
                  settings.casing === caseOption.id
                    ? "border-black bg-black text-white"
                    : "border-[#D1D1CB] text-[#1A1A1A] hover:border-black",
                  caseOption.id === 'none' && "col-span-2"
                )}
              >
                {caseOption.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
