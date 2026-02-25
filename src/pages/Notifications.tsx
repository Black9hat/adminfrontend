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
        axios.get("/api/admin/drivers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/admin/customers", {
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
      const res = await axios.get("/api/admin/offers/all", {
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
  }, [token]);

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

      const response = await axios.post("/api/admin/upload-image", formData, {
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
          "/api/admin/send-fcm",
          {
            title,
            body,
            role: role === "all" ? undefined : role,
            type: notificationType,
            imageUrl: uploadedImageUrl,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess(`✅ ${notificationType === "promotion" ? "Offer" : "Notification"} sent successfully!`);
      } else {
        if (!selectedUser) {
          setError("Please select a user.");
          setLoading(false);
          return;
        }
        await axios.post(
          "/api/admin/send-fcm/individual",
          {
            title,
            body,
            userId: selectedUser,
            type: notificationType,
            imageUrl: uploadedImageUrl,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess(`✅ ${notificationType === "promotion" ? "Offer" : "Message"} sent successfully!`);
      }

      // Reset form
      setTitle("");
      setBody("");
      setSelectedUser("");
      removeImage();

      // ✅ Refresh offers list if a promotion was sent
      if (notificationType === "promotion") {
        setTimeout(() => fetchOffers(), 800);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send notification.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete offer handler
  const handleDeleteOffer = async (offerId: string) => {
    try {
      setDeletingOfferId(offerId);
      await axios.delete(`/api/admin/offers/${offerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers((prev) => prev.filter((o) => o._id !== offerId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setOffersError(err.response?.data?.message || "Failed to delete offer.");
    } finally {
      setDeletingOfferId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📢 Push Notifications
          </h1>
          <p className="text-gray-600">Send messages and offers to your users</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 animate-in slide-in-from-top">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-800 font-medium">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 animate-in slide-in-from-top">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <form onSubmit={handleSend} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-8">

            {/* Mode Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Delivery Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode("broadcast")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mode === "broadcast"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">📣</span>
                    <span className={`font-semibold ${mode === "broadcast" ? "text-blue-700" : "text-gray-700"}`}>
                      Broadcast
                    </span>
                    <span className="text-xs text-gray-500">Send to multiple users</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("individual")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mode === "individual"
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <span className={`font-semibold ${mode === "individual" ? "text-purple-700" : "text-gray-700"}`}>
                      Individual
                    </span>
                    <span className="text-xs text-gray-500">Send to one user</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Notification Type Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Notification Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setNotificationType("general")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    notificationType === "general"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <span className={`font-semibold ${notificationType === "general" ? "text-green-700" : "text-gray-700"}`}>
                      General Message
                    </span>
                    <span className="text-xs text-gray-500">Normal notifications</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationType("promotion")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    notificationType === "promotion"
                      ? "border-orange-500 bg-orange-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🎁</span>
                    <span className={`font-semibold ${notificationType === "promotion" ? "text-orange-700" : "text-gray-700"}`}>
                      Offer / Promotion
                    </span>
                    <span className="text-xs text-gray-500">Shows in Offers tab</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                required
              />
            </div>

            {/* Body Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter notification message"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none bg-white"
                required
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Image (Optional)
              </label>
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-xl" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                    title="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                  <div className="flex flex-col items-center justify-center py-6">
                    {uploadingImage ? (
                      <>
                        <svg className="animate-spin h-10 w-10 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4 group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-base font-semibold text-gray-700 mb-1">Click to upload image</p>
                        <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={uploadingImage || loading}
                  />
                </label>
              )}
            </div>

            {/* Broadcast Options */}
            {mode === "broadcast" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Send To
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "all", label: "All Users", emoji: "👥", color: "blue" },
                    { value: "driver", label: "Drivers", emoji: "🚗", color: "green" },
                    { value: "customer", label: "Customers", emoji: "🛒", color: "orange" },
                  ].map(({ value, label, emoji, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value as any)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        role === value
                          ? `border-${color}-500 bg-${color}-50 shadow-md`
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">{emoji}</span>
                        <span className={`text-sm font-semibold ${role === value ? `text-${color}-700` : "text-gray-700"}`}>
                          {label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Options */}
            {mode === "individual" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white transition-all"
                  required
                >
                  <option value="">-- Select a user --</option>
                  <optgroup label="🚗 Drivers">
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🛒 Customers">
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3 text-lg ${
                loading || uploadingImage
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadingImage ? "Uploading Image..." : "Sending..."}
                </>
              ) : (
                <>
                  {mode === "broadcast" ? (
                    <><span>🚀</span><span>Send {notificationType === "promotion" ? "Offer" : "Broadcast"}</span></>
                  ) : (
                    <><span>💬</span><span>Send {notificationType === "promotion" ? "Offer" : "Message"}</span></>
                  )}
                  {imageFile && <span className="text-sm opacity-90">(with image)</span>}
                </>
              )}
            </button>
          </div>
        </form>

        {/* ============================================
            🎁 MANAGE EXISTING OFFERS / PROMOTIONS
        ============================================ */}
        <div className="mt-10 bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
          {/* Section Header */}
          <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <h2 className="text-xl font-bold text-orange-900">Manage Offers & Promotions</h2>
                <p className="text-sm text-orange-600">
                  {offers.length > 0
                    ? `${offers.length} offer${offers.length !== 1 ? "s" : ""} currently active`
                    : "No offers sent yet"}
                </p>
              </div>
            </div>
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
            <span>Quick Tips</span>
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
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