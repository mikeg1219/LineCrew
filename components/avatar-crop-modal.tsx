"use client";

import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useCallback, useState } from "react";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onSkipCrop: () => void;
  onApplyCrop: (pixelCrop: Area) => void;
};

export function AvatarCropModal({
  imageSrc,
  onCancel,
  onSkipCrop,
  onApplyCrop,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_area: Area, areaPixels: Area) => {
      setCroppedAreaPixels(areaPixels);
    },
    []
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2
            id="avatar-crop-title"
            className="text-base font-semibold text-slate-900"
          >
            Crop photo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pinch or drag to adjust. Square area uploads as your avatar.
          </p>
        </div>

        <div className="relative min-h-[min(72vw,20rem)] w-full flex-1 bg-slate-900 sm:min-h-[22rem]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="cover"
          />
        </div>

        <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
          <label className="mb-3 flex items-center gap-3 text-sm text-slate-700">
            <span className="shrink-0 font-medium">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="min-h-[44px] w-full accent-blue-600"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[48px] rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:min-w-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSkipCrop}
              className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Skip cropping
            </button>
            <button
              type="button"
              onClick={() => {
                if (croppedAreaPixels) {
                  onApplyCrop(croppedAreaPixels);
                }
              }}
              disabled={!croppedAreaPixels}
              className="min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              Use cropped photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
