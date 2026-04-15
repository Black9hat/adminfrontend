import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../AuthContext";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  RefreshCw,
  ChevronRight,
  Mail,
  Phone,
  User,
  Search,
  Trash2,
  X,
  ZoomIn,
  ArrowLeft,
  CheckCheck,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Award,
  Car,
  Bike,
  Truck,
  ExternalLink,
  Download,
  FolderOpen,
  FolderCheck,
} from "lucide-react";

// ============================================
// AUTH TOKEN HELPER
// ============================================
const getAuthToken = (): string => {
  const token = localStorage.getItem("adminToken") || "";
  if (!token) {
    console.error("❌ No authentication token found in localStorage!");
  }
  return token;
};

// ============================================
// API HEADERS HELPER
// ============================================
const getApiHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "ngrok-skip-browser-warning": "true",
  "Content-Type": "application/json",
});

// ============================================
// 🔥 Get Image URL via Backend Proxy
// ============================================
const getProxyImageUrl = (docId: string | undefined): string | null => {
  if (!docId) return null;
  const token = getAuthToken();
  const baseUrl = axiosInstance.defaults.baseURL || "";
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  return `${cleanBaseUrl}/admin/document-image/${docId}?token=${token}`;
};

// ============================================
// 📝 HELPER: Extract file extension from URL
// ============================================
const getFileExtension = (url: string | undefined): string => {
  if (!url) return ".jpg";
  const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
};

