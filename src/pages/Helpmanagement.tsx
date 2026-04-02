import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════════════════════

interface HelpSettings {
  _id: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HelpRequest {
  _id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'technical' | 'billing' | 'general' | 'complaint' | 'feedback' | 'account-deletion';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  response?: string;
  resolvedAt?: string;
  deletionType?: 'immediate' | 'scheduled' | 'with-export';
  scheduledDeletionDate?: string;
  dataExportRequested?: boolean;
  dataExportCompleted?: boolean;
  deletionReason?: string;
}

// ✅ NEW: Driver ticket interface
interface DriverTicket {
  _id: string;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
  issueType: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved';
  adminNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface HelpStats {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  resolvedRequests: number;
  averageResponseTime: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return 'https://your-api-url.com';
};

const API_BASE = getApiBase();

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const HelpManagement: React.FC = () => {
  // ── Core state ──────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<HelpSettings | null>(null);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [driverTickets, setDriverTickets] = useState<DriverTicket[]>([]);  // ✅ NEW
  const [stats, setStats] = useState<HelpStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'customer' | 'driver'>('customer');  // ✅ NEW tab
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [selectedDriverTicket, setSelectedDriverTicket] = useState<DriverTicket | null>(null);  // ✅ NEW
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeletionRequests, setShowDeletionRequests] = useState(true);

  // ── Driver ticket response state ─────────────────────────────────────────
  const [driverTicketResponse, setDriverTicketResponse] = useState({ message: '', resolve: false });  // ✅ NEW

