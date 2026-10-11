import { create } from "zustand";
import type { AppSettings, ConversionJob, MediaFile, RecentConversionItem, SupportedLanguage } from "./types";

interface AppState {
  files: MediaFile[];
  jobs: ConversionJob[];
  targetFormat: string;
  presetId?: string;
  recentFiles: RecentConversionItem[];
  settings: AppSettings;
  activeTab: "home" | "history" | "settings";
  conversionState: "idle" | "converting" | "complete";
  overallProgress: number;
  completedJobs: ConversionJob[];

  addFiles: (files: MediaFile[]) => void;
  removeFile: (path: string) => void;
  clearFiles: () => void;
  setTargetFormat: (format: string) => void;
  setPresetId: (presetId: string) => void;
  addJobs: (jobs: ConversionJob[]) => void;
  updateJob: (job: ConversionJob) => void;

  addRecentFiles: (items: RecentConversionItem[]) => void;
  removeRecentFile: (id: string) => void;
  clearRecentFiles: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setActiveTab: (tab: "home" | "history" | "settings") => void;
  setConversionState: (state: "idle" | "converting" | "complete") => void;
  setOverallProgress: (progress: number) => void;
  setCompletedJobs: (jobs: ConversionJob[]) => void;
}

const RECENT_STORAGE_KEY = "recast_recent_conversions";
const SETTINGS_STORAGE_KEY = "recast_app_settings";
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "tr", "de", "es", "fr", "it", "ru", "zh", "ja", "ko"];

function loadStoredRecent(): RecentConversionItem[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredRecent(items: RecentConversionItem[]) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // Ignore storage quota or disabled localStorage
  }
}

function loadStoredSettings(): AppSettings {
  const defaultSettings: AppSettings = {
    theme: "system",
    language: "en",
    keepOriginals: true,
    overwriteExisting: false,
    outputFolder: null,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      const savedLang = localStorage.getItem("recast_language");
      if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang as SupportedLanguage)) {
        defaultSettings.language = savedLang as SupportedLanguage;
      }
      return defaultSettings;
    }
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function saveStoredSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota
  }
}

export const useAppStore = create<AppState>((set) => ({
  files: [],
  jobs: [],
  targetFormat: "jpg",
  recentFiles: loadStoredRecent(),
  settings: loadStoredSettings(),
  activeTab: "home",
  conversionState: "idle",
  overallProgress: 0,
  completedJobs: [],

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

  addRecentFiles: (items) =>
    set((state) => {
      const updated = [...items, ...state.recentFiles].filter(
        (item, index, all) => all.findIndex((c) => c.inputPath === item.inputPath && c.timestamp === item.timestamp) === index,
      ).slice(0, 50);
      saveStoredRecent(updated);
      return { recentFiles: updated };
    }),

  removeRecentFile: (id) =>
    set((state) => {
      const updated = state.recentFiles.filter((item) => item.id !== id);
      saveStoredRecent(updated);
      return { recentFiles: updated };
    }),

  clearRecentFiles: () => {
    saveStoredRecent([]);
    set({ recentFiles: [] });
  },

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      saveStoredSettings(updated);
      return { settings: updated };
    }),

  setActiveTab: (activeTab) => set({ activeTab }),
  setConversionState: (conversionState) => set({ conversionState }),
  setOverallProgress: (overallProgress) => set({ overallProgress }),
  setCompletedJobs: (completedJobs) => set({ completedJobs }),
}));
