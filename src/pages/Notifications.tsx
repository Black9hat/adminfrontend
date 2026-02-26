import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Offer {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  role: string;
}

// 🔧 API BASE URL Configuration
// Uses VITE_API_URL environment variable (set in Render dashboard)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const NotificationPage: React.FC = () => {
  const { token } = useAuth();
  const [mode, setMode] = useState<"broadcast" | "individual">("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState<"driver" | "customer" | "all">("all");
  const [notificationType, setNotificationType] = useState<"general" | "promotion">("general");
  const [drivers, setDrivers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ✅ Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Offers management states
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [offersError, setOffersError] = useState("");

  // Fetch drivers & customers
  const fetchUsers = async () => {
    try {
      const [driverRes, customerRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/drivers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/admin/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setDrivers(driverRes.data.drivers || []);
      setCustomers(customerRes.data.customers || []);
    } catch (err) {
      console.error("❌ Error fetching users");
    }
  };

  // ✅ Fetch existing promotion offers (admin view)
  const fetchOffers = useCallback(async () => {
    try {
      setOffersLoading(true);
      setOffersError("");
      const res = await axios.get(`${API_BASE_URL}/api/admin/offers/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(res.data.offers || []);
    } catch (err: any) {
      setOffersError(err.response?.data?.message || "Failed to load offers.");
    } finally {
      setOffersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchOffers();
    }
  }, [token, fetchOffers]);

  // ✅ Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setImageFile(file);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ✅ Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ Upload image to server
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await axios.post(`${API_BASE_URL}/api/admin/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const imageUrl = response.data.imageUrl || response.data.url;
      console.log("✅ Image uploaded:", imageUrl);
      return imageUrl;
    } catch (err) {
      console.error("❌ Image upload failed:", err);
      throw new Error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }

    try {
      setLoading(true);

      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        try {
          uploadedImageUrl = await uploadImage();
        } catch (uploadErr) {
          setError("Failed to upload image. Please try again.");
          setLoading(false);
          return;
        }
      }

      if (mode === "broadcast") {
        await axios.post(
          `${API_BASE_URL}/api/admin/send-fcm`,
          {
            title,
            body,
            role: role === "all" ? undefined : role,
            type: notificationType,
            imageUrl: uploadedImageUrl,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSuccess("✅ Notification sent successfully!");
      } else {
        if (!selectedUser) {
          setError("Please select a user.");
          setLoading(false);
          return;
        }
        await axios.post(
          `${API_BASE_URL}/api/admin/send-individual-notification`,
          {
            userId: selectedUser,
            title,
            body,
            type: notificationType,
            imageUrl: uploadedImageUrl,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSuccess("✅ Notification sent to user successfully!");
      }

      setTitle("");
      setBody("");
      setImageFile(null);
      setImagePreview("");
      removeImage();
      await fetchOffers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send notification");
      console.error("❌ Error sending notification:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle delete offer
  const handleDeleteOffer = async (offerId: string) => {
    try {
      setDeletingOfferId(offerId);
      await axios.delete(`${API_BASE_URL}/api/admin/offers/${offerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteConfirmId(null);
      await fetchOffers();
      setSuccess("✅ Offer deleted successfully!");
    } catch (err: any) {
      setOffersError(err.response?.data?.message || "Failed to delete offer");
      console.error("❌ Error deleting offer:", err);
    } finally {
      setDeletingOfferId(null);
    }
  };

  // ✅ Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2">
            📢 Notification Center
          </h1>
          <p className="text-gray-600 text-lg">Send notifications and manage offers for drivers and customers</p>
          {/* API URL Info (for debugging) */}
          <p className="text-xs text-gray-500 mt-3 p-2 bg-gray-100 rounded">
            Backend: <code className="font-mono">{API_BASE_URL}</code>
          </p>
        </div>

        {/* Notification Sender */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span>✉️</span>
              Send Notification
            </h2>
          </div>

          <div className="p-8">
            {/* Mode Selection */}
            <div className="flex gap-4 mb-6 flex-col sm:flex-row">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  value="broadcast"
                  checked={mode === "broadcast"}
                  onChange={() => setMode("broadcast")}
                  className="w-4 h-4 text-orange-600 accent-orange-600"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">
                  📡 Broadcast (All Users)
                </span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  value="individual"
                  checked={mode === "individual"}
                  onChange={() => setMode("individual")}
                  className="w-4 h-4 text-orange-600 accent-orange-600"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">
                  👤 Individual User
                </span>
              </label>
            </div>

            {/* Form */}
            <form onSubmit={handleSend} className="space-y-6">
              {/* Success Message */}
              {success && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {success}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Individual User Selection */}
              {mode === "individual" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select User <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Select a driver --</option>
                      {drivers.map((driver) => (
                        <option key={driver._id} value={driver._id}>
                          🚗 {driver.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">-- Select a customer --</option>
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer._id}>
                          🛒 {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Broadcast Options */}
              {mode === "broadcast" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Send To <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: "all", label: "👥 All Users", desc: "Both drivers & customers" },
                      { value: "driver", label: "🚗 Drivers Only", desc: "Only drivers" },
                      { value: "customer", label: "🛒 Customers Only", desc: "Only customers" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all">
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={role === (option.value as "driver" | "customer" | "all")}
                          onChange={(e) => setRole(e.target.value as "driver" | "customer" | "all")}
                          className="w-4 h-4 text-orange-600 accent-orange-600"
                        />
                        <div>
                          <div className="font-medium text-gray-700">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notification Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { value: "general", label: "💬 General", desc: "Regular message" },
                    { value: "promotion", label: "🎁 Promotion/Offer", desc: "Show in offers tab" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all">
                      <input
                        type="radio"
                        name="type"
                        value={option.value}
                        checked={notificationType === (option.value as "general" | "promotion")}
                        onChange={(e) => setNotificationType(e.target.value as "general" | "promotion")}
                        className="w-4 h-4 text-orange-600 accent-orange-600"
                      />
                      <div>
                        <div className="font-medium text-gray-700">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Special Discount Available"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Attach Image (Optional)
                </label>
                {!imageFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-orange-300 rounded-xl p-8 text-center cursor-pointer hover:bg-orange-50 transition-colors"
                  >
                    <svg className="mx-auto h-12 w-12 text-orange-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium text-gray-700">Click to upload an image</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF • Max 5MB • Recommended 1024x512px</p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl p-4">
                    <div className="flex gap-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="font-medium text-gray-700 truncate">{imageFile.name}</p>
                          <p className="text-sm text-gray-500">{(imageFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeImage}
                          className="self-start px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:from-orange-700 hover:to-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || uploadingImage ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadingImage ? "Uploading image..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Notification
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Offers Management Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span>🎁</span>
              Active Offers
            </h2>
            <div>
              <button
                type="button"
                onClick={fetchOffers}
                disabled={offersLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-700 text-sm font-medium hover:bg-orange-50 hover:border-orange-300 transition-all shadow-sm"
              >
                <svg
                  className={`w-4 h-4 ${offersLoading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Offers Error */}
          {offersError && (
            <div className="mx-8 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {offersError}
            </div>
          )}

          {/* Offers List */}
          <div className="p-6">
            {offersLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="animate-spin h-10 w-10 mb-3 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-medium">Loading offers...</p>
              </div>
            ) : offers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-5xl mb-3">🎁</span>
                <p className="text-base font-semibold text-gray-500">No offers yet</p>
                <p className="text-sm text-gray-400 mt-1">Send a promotion above to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div
                    key={offer._id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gradient-to-r from-orange-50/40 to-amber-50/40 hover:border-orange-200 transition-all group"
                  >
                    {/* Offer Image Thumbnail */}
                    {offer.imageUrl ? (
                      <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <img
                          src={offer.imageUrl}
                          alt="Offer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-20 h-16 rounded-lg border border-dashed border-orange-200 bg-orange-50 flex items-center justify-center">
                        <span className="text-2xl">🎁</span>
                      </div>
                    )}

                    {/* Offer Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate">{offer.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{offer.body}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              offer.role === "driver"
                                ? "bg-green-100 text-green-700"
                                : offer.role === "customer"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {offer.role === "driver" ? "🚗" : offer.role === "customer" ? "🛒" : "👥"} {offer.role}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(offer.createdAt)}</span>
                          </div>
                        </div>

                        {/* Delete Button / Confirm */}
                        <div className="flex-shrink-0">
                          {deleteConfirmId === offer._id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-medium whitespace-nowrap">Delete for all users?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteOffer(offer._id)}
                                disabled={deletingOfferId === offer._id}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center gap-1"
                              >
                                {deletingOfferId === offer._id ? (
                                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                  </svg>
                                ) : "✓ Yes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(offer._id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete this offer for all users"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-8 py-4 border-t border-orange-100 bg-orange-50/50">
            <p className="text-xs text-orange-600 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deleting an offer removes it for <strong>all users</strong>. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <span>💡</span>
            <span>Quick Tips & Configuration</span>
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Backend URL:</strong> Uses <code className="bg-blue-100 px-2 py-0.5 rounded">VITE_API_URL</code> environment variable (already set in Render) or defaults to <code className="bg-blue-100 px-2 py-0.5 rounded">http://localhost:5000</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Current Backend:</strong> <code className="bg-blue-100 px-2 py-0.5 rounded">{API_BASE_URL}</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-0.5">•</span>
              <span><strong>General Messages:</strong> Appear in Messages tab only</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-0.5">•</span>
              <span><strong>Offers/Promotions:</strong> Appear in BOTH Messages and Offers tabs (max 5 in Offers)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span><strong>1 Offer → All Users:</strong> Admin creates 1 offer, all customers/drivers see it</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span><strong>Delete Offer:</strong> Hover over any offer card and click the 🗑 icon to remove it for all users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 mt-0.5">•</span>
              <span><strong>Images:</strong> Recommended size 1024x512px, max 5MB (PNG, JPG, GIF)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