// ============================================
// 🔥 Legacy Image URL Helper
// ============================================
const getImageUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  if (url.includes("ngrok-skip-browser-warning")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ngrok-skip-browser-warning=true`;
};

// ============================================
// 📋 DOCUMENT FIELD CONFIGURATIONS
// ============================================
interface DocumentField {
  label: string;
  key: string;
  placeholder?: string;
}

interface DocumentTypeConfig {
  aliases: string[];
  displayName: string;
  fields: DocumentField[];
  verifyLink?: string;
  hasFrontBack: boolean;
}

const DOCUMENT_CONFIGS: Record<string, DocumentTypeConfig> = {
  rc: {
    aliases: ["rc", "registration_certificate", "vehicle_rc"],
    displayName: "Vehicle RC",
    verifyLink: "https://tgtransport.net/TGCFSTONLINE/Reports/VehicleRegistrationSearch.aspx",
    hasFrontBack: true,
    fields: [
      { label: "Owner Name", key: "fullName", placeholder: "Enter owner name" },
      { label: "Registration Number", key: "licenseNumber", placeholder: "e.g., TS09EA1234" },
      { label: "Engine Number", key: "engineNumber", placeholder: "Enter engine number" },
      { label: "Model", key: "model", placeholder: "Enter vehicle model" },
      { label: "Registration Date", key: "registrationDate", placeholder: "DD/MM/YYYY" },
      { label: "Validity Date", key: "validity", placeholder: "DD/MM/YYYY" },
      { label: "Chassis Number", key: "chassisNumber", placeholder: "Enter chassis number" },
      { label: "Vehicle Class", key: "vehicleClass", placeholder: "e.g., LMV, MCWG" },
      { label: "Address", key: "address", placeholder: "Enter owner address" },
    ],
  },
  pan: {
    aliases: ["pan", "pan_card", "pancard"],
    displayName: "PAN Card",
    verifyLink: undefined,
    hasFrontBack: false,
    fields: [
      { label: "PAN Number", key: "licenseNumber", placeholder: "e.g., ABCDE1234F" },
      { label: "Full Name", key: "fullName", placeholder: "Enter full name" },
      { label: "Date of Birth", key: "dob", placeholder: "DD/MM/YYYY" },
    ],
  },
  aadhaar: {
    aliases: ["aadhaar", "aadhar", "aadhaar_card", "aadhar_card", "uid"],
    displayName: "Aadhaar Card",
    verifyLink: "https://myaadhaar.uidai.gov.in/verifyAadhaar",
    hasFrontBack: true,
    fields: [
      { label: "Aadhaar Number", key: "licenseNumber", placeholder: "e.g., 1234 5678 9012" },
      { label: "Name", key: "fullName", placeholder: "Enter name as on Aadhaar" },
      { label: "Date of Birth", key: "dob", placeholder: "DD/MM/YYYY" },
      { label: "Mobile No", key: "mobile", placeholder: "Enter mobile number" },
      { label: "Address", key: "address", placeholder: "Enter address" },
    ],
  },
  license: {
    aliases: ["license", "driving_license", "dl"],
    displayName: "Driving License",
    verifyLink: "https://parivahan.gov.in/rcdlstatus/?pur_cd=101",
    hasFrontBack: true,
    fields: [
      { label: "Driving License No", key: "licenseNumber", placeholder: "e.g., TS0120200012345" },
      { label: "Name", key: "fullName", placeholder: "Enter full name" },
      { label: "Date of Birth", key: "dob", placeholder: "DD/MM/YYYY" },
      { label: "Son/Daughter/Wife of", key: "fatherOrSpouseName", placeholder: "Enter father/spouse name" },
      { label: "Address", key: "address", placeholder: "Enter address" },
      { label: "Validity", key: "validity", placeholder: "DD/MM/YYYY" },
      { label: "State of Issue", key: "state", placeholder: "e.g., Telangana" },
      { label: "Class of Vehicles", key: "vehicleClass", placeholder: "e.g., LMV, MCWG" },
    ],
  },
  fitnesscertificate: {
    aliases: ["fitness", "fitness_certificate", "fitness_cert", "fc", "fitnesscertificate", "vehicle_fitness"],
    displayName: "Fitness Certificate",
    verifyLink: "https://tgtransport.net/TGCFSTONLINE/Reports/RegistrationValiditySearch.aspx",
    hasFrontBack: true,
    fields: [
      { label: "Registration Number", key: "licenseNumber", placeholder: "e.g., TS09EA1234" },
      { label: "FC Number", key: "fcNumber", placeholder: "Enter FC number" },
      { label: "Class of Vehicle", key: "vehicleClass", placeholder: "e.g., LMV, HMV" },
      { label: "FC Issued By", key: "issuedBy", placeholder: "Enter issuing authority" },
      { label: "FC Valid Upto", key: "validity", placeholder: "DD/MM/YYYY" },
    ],
  },
  insurance: {
    aliases: ["insurance", "insurance_certificate", "vehicle_insurance"],
    displayName: "Insurance",
    verifyLink: undefined,
    hasFrontBack: false,
    fields: [
      { label: "Insurance Certificate No", key: "licenseNumber", placeholder: "Enter policy number" },
      { label: "Company", key: "company", placeholder: "e.g., ICICI Lombard" },
      { label: "Valid Upto", key: "validity", placeholder: "DD/MM/YYYY" },
    ],
  },
  permit: {
    aliases: ["permit", "vehicle_permit"],
    displayName: "Permit",
    verifyLink: undefined,
    hasFrontBack: true,
    fields: [
      { label: "Permit Number", key: "licenseNumber", placeholder: "Enter permit number" },
      { label: "Permit Issued By", key: "issuedBy", placeholder: "Enter issuing authority" },
      { label: "Permit Valid Upto", key: "validity", placeholder: "DD/MM/YYYY" },
    ],
  },
  profile: {
    aliases: ["profile", "profile_photo", "selfie", "photo"],
    displayName: "Profile Photo",
    verifyLink: undefined,
    hasFrontBack: false,
    fields: [],
  },
};

const getDocumentConfig = (docType: string): DocumentTypeConfig | null => {
  const normalizedType = docType.toLowerCase().trim();
  if (DOCUMENT_CONFIGS[normalizedType]) return DOCUMENT_CONFIGS[normalizedType];
  for (const [, config] of Object.entries(DOCUMENT_CONFIGS)) {
    if (config.aliases.includes(normalizedType)) return config;
  }
  return null;
};

const getDocumentFields = (docType: string): DocumentField[] => {
  const config = getDocumentConfig(docType);
  if (config && config.fields.length > 0) return config.fields;
  return [
    { label: "Full Name", key: "fullName", placeholder: "Enter full name" },
    { label: "Document Number", key: "licenseNumber", placeholder: "Enter document number" },
  ];
};

const getVerificationLink = (docType: string): string | undefined => {
  return getDocumentConfig(docType)?.verifyLink;
};

const getDocumentDisplayName = (docType: string): string => {
  return getDocumentConfig(docType)?.displayName || docType.replace(/_/g, " ").toUpperCase();
};

// ============================================
// INTERFACES
// ============================================
interface ExtractedData {
  licenseNumber?: string;
  fullName?: string;
  dob?: string;
  address?: string;
  validity?: string;
  fatherOrSpouseName?: string;
  state?: string;
  engineNumber?: string;
  model?: string;
  registrationDate?: string;
  chassisNumber?: string;
  vehicleClass?: string;
  fcNumber?: string;
  issuedBy?: string;
  company?: string;
  mobile?: string;
  vehicleTypes?: string[];
  vehicleTypesVerified?: boolean;
  [key: string]: string | string[] | boolean | undefined;
}

interface Document {
  _id: string;
  userId: string;
  docType: string;
  side?: string;
  extractedData: ExtractedData;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  remarks?: string;
  imageUrl?: string;
  url?: string;
}

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  vehicleType?: string;
  seats?: number | null;
  vehicleModel?: string | null;
  profilePhotoUrl?: string;
  documents: Document[];
  isFullyVerified?: boolean;
  totalDocs?: number;
}

// ============================================
// 📁 FILE SYSTEM ACCESS API — Save to real subfolder
// Works on Chrome/Edge on Windows, Mac, Linux
// Falls back to legacy blob download if not supported
// ============================================

// Check if File System Access API is available
const supportsFileSystemAccess = (): boolean => {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
};

// Global ref to store the selected root directory handle
// Persists across approvals within the same admin session
let globalRootDirHandle: FileSystemDirectoryHandle | null = null;

/**
 * Ask admin to pick a root save folder (only once per session).
 * Returns the handle or null if cancelled.
 */
const pickSaveFolder = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const handle = await (window as any).showDirectoryPicker({
      id: "ghumo-docs-save",
      mode: "readwrite",
      startIn: "downloads",
    });
    globalRootDirHandle = handle;
    return handle;
  } catch (err: any) {
    if (err?.name === "AbortError") return null; // user cancelled
    console.error("showDirectoryPicker error:", err);
    return null;
  }
};

/**
 * Save a blob into rootDir/{subfolderName}/{filename}
 * Creates the subfolder if it doesn't exist.
 */
const saveBlobToSubfolder = async (
  rootDir: FileSystemDirectoryHandle,
  subfolderName: string,
  filename: string,
  blob: Blob
): Promise<void> => {
  // Get or create subfolder
  const subDir = await rootDir.getDirectoryHandle(subfolderName, { create: true });
  // Create file inside subfolder
  const fileHandle = await subDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

/**
 * Download a single document via the backend proxy and save it
 * into rootDir/{phone}_{vehicleType}/{docType}_{side}.ext
 *
 * Falls back to legacy <a download> if File System Access API unavailable.
 */
const saveDocToFolder = async (
  docId: string,
  rootDir: FileSystemDirectoryHandle | null,
  phone: string,
  vehicleType: string,
  docType: string,
  side: string,
  fallbackExt: string = ".jpg"
): Promise<{ success: boolean; path: string; error?: string }> => {
  const authToken = getAuthToken();
  const headers = getApiHeaders(authToken);

  const safePhone = phone.replace(/[^0-9+]/g, "") || "unknown";
  const safeVehicle = (vehicleType || "vehicle").toLowerCase().replace(/\s+/g, "_");
  const safeDocType = (docType || "document").toLowerCase().replace(/\s+/g, "_");
  const safeSide = (side || "front").toLowerCase();

  const subfolderName = `${safePhone}_${safeVehicle}`;

  try {
    const response = await axiosInstance.get(`/admin/download-single/${docId}`, {
      headers,
      responseType: "blob",
    });

    // Determine extension
    const disposition = response.headers?.["content-disposition"] as string | undefined;
    let ext = fallbackExt;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) {
        const extMatch = match[1].replace(/['"]/g, "").match(/\.[a-zA-Z0-9]+$/);
        if (extMatch) ext = extMatch[0].toLowerCase();
      }
    }

    const filename = `${safeDocType}_${safeSide}${ext}`;
    const blob = new Blob([response.data]);

    // ✅ USE FILE SYSTEM ACCESS API — saves into real subfolder
    if (rootDir) {
      await saveBlobToSubfolder(rootDir, subfolderName, filename, blob);
      return { success: true, path: `${subfolderName}/${filename}` };
    }

    // 🔄 FALLBACK: legacy blob download (flat, no subfolder on Windows)
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    window.document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, path: filename };
  } catch (err: any) {
    return {
      success: false,
      path: `${subfolderName}/${safeDocType}_${safeSide}${fallbackExt}`,
      error: err?.response?.data?.message || err?.message || "Save failed",
    };
  }
};

type DriverCategory = "pending" | "verified" | "rejected";

// ============================================
// 🔥 SECURE IMAGE - Uses Backend Proxy
// ============================================
const SecureImage: React.FC<{
  docId: string | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}> = ({ docId, alt, className = "", fallback }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUrl = useMemo(() => {
    if (!docId) return null;
    const token = getAuthToken();
    const baseUrl = axiosInstance.defaults.baseURL || "";
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    return `${cleanBaseUrl}/admin/document-image/${docId}?token=${token}`;
  }, [docId]);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [docId]);

  if (!docId || !imageUrl || hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        {fallback || <AlertCircle size={32} className="text-gray-400" />}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

// ============================================
// 🚗 VEHICLE DISPLAY LABEL
// ============================================
const getVehicleDisplayLabel = (vehicleType?: string, seats?: number | null): string => {
  const vt = (vehicleType ?? "").toLowerCase().trim();
  if (vt === "xl") return "XL / 6 Seater";
  if (vt === "car") {
    if (seats === 6) return "XL / 6 Seater";
    if (seats === 4) return "Car (4 Seater)";
    return "Car";
  }
  if (!vehicleType) return "";
  return vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);
};

// ============================================
// SUB COMPONENTS
// ============================================
const StatusBadge: React.FC<{ status: string; size?: "sm" | "md" | "lg" }> = ({ status, size = "md" }) => {
  const config = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
    verified: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
    rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: XCircle },
  };
  const c = config[status as keyof typeof config] || config.pending;
  const Icon = c.icon;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-4 py-2 text-base" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <Icon size={size === "sm" ? 12 : size === "lg" ? 18 : 14} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}> = ({ label, value, icon, color, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 w-full text-left ${
      isActive ? `${color} shadow-lg scale-[1.02]` : "bg-white hover:shadow-md border border-gray-100"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${isActive ? "text-white/80" : "text-gray-500"}`}>{label}</p>
        <p className={`text-3xl font-bold mt-1 ${isActive ? "text-white" : "text-gray-900"}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${isActive ? "bg-white/20" : "bg-gray-50"}`}>{icon}</div>
    </div>
    {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" />}
  </button>
);

