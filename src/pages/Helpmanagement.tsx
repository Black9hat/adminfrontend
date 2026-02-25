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
  // Account deletion specific fields
  deletionType?: 'immediate' | 'scheduled' | 'with-export';
  scheduledDeletionDate?: string;
  dataExportRequested?: boolean;
  dataExportCompleted?: boolean;
  deletionReason?: string;
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
  // State Management
  const [settings, setSettings] = useState<HelpSettings | null>(null);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [stats, setStats] = useState<HelpStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // UI State
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeletionRequests, setShowDeletionRequests] = useState(true);

  // Form Data
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

  const getAuthToken = (): string => {
    const token = localStorage.getItem('adminToken');
    return token || '';
  };

  const getAxiosConfig = () => {
    const token = getAuthToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ════════════════════════════════════════════════════════════════════════════

  const fetchSettings = async () => {
    try {
      const url = `${API_BASE}/api/admin/help/settings`;
      console.log('📡 Fetching settings from:', url);

      const response = await axios.get(url, getAxiosConfig());
      console.log('📦 Settings response:', response.data);

      if (response.data.success) {
        const settingsData = response.data.settings;
        setSettings(settingsData);
        
        // Populate form
        setFormData({
          supportPhone: settingsData.supportPhone || '',
          supportEmail: settingsData.supportEmail || '',
          whatsappNumber: settingsData.whatsappNumber || '',
          enabled: settingsData.enabled ?? true,
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
      const url = `${API_BASE}/api/admin/help/requests`;
      console.log('📡 Fetching requests from:', url);

      const response = await axios.get(url, getAxiosConfig());
      console.log('📦 Requests response:', response.data);

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
      const url = `${API_BASE}/api/admin/help/stats`;
      const response = await axios.get(url, getAxiosConfig());

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error: any) {
      console.error('❌ Error fetching stats:', error.response?.data || error.message);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/admin/help/settings`;
      console.log('💾 Updating settings:', formData);

      const response = await axios.put(url, formData, getAxiosConfig());

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
      const url = `${API_BASE}/api/admin/help/requests/${requestId}`;
      console.log('💾 Updating request:', requestId, responseData);

      const response = await axios.put(url, responseData, getAxiosConfig());

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
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      const url = `${API_BASE}/api/admin/help/requests/${requestId}`;
      console.log('🗑️ Deleting request:', requestId);

      const response = await axios.delete(url, getAxiosConfig());

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
    const errorMessage = error.response?.data?.error || error.message || defaultMessage;
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
    setResponseData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // ════════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ════════════════════════════════════════════════════════════════════════════

  const deletionRequests = requests.filter(r => r.category === 'account-deletion');
  const regularRequests = requests.filter(r => r.category !== 'account-deletion');

  const filteredDeletionRequests = deletionRequests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch = !searchQuery || 
      request.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const filteredRegularRequests = regularRequests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || request.category === filterCategory;
    const matchesSearch = !searchQuery || 
      request.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.customerName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ════════════════════════════════════════════════════════════════════════════

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: HelpRequest['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
    };

    const icons = {
      pending: '🟡',
      'in-progress': '🔵',
      resolved: '🟢',
      closed: '⚫',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: HelpRequest['priority']) => {
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
    
    const styles = {
      technical: 'bg-purple-100 text-purple-700',
      billing: 'bg-green-100 text-green-700',
      general: 'bg-gray-100 text-gray-700',
      complaint: 'bg-red-100 text-red-700',
      feedback: 'bg-blue-100 text-blue-700',
      'account-deletion': 'bg-red-100 text-red-700',
    };

    const icons = {
      technical: '🔧',
      billing: '💳',
      general: '📋',
      complaint: '⚠️',
      feedback: '💬',
      'account-deletion': '🗑️',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[category as keyof typeof styles]}`}>
        {icons[category as keyof typeof icons]} {category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </span>
    );
  };

  const getDeletionTypeBadge = (deletionType?: string) => {
    if (!deletionType) return null;

    const styles = {
      immediate: 'bg-red-100 text-red-700',
      scheduled: 'bg-orange-100 text-orange-700',
      'with-export': 'bg-blue-100 text-blue-700',
    };

    const labels = {
      immediate: '⚡ Immediate',
      scheduled: '📅 Scheduled',
      'with-export': '📦 With Export',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[deletionType as keyof typeof styles]}`}>
        {labels[deletionType as keyof typeof labels]}
      </span>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Message Banner */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white max-w-md`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            <p className="font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Help & Support Management</h1>
        <p className="text-gray-600 mt-2">Manage customer support requests and contact settings</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 font-medium">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 font-medium">In Progress</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgressRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 font-medium">Resolved</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.resolvedRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 font-medium">Deletions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{deletionRequests.length}</p>
          </div>
        </div>
      )}

      {/* Help Settings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Contact Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Support contact information shown to customers</p>
          </div>
          
          <button
            onClick={() => setShowSettingsForm(!showSettingsForm)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            <span>⚙️</span>
            {showSettingsForm ? 'Cancel' : 'Edit Settings'}
          </button>
        </div>

        {showSettingsForm ? (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Support Phone</label>
              <input
                type="text"
                name="supportPhone"
                value={formData.supportPhone}
                onChange={handleFormChange}
                className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="+91 1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Support Email</label>
              <input
                type="email"
                name="supportEmail"
                value={formData.supportEmail}
                onChange={handleFormChange}
                className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="support@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">WhatsApp Number</label>
              <input
                type="text"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleFormChange}
                className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="911234567890"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="enabled"
                checked={formData.enabled}
                onChange={handleFormChange}
                className="w-5 h-5"
              />
              <label className="text-sm font-medium">Enable Help & Support</label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSettingsForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={updateSettings}
                disabled={loading}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                💾 Save Settings
              </button>
            </div>
          </div>
        ) : settings ? (
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">📞 SUPPORT PHONE</p>
              <p className="text-gray-900 font-semibold">{settings.supportPhone}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">📧 SUPPORT EMAIL</p>
              <p className="text-gray-900 font-semibold">{settings.supportEmail}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">💬 WHATSAPP</p>
              <p className="text-gray-900 font-semibold">{settings.whatsappNumber}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">Loading settings...</div>
        )}
      </div>

      {/* Account Deletion Requests - Priority Section */}
      {deletionRequests.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-red-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-500 text-white p-2 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-900">Account Deletion Requests</h2>
                  <p className="text-sm text-red-700">⚠️ High Priority - Requires immediate attention ({filteredDeletionRequests.length} pending)</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDeletionRequests(!showDeletionRequests)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              {showDeletionRequests ? '👁️ Hide' : '👁️ Show'}
            </button>
          </div>

          {showDeletionRequests && (
            filteredDeletionRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-lg font-medium">All account deletion requests have been processed!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeletionRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white border-2 border-red-300 rounded-lg p-5 hover:shadow-xl transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold text-red-900">{request.subject}</h3>
                          {getStatusBadge(request.status)}
                          {getDeletionTypeBadge(request.deletionType)}
                          {getPriorityBadge(request.priority)}
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 mb-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 font-medium mb-1">👤 CUSTOMER INFO</p>
                            <p className="text-sm font-semibold">{request.customerName || 'Unknown'}</p>
                            {request.customerPhone && (
                              <p className="text-xs text-gray-600">📱 {request.customerPhone}</p>
                            )}
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
                          onClick={() => {
                            setSelectedRequest(request);
                            setResponseData({
                              response: request.response || '',
                              status: request.status,
                            });
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
                        >
                          ✏️ Process
                        </button>
                        <button
                          onClick={() => deleteRequest(request._id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>

                    {request.response && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Admin Response:</p>
                        <p className="text-sm text-blue-800">{request.response}</p>
                        {request.resolvedAt && (
                          <p className="text-xs text-blue-600 mt-2">
                            ✅ Resolved: {formatDate(request.resolvedAt)}
                          </p>
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
            <p className="text-sm text-gray-500 mt-1">General customer support tickets and inquiries</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 min-w-[250px]"
            />
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Categories</option>
              <option value="technical">🔧 Technical</option>
              <option value="billing">💳 Billing</option>
              <option value="general">📋 General</option>
              <option value="complaint">⚠️ Complaint</option>
              <option value="feedback">💬 Feedback</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500"
            >
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
            <p className="text-sm">
              {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
                ? 'Try adjusting your filters' 
                : 'All customer support requests will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRegularRequests.map((request) => (
              <div
                key={request._id}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >
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
                      onClick={() => {
                        setSelectedRequest(request);
                        setResponseData({
                          response: request.response || '',
                          status: request.status,
                        });
                      }}
                      className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      ✏️ Respond
                    </button>
                    <button
                      onClick={() => deleteRequest(request._id)}
                      className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {request.response && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">Response:</p>
                    <p className="text-sm text-blue-800 mt-1">{request.response}</p>
                    {request.resolvedAt && (
                      <p className="text-xs text-blue-600 mt-2">
                        Resolved: {formatDate(request.resolvedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
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
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
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

                {/* Account Deletion Specific Fields */}
                {selectedRequest.category === 'account-deletion' && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-bold text-red-900 mb-3">⚠️ Account Deletion Request Details</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Type:</span> {getDeletionTypeBadge(selectedRequest.deletionType)}</p>
                      {selectedRequest.scheduledDeletionDate && (
                        <p><span className="font-semibold">Scheduled Date:</span> {formatDate(selectedRequest.scheduledDeletionDate)}</p>
                      )}
                      {selectedRequest.dataExportRequested && (
                        <p><span className="font-semibold">Data Export:</span> {selectedRequest.dataExportCompleted ? '✅ Completed' : '⏳ Pending'}</p>
                      )}
                      {selectedRequest.deletionReason && (
                        <div className="mt-2">
                          <p className="font-semibold">Reason:</p>
                          <p className="text-gray-700 mt-1">{selectedRequest.deletionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Your Response:</label>
                  <textarea
                    name="response"
                    value={responseData.response}
                    onChange={handleResponseChange}
                    rows={5}
                    className="border rounded-lg w-full p-3 focus:ring-2 focus:ring-orange-500"
                    placeholder="Type your response here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Update Status:</label>
                  <select
                    name="status"
                    value={responseData.status}
                    onChange={handleResponseChange}
                    className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="pending">🟡 Pending</option>
                    <option value="in-progress">🔵 In Progress</option>
                    <option value="resolved">🟢 Resolved</option>
                    <option value="closed">⚫ Closed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateRequestStatus(selectedRequest._id)}
                    disabled={loading}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    💾 Save Response
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