  // ── Form data ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    supportPhone: '',
    supportEmail: '',
    whatsappNumber: '',
    enabled: true,
  });

  const [responseData, setResponseData] = useState({
    response: '',
    status: 'in-progress' as HelpRequest['status'],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    console.log('🔗 API_BASE:', API_BASE);
    fetchSettings();
    fetchRequests();
    fetchStats();
    fetchDriverTickets();  // ✅ NEW
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ════════════════════════════════════════════════════════════════════════════
  // AUTH HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  const getAuthToken = (): string => localStorage.getItem('adminToken') || '';

  const getAxiosConfig = () => ({
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // API CALLS — Customer
  // ════════════════════════════════════════════════════════════════════════════

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/help/settings`, getAxiosConfig());
      if (response.data.success) {
        const s = response.data.settings;
        setSettings(s);
        setFormData({
          supportPhone: s.supportPhone || '',
          supportEmail: s.supportEmail || '',
          whatsappNumber: s.whatsappNumber || '',
          enabled: s.enabled ?? true,
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching settings:', error);
      handleError(error, 'Failed to load help settings');
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/admin/help/requests`, getAxiosConfig());
      if (response.data.success) {
        setRequests(response.data.requests || []);
      }
    } catch (error: any) {
      console.error('❌ Error fetching requests:', error);
      handleError(error, 'Failed to load help requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/help/stats`, getAxiosConfig());
      if (response.data.success) setStats(response.data.stats);
    } catch (error: any) {
      console.error('❌ Error fetching stats:', error.response?.data || error.message);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ✅ NEW: API CALLS — Driver Tickets
  // ════════════════════════════════════════════════════════════════════════════

  const fetchDriverTickets = async () => {
    try {
      // Fetch all (pending + in_progress + resolved) by passing no status filter
      const response = await axios.get(
        `${API_BASE}/api/support/admin/driver-tickets?status=all`,
        getAxiosConfig()
      );
      if (response.data.success) {
        setDriverTickets(response.data.tickets || []);
      }
    } catch (error: any) {
      console.error('❌ Error fetching driver tickets:', error.response?.data || error.message);
      // Don't show error banner — older backends may not have this route yet
    }
  };

  const sendDriverTicketMessage = async (ticketId: string) => {
    if (!driverTicketResponse.message.trim()) {
      setMessage({ type: 'error', text: 'Please type a message before sending' });
      return;
    }
    setLoading(true);
    try {
      const url = driverTicketResponse.resolve
        ? `${API_BASE}/api/support/admin/driver-tickets/${ticketId}/resolve`
        : `${API_BASE}/api/support/admin/driver-tickets/${ticketId}/message`;

      await axios.post(
        url,
        driverTicketResponse.resolve
          ? { resolutionNotes: driverTicketResponse.message }
          : { message: driverTicketResponse.message },
        getAxiosConfig()
      );

      setMessage({
        type: 'success',
        text: driverTicketResponse.resolve ? 'Ticket resolved!' : 'Message sent to driver!',
      });
      setSelectedDriverTicket(null);
      setDriverTicketResponse({ message: '', resolve: false });
      fetchDriverTickets();
    } catch (error: any) {
      handleError(error, 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // API CALLS — Settings / Customer requests
  // ════════════════════════════════════════════════════════════════════════════

  const updateSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE}/api/admin/help/settings`, formData, getAxiosConfig());
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Help settings updated successfully!' });
        setSettings(response.data.settings);
        setShowSettingsForm(false);
      }
    } catch (error: any) {
      handleError(error, 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string) => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE}/api/admin/help/requests/${requestId}`,
        responseData,
        getAxiosConfig()
      );
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Request updated successfully!' });
        setSelectedRequest(null);
        fetchRequests();
        fetchStats();
      }
    } catch (error: any) {
      handleError(error, 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;
    try {
      const response = await axios.delete(
        `${API_BASE}/api/admin/help/requests/${requestId}`,
        getAxiosConfig()
      );
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Request deleted successfully!' });
        fetchRequests();
        fetchStats();
      }
    } catch (error: any) {
      handleError(error, 'Failed to delete request');
    }
  };

  const handleError = (error: any, defaultMessage: string) => {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || defaultMessage;
    setMessage({ type: 'error', text: errorMessage });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setResponseData(prev => ({ ...prev, [name]: value }));
  };

  // ════════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ════════════════════════════════════════════════════════════════════════════

  const deletionRequests = requests.filter(r => r.category === 'account-deletion');
  const regularRequests = requests.filter(r => r.category !== 'account-deletion');

  const filteredDeletionRequests = deletionRequests.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = !searchQuery ||
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredRegularRequests = regularRequests.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesSearch = !searchQuery ||
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // ✅ NEW: filtered driver tickets
  const filteredDriverTickets = driverTickets.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = !searchQuery ||
      t.issueType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.driverName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingDriverTickets = driverTickets.filter(t => t.status === 'pending').length;

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ════════════════════════════════════════════════════════════════════════════

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatIssueType = (issueType: string) =>
    issueType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const getStatusBadge = (status: HelpRequest['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    const icons = { pending: '🟡', 'in-progress': '🔵', resolved: '🟢', closed: '⚫' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ✅ NEW: driver ticket status badge (uses underscore variant)
  const getDriverStatusBadge = (status: DriverTicket['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
    };
    const icons = { pending: '🟡', in_progress: '🔵', resolved: '🟢' };
    const labels = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {icons[status]} {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const styles = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    const styles: Record<string, string> = {
      technical: 'bg-purple-100 text-purple-700',
      billing: 'bg-green-100 text-green-700',
      general: 'bg-gray-100 text-gray-700',
      complaint: 'bg-red-100 text-red-700',
      feedback: 'bg-blue-100 text-blue-700',
      'account-deletion': 'bg-red-100 text-red-700',
    };
    const icons: Record<string, string> = {
      technical: '🔧', billing: '💳', general: '📋',
      complaint: '⚠️', feedback: '💬', 'account-deletion': '🗑️',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[category] || 'bg-gray-100 text-gray-700'}`}>
        {icons[category] || '📋'} {category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </span>
    );
  };

  const getDeletionTypeBadge = (deletionType?: string) => {
    if (!deletionType) return null;
    const styles: Record<string, string> = {
      immediate: 'bg-red-100 text-red-700',
      scheduled: 'bg-orange-100 text-orange-700',
      'with-export': 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      immediate: '⚡ Immediate',
      scheduled: '📅 Scheduled',
      'with-export': '📦 With Export',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[deletionType] || ''}`}>
        {labels[deletionType] || deletionType}
      </span>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ── Toast Banner ─────────────────────────────────────────────────── */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white max-w-md`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{message.type === 'success' ? '✅' : '❌'}</span>
            <p className="font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Help & Support Management</h1>
        <p className="text-gray-600 mt-2">Manage customer & driver support requests</p>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 font-medium">Total (Customer)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-400">
            <p className="text-sm text-gray-600 font-medium">In Progress</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgressRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 font-medium">Resolved</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.resolvedRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600 font-medium">Avg. Response</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageResponseTime}h</p>
          </div>
          {/* ✅ NEW: Driver tickets stat */}
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600 font-medium">Driver Tickets</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{driverTickets.length}</p>
            {pendingDriverTickets > 0 && (
              <p className="text-xs text-yellow-600 font-semibold mt-1">🟡 {pendingDriverTickets} pending</p>
            )}
          </div>
        </div>
      )}

      {/* ── Settings Panel ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Support Contact Settings</h2>
            {settings && (
              <p className="text-sm text-gray-500 mt-1">
                📞 {settings.supportPhone} · 📧 {settings.supportEmail} · 
                {settings.enabled ? ' ✅ Enabled' : ' ❌ Disabled'}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSettingsForm(!showSettingsForm)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            ⚙️ {showSettingsForm ? 'Cancel' : 'Edit Settings'}
          </button>
        </div>

        {showSettingsForm && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Support Phone</label>
              <input name="supportPhone" value={formData.supportPhone} onChange={handleFormChange}
                className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="+91 XXXXXXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Support Email</label>
              <input name="supportEmail" type="email" value={formData.supportEmail} onChange={handleFormChange}
                className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="support@ghumo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
              <input name="whatsappNumber" value={formData.whatsappNumber} onChange={handleFormChange}
                className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="91XXXXXXXXXX" />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input name="enabled" type="checkbox" checked={formData.enabled}
                onChange={handleFormChange} className="w-4 h-4 accent-orange-500" />
              <label className="text-sm font-medium">Support Enabled</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSettingsForm(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={updateSettings} disabled={loading}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {loading ? 'Saving…' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ✅ NEW: TAB SWITCHER — Customer Requests / Driver Tickets
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('customer'); setFilterStatus('all'); setSearchQuery(''); }}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition ${
            activeTab === 'customer'
              ? 'bg-orange-500 text-white shadow'
              : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          👤 Customer Requests ({requests.length})
        </button>
        <button
          onClick={() => { setActiveTab('driver'); setFilterStatus('all'); setSearchQuery(''); }}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition relative ${
            activeTab === 'driver'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          🚗 Driver Tickets ({driverTickets.length})
          {pendingDriverTickets > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingDriverTickets}
            </span>
          )}
        </button>
        <button
          onClick={() => { fetchRequests(); fetchDriverTickets(); fetchStats(); }}
          className="ml-auto px-4 py-3 rounded-xl font-semibold text-sm bg-white border text-gray-600 hover:bg-gray-50"
          title="Refresh"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          CUSTOMER TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'customer' && (
        <>
          {/* Account Deletion Priority Section */}
          {deletionRequests.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-red-200 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500 text-white p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-red-900">Account Deletion Requests</h2>
                    <p className="text-sm text-red-700">⚠️ High Priority ({filteredDeletionRequests.length} pending)</p>
                  </div>
                </div>
                <button onClick={() => setShowDeletionRequests(!showDeletionRequests)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                  {showDeletionRequests ? '👁️ Hide' : '👁️ Show'}
                </button>
              </div>

              {showDeletionRequests && (
                filteredDeletionRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-lg font-medium">All account deletion requests processed!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDeletionRequests.map(request => (
                      <div key={request._id} className="bg-white border-2 border-red-300 rounded-lg p-5 hover:shadow-xl transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <h3 className="text-lg font-bold text-red-900">{request.subject}</h3>
                              {getStatusBadge(request.status)}
                              {getDeletionTypeBadge(request.deletionType)}
                              {getPriorityBadge(request.priority)}
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 mb-3">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 font-medium mb-1">👤 CUSTOMER INFO</p>
                                <p className="text-sm font-semibold">{request.customerName || 'Unknown'}</p>
                                {request.customerPhone && <p className="text-xs text-gray-600">📱 {request.customerPhone}</p>}
                                <p className="text-xs text-gray-600">🆔 {request.customerId}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 font-medium mb-1">📅 REQUEST DETAILS</p>
                                <p className="text-xs text-gray-600">Created: {formatDate(request.createdAt)}</p>
                                {request.scheduledDeletionDate && (
                                  <p className="text-xs text-red-600 font-semibold">
                                    🗓️ Scheduled: {formatDate(request.scheduledDeletionDate)}
                                  </p>
                                )}
                                {request.dataExportRequested && (
                                  <p className="text-xs text-blue-600">
                                    📦 Data Export {request.dataExportCompleted ? '✅ Completed' : '⏳ Pending'}
                                  </p>
                                )}
                              </div>
                            </div>
                            {request.deletionReason && (
                              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-xs text-yellow-700 font-medium mb-1">💬 DELETION REASON</p>
                                <p className="text-sm text-gray-800">{request.deletionReason}</p>
                              </div>
                            )}
                            {request.description && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 font-medium mb-1">📝 DESCRIPTION</p>
                                <p className="text-sm text-gray-800">{request.description}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => { setSelectedRequest(request); setResponseData({ response: request.response || '', status: request.status }); }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">
                              ✏️ Process
                            </button>
                            <button onClick={() => deleteRequest(request._id)}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600">
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                        {request.response && (
                          <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Admin Response:</p>
                            <p className="text-sm text-blue-800">{request.response}</p>
                            {request.resolvedAt && (
                              <p className="text-xs text-blue-600 mt-2">✅ Resolved: {formatDate(request.resolvedAt)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* Regular Support Requests */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Support Requests ({filteredRegularRequests.length})</h2>
                <p className="text-sm text-gray-500 mt-1">General customer support tickets</p>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <input type="text" placeholder="🔍 Search requests..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 min-w-[220px]" />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500">
                  <option value="all">All Categories</option>
                  <option value="technical">🔧 Technical</option>
                  <option value="billing">💳 Billing</option>
                  <option value="general">📋 General</option>
                  <option value="complaint">⚠️ Complaint</option>
                  <option value="feedback">💬 Feedback</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500">
                  <option value="all">All Status</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="in-progress">🔵 In Progress</option>
                  <option value="resolved">🟢 Resolved</option>
                  <option value="closed">⚫ Closed</option>
                </select>
              </div>
            </div>

            {loading && requests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-10 w-10 mx-auto text-orange-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="mt-4 text-gray-500">Loading requests...</p>
              </div>
            ) : filteredRegularRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-lg">No requests found</p>
                <p className="text-sm">{searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
                  ? 'Try adjusting your filters' : 'All customer support requests will appear here'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegularRequests.map(request => (
                  <div key={request._id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{request.subject}</h3>
                          {getStatusBadge(request.status)}
                          {getPriorityBadge(request.priority)}
                          {getCategoryBadge(request.category)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span>👤 {request.customerName || 'Unknown'}</span>
                          {request.customerPhone && <span>📱 {request.customerPhone}</span>}
                          <span>📅 {formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => { setSelectedRequest(request); setResponseData({ response: request.response || '', status: request.status }); }}
                          className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">
                          ✏️ Respond
                        </button>
                        <button onClick={() => deleteRequest(request._id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    {request.response && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900">Response:</p>
                        <p className="text-sm text-blue-800 mt-1">{request.response}</p>
                        {request.resolvedAt && (
                          <p className="text-xs text-blue-600 mt-2">Resolved: {formatDate(request.resolvedAt)}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ✅ NEW: DRIVER TICKETS TAB
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'driver' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Driver Support Tickets ({filteredDriverTickets.length})</h2>
              <p className="text-sm text-gray-500 mt-1">Tickets raised by drivers from the partner app</p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <input type="text" placeholder="🔍 Search driver, issue..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 min-w-[220px]" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500">
                <option value="all">All Status</option>
                <option value="pending">🟡 Pending</option>
                <option value="in_progress">🔵 In Progress</option>
                <option value="resolved">🟢 Resolved</option>
              </select>
            </div>
          </div>

          {filteredDriverTickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🚗</div>
              <p className="text-lg">No driver tickets found</p>
              <p className="text-sm">Driver support tickets will appear here once drivers submit them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDriverTickets.map(ticket => (
                <div key={ticket._id} className={`border-2 rounded-lg p-4 hover:shadow-md transition ${
                  ticket.status === 'pending' ? 'border-yellow-300 bg-yellow-50' :
                  ticket.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200 bg-white'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">
                          🔧 {formatIssueType(ticket.issueType)}
                        </h3>
                        {getDriverStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <p className="text-sm text-gray-700 mb-3 bg-white p-2 rounded border">{ticket.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span>🚗 {ticket.driverName || 'Unknown Driver'}</span>
                        {ticket.driverPhone && <span>📱 {ticket.driverPhone}</span>}
                        <span>🆔 {ticket.driverId}</span>
                        <span>📅 {formatDate(ticket.createdAt)}</span>
                      </div>
                      {ticket.adminNotes && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">Admin Notes:</p>
                          <p className="text-xs text-green-700 whitespace-pre-wrap">{ticket.adminNotes}</p>
                          {ticket.resolvedAt && (
                            <p className="text-xs text-green-600 mt-1">✅ Resolved: {formatDate(ticket.resolvedAt)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {ticket.status !== 'resolved' && (
                      <button
                        onClick={() => { setSelectedDriverTicket(ticket); setDriverTicketResponse({ message: '', resolve: false }); }}
                        className="ml-4 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 whitespace-nowrap">
                        💬 Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Customer Request Response Modal ──────────────────────────────── */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold">{selectedRequest.subject}</h3>
                    {getCategoryBadge(selectedRequest.category)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    From: {selectedRequest.customerName || 'Unknown'} • {formatDate(selectedRequest.createdAt)}
                  </p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Customer Message:</p>
                  <p className="text-gray-900 mt-2">{selectedRequest.description}</p>
                </div>
                {selectedRequest.category === 'account-deletion' && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-bold text-red-900 mb-3">⚠️ Account Deletion Details</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Type:</span> {getDeletionTypeBadge(selectedRequest.deletionType)}</p>
                      {selectedRequest.scheduledDeletionDate && (
                        <p><span className="font-semibold">Scheduled:</span> {formatDate(selectedRequest.scheduledDeletionDate)}</p>
                      )}
                      {selectedRequest.dataExportRequested && (
                        <p><span className="font-semibold">Data Export:</span> {selectedRequest.dataExportCompleted ? '✅ Completed' : '⏳ Pending'}</p>
                      )}
                      {selectedRequest.deletionReason && (
                        <div className="mt-2"><p className="font-semibold">Reason:</p><p className="text-gray-700 mt-1">{selectedRequest.deletionReason}</p></div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Your Response:</label>
                  <textarea name="response" value={responseData.response} onChange={handleResponseChange}
                    rows={5} className="border rounded-lg w-full p-3 focus:ring-2 focus:ring-orange-500"
                    placeholder="Type your response here..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Update Status:</label>
                  <select name="status" value={responseData.status} onChange={handleResponseChange}
                    className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500">
                    <option value="pending">🟡 Pending</option>
                    <option value="in-progress">🔵 In Progress</option>
                    <option value="resolved">🟢 Resolved</option>
                    <option value="closed">⚫ Closed</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={() => setSelectedRequest(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                  <button onClick={() => updateRequestStatus(selectedRequest._id)} disabled={loading}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                    {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                    💾 Save Response
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Driver Ticket Response Modal */}
      {selectedDriverTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">🚗 {formatIssueType(selectedDriverTicket.issueType)}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Driver: {selectedDriverTicket.driverName || 'Unknown'} 
                    {selectedDriverTicket.driverPhone && ` · 📱 ${selectedDriverTicket.driverPhone}`}
                    {' · '}{formatDate(selectedDriverTicket.createdAt)}
                  </p>
                </div>
                <button onClick={() => setSelectedDriverTicket(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Driver's Message:</p>
                  <p className="text-gray-900 mt-2">{selectedDriverTicket.message}</p>
                </div>
                {selectedDriverTicket.adminNotes && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-semibold text-green-800 mb-1">Previous Notes:</p>
                    <p className="text-xs text-green-700 whitespace-pre-wrap">{selectedDriverTicket.adminNotes}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Your Message / Notes:</label>
                  <textarea
                    value={driverTicketResponse.message}
                    onChange={e => setDriverTicketResponse(prev => ({ ...prev, message: e.target.value }))}
                    rows={5} className="border rounded-lg w-full p-3 focus:ring-2 focus:ring-purple-500"
                    placeholder="Type your response or resolution notes..." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="resolveTicket"
                    checked={driverTicketResponse.resolve}
                    onChange={e => setDriverTicketResponse(prev => ({ ...prev, resolve: e.target.checked }))}
                    className="w-4 h-4 accent-green-600" />
                  <label htmlFor="resolveTicket" className="text-sm font-medium text-green-700">
                    ✅ Mark as Resolved
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={() => setSelectedDriverTicket(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                  <button
                    onClick={() => sendDriverTicketMessage(selectedDriverTicket._id)}
                    disabled={loading}
                    className={`${driverTicketResponse.resolve ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2`}>
                    {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                    {driverTicketResponse.resolve ? '✅ Resolve Ticket' : '💬 Send Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        📞 Help & Support Management System • API: {API_BASE}
      </div>
    </div>
  );
};

export default HelpManagement;