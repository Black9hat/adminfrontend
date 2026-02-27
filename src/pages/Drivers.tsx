/**
 * FULL-SCREEN LAYOUT OPTIMIZATION
 * 
 * This component works with a full-screen app wrapper.
 * The app root should have:
 * 
 * display: "flex"
 * flexDirection: "column"
 * minHeight: "100vh"
 * 
 * This component's parent container should have:
 * flex: 1
 * overflowY: "auto"
 * overflowX: "hidden"
 * 
 * See: FULL_SCREEN_APP_WRAPPER.tsx for the app-level wrapper.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

// ✅ Interfaces
interface Driver {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  vehicleType?: string;
  vehicleTypes?: string[];
  isBlocked?: boolean;
  createdAt: string;
}

interface Trip {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  fare: number;
  status: string;
  createdAt: string;
}

interface ExtractedData {
  fullName?: string;
  licenseNumber?: string;
  expiryDate?: string;
  issueDate?: string;
  dob?: string;
  address?: string;
  validity?: string;
  fatherOrSpouseName?: string;
  state?: string;
  vehicleTypes?: string[];
  vehicleTypesVerified?: boolean;
  engineNumber?: string;
  model?: string;
  registrationDate?: string;
  chassisNumber?: string;
  vehicleClass?: string;
  mobile?: string;
  fcNumber?: string;
  issuedBy?: string;
  company?: string;
}

interface Document {
  _id: string;
  docType: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  remarks?: string;
  extractedData?: ExtractedData;
}

interface DocTypeConfig {
  key: string;
  label: string;
  icon: string;
  aliases: string[];
}

interface FieldConfig {
  label: string;
  key: keyof ExtractedData;
}

const DriversPage: React.FC = () => {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTripsModal, setShowTripsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeDocType, setActiveDocType] = useState<string>("");

  // Auto Refresh States
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter((driver) => {
        const nameMatch = driver.name?.toLowerCase().includes(searchLower);
        const emailMatch = driver.email?.toLowerCase().includes(searchLower);
        const phoneMatch = driver.phone?.toLowerCase().includes(searchLower);
        const vehicleTypeMatch = driver.vehicleType?.toLowerCase().includes(searchLower);
        const vehicleTypesMatch = driver.vehicleTypes?.some((v) =>
          v.toLowerCase().includes(searchLower)
        );
        return nameMatch || emailMatch || phoneMatch || vehicleTypeMatch || vehicleTypesMatch;
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((driver) => {
        if (statusFilter === "active") return !driver.isBlocked;
        if (statusFilter === "blocked") return driver.isBlocked;
        return true;
      });
    }

    if (vehicleFilter !== "all") {
      result = result.filter((driver) => {
        const type = driver.vehicleType?.toLowerCase() || driver.vehicleTypes?.[0]?.toLowerCase();
        return type === vehicleFilter;
      });
    }

    return result;
  }, [drivers, search, statusFilter, vehicleFilter]);

  // Document type configurations
  const docTypeConfigs: DocTypeConfig[] = [
    { key: "driving_license", label: "Driving License", icon: "🪪", aliases: ["drivinglicense", "drivinglicence", "license", "licence", "dl", "driving_license", "driverlicense"] },
    { key: "rc", label: "RC", icon: "🚗", aliases: ["rc", "registrationcertificate", "vehiclerc", "vehicleregistration", "registration_certificate"] },
    { key: "aadhaar", label: "Aadhaar", icon: "🆔", aliases: ["aadhaar", "aadhar", "aadhaarcard", "aadharcard", "aadhaar_card"] },
    { key: "pan", label: "PAN", icon: "💳", aliases: ["pan", "pancard", "pan_card"] },
    { key: "fitness", label: "Fitness", icon: "✅", aliases: ["fitness", "fitnesscertificate", "fc", "fitness_certificate"] },
    { key: "insurance", label: "Insurance", icon: "🛡️", aliases: ["insurance", "insurancecertificate", "vehicleinsurance", "insurance_certificate"] },
    { key: "permit", label: "Permit", icon: "📜", aliases: ["permit", "vehiclepermit", "routepermit", "route_permit"] },
  ];

  const normalizeDocType = (docType: string): string => {
    const normalized = docType.toLowerCase().replace(/[_\s-]/g, "");
    for (const config of docTypeConfigs) {
      if (config.aliases.includes(normalized)) return config.key;
    }
    return "unknown";
  };

  const getNewestVerifiedDocsPerType = useMemo((): Map<string, Document> => {
    const verifiedDocsMap = new Map<string, Document>();
    const verifiedDocs = documents.filter((doc) => doc.status === "verified");
    verifiedDocs.forEach((doc) => {
      const normalizedType = normalizeDocType(doc.docType);
      const existingDoc = verifiedDocsMap.get(normalizedType);
      if (!existingDoc) {
        verifiedDocsMap.set(normalizedType, doc);
      } else {
        const existingDate = new Date(existingDoc.createdAt).getTime();
        const currentDate = new Date(doc.createdAt).getTime();
        if (currentDate > existingDate) {
          verifiedDocsMap.set(normalizedType, doc);
        }
      }
    });
    return verifiedDocsMap;
  }, [documents]);

  const getAvailableDocTypes = (): DocTypeConfig[] => {
    const availableTypes = Array.from(getNewestVerifiedDocsPerType.keys());
    const available = docTypeConfigs.filter((config) => availableTypes.includes(config.key));
    if (availableTypes.includes("unknown")) {
      available.push({ key: "unknown", label: "Other", icon: "📄", aliases: [] });
    }
    return available;
  };

  const getActiveDocument = (): Document | null => {
    if (!activeDocType) return null;
    return getNewestVerifiedDocsPerType.get(activeDocType) || null;
  };

  const getValue = (data: ExtractedData | undefined, field: keyof ExtractedData): string => {
    if (!data) return "-";
    const value = data[field];
    if (value === undefined || value === null || value === "") return "-";
    if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const formatVehicleType = (driver: Driver): string => {
    if (driver.vehicleTypes && driver.vehicleTypes.length > 0) {
      return driver.vehicleTypes.map((v) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()).join(", ");
    }
    if (driver.vehicleType) {
      return driver.vehicleType.charAt(0).toUpperCase() + driver.vehicleType.slice(1).toLowerCase();
    }
    return "N/A";
  };

  const getVehicleIcon = (driver: Driver): string => {
    const type = driver.vehicleType?.toLowerCase() || driver.vehicleTypes?.[0]?.toLowerCase();
    switch (type) {
      case "auto": return "🛺";
      case "bike": return "🏍️";
      case "car": return "🚗";
      case "truck": return "🚚";
      case "van": return "🚐";
      default: return "🚙";
    }
  };

  const getVehicleTypeBadgeColor = (driver: Driver): string => {
    const type = driver.vehicleType?.toLowerCase() || driver.vehicleTypes?.[0]?.toLowerCase();
    switch (type) {
      case "auto": return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "bike": return "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "car": return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "truck": return "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      case "van": return "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800";
      default: return "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
    }
  };

  const getFieldsForDocType = (docType: string): FieldConfig[] => {
    switch (docType) {
      case "driving_license":
        return [
          { label: "DL Number", key: "licenseNumber" },
          { label: "Full Name", key: "fullName" },
          { label: "Date of Birth", key: "dob" },
          { label: "Father/Spouse Name", key: "fatherOrSpouseName" },
          { label: "Address", key: "address" },
          { label: "Validity", key: "validity" },
          { label: "State", key: "state" },
          { label: "Vehicle Types", key: "vehicleTypes" },
          { label: "Vehicle Verified", key: "vehicleTypesVerified" },
        ];
      case "rc":
        return [
          { label: "Registration Number", key: "licenseNumber" },
          { label: "Owner Name", key: "fullName" },
          { label: "Engine Number", key: "engineNumber" },
          { label: "Model", key: "model" },
          { label: "Registration Date", key: "registrationDate" },
          { label: "Validity", key: "validity" },
          { label: "Chassis Number", key: "chassisNumber" },
          { label: "Vehicle Class", key: "vehicleClass" },
          { label: "Address", key: "address" },
        ];
      case "aadhaar":
        return [
          { label: "Aadhaar Number", key: "licenseNumber" },
          { label: "Full Name", key: "fullName" },
          { label: "Date of Birth", key: "dob" },
          { label: "Mobile", key: "mobile" },
          { label: "Address", key: "address" },
        ];
      case "pan":
        return [
          { label: "PAN Number", key: "licenseNumber" },
          { label: "Full Name", key: "fullName" },
          { label: "Date of Birth", key: "dob" },
        ];
      case "fitness":
        return [
          { label: "Registration Number", key: "licenseNumber" },
          { label: "FC Number", key: "fcNumber" },
          { label: "Issued By", key: "issuedBy" },
          { label: "Vehicle Class", key: "vehicleClass" },
          { label: "Validity", key: "validity" },
        ];
      case "insurance":
        return [
          { label: "Certificate Number", key: "licenseNumber" },
          { label: "Company", key: "company" },
          { label: "Validity", key: "validity" },
        ];
      case "permit":
        return [
          { label: "Permit Number", key: "licenseNumber" },
          { label: "Issued By", key: "issuedBy" },
          { label: "Validity", key: "validity" },
        ];
      default:
        return [
          { label: "Full Name", key: "fullName" },
          { label: "ID Number", key: "licenseNumber" },
          { label: "Validity", key: "validity" },
        ];
    }
  };

  const renderOCRFields = (doc: Document): React.ReactNode => {
    const data = doc.extractedData;
    const docType = normalizeDocType(doc.docType);
    const fields = getFieldsForDocType(docType);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field, index) => (
          <div
            key={`${doc._id}-${field.key}-${index}`}
            className="group bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-300"
          >
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
              {field.label}
            </span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm block group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
              {getValue(data, field.key)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // API Functions
  const fetchDrivers = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await axios.get("/api/admin/drivers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers(res.data.drivers || []);
      setLastRefreshed(new Date());
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load drivers.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  const fetchDriverTrips = async (driverId: string) => {
    try {
      setTripLoading(true);
      const res = await axios.get("/api/admin/trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allTrips: Trip[] = res.data.trips || [];
      const driverTrips = allTrips.filter((t) => (t as any).assignedDriver?._id === driverId);
      setTrips(driverTrips);
    } catch (err) {
      console.error("Error fetching trips", err);
    } finally {
      setTripLoading(false);
    }
  };

  const fetchDriverDocuments = async (driverId: string) => {
    try {
      setDocLoading(true);
      const res = await axios.get(`/api/admin/documents/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const docs: Document[] = res.data.docs || res.data.documents || [];
      setDocuments(docs);
    } catch (err) {
      console.error("Error fetching documents", err);
    } finally {
      setDocLoading(false);
    }
  };

  const toggleBlockDriver = async (driverId: string, block: boolean) => {
    try {
      await axios.put(
        `/api/admin/driver/${block ? "block" : "unblock"}/${driverId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDrivers((prev) =>
        prev.map((d) => (d._id === driverId ? { ...d, isBlocked: block } : d))
      );
    } catch (err) {
      alert("Failed to update driver status.");
    }
  };

  // Effects
  useEffect(() => {
    if (documents.length > 0 && showDocsModal) {
      const verifiedDocs = documents.filter((doc) => doc.status === "verified");
      if (verifiedDocs.length > 0) {
        const sortedDocs = [...verifiedDocs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const firstVerifiedType = normalizeDocType(sortedDocs[0].docType);
        setActiveDocType(firstVerifiedType);
      } else {
        setActiveDocType("");
      }
    }
  }, [documents, showDocsModal]);

  useEffect(() => {
    if (token) fetchDrivers();
  }, [token, fetchDrivers]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh && token) {
      intervalId = setInterval(() => {
        fetchDrivers(true);
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, token, fetchDrivers]);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);
  const clearSearch = () => setSearch("");
  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setVehicleFilter("all");
  };

  const openTripModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowTripsModal(true);
    fetchDriverTrips(driver._id);
  };

  const closeTripModal = () => {
    setSelectedDriver(null);
    setTrips([]);
    setShowTripsModal(false);
  };

  const openDocsModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDocsModal(true);
    fetchDriverDocuments(driver._id);
  };

  const closeDocsModal = () => {
    setSelectedDriver(null);
    setDocuments([]);
    setShowDocsModal(false);
    setActiveDocType("");
  };

  // Computed Values
  const formatLastRefreshed = (): string => {
    if (!lastRefreshed) return "Never";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastRefreshed.getTime()) / 1000);
    if (diffInSeconds < 5) return "Just now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return lastRefreshed.toLocaleTimeString();
  };

  const verifiedDocsCount = useMemo(() => getNewestVerifiedDocsPerType.size, [getNewestVerifiedDocsPerType]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => !d.isBlocked).length;
    const blocked = drivers.filter((d) => d.isBlocked).length;
    const withVehicle = drivers.filter((d) => d.vehicleType || (d.vehicleTypes && d.vehicleTypes.length > 0)).length;
    return { total, active, blocked, withVehicle };
  }, [drivers]);

  const vehicleTypes = useMemo(() => {
    const types = new Set<string>();
    drivers.forEach((d) => {
      if (d.vehicleType) types.add(d.vehicleType.toLowerCase());
      d.vehicleTypes?.forEach((v) => types.add(v.toLowerCase()));
    });
    return Array.from(types);
  }, [drivers]);

  const hasActiveFilters = search || statusFilter !== "all" || vehicleFilter !== "all";

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Title Section */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/50">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Driver Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Monitor and manage all registered drivers</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Auto Refresh Toggle */}
                  <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 dark:peer-focus:ring-indigo-900/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Auto</span>
                    {autoRefresh && (
                      <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="text-xs bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                      </select>
                    )}
                  </div>

                  {/* Last Updated */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span>{formatLastRefreshed()}</span>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchDrivers(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isRefreshing ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Drivers", value: stats.total, icon: "👥", color: "indigo", percentage: "100%" },
              { label: "Active", value: stats.active, icon: "✅", color: "emerald", percentage: `${Math.round((stats.active / stats.total) * 100) || 0}%` },
              { label: "Blocked", value: stats.blocked, icon: "🚫", color: "red", percentage: `${Math.round((stats.blocked / stats.total) * 100) || 0}%` },
              { label: "With Vehicle", value: stats.withVehicle, icon: "🚗", color: "blue", percentage: `${Math.round((stats.withVehicle / stats.total) * 100) || 0}%` },
            ].map((stat, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${
                      stat.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                      stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      stat.color === 'red' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.percentage} of total</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                    stat.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/30' :
                    stat.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30' :
                    stat.color === 'red' ? 'bg-red-50 dark:bg-red-900/30' :
                    'bg-blue-50 dark:bg-blue-900/30'
                  }`}>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or vehicle type..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
                {search && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Dropdowns */}
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>

                <select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Vehicles</option>
                  {vehicleTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active filters:</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
                    Search: "{search}"
                    <button onClick={clearSearch} className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("all")} className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {vehicleFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
                    Vehicle: {vehicleFilter}
                    <button onClick={() => setVehicleFilter("all")} className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  Showing {filteredDrivers.length} of {drivers.length} drivers
                </span>
              </div>
            )}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium">Loading drivers...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Drivers</h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={() => fetchDrivers()}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🧑‍✈️</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No drivers found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                {hasActiveFilters
                  ? "No drivers match your current filters. Try adjusting or clearing them."
                  : "No drivers have registered yet. They will appear here once they sign up."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {filteredDrivers.map((driver) => (
                      <tr key={driver._id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/50">
                              {driver.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                                {driver.name || "Unknown"}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{driver.email || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm">{driver.phone || "-"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border ${getVehicleTypeBadgeColor(driver)}`}>
                            <span>{getVehicleIcon(driver)}</span>
                            <span>{formatVehicleType(driver)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {new Date(driver.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(driver.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                            driver.isBlocked
                              ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800"
                              : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${driver.isBlocked ? "bg-red-500" : "bg-emerald-500"}`}></span>
                            {driver.isBlocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openTripModal(driver)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="View Trips"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDocsModal(driver)}
                              className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                              title="View Documents"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => toggleBlockDriver(driver._id, !driver.isBlocked)}
                              className={`p-2 rounded-lg transition-colors ${
                                driver.isBlocked
                                  ? "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                  : "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                              }`}
                              title={driver.isBlocked ? "Unblock" : "Block"}
                            >
                              {driver.isBlocked ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredDrivers.length}</span> of{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">{drivers.length}</span> drivers
                  </span>
                  {hasActiveFilters && (
                    <button onClick={clearAllFilters} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trip History Modal */}
      {showTripsModal && selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeTripModal}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trip History</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedDriver.name}</p>
                </div>
              </div>
              <button onClick={closeTripModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {tripLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-500 dark:text-slate-400">Loading trips...</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🗺️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No trips found</h3>
                  <p className="text-slate-500 dark:text-slate-400">This driver hasn't completed any trips yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip) => (
                    <div key={trip._id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full mt-1.5 ring-4 ring-emerald-100 dark:ring-emerald-900/50"></div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pickup</p>
                              <p className="font-semibold text-slate-900 dark:text-white">{trip.pickupLocation || "Unknown"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 ring-4 ring-red-100 dark:ring-red-900/50"></div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Drop</p>
                              <p className="font-semibold text-slate-900 dark:text-white">{trip.dropLocation || "Unknown"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{trip.fare?.toFixed(0) || 0}</p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold mt-2 ${
                            trip.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" :
                            trip.status === "cancelled" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" :
                            trip.status === "ongoing" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300" :
                            "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                          }`}>
                            {trip.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(trip.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trips.length > 0 && (
              <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-b-3xl">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Total <span className="font-semibold text-slate-900 dark:text-white">{trips.length}</span> trip{trips.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocsModal && selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeDocsModal}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verified Documents</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedDriver.name}</p>
                </div>
              </div>
              <button onClick={closeDocsModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            {docLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-purple-100 dark:border-purple-900 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 dark:text-slate-400">Loading documents...</p>
              </div>
            ) : verifiedDocsCount === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No verified documents</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
                  This driver doesn't have any verified documents yet.
                </p>
              </div>
            ) : (
              <>
                {/* Document Tabs */}
                <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex flex-wrap gap-2">
                    {getAvailableDocTypes().map((config) => {
                      const isActive = activeDocType === config.key;
                      return (
                        <button
                          key={config.key}
                          onClick={() => setActiveDocType(config.key)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                            isActive
                              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                              : "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          }`}
                        >
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                          {isActive && <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  {(() => {
                    const activeDoc = getActiveDocument();
                    if (!activeDoc) {
                      return (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                          Select a document type to view details.
                        </div>
                      );
                    }
                    const docConfig = docTypeConfigs.find((c) => c.key === normalizeDocType(activeDoc.docType));

                    return (
                      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-600">
                        {/* Document Header */}
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-600">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                              <span className="text-2xl">{docConfig?.icon || "📄"}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{docConfig?.label || "Document"}</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                Verified on {new Date(activeDoc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-semibold border border-emerald-100 dark:border-emerald-800">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        </div>

                        {/* OCR Fields */}
                        {renderOCRFields(activeDoc)}

                        {/* Remarks */}
                        {activeDoc.remarks && (
                          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-600">
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-xl p-4">
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">📝 Remarks</p>
                              <p className="text-amber-800 dark:text-amber-200 italic">"{activeDoc.remarks}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-b-3xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold">
                        {verifiedDocsCount}
                      </span>
                      verified document{verifiedDocsCount !== 1 ? "s" : ""} found
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Only showing latest verified version</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversPage;