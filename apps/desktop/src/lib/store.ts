import { create } from "zustand";
import type { ConversionJob, MediaFile } from "./types";

interface AppState {
  files: MediaFile[];
  jobs: ConversionJob[];
  targetFormat: string;
  presetId?: string;
  addFiles: (files: MediaFile[]) => void;
  removeFile: (path: string) => void;
  clearFiles: () => void;
  setTargetFormat: (format: string) => void;
  setPresetId: (presetId: string) => void;
  addJobs: (jobs: ConversionJob[]) => void;
  updateJob: (job: ConversionJob) => void;
}

export const useAppStore = create<AppState>((set) => ({
  files: [],
  jobs: [],
  targetFormat: "jpg",
  addFiles: (files) =>
    set((state) => ({
      files: [...state.files, ...files].filter(
        (file, index, all) => all.findIndex((candidate) => candidate.path === file.path) === index,
      ),
    })),
  removeFile: (path) =>
    set((state) => ({
      files: state.files.filter((file) => file.path !== path),
    })),
  clearFiles: () => set({ files: [] }),
  setTargetFormat: (targetFormat) => set({ targetFormat }),
  setPresetId: (presetId) => set({ presetId }),
  addJobs: (jobs) => set((state) => ({ jobs: [...jobs, ...state.jobs] })),
  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((item) => (item.id === job.id ? job : item)),
    })),
}));
