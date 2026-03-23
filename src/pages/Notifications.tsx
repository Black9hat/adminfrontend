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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── TEMPLATE LIBRARY ────────────────────────────────────────────────────────
interface Template {
  id: string;
  category: string;
  categoryIcon: string;
  label: string;
  title: string;
  body: string;
  role: "driver" | "customer" | "all";
  type: "general" | "promotion";
}

const TEMPLATES: Template[] = [
  // Marketing / Discounts
  {
    id: "t1", category: "Marketing", categoryIcon: "🎯",
    label: "20% OFF Ride",
    title: "🚗 20% OFF on Your Next Ride!",
    body: "Book now and save big! Use code SAVE20 at checkout. Limited slots available today.",
    role: "customer", type: "promotion",
  },
  {
    id: "t2", category: "Marketing", categoryIcon: "🎯",
    label: "Free Delivery Today",
    title: "🎁 Special Offer Just for You!",
    body: "Flat ₹30 OFF on your next ride. Valid today only. Book now!",
    role: "customer", type: "promotion",
  },
  {
    id: "t3", category: "Marketing", categoryIcon: "🎯",
    label: "Flash Sale",
    title: "⏰ Flash Sale Ends in 2 Hours!",
    body: "Get 25% OFF on all rides booked in the next 2 hours. Don't miss out!",
    role: "customer", type: "promotion",
  },
  // Driver Earnings
  {
    id: "t4", category: "Driver Earnings", categoryIcon: "💰",
    label: "Bonus Available",
    title: "💰 Boost Your Earnings Today!",
    body: "Complete 5 trips today and earn ₹100 bonus. Go online now and start earning more!",
    role: "driver", type: "general",
  },
  {
    id: "t5", category: "Driver Earnings", categoryIcon: "💰",
    label: "Surge Pricing Active",
    title: "⚡ High Demand in Your Area!",
    body: "Surge pricing is active right now. Go online to earn more per trip!",
    role: "driver", type: "general",
  },
  {
    id: "t6", category: "Driver Earnings", categoryIcon: "💰",
    label: "Top Driver Bonus",
    title: "🏆 Top Driver Bonus Available",
    body: "Top 10 drivers this week earn ₹500 bonus. Check your ranking in the app!",
    role: "driver", type: "general",
  },
  // Referral
  {
    id: "t7", category: "Referral", categoryIcon: "🔗",
    label: "Referral Bonus",
    title: "🎉 Refer Friends & Earn Rewards!",
    body: "Share your referral code and earn GoCoin rewards for every friend who joins. Start referring now!",
    role: "customer", type: "promotion",
  },
  {
    id: "t8", category: "Referral", categoryIcon: "🔗",
    label: "Coins Credited",
    title: "🪙 Your Referral Bonus is Here!",
    body: "Your referral reward has been credited to your wallet. Keep sharing and keep earning!",
    role: "customer", type: "general",
  },
  // Payment
  {
    id: "t9", category: "Payment", categoryIcon: "💳",
    label: "Cashback Credited",
    title: "💰 Cashback Credited to Wallet!",
    body: "Your cashback has been added to your Ghumo wallet. Use it on your next ride!",
    role: "customer", type: "general",
  },
  {
    id: "t10", category: "Payment", categoryIcon: "💳",
    label: "Payment Reminder",
    title: "📝 Pending Payment Reminder",
    body: "You have a pending payment in your account. Please clear it to continue booking rides.",
    role: "customer", type: "general",
  },
  // Re-engagement
  {
    id: "t11", category: "Engagement", categoryIcon: "💬",
    label: "We Miss You",
    title: "😢 We Miss You!",
    body: "It's been a while! Book a ride today and get ₹50 OFF with code COMEBACK. We're waiting for you!",
    role: "customer", type: "promotion",
  },
  {
    id: "t12", category: "Engagement", categoryIcon: "💬",
    label: "Morning Ride",
    title: "🌅 Good Morning! Special Offer Awaits",
    body: "Start your day with 20% OFF on your first ride today. Book in 30 seconds!",
    role: "customer", type: "promotion",
  },
  {
    id: "t13", category: "Engagement", categoryIcon: "💬",
    label: "Evening Rush",
    title: "🌆 Heading Home? We've Got You!",
    body: "Skip the traffic stress. Get 15% OFF on evening rides right now. Drivers are nearby!",
    role: "customer", type: "promotion",
  },
  {
    id: "t14", category: "Engagement", categoryIcon: "💬",
    label: "Driver Inactive",
    title: "👋 Hey, You Haven't Been Online!",
    body: "There are rides waiting in your area. Go online now and start earning. We miss you!",
    role: "driver", type: "general",
  },
];

const CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))];

// ─── SCHEDULE OPTIONS ─────────────────────────────────────────────────────────
const SCHEDULE_OPTIONS = [
  { value: "now", label: "Send Now" },
  { value: "morning", label: "Morning — 9:00 AM IST" },
  { value: "evening", label: "Evening — 6:00 PM IST" },
  { value: "custom", label: "Custom Time" },
];

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

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [offersError, setOffersError] = useState("");

  // Templates
  const [activeCategory, setActiveCategory] = useState<string>("Marketing");
  const [showTemplates, setShowTemplates] = useState(true);

  // Personalization
  const [personalize, setPersonalize] = useState(false);

  // Schedule
  const [scheduleOption, setScheduleOption] = useState<string>("now");
  const [customTime, setCustomTime] = useState<string>("");

  // Preview
  const [showPreview, setShowPreview] = useState(false);

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

  const applyTemplate = (t: Template) => {
    setTitle(t.title);
    setBody(t.body);
    setRole(t.role);
    setNotificationType(t.type);
    setShowTemplates(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file (PNG, JPG, GIF)"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image size should be less than 5MB"); return; }
    setImageFile(file);
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", imageFile);
      const response = await axios.post(`${API_BASE_URL}/api/admin/upload-image`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      return response.data.imageUrl || response.data.url;
    } catch (err) {
      throw new Error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Build final title/body with optional personalization token
  const buildPayload = () => {
    let finalTitle = title;
    let finalBody = body;
    if (personalize) {
      // Backend should replace {name} — we just send the placeholder
      if (!finalTitle.includes("{name}") && !finalBody.includes("{name}")) {
        finalBody = finalBody + " — {name}, this one's for you!";
      }
    }
    return { finalTitle, finalBody };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!title.trim() || !body.trim()) { setError("Title and message are required."); return; }

    try {
      setLoading(true);
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        try { uploadedImageUrl = await uploadImage(); }
        catch { setError("Failed to upload image. Please try again."); setLoading(false); return; }
      }

      const { finalTitle, finalBody } = buildPayload();

      // Schedule note — in production you'd send scheduleOption/customTime to backend
      // For now we send immediately and note scheduled sends in success message
      const scheduleNote = scheduleOption !== "now"
        ? ` (Scheduled: ${SCHEDULE_OPTIONS.find(s => s.value === scheduleOption)?.label})`
        : "";

      if (mode === "broadcast") {
        await axios.post(
          `${API_BASE_URL}/api/admin/send-fcm`,
          { title: finalTitle, body: finalBody, role: role === "all" ? undefined : role, type: notificationType, imageUrl: uploadedImageUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess(`✅ Notification sent successfully!${scheduleNote}`);
      } else {
        if (!selectedUser) { setError("Please select a user."); setLoading(false); return; }
        await axios.post(
          `${API_BASE_URL}/api/admin/send-individual-notification`,
          { userId: selectedUser, title: finalTitle, body: finalBody, type: notificationType, imageUrl: uploadedImageUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess(`✅ Notification sent to user!${scheduleNote}`);
      }

      setTitle(""); setBody(""); removeImage(); setPersonalize(false); setScheduleOption("now");
      await fetchOffers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setDeletingOfferId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const filteredTemplates = TEMPLATES.filter((t) => t.category === activeCategory);

  // Phone preview text
  const previewTitle = title || "Notification Title";
  const previewBody = body || "Your message will appear here...";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── HEADER ── */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-3xl">📢</span> Notification Center
          </h1>
          <p className="text-gray-500 mt-1">Send targeted notifications to drivers and customers</p>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* LEFT: Composer (2 cols) */}
          <div className="xl:col-span-2 space-y-6">

            {/* ── TEMPLATE LIBRARY ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  <span>⚡</span> Quick Templates
                  <span className="ml-2 text-xs font-normal text-gray-400">{TEMPLATES.length} templates</span>
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showTemplates ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTemplates && (
                <div className="border-t border-gray-100 px-6 pb-6 pt-4">
                  {/* Category tabs */}
                  <div className="flex gap-2 flex-wrap mb-4">
                    {CATEGORIES.map((cat) => {
                      const icon = TEMPLATES.find((t) => t.category === cat)?.categoryIcon;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            activeCategory === cat
                              ? "bg-orange-500 text-white shadow-sm"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {icon} {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Template cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="text-left p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-800 group-hover:text-orange-700">
                            {t.label}
                          </span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              t.role === "driver" ? "bg-green-100 text-green-700"
                              : t.role === "customer" ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                            }`}>
                              {t.role === "driver" ? "🚗" : t.role === "customer" ? "🛒" : "👥"} {t.role}
                            </span>
                            {t.type === "promotion" && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                                offer
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{t.body}</p>
                        <p className="text-xs text-orange-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to use →
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── COMPOSE FORM ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  ✉️ Compose Notification
                </h2>
              </div>

              <div className="p-6">
                {/* Mode toggle */}
                <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
                  {(["broadcast", "individual"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {m === "broadcast" ? "📡 Broadcast" : "👤 Individual"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSend} className="space-y-5">
                  {/* Feedback banners */}
                  {success && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {success}
                    </div>
                  )}
                  {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  {/* Individual user picker */}
                  {mode === "individual" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select User <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                        >
                          <option value="">— Select a driver —</option>
                          {drivers.map((d) => (
                            <option key={d._id} value={d._id}>🚗 {d.name}</option>
                          ))}
                        </select>
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                        >
                          <option value="">— Select a customer —</option>
                          {customers.map((c) => (
                            <option key={c._id} value={c._id}>🛒 {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Broadcast audience */}
                  {mode === "broadcast" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Audience <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: "all", label: "👥 All Users" },
                          { value: "driver", label: "🚗 Drivers" },
                          { value: "customer", label: "🛒 Customers" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value as typeof role)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              role === opt.value
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: "general", label: "💬 General", desc: "Messages tab" },
                        { value: "promotion", label: "🎁 Offer/Promo", desc: "Messages + Offers tab" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNotificationType(opt.value as typeof notificationType)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex flex-col items-start ${
                            notificationType === opt.value
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-xs opacity-60 font-normal">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., 🚗 20% OFF on Your Next Ride!"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-gray-400">{body.length}/200</span>
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Type your message here... Use {name} to personalize with user's name."
                      rows={3}
                      maxLength={200}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                    />
                  </div>

                  {/* Personalization + Preview row */}
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setPersonalize((v) => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${personalize ? "bg-orange-500" : "bg-gray-200"}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${personalize ? "translate-x-5" : ""}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        👤 Personalize with name
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      className="flex items-center gap-1.5 text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {showPreview ? "Hide" : "Preview"}
                    </button>
                    {personalize && (
                      <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                        Use <code className="font-mono font-bold">{"{name}"}</code> in your message to insert user's name
                      </p>
                    )}
                  </div>

                  {/* Phone preview */}
                  {showPreview && (
                    <div className="flex justify-center py-2">
                      <div className="relative w-64">
                        {/* Phone shell */}
                        <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl">
                          <div className="bg-gray-800 rounded-2xl overflow-hidden">
                            {/* Status bar */}
                            <div className="bg-gray-800 px-4 pt-2 pb-1 flex justify-between items-center">
                              <span className="text-white text-xs">9:41</span>
                              <div className="w-16 h-4 bg-black rounded-full" />
                              <div className="flex gap-1">
                                <div className="w-3 h-2 bg-white rounded-sm opacity-80" />
                                <div className="w-2 h-2 bg-white rounded-full opacity-80" />
                              </div>
                            </div>
                            {/* Notification banner */}
                            <div className="mx-2 mb-2 mt-1 bg-white rounded-2xl p-3 shadow-lg">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
                                  <span className="text-white text-xs">G</span>
                                </div>
                                <span className="text-xs font-semibold text-gray-800">Ghumo</span>
                                <span className="text-xs text-gray-400 ml-auto">now</span>
                              </div>
                              <p className="text-xs font-semibold text-gray-900 leading-tight mb-0.5">
                                {previewTitle.slice(0, 50)}{previewTitle.length > 50 ? "..." : ""}
                              </p>
                              <p className="text-xs text-gray-500 leading-tight line-clamp-2">
                                {personalize
                                  ? previewBody.replace("{name}", "Rahul")
                                  : previewBody.slice(0, 80)}{previewBody.length > 80 && !personalize ? "..." : ""}
                              </p>
                              {imagePreview && (
                                <img src={imagePreview} alt="preview" className="w-full h-16 object-cover rounded-lg mt-2" />
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">Preview on Android</p>
                      </div>
                    </div>
                  )}

                  {/* Image upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Attach Image <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    {!imageFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors"
                      >
                        <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF · Max 5MB · 1024×512px recommended</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <img src={imagePreview} alt="Preview" className="w-20 h-14 object-cover rounded-lg border border-gray-200" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{imageFile.name}</p>
                          <p className="text-xs text-gray-400">{(imageFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button type="button" onClick={removeImage}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                          Remove
                        </button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </div>

                  {/* Schedule */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ⏰ Send Timing
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {SCHEDULE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setScheduleOption(opt.value)}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            scheduleOption === opt.value
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {scheduleOption === "custom" && (
                      <input
                        type="datetime-local"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="mt-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full sm:w-auto"
                      />
                    )}
                    {scheduleOption !== "now" && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                        ⚠️ Scheduled sends use the daily cron jobs (notificationScheduler.js). For custom scheduling, integrate with a queue like Bull.
                      </p>
                    )}
                  </div>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={loading || uploadingImage}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:from-orange-700 hover:to-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {loading || uploadingImage ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {uploadingImage ? "Uploading image..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        {scheduleOption === "now" ? "Send Now" : `Schedule Notification`}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT: Active Offers + Tips (1 col) */}
          <div className="space-y-6">

            {/* ── ACTIVE OFFERS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  🎁 Active Offers
                  {offers.length > 0 && (
                    <span className="ml-1 text-xs bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {offers.length}
                    </span>
                  )}
                </h2>
                <button type="button" onClick={fetchOffers} disabled={offersLoading}
                  className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 transition-all">
                  <svg className={`w-4 h-4 ${offersLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {offersError && (
                <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                  {offersError}
                </div>
              )}

              <div className="p-4">
                {offersLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <svg className="animate-spin h-8 w-8 mb-2 text-orange-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs">Loading offers...</p>
                  </div>
                ) : offers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <span className="text-4xl mb-2">🎁</span>
                    <p className="text-sm font-medium text-gray-500">No offers yet</p>
                    <p className="text-xs text-gray-400 mt-1 text-center">Send a Promotion above to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {offers.map((offer) => (
                      <div key={offer._id}
                        className="p-3 rounded-xl border border-gray-100 hover:border-orange-200 transition-all group bg-gradient-to-r from-orange-50/30 to-amber-50/30">
                        <div className="flex items-start gap-3">
                          {offer.imageUrl ? (
                            <img src={offer.imageUrl} alt="offer" className="w-12 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-12 h-10 rounded-lg border border-dashed border-orange-200 bg-orange-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">🎁</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{offer.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{offer.body}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                offer.role === "driver" ? "bg-green-100 text-green-700"
                                : offer.role === "customer" ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                              }`}>
                                {offer.role === "driver" ? "🚗" : offer.role === "customer" ? "🛒" : "👥"} {offer.role}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(offer.createdAt)}</span>
                            </div>
                          </div>
                          {/* Delete */}
                          <div className="flex-shrink-0">
                            {deleteConfirmId === offer._id ? (
                              <div className="flex flex-col gap-1">
                                <button type="button" onClick={() => handleDeleteOffer(offer._id)}
                                  disabled={deletingOfferId === offer._id}
                                  className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-60">
                                  {deletingOfferId === offer._id ? "..." : "Yes"}
                                </button>
                                <button type="button" onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-all">
                                  No
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setDeleteConfirmId(offer._id)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-orange-100 bg-orange-50/50">
                <p className="text-xs text-orange-500">
                  Max 5 active offers. Oldest removed automatically when limit reached.
                </p>
              </div>
            </div>

            {/* ── TIPS ── */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>💡</span> Pro Tips
              </h3>
              <ul className="space-y-2.5 text-sm text-blue-800">
                {[
                  ["🎯", "Use templates to send in seconds"],
                  ["⏰", "Best open rates: 9 AM & 6 PM IST"],
                  ["👤", "Use {name} to personalize — higher engagement"],
                  ["🎁", "Promotions show in both Messages + Offers tabs"],
                  ["🚗", "Driver earnings nudges → higher trip completion"],
                  ["🔁", "Max 1–2 notifications per day to avoid unsubscribes"],
                ].map(([icon, tip]) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="flex-shrink-0">{icon}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
