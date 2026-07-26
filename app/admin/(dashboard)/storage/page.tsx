"use client";

import { useState, useEffect } from "react";
import {
  HardDrive,
  Upload,
  Search,
  Trash2,
  File,
  FileText,
  Image,
  FileArchive,
  RefreshCw,
} from "lucide-react";

interface StorageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  entityType: string;
  uploadedAt: string;
}

interface StorageInfo {
  usedBytes: number;
  maxBytes: number;
  fileCount: number;
}

export default function StoragePage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usedBytes: 0,
    maxBytes: 1073741824,
    fileCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (entityFilter) params.set("entity", entityFilter);

      const [filesRes, infoRes] = await Promise.all([
        fetch(`/api/storage/files?${params.toString()}`),
        fetch("/api/storage/info"),
      ]);

      if (filesRes.ok) {
        const data = await filesRes.json();
        setFiles(data.files || []);
      }
      if (infoRes.ok) {
        const data = await infoRes.json();
        setStorageInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch storage data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, entityFilter]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      fetchData();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await fetch(`/api/storage/files/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const usagePercentage =
    storageInfo.maxBytes > 0
      ? (storageInfo.usedBytes / storageInfo.maxBytes) * 100
      : 0;

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <Image className="w-4 h-4" />;
    if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
    if (type.includes("zip") || type.includes("archive"))
      return <FileArchive className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-oswald font-bold text-white">Storage</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage file storage and monitor usage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <label className="px-4 py-2 bg-signal text-ink text-sm font-bold rounded-lg hover:bg-signal/90 transition-colors cursor-pointer shadow-[0_0_15px_rgba(247,198,0,0.3)]">
            <Upload className="w-4 h-4 inline mr-2" />
            Upload
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-oswald font-semibold text-white">
            Storage Usage
          </h2>
          <span className="text-sm text-gray-400">
            {storageInfo.fileCount} files
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">
              {formatBytes(storageInfo.usedBytes)} used
            </span>
            <span className="text-gray-400">
              {formatBytes(storageInfo.maxBytes)} max
            </span>
          </div>
          <div className="h-3 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercentage > 90
                  ? "bg-red-500"
                  : usagePercentage > 70
                  ? "bg-yellow-500"
                  : "bg-signal"
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {usagePercentage.toFixed(1)}% used
          </p>
        </div>
      </div>

      {/* File List */}
      <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-signal/50"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-signal/50"
            >
              <option value="">All Types</option>
              <option value="document">Documents</option>
              <option value="template">Templates</option>
              <option value="attachment">Attachments</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No files found
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-surface rounded-lg mr-3">
                          {getFileIcon(file.type)}
                        </div>
                        <span className="text-sm text-white">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">{file.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {formatBytes(file.size)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