const EmptyState: React.FC<{ type: string }> = ({ type }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      {type === "verified" ? (
        <Award size={40} className="text-emerald-400" />
      ) : type === "rejected" ? (
        <AlertTriangle size={40} className="text-rose-400" />
      ) : (
        <FileText size={40} className="text-gray-400" />
      )}
    </div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">
      No {type === "verified" ? "Verified" : type === "rejected" ? "Rejected" : "Pending"} Drivers
    </h3>
    <p className="text-gray-500 text-center max-w-md">
      {type === "pending"
        ? "All documents have been reviewed. Great job! 🎉"
        : type === "verified"
        ? "No drivers with all documents verified yet."
        : "No documents have been rejected."}
    </p>
  </div>
);

const VerifiedDriverCard: React.FC<{ driver: Driver }> = ({ driver }) => {
  const getVehicleIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "car": return <Car size={16} />;
      case "bike": return <Bike size={16} />;
      case "auto": return <Truck size={16} />;
      case "xl": return <Truck size={16} />;
      default: return <Car size={16} />;
    }
  };
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium">
        <ShieldCheck size={16} />
        All Documents Verified
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {driver.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg truncate">{driver.name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 truncate"><Mail size={12} />{driver.email}</p>
            {driver.phone && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone size={12} />{driver.phone}</p>}
          </div>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Award className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center justify-between">
          {driver.vehicleType && (
            <span className="inline-flex items-center gap-1.5 text-sm bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
              {getVehicleIcon(driver.vehicleType)}
              {getVehicleDisplayLabel(driver.vehicleType, driver.seats)}
            </span>
          )}
          {driver.totalDocs !== undefined && (
            <span className="text-sm text-emerald-600 font-medium">{driver.totalDocs} docs approved</span>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionableDriverCard: React.FC<{
  driver: Driver;
  onClick: () => void;
  category: DriverCategory;
}> = ({ driver, onClick, category }) => {
  const relevantDocs = driver.documents.filter((d) => d.status === category);
  const categoryConfig = {
    pending: { borderColor: "border-l-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-700", hoverBorder: "hover:border-amber-300", icon: Clock },
    rejected: { borderColor: "border-l-rose-500", badgeBg: "bg-rose-100", badgeText: "text-rose-700", hoverBorder: "hover:border-rose-300", icon: XCircle },
    verified: { borderColor: "border-l-emerald-500", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700", hoverBorder: "hover:border-emerald-300", icon: CheckCircle },
  };
  const config = categoryConfig[category];
  const Icon = config.icon;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden border-l-4 ${config.borderColor} ${config.hoverBorder}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
              {driver.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{driver.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Mail size={12} />{driver.email}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </div>
        {driver.phone && <p className="text-sm text-gray-500 flex items-center gap-2 mb-3"><Phone size={14} />{driver.phone}</p>}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.badgeBg} ${config.badgeText}`}>
            <Icon size={14} />
            {relevantDocs.length} {category}
          </div>
          {driver.vehicleType && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
              {getVehicleDisplayLabel(driver.vehicleType, driver.seats)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const VerificationLinkButton: React.FC<{ docType: string }> = ({ docType }) => {
  const verifyLink = getVerificationLink(docType);
  if (!verifyLink) return null;
  return (
    <a
      href={verifyLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors text-sm font-medium border border-blue-200"
    >
      <ExternalLink size={16} />
      Verify Online
    </a>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const DocumentsPage: React.FC = () => {
  const { token } = useAuth();

  const [pendingDrivers, setPendingDrivers] = useState<Driver[]>([]);
  const [rejectedDrivers, setRejectedDrivers] = useState<Driver[]>([]);
  const [verifiedDrivers, setVerifiedDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DriverCategory>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [backDoc, setBackDoc] = useState<Document | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [zoomImageDocId, setZoomImageDocId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // ============================================
  // 📁 SAVE FOLDER STATE
  // ============================================
  // Stores the root folder handle the admin picked
  const [saveFolderHandle, setSaveFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [saveFolderName, setSaveFolderName] = useState<string>("");
  const fsApiSupported = supportsFileSystemAccess();

  // ============================================
  // 📥 DOWNLOAD RESULT STATE — shown after approval
  // ============================================
  const [downloadResults, setDownloadResults] = useState<{
    folderName: string;
    files: { path: string; success: boolean; error?: string }[];
  } | null>(null);

  const [editableData, setEditableData] = useState<ExtractedData>({
    licenseNumber: "",
    fullName: "",
    dob: "",
    fatherOrSpouseName: "",
    address: "",
    validity: "",
    state: "",
    vehicleTypes: [],
    vehicleTypesVerified: false,
  });

  // ============================================
  // FILTERED DRIVERS BY SEARCH
  // ============================================
  const filteredDrivers = useMemo(() => {
    const drivers =
      activeTab === "pending" ? pendingDrivers : activeTab === "rejected" ? rejectedDrivers : verifiedDrivers;
    if (!searchQuery.trim()) return drivers;
    const query = searchQuery.toLowerCase();
    return drivers.filter(
      (d) => d.name.toLowerCase().includes(query) || d.email.toLowerCase().includes(query) || d.phone?.includes(query)
    );
  }, [activeTab, pendingDrivers, rejectedDrivers, verifiedDrivers, searchQuery]);

  // ============================================
  // PICK SAVE FOLDER
  // ============================================
  const handlePickSaveFolder = async () => {
    const handle = await pickSaveFolder();
    if (handle) {
      setSaveFolderHandle(handle);
      setSaveFolderName(handle.name);
      globalRootDirHandle = handle;
    }
  };

  // ============================================
  // FETCH DRIVERS WITH DOCUMENTS
  // ============================================
  const fetchDriversWithDocStatus = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      setError("❌ Please login to view documents");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers = getApiHeaders(authToken);
      const driversRes = await axiosInstance.get("/admin/drivers", { headers });
      const drivers = driversRes.data.drivers || [];

      const pendingMap = new Map<string, Driver>();
      const rejectedMap = new Map<string, Driver>();
      const verifiedMap = new Map<string, Driver>();

      for (const driver of drivers) {
        try {
          const docsRes = await axiosInstance.get(`/admin/documents/${driver._id}`, { headers });
          const docs = docsRes.data.docs || [];
          if (docs.length > 0) {
            const docsWithFixedUrls = docs.map((doc: Document) => ({
              ...doc,
              imageUrl: doc.imageUrl ? getImageUrl(doc.imageUrl) : undefined,
            }));
            const driverData: Driver = {
              _id: driver._id,
              name: driver.name || "Unnamed Driver",
              email: driver.email || "No email",
              phone: driver.phone || null,
              vehicleType: driver.vehicleType || null,
              seats: driver.seats ?? null,
              vehicleModel: driver.vehicleModel || null,
              profilePhotoUrl: driver.profilePhotoUrl || null,
              documents: docsWithFixedUrls,
            };
            const normalizeStatus = (status?: string) => {
              const s = (status || "").toLowerCase();
              return s === "approved" ? "verified" : s;
            };
            const allVerified =
              docsWithFixedUrls.length > 0 &&
              docsWithFixedUrls.every((d: Document) => normalizeStatus(d.status) === "verified");
            const hasPending = docsWithFixedUrls.some((d: Document) => normalizeStatus(d.status) === "pending");
            const hasRejected = docsWithFixedUrls.some((d: Document) => normalizeStatus(d.status) === "rejected");

            if (allVerified) {
              verifiedMap.set(driver._id, { ...driverData, isFullyVerified: true, totalDocs: docsWithFixedUrls.length, documents: [] });
            } else {
              const actionableDocs = docsWithFixedUrls.filter((d: Document) => {
                const s = normalizeStatus(d.status);
                return s === "pending" || s === "rejected";
              });
              if (hasPending) pendingMap.set(driver._id, { ...driverData, documents: actionableDocs });
              if (hasRejected) rejectedMap.set(driver._id, { ...driverData, documents: actionableDocs });
            }
          }
        } catch (err: any) {
          console.error(`❌ Failed to fetch docs for driver ${driver._id}:`, err.response?.data || err.message);
        }
      }

      setPendingDrivers(Array.from(pendingMap.values()));
      setRejectedDrivers(Array.from(rejectedMap.values()));
      setVerifiedDrivers(Array.from(verifiedMap.values()));
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("❌ Authentication failed. Please login again.");
      } else if (err.response?.status === 404) {
        setError("❌ API endpoint not found.");
      } else {
        setError(err.response?.data?.message || "Failed to load documents.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDriversWithDocStatus();
  }, [fetchDriversWithDocStatus]);

  // ============================================
  // LOCAL STATE UPDATE ON VERIFY/REJECT
  // ============================================
  const updateDocumentsLocally = useCallback(
    (driverId: string, docIds: string[], newStatus: "verified" | "rejected", newRemarks?: string, newExtractedData?: ExtractedData) => {
      const mergeUniqueByDriverId = (base: Driver[], incoming: Driver[]) => {
        const map = new Map<string, Driver>();
        for (const d of base) map.set(d._id, d);
        for (const d of incoming) map.set(d._id, d);
        return Array.from(map.values());
      };

      const updateDriverList = (drivers: Driver[], sourceCategory: DriverCategory) => {
        const updated = drivers.map((driver) => {
          if (driver._id !== driverId) return driver;
          const updatedDocs = driver.documents.map((doc) =>
            docIds.includes(doc._id)
              ? { ...doc, status: newStatus, remarks: newRemarks || doc.remarks, extractedData: newExtractedData || doc.extractedData }
              : doc
          );
          return { ...driver, documents: updatedDocs };
        });

        const stillInCategory: Driver[] = [];
        const moveToPending: Driver[] = [];
        const moveToRejected: Driver[] = [];
        const moveToVerified: Driver[] = [];

        updated.forEach((driver) => {
          const nonVerifiedDocs = driver.documents.filter((d) => d.status === "pending" || d.status === "rejected");
          if (nonVerifiedDocs.length === 0) {
            moveToVerified.push({ ...driver, isFullyVerified: true, totalDocs: driver.documents.length, documents: [] });
          } else {
            const hasPending = nonVerifiedDocs.some((d) => d.status === "pending");
            const hasRejected = nonVerifiedDocs.some((d) => d.status === "rejected");
            if (hasPending) {
              const payload = { ...driver, documents: nonVerifiedDocs };
              if (sourceCategory === "pending") stillInCategory.push(payload);
              else moveToPending.push(payload);
            }
            if (hasRejected) {
              const payload = { ...driver, documents: nonVerifiedDocs };
              if (sourceCategory === "rejected") stillInCategory.push(payload);
              else moveToRejected.push(payload);
            }
          }
        });

        if (moveToVerified.length > 0) setVerifiedDrivers((prev) => mergeUniqueByDriverId(prev, moveToVerified));
        if (moveToPending.length > 0) setPendingDrivers((prev) => mergeUniqueByDriverId(prev, moveToPending));
        if (moveToRejected.length > 0) setRejectedDrivers((prev) => mergeUniqueByDriverId(prev, moveToRejected));
        return stillInCategory;
      };

      if (activeTab === "pending") setPendingDrivers((prev) => updateDriverList(prev, "pending"));
      else if (activeTab === "rejected") setRejectedDrivers((prev) => updateDriverList(prev, "rejected"));

      if (selectedDriver && selectedDriver._id === driverId) {
        setSelectedDriver((prev) => {
          if (!prev) return null;
          const updatedDocs = prev.documents
            .map((doc) =>
              docIds.includes(doc._id)
                ? { ...doc, status: newStatus, remarks: newRemarks || doc.remarks, extractedData: newExtractedData || doc.extractedData }
                : doc
            )
            .filter((d) => d.status === activeTab);
          return { ...prev, documents: updatedDocs };
        });
      }
    },
    [selectedDriver, activeTab]
  );

  // ============================================
  // ✅ VERIFY DOCUMENT HANDLER
  // Saves files into {rootFolder}/{phone}_{vehicleType}/ subfolder
  // ============================================
  const handleVerifyDocument = async (docId: string, status: "verified" | "rejected") => {
    const authToken = getAuthToken();
    if (!authToken) { alert("❌ Please login to verify documents"); return; }
    if (status === "rejected" && !remarks.trim()) { alert("Please add remarks for rejection."); return; }

    // If approving and FS API is supported but no folder picked yet, prompt now
    let rootDir = saveFolderHandle || globalRootDirHandle;
    if (status === "verified" && fsApiSupported && !rootDir) {
      const confirmed = window.confirm(
        "📁 Please select a root folder where driver documents will be saved.\n\n" +
        "A subfolder like '7013417780_car/' will be created automatically inside it.\n\n" +
        "Click OK to pick a folder."
      );
      if (!confirmed) return;
      const handle = await pickSaveFolder();
      if (!handle) return; // user cancelled
      setSaveFolderHandle(handle);
      setSaveFolderName(handle.name);
      rootDir = handle;
    }

    setProcessing(true);
    setDownloadResults(null);

    try {
      // Collect all docs of the same type (front + back)
      const docsToVerify: string[] = [];
      let docsToVerifyData: Document[] = [];

      if (selectedDriver && selectedDoc) {
        const selectedType = (selectedDoc.docType || "").toLowerCase();
        const sameTypeDocs = selectedDriver.documents.filter(
          (d) => (d.docType || "").toLowerCase() === selectedType
        );
        docsToVerifyData = sameTypeDocs;
        sameTypeDocs.forEach((d) => docsToVerify.push(d._id));
      } else {
        docsToVerify.push(docId);
        if (selectedDoc?._id === docId) docsToVerifyData = [selectedDoc];
      }

      if (docsToVerifyData.length === 0) {
        docsToVerifyData = docsToVerify.map((id) => ({
          _id: id,
          userId: "",
          docType: selectedDoc?.docType || "document",
          extractedData: {},
          status: "pending" as const,
          createdAt: "",
          side: selectedDoc?.side,
        }));
      }

      const headers = getApiHeaders(authToken);
      const payload = {
        status,
        remarks: status === "rejected" ? remarks : undefined,
        extractedData: editableData,
      };

      // 1️⃣ Mark as verified/rejected in MongoDB
      for (const id of docsToVerify) {
        await axiosInstance.put(`/admin/verifyDocument/${id}`, payload, { headers });
      }

      // 2️⃣ If approved: save each doc file into the subfolder
      if (status === "verified" && selectedDriver) {
        const phone = selectedDriver.phone || "unknown";
        const vehicleType = selectedDriver.vehicleType || "vehicle";

        const safePhone = phone.replace(/[^0-9+]/g, "") || "unknown";
        const safeVehicle = vehicleType.toLowerCase();
        const subfolderName = `${safePhone}_${safeVehicle}`;

        const results: { path: string; success: boolean; error?: string }[] = [];

        for (const doc of docsToVerifyData) {
          const result = await saveDocToFolder(
            doc._id,
            rootDir,
            phone,
            vehicleType,
            doc.docType || "document",
            doc.side || "front",
            getFileExtension(doc.url)
          );
          results.push(result);

          // Small delay between saves
          await new Promise((r) => setTimeout(r, 200));
        }

        const folderLabel = rootDir ? `${rootDir.name}/${subfolderName}` : subfolderName;
        setDownloadResults({ folderName: folderLabel, files: results });
      }

      // 3️⃣ Update local UI state
      if (selectedDriver) {
        updateDocumentsLocally(
          selectedDriver._id,
          docsToVerify,
          status,
          status === "rejected" ? remarks : undefined,
          editableData
        );
      }

      // 4️⃣ Close doc modal, check if driver modal should close
      closeDocumentModal();

      if (selectedDriver) {
        const remainingDocs = selectedDriver.documents.filter(
          (d) => !docsToVerify.includes(d._id) && d.status === activeTab
        );
        if (remainingDocs.length === 0) closeDriverModal();
      }
    } catch (err: any) {
      console.error("❌ Verification failed:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("❌ Session expired. Please login again.");
      } else {
        alert(err.response?.data?.message || "Error verifying document.");
      }
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // DELETE IMAGE HANDLER
  // ============================================
  const handleDeleteImage = async (docId: string) => {
    const authToken = getAuthToken();
    if (!authToken) { alert("❌ Please login to delete images"); return; }
    if (!window.confirm("Are you sure? This will permanently delete the image from the server.")) return;
    setProcessing(true);
    try {
      const headers = getApiHeaders(authToken);
      const res = await axiosInstance.delete(`/admin/document/${docId}/image`, { headers });
      alert(res.data.message || "Image deleted successfully.");
      const updateDocs = (drivers: Driver[]) =>
        drivers.map((driver) => ({
          ...driver,
          documents: driver.documents.map((doc) =>
            doc._id === docId ? { ...doc, imageUrl: undefined, url: undefined } : doc
          ),
        }));
      setPendingDrivers(updateDocs);
      setRejectedDrivers(updateDocs);
      if (selectedDoc?._id === docId) setSelectedDoc({ ...selectedDoc, imageUrl: undefined, url: undefined });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete image.");
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // DOWNLOAD ALL AS ZIP
  // ============================================
  const handleDownloadAllDocuments = async (phone: string, driverName: string) => {
    const authToken = getAuthToken();
    if (!authToken) { alert("❌ Please login"); return; }
    setProcessing(true);
    try {
      const headers = getApiHeaders(authToken);
      const response = await axiosInstance.get(`/admin/download-documents/${phone}`, { headers, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${driverName}-documents.zip`);
      window.document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to download documents");
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // REJECT SPECIFIC DOCUMENT TYPE
  // ============================================
  const handleRejectDocumentType = async (docType: string) => {
    if (!selectedDriver?._id) return;
    const authToken = getAuthToken();
    if (!authToken) { alert("❌ Please login"); return; }
    if (!window.confirm(`Delete ${docType} document? This cannot be undone.`)) return;
    setProcessing(true);
    try {
      await axiosInstance.delete(`/admin/document/${selectedDriver._id}/${docType}/reject`, {
        headers: getApiHeaders(authToken),
        data: { remarks: "Deleted by admin from KYC panel" },
      });
      alert(`✅ ${docType} document deleted successfully`);
      await fetchDriversWithDocStatus();
      closeDriverModal();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete document");
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // REJECT SINGLE DOCUMENT
  // ============================================
  const handleRejectSingleDocument = async (docId: string, docType: string) => {
    const authToken = getAuthToken();
    if (!authToken) { alert("❌ Please login"); return; }
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return;
    setProcessing(true);
    try {
      await axiosInstance.put(`/admin/verifyDocument/${docId}`, { status: "rejected", remarks: reason || "Rejected by admin" }, { headers: getApiHeaders(authToken) });
      alert("✅ Document rejected successfully");
      if (selectedDriver) {
        const updateInList = (drivers: Driver[]) =>
          drivers.map((d) =>
            d._id === selectedDriver._id
              ? { ...d, documents: d.documents.map((doc) => doc._id === docId ? { ...doc, status: "rejected" as const, remarks: reason || "Rejected by admin" } : doc) }
              : d
          );
        if (activeTab === "pending") setPendingDrivers(updateInList(pendingDrivers));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject document");
    } finally {
      setProcessing(false);
    }
  };

  // ============================================
  // MODAL HANDLERS
  // ============================================
  const openDriverModal = (driver: Driver) => {
    const filteredDocs = driver.documents.filter((d) => d.status === activeTab);
    setSelectedDriver({ ...driver, documents: filteredDocs });
    setDownloadResults(null);
  };

  const closeDriverModal = () => {
    setSelectedDriver(null);
    setSelectedDoc(null);
    setBackDoc(null);
    setDownloadResults(null);
  };

  const openDocumentModal = (doc: Document) => {
    setSelectedDoc(doc);
    setRemarks(doc.remarks || "");
    setDownloadResults(null);
    const baseData: ExtractedData = doc.extractedData || {};
    let paired: Document | null = null;
    if (selectedDriver) {
      paired = selectedDriver.documents.find(
        (d) =>
          d._id !== doc._id &&
          (d.docType || "").toLowerCase() === (doc.docType || "").toLowerCase() &&
          ((doc.side === "front" && d.side === "back") ||
            (doc.side === "back" && d.side === "front") ||
            (!doc.side && d.side === "back") ||
            (doc.side === "back" && !d.side))
      ) || null;
    }
    setBackDoc(paired);
    const pairedData: ExtractedData = paired?.extractedData || {};
    const merged: ExtractedData = {
      licenseNumber: baseData.licenseNumber || pairedData.licenseNumber || "",
      fullName: baseData.fullName || pairedData.fullName || "",
      dob: baseData.dob || pairedData.dob || "",
      fatherOrSpouseName: baseData.fatherOrSpouseName || pairedData.fatherOrSpouseName || "",
      address: baseData.address || pairedData.address || "",
      validity: baseData.validity || pairedData.validity || "",
      state: baseData.state || pairedData.state || "",
      engineNumber: baseData.engineNumber || pairedData.engineNumber || "",
      model: baseData.model || pairedData.model || "",
      registrationDate: baseData.registrationDate || pairedData.registrationDate || "",
      chassisNumber: baseData.chassisNumber || pairedData.chassisNumber || "",
      vehicleClass: baseData.vehicleClass || pairedData.vehicleClass || "",
      fcNumber: baseData.fcNumber || pairedData.fcNumber || "",
      issuedBy: baseData.issuedBy || pairedData.issuedBy || "",
      company: baseData.company || pairedData.company || "",
      mobile: baseData.mobile || pairedData.mobile || "",
      vehicleTypes: pairedData.vehicleTypes ? [...pairedData.vehicleTypes] : baseData.vehicleTypes ? [...baseData.vehicleTypes] : [],
      vehicleTypesVerified: pairedData.vehicleTypesVerified ?? baseData.vehicleTypesVerified ?? false,
    };
    setEditableData(merged);
  };

  const closeDocumentModal = () => {
    setSelectedDoc(null);
    setBackDoc(null);
    setRemarks("");
  };

  const openImageZoom = (docId: string) => {
    setZoomImageDocId(docId);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setZoomImageDocId(null);
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
  };

  // ============================================
  // PAIRED DOCS FOR MODAL
  // ============================================
  const getFilteredDocsForModal = useCallback(() => {
    if (!selectedDriver) return [];
    const docsByType = new Map<string, { front?: Document; back?: Document }>();
    selectedDriver.documents.forEach((doc) => {
      const key = (doc.docType || "unknown").toLowerCase();
      const existing = docsByType.get(key) || {};
      if (doc.side === "back") existing.back = doc;
      else if (doc.side === "front") existing.front = doc;
      else { if (!existing.front) existing.front = doc; else existing.back = doc; }
      docsByType.set(key, existing);
    });
    return Array.from(docsByType.entries()).map(([docType, pair]) => ({
      docType,
      front: pair.front,
      back: pair.back,
      status: pair.front?.status || pair.back?.status || "pending",
      extractedData: pair.back?.extractedData || pair.front?.extractedData || {},
      remarks: pair.front?.remarks || pair.back?.remarks || "",
    }));
  }, [selectedDriver]);

  // ============================================
  // RENDER HEADER
  // ============================================
  const renderHeader = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Shield className="text-indigo-600" size={28} />
            </div>
            Document Verification
          </h1>
          <p className="text-gray-500 mt-1">Review and manage driver document submissions</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">

          {/* 📁 SAVE FOLDER PICKER — only shown if File System Access API supported */}
          {fsApiSupported ? (
            <button
              onClick={handlePickSaveFolder}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                saveFolderName
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  : "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 animate-pulse"
              }`}
              title="Pick a root folder where driver subfolders will be created"
            >
              {saveFolderName ? <FolderCheck size={16} /> : <FolderOpen size={16} />}
              {saveFolderName ? (
                <span>Saving to <strong>{saveFolderName}/</strong></span>
              ) : (
                <span>Pick Save Folder <span className="text-xs opacity-75">(required)</span></span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium">
              <Download size={16} />
              Files save to Downloads/ on approval
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <button
            onClick={fetchDriversWithDocStatus}
            disabled={loading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER STATS
  // ============================================
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatCard label="Pending Review" value={pendingDrivers.length}
        icon={<Clock size={24} className={activeTab === "pending" ? "text-white" : "text-amber-600"} />}
        color="bg-gradient-to-br from-amber-500 to-orange-600"
        onClick={() => setActiveTab("pending")} isActive={activeTab === "pending"} />
      <StatCard label="Fully Verified" value={verifiedDrivers.length}
        icon={<CheckCheck size={24} className={activeTab === "verified" ? "text-white" : "text-emerald-600"} />}
        color="bg-gradient-to-br from-emerald-500 to-green-600"
        onClick={() => setActiveTab("verified")} isActive={activeTab === "verified"} />
      <StatCard label="Has Rejections" value={rejectedDrivers.length}
        icon={<AlertTriangle size={24} className={activeTab === "rejected" ? "text-white" : "text-rose-600"} />}
        color="bg-gradient-to-br from-rose-500 to-red-600"
        onClick={() => setActiveTab("rejected")} isActive={activeTab === "rejected"} />
    </div>
  );

  // ============================================
  // RENDER DRIVERS GRID
  // ============================================
  const renderDriversGrid = () => {
    if (filteredDrivers.length === 0) return <EmptyState type={activeTab} />;
    if (activeTab === "verified") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => <VerifiedDriverCard key={driver._id} driver={driver} />)}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => (
          <ActionableDriverCard key={driver._id} driver={driver} onClick={() => openDriverModal(driver)} category={activeTab} />
        ))}
      </div>
    );
  };

  // ============================================
  // RENDER DRIVER MODAL
  // ============================================
  const renderDriverModal = () => {
    if (!selectedDriver) return null;
    const filteredDocs = getFilteredDocsForModal();
    const categoryConfig = {
      pending: { gradient: "from-amber-500 to-orange-600", title: "Pending Documents", subtitle: "Review and verify these documents", icon: Clock, docBorder: "border-amber-100 hover:border-amber-300", docIconBg: "bg-amber-50", docIconColor: "text-amber-600" },
      rejected: { gradient: "from-rose-500 to-red-600", title: "Rejected Documents", subtitle: "Documents that need re-submission", icon: XCircle, docBorder: "border-rose-100 hover:border-rose-300", docIconBg: "bg-rose-50", docIconColor: "text-rose-600" },
      verified: { gradient: "from-emerald-500 to-green-600", title: "Verified Documents", subtitle: "All documents approved", icon: CheckCircle, docBorder: "border-emerald-100 hover:border-emerald-300", docIconBg: "bg-emerald-50", docIconColor: "text-emerald-600" },
    };
    const config = categoryConfig[activeTab];
    const Icon = config.icon;

    const safePhone = (selectedDriver.phone || "unknown").replace(/[^0-9+]/g, "");
    const safeVehicle = (selectedDriver.vehicleType || "vehicle").toLowerCase();
    const subfolderName = `${safePhone}_${safeVehicle}`;
    const fullSavePath = saveFolderName ? `${saveFolderName}/${subfolderName}` : subfolderName;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className={`bg-gradient-to-r ${config.gradient} text-white p-6`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                  {selectedDriver.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedDriver.name}</h2>
                  <div className="flex items-center flex-wrap gap-3 mt-1 text-white/80">
                    <span className="flex items-center gap-1"><Mail size={14} />{selectedDriver.email}</span>
                    {selectedDriver.phone && <span className="flex items-center gap-1"><Phone size={14} />{selectedDriver.phone}</span>}
                  </div>
                  {(selectedDriver.vehicleModel || selectedDriver.vehicleType) && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-semibold">
                        <Car size={12} />
                        {[selectedDriver.vehicleModel, getVehicleDisplayLabel(selectedDriver.vehicleType, selectedDriver.seats)].filter(Boolean).join(" • ")}
                      </span>
                      {(selectedDriver.seats === 4 || (selectedDriver.seats == null && (selectedDriver.vehicleType === "car" || selectedDriver.vehicleType === "premium"))) && (
                        <select
                          className="text-xs bg-white/20 text-white border border-white/40 rounded-full px-3 py-1 font-semibold cursor-pointer focus:outline-none hover:bg-white/30 transition-colors"
                          value={selectedDriver.vehicleType || "car"}
                          title="Set vehicle category for this 4-seater"
                          onChange={async (e) => {
                            const newType = e.target.value;
                            try {
                              const authToken = getAuthToken();
                              await axiosInstance.put(`/admin/driver/vehicle-type/${selectedDriver._id}`, { vehicleType: newType }, { headers: getApiHeaders(authToken) });
                              setSelectedDriver((prev) => prev ? { ...prev, vehicleType: newType } : prev);
                              setPendingDrivers((prev) => prev.map((d) => d._id === selectedDriver._id ? { ...d, vehicleType: newType } : d));
                              setRejectedDrivers((prev) => prev.map((d) => d._id === selectedDriver._id ? { ...d, vehicleType: newType } : d));
                              setVerifiedDrivers((prev) => prev.map((d) => d._id === selectedDriver._id ? { ...d, vehicleType: newType } : d));
                            } catch (err: any) {
                              alert(err?.response?.data?.message || "Failed to update vehicle type.");
                            }
                          }}
                        >
                          <option value="car" className="text-black bg-white">🚗 Car</option>
                          <option value="premium" className="text-black bg-white">⭐ Premium</option>
                        </select>
                      )}
                      {(selectedDriver.seats === 6 || selectedDriver.vehicleType === "xl") && (
                        <span className="text-xs bg-white/10 text-white/70 border border-white/20 rounded-full px-2.5 py-1 font-medium">XL auto-classified</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={closeDriverModal} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <Icon size={24} />
              <div>
                <h3 className="font-semibold">{config.title}</h3>
                <p className="text-sm text-white/80">{config.subtitle}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1">
                  <span className="font-bold text-lg">{filteredDocs.length}</span>
                  <span className="text-sm ml-1">doc type(s)</span>
                </div>
                {selectedDriver && (
                  <button
                    onClick={() => handleDownloadAllDocuments(selectedDriver.phone || "", selectedDriver.name)}
                    disabled={processing}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download size={16} />
                    Download All (ZIP)
                  </button>
                )}
              </div>
            </div>

            {/* 📁 Save folder info */}
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90">
              {saveFolderName ? <FolderCheck size={16} className="flex-shrink-0 text-emerald-300" /> : <FolderOpen size={16} className="flex-shrink-0" />}
              <span>
                {saveFolderName
                  ? <>Approved docs will be saved to <strong>{fullSavePath}/</strong></>
                  : <>No folder selected — files will download individually to <strong>Downloads/</strong></>
                }
              </span>
            </div>
          </div>

          {/* ✅ Download results panel — shown after approval */}
          {downloadResults && (
            <div className="mx-6 mt-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <FolderCheck size={20} className="text-emerald-600" />
                <h4 className="font-bold text-emerald-900">
                  Saved to: {downloadResults.folderName}/
                </h4>
              </div>
              <div className="space-y-1.5">
                {downloadResults.files.map((f, idx) => (
                  <div key={idx} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${f.success ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {f.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <code className="font-mono text-xs">{f.path}</code>
                    {!f.success && <span className="text-xs ml-auto">({f.error})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={36} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">All Done!</h3>
                <p className="text-gray-500">No more {activeTab} documents for this driver</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.docType}
                    onClick={() => (doc.front || doc.back) && openDocumentModal(doc.front || doc.back!)}
                    className={`bg-white border-2 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer group ${config.docBorder}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${config.docIconBg}`}>
                          <CreditCard className={config.docIconColor} size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 capitalize group-hover:text-indigo-600 transition-colors">
                            {getDocumentDisplayName(doc.docType)}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {doc.front && doc.back ? "Front & Back" : doc.front ? "Front Only" : "Back Only"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={doc.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="aspect-video bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                        {doc.front?._id ? (
                          <SecureImage docId={doc.front._id} alt="Front" className="object-cover w-full h-full" fallback={<span className="text-gray-400 text-xs">Failed</span>} />
                        ) : (
                          <span className="text-gray-400 text-xs">No Front</span>
                        )}
                      </div>
                      <div className="aspect-video bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                        {doc.back?._id ? (
                          <SecureImage docId={doc.back._id} alt="Back" className="object-cover w-full h-full" fallback={<span className="text-gray-400 text-xs">Failed</span>} />
                        ) : (
                          <span className="text-gray-400 text-xs">No Back</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      {doc.extractedData?.fullName && (
                        <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span className="text-gray-600">{doc.extractedData.fullName}</span></div>
                      )}
                      {doc.extractedData?.licenseNumber && (
                        <div className="flex items-center gap-2"><CreditCard size={14} className="text-gray-400" /><span className="font-mono text-gray-600">{doc.extractedData.licenseNumber}</span></div>
                      )}
                    </div>

                    {activeTab === "rejected" && doc.remarks && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <p className="text-xs text-rose-700"><strong>Reason:</strong> {doc.remarks}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Click to {activeTab === "pending" ? "review" : "view"}</span>
                      <div className="flex items-center gap-2">
                        {activeTab === "pending" && doc.front && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRejectSingleDocument(doc.front!._id, doc.docType); }}
                            disabled={processing}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                            title="Reject document"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DOCUMENT MODAL
  // ============================================
  const renderDocumentModal = () => {
    if (!selectedDoc) return null;
    const isPending = selectedDoc.status === "pending";
    const isRejected = selectedDoc.status === "rejected";
    const frontDoc = selectedDoc.side === "back" ? backDoc : selectedDoc;
    const backDocDisplay = selectedDoc.side === "back" ? selectedDoc : backDoc;
    const docType = selectedDoc.docType || "";
    const fields = getDocumentFields(docType);
    const displayName = getDocumentDisplayName(docType);
    const verifyLink = getVerificationLink(docType);

    const safePhone = (selectedDriver?.phone || "unknown").replace(/[^0-9+]/g, "");
    const safeVehicle = (selectedDriver?.vehicleType || "vehicle").toLowerCase();
    const subfolderName = `${safePhone}_${safeVehicle}`;
    const fullSavePath = saveFolderName ? `${saveFolderName}/${subfolderName}` : `Downloads/${subfolderName}`;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className={`bg-gradient-to-r ${isPending ? "from-amber-500 to-orange-600" : "from-rose-500 to-red-600"} text-white p-5 flex justify-between items-center`}>
            <div className="flex items-center gap-3">
              <button onClick={closeDocumentModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold">{displayName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selectedDoc.status} size="sm" />
                  {backDoc && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Both sides will be {isPending ? "verified" : "updated"} together</span>}
                </div>
              </div>
            </div>
            <button onClick={closeDocumentModal} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Images */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText size={18} />Document Images</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Front Side</label>
                    <div className="aspect-[4/3] bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200 relative group">
                      {frontDoc?._id ? (
                        <>
                          <SecureImage docId={frontDoc._id} alt="Front" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => openImageZoom(frontDoc._id)} className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"><ZoomIn size={18} /></button>
                            {isPending && <button onClick={() => handleDeleteImage(frontDoc._id)} disabled={processing} className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"><Trash2 size={18} /></button>}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><AlertCircle size={32} /></div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Back Side</label>
                    <div className="aspect-[4/3] bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200 relative group">
                      {backDocDisplay?._id ? (
                        <>
                          <SecureImage docId={backDocDisplay._id} alt="Back" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => openImageZoom(backDocDisplay._id)} className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"><ZoomIn size={18} /></button>
                            {isPending && <button onClick={() => handleDeleteImage(backDocDisplay._id)} disabled={processing} className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"><Trash2 size={18} /></button>}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><AlertCircle size={32} /></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vehicle Types (for License) */}
                {isPending && (docType.toLowerCase().includes("license") || docType.toLowerCase().includes("dl")) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Types Authorized</label>
                    <div className="flex flex-wrap gap-2">
                      {["car", "bike", "auto"].map((vt) => {
                        const checked = (editableData.vehicleTypes || []).includes(vt);
                        return (
                          <label key={vt} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${checked ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                            <input type="checkbox" checked={checked}
                              onChange={(e) => {
                                const prev = editableData.vehicleTypes || [];
                                let next = [...prev];
                                if (e.target.checked) { if (!next.includes(vt)) next.push(vt); } else { next = next.filter((x) => x !== vt); }
                                setEditableData((prevD) => ({ ...prevD, vehicleTypes: next }));
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span className="capitalize font-medium">{vt}</span>
                          </label>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-2 mt-4 text-sm">
                      <input type="checkbox" checked={!!editableData.vehicleTypesVerified}
                        onChange={(e) => setEditableData((prevD) => ({ ...prevD, vehicleTypesVerified: e.target.checked }))}
                        className="rounded text-indigo-600"
                      />
                      Mark vehicle types as verified
                    </label>
                  </div>
                )}
              </div>

              {/* Fields + Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CreditCard size={18} />Extracted Information</h3>
                  {verifyLink && <VerificationLinkButton docType={docType} />}
                </div>

                {isPending && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-sm text-amber-700">
                      <strong>Pending Review:</strong> Edit the OCR-extracted data.
                      {backDoc && " Both front & back will be verified together."}
                    </p>
                  </div>
                )}

                {isRejected && selectedDoc.remarks && (
                  <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                    <p className="text-sm text-rose-700"><strong>Rejection Reason:</strong> {selectedDoc.remarks}</p>
                  </div>
                )}

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={(editableData[field.key] as string) || ""}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        disabled={!isPending}
                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={field.placeholder || `Enter ${field.label}`}
                      />
                    </div>
                  ))}
                </div>

                {isPending && (
                  <div className="space-y-3 pt-4 border-t">
                    {/* Save path preview */}
                    <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${saveFolderName ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      {saveFolderName ? <FolderCheck size={16} className="flex-shrink-0" /> : <FolderOpen size={16} className="flex-shrink-0" />}
                      <span>
                        Saves to{" "}
                        <code className={`px-1 rounded font-mono text-xs ${saveFolderName ? "bg-emerald-100" : "bg-amber-100"}`}>
                          {fullSavePath}/{docType}_{"{side}"}.jpg
                        </code>
                      </span>
                      {!saveFolderName && fsApiSupported && (
                        <button onClick={handlePickSaveFolder} className="ml-auto text-xs underline whitespace-nowrap">
                          Pick folder
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleVerifyDocument(selectedDoc._id, "verified")}
                      disabled={processing}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                      {processing ? "Approving & Saving..." : `Approve & Save to ${subfolderName}/`}
                    </button>

                    <div className="space-y-2">
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Provide detailed remarks for rejection..."
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-400 transition-all resize-none"
                        rows={3}
                        disabled={processing}
                      />
                      <button
                        onClick={() => handleVerifyDocument(selectedDoc._id, "rejected")}
                        disabled={!remarks.trim() || processing}
                        className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-4 rounded-xl hover:from-rose-600 hover:to-red-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing ? <Loader2 size={20} className="animate-spin" /> : <XCircle size={20} />}
                        {processing ? "Processing..." : `Reject Document${backDoc ? " (Both Sides)" : ""}`}
                      </button>
                    </div>

                    {/* Delete doc type */}
                    <button
                      onClick={() => handleRejectDocumentType(selectedDoc.docType)}
                      disabled={processing}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Delete {selectedDoc.docType}
                    </button>
                  </div>
                )}

                {isRejected && (
                  <div className="rounded-xl p-6 text-center border-2 bg-rose-50 border-rose-200">
                    <XCircle size={48} className="mx-auto text-rose-600 mb-3" />
                    <h3 className="text-xl font-bold text-rose-900 mb-1">Document Rejected</h3>
                    <p className="text-rose-700 text-sm">Driver needs to re-upload this document</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER IMAGE ZOOM MODAL
  // ============================================
  const renderImageZoomModal = () => {
    if (!isImageModalOpen || !zoomImageDocId) return null;
    const zoomImageUrl = getProxyImageUrl(zoomImageDocId);
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={closeImageModal}>
        <button onClick={closeImageModal} className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all">
          <X size={28} />
        </button>
        {zoomImageUrl ? (
          <img src={zoomImageUrl} alt="Document" className="max-w-[90%] max-h-[90%] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        ) : (
          <div className="text-white text-xl">Failed to load image</div>
        )}
      </div>
    );
  };

  const tabConfig = {
    pending: { icon: Clock, iconBg: "bg-amber-100", iconColor: "text-amber-600", title: "Pending Review", subtitle: "Drivers with documents awaiting your review" },
    verified: { icon: CheckCheck, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", title: "Fully Verified Drivers", subtitle: "All documents approved - no action needed" },
    rejected: { icon: AlertTriangle, iconBg: "bg-rose-100", iconColor: "text-rose-600", title: "Has Rejections", subtitle: "Drivers with rejected documents awaiting re-upload" },
  };
  const currentTabConfig = tabConfig[activeTab];
  const TabIcon = currentTabConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {renderHeader()}
        {renderStats()}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${currentTabConfig.iconBg} rounded-xl`}>
                <TabIcon className={currentTabConfig.iconColor} size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{currentTabConfig.title}</h2>
                <p className="text-sm text-gray-500">{currentTabConfig.subtitle}</p>
              </div>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading documents...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-rose-600 mb-4" />
            <p className="text-rose-700 font-medium">{error}</p>
            <button onClick={fetchDriversWithDocStatus} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {renderDriversGrid()}
          </div>
        )}
      </div>

      {renderDriverModal()}
      {renderDocumentModal()}
      {renderImageZoomModal()}
    </div>
  );
};

export default DocumentsPage;