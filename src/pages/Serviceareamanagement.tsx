import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

interface ServiceArea {
  _id: string;
  id: string;
  name: string;
  enabled: boolean;
  center: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  allowedCities: string[];
  allowedStates: string[];
  specialZones: SpecialZone[];
  outOfServiceMessage: {
    title: string;
    message: string;
    suggestions: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface SpecialZone {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

interface ServiceAreaStats {
  totalAreas: number;
  activeAreas: number;
  totalCities: number;
  totalSpecialZones: number;
  averageRadius: number;
}

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return 'https://your-api-url.com';
};

const API_BASE = getApiBase();

// 🗺️ Default coordinates for Indian cities
const CITY_COORDINATES = {
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  pune: { lat: 18.5204, lng: 73.8567 },
};

const ServiceAreaManagement: React.FC = () => {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [stats, setStats] = useState<ServiceAreaStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showMap, setShowMap] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    enabled: true,
    centerLat: 17.3850,
    centerLng: 78.4867,
    radiusKm: 50,
    allowedCities: [] as string[],
    allowedStates: [] as string[],
    specialZones: [] as SpecialZone[],
    messageTitle: 'Oops! We currently don\'t service your drop location.',
    messageText: 'Please select a different location within our service area',
    messageSuggestions: [] as string[],
  });

  // Temp state for adding cities/states/zones
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newSuggestion, setNewSuggestion] = useState('');
  const [newZone, setNewZone] = useState({
    name: '',
    lat: 17.3850,
    lng: 78.4867,
    radiusKm: 5,
  });

  useEffect(() => {
    console.log('🔗 API_BASE:', API_BASE);
    fetchServiceAreas();
    fetchStats();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

  const fetchServiceAreas = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/admin/service-areas`;
      console.log('📡 Fetching from:', url);

      const response = await axios.get(url, getAxiosConfig());
      console.log('📦 Response:', response.data);

      if (response.data.success) {
        const areas = response.data.serviceAreas || [];
        console.log(`✅ Fetched ${areas.length} service areas`);
        setServiceAreas(areas);
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to load service areas' });
      }
    } catch (error: any) {
      console.error('❌ Error fetching service areas:', error);
      let errorMessage = 'Failed to load service areas';
      if (error.response) {
        errorMessage = error.response.data?.error || `Error ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Check if backend is running.';
      }
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const url = `${API_BASE}/api/admin/service-areas/stats`;
      const response = await axios.get(url, getAxiosConfig());

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error: any) {
      console.error('❌ Error fetching stats:', error.response?.data || error.message);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: value === '' ? 0 : Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddCity = () => {
    if (newCity.trim()) {
      setFormData({
        ...formData,
        allowedCities: [...formData.allowedCities, newCity.trim().toLowerCase()],
      });
      setNewCity('');
    }
  };

  const handleRemoveCity = (city: string) => {
    setFormData({
      ...formData,
      allowedCities: formData.allowedCities.filter((c) => c !== city),
    });
  };

  const handleAddState = () => {
    if (newState.trim()) {
      setFormData({
        ...formData,
        allowedStates: [...formData.allowedStates, newState.trim().toLowerCase()],
      });
      setNewState('');
    }
  };

  const handleRemoveState = (state: string) => {
    setFormData({
      ...formData,
      allowedStates: formData.allowedStates.filter((s) => s !== state),
    });
  };

  const handleAddSuggestion = () => {
    if (newSuggestion.trim()) {
      setFormData({
        ...formData,
        messageSuggestions: [...formData.messageSuggestions, newSuggestion.trim()],
      });
      setNewSuggestion('');
    }
  };

  const handleRemoveSuggestion = (index: number) => {
    setFormData({
      ...formData,
      messageSuggestions: formData.messageSuggestions.filter((_, i) => i !== index),
    });
  };

  const handleAddZone = () => {
    if (newZone.name.trim()) {
      setFormData({
        ...formData,
        specialZones: [...formData.specialZones, { ...newZone }],
      });
      setNewZone({ name: '', lat: 17.3850, lng: 78.4867, radiusKm: 5 });
    }
  };

  const handleRemoveZone = (index: number) => {
    setFormData({
      ...formData,
      specialZones: formData.specialZones.filter((_, i) => i !== index),
    });
  };

  const handleQuickSetCity = (cityKey: string) => {
    const coords = CITY_COORDINATES[cityKey as keyof typeof CITY_COORDINATES];
    if (coords) {
      setFormData({
        ...formData,
        centerLat: coords.lat,
        centerLng: coords.lng,
        name: cityKey.charAt(0).toUpperCase() + cityKey.slice(1),
        id: cityKey,
      });
    }
  };

  const handleCreateServiceArea = async () => {
    // Validation
    if (!formData.id.trim()) {
      setMessage({ type: 'error', text: 'Service area ID is required' });
      return;
    }
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Service area name is required' });
      return;
    }
    if (formData.radiusKm <= 0) {
      setMessage({ type: 'error', text: 'Radius must be greater than 0' });
      return;
    }
    if (formData.allowedCities.length === 0 && formData.allowedStates.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one city or state' });
      return;
    }

    setLoading(true);

    try {
      const url = `${API_BASE}/api/admin/service-areas`;

      const payload = {
        id: formData.id.toLowerCase().trim(),
        name: formData.name.trim(),
        enabled: formData.enabled,
        center: {
          lat: Number(formData.centerLat),
          lng: Number(formData.centerLng),
        },
        radiusKm: Number(formData.radiusKm),
        allowedCities: formData.allowedCities,
        allowedStates: formData.allowedStates,
        specialZones: formData.specialZones,
        outOfServiceMessage: {
          title: formData.messageTitle,
          message: formData.messageText,
          suggestions: formData.messageSuggestions,
        },
      };

      console.log('📤 Creating service area:', payload);

      const response = await axios.post(url, payload, getAxiosConfig());

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Service area created successfully!' });
        setShowCreateForm(false);
        resetForm();
        await fetchServiceAreas();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to create service area' });
      }
    } catch (error: any) {
      console.error('❌ Error creating service area:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create service area';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServiceArea = async () => {
    if (!editingArea) return;

    setLoading(true);

    try {
      const url = `${API_BASE}/api/admin/service-areas/${editingArea._id}`;

      const payload = {
        name: formData.name.trim(),
        enabled: formData.enabled,
        center: {
          lat: Number(formData.centerLat),
          lng: Number(formData.centerLng),
        },
        radiusKm: Number(formData.radiusKm),
        allowedCities: formData.allowedCities,
        allowedStates: formData.allowedStates,
        specialZones: formData.specialZones,
        outOfServiceMessage: {
          title: formData.messageTitle,
          message: formData.messageText,
          suggestions: formData.messageSuggestions,
        },
      };

      console.log('📤 Updating service area:', payload);

      const response = await axios.put(url, payload, getAxiosConfig());

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Service area updated successfully!' });
        setEditingArea(null);
        setShowCreateForm(false);
        resetForm();
        await fetchServiceAreas();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to update service area' });
      }
    } catch (error: any) {
      console.error('❌ Error updating service area:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update service area';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServiceArea = async (area: ServiceArea) => {
    if (!window.confirm(`Are you sure you want to delete service area "${area.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setLoading(true);

    try {
      const url = `${API_BASE}/api/admin/service-areas/${area._id}`;
      const response = await axios.delete(url, getAxiosConfig());

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Service area deleted successfully!' });
        await fetchServiceAreas();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to delete service area' });
      }
    } catch (error: any) {
      console.error('❌ Error deleting service area:', error);
      const errorMsg = error.response?.data?.error || 'Failed to delete service area';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (area: ServiceArea) => {
    try {
      const url = `${API_BASE}/api/admin/service-areas/${area._id}/toggle`;
      const response = await axios.patch(url, {}, getAxiosConfig());

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `✅ Service area ${response.data.serviceArea.enabled ? 'enabled' : 'disabled'}!`,
        });
        await fetchServiceAreas();
        await fetchStats();
      }
    } catch (error: any) {
      console.error('❌ Error toggling status:', error);
      setMessage({ type: 'error', text: 'Failed to toggle status' });
    }
  };

  const handleEditServiceArea = (area: ServiceArea) => {
    setEditingArea(area);
    setFormData({
      id: area.id,
      name: area.name,
      enabled: area.enabled,
      centerLat: area.center.lat,
      centerLng: area.center.lng,
      radiusKm: area.radiusKm,
      allowedCities: area.allowedCities || [],
      allowedStates: area.allowedStates || [],
      specialZones: area.specialZones || [],
      messageTitle: area.outOfServiceMessage?.title || '',
      messageText: area.outOfServiceMessage?.message || '',
      messageSuggestions: area.outOfServiceMessage?.suggestions || [],
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      enabled: true,
      centerLat: 17.3850,
      centerLng: 78.4867,
      radiusKm: 50,
      allowedCities: [],
      allowedStates: [],
      specialZones: [],
      messageTitle: 'Oops! We currently don\'t service your drop location.',
      messageText: 'Please select a different location within our service area',
      messageSuggestions: [],
    });
    setEditingArea(null);
  };

  const getStatusBadge = (area: ServiceArea) => {
    if (!area.enabled) {
      return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Disabled</span>;
    }
    return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🗺️ Service Area Management</h1>
        <button
          onClick={fetchServiceAreas}
          disabled={loading}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '🔄'
          )}
          Refresh
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex justify-between items-center ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xl font-bold hover:opacity-70 ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-100 text-center">
            <div className="text-sm text-blue-600">📊 Total Areas</div>
            <div className="text-2xl font-bold text-blue-800">{stats.totalAreas}</div>
          </div>
          <div className="p-4 rounded-lg bg-green-100 text-center">
            <div className="text-sm text-green-600">✅ Active</div>
            <div className="text-2xl font-bold text-green-800">{stats.activeAreas}</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-100 text-center">
            <div className="text-sm text-purple-600">🏙️ Cities</div>
            <div className="text-2xl font-bold text-purple-800">{stats.totalCities}</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-100 text-center">
            <div className="text-sm text-yellow-600">📍 Special Zones</div>
            <div className="text-2xl font-bold text-yellow-800">{stats.totalSpecialZones}</div>
          </div>
          <div className="p-4 rounded-lg bg-indigo-100 text-center">
            <div className="text-sm text-indigo-600">📏 Avg Radius</div>
            <div className="text-2xl font-bold text-indigo-800">{stats.averageRadius}km</div>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            if (showCreateForm && !editingArea) {
              setShowCreateForm(false);
            } else {
              setShowCreateForm(true);
              setEditingArea(null);
              resetForm();
            }
          }}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-semibold"
        >
          {showCreateForm && !editingArea ? '❌ Cancel' : '➕ Create New Service Area'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border">
          <h2 className="text-2xl font-bold mb-4">
            {editingArea ? `✏️ Edit Service Area: ${editingArea.name}` : '➕ Create New Service Area'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📋 Basic Information</h3>
            </div>

            {/* Service Area ID */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Service Area ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                className="border rounded w-full p-2 lowercase focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., hyderabad"
                disabled={!!editingArea}
              />
              {editingArea && (
                <p className="text-xs text-gray-500 mt-1">ID cannot be changed</p>
              )}
              {!editingArea && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-gray-500">Quick set:</span>
                  {Object.keys(CITY_COORDINATES).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleQuickSetCity(city)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                    >
                      {city.charAt(0).toUpperCase() + city.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Service Area Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Service Area Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Hyderabad"
              />
            </div>

            {/* Center Coordinates */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📍 Center Coordinates</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="centerLat"
                value={formData.centerLat}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 17.3850"
                step="0.0001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="centerLng"
                value={formData.centerLng}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 78.4867"
                step="0.0001"
              />
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Service Radius (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="radiusKm"
                value={formData.radiusKm}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 50"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Coverage area from center point
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="enabled"
                checked={formData.enabled}
                onChange={handleInputChange}
                className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                id="enabled"
              />
              <label htmlFor="enabled" className="text-sm font-medium cursor-pointer">
                Enabled (service area is active)
              </label>
            </div>

            {/* Allowed Cities */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                🏙️ Allowed Cities <span className="text-red-500">*</span>
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
                  className="border rounded flex-1 p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter city name (e.g., hyderabad, secunderabad)"
                />
                <button
                  type="button"
                  onClick={handleAddCity}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allowedCities.map((city) => (
                  <span
                    key={city}
                    className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(city)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.allowedCities.length === 0 && (
                  <span className="text-sm text-gray-400">No cities added yet</span>
                )}
              </div>
            </div>

            {/* Allowed States */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                🗺️ Allowed States <span className="text-red-500">*</span>
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddState()}
                  className="border rounded flex-1 p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter state name (e.g., telangana)"
                />
                <button
                  type="button"
                  onClick={handleAddState}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allowedStates.map((state) => (
                  <span
                    key={state}
                    className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                  >
                    {state}
                    <button
                      type="button"
                      onClick={() => handleRemoveState(state)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.allowedStates.length === 0 && (
                  <span className="text-sm text-gray-400">No states added yet</span>
                )}
              </div>
            </div>

            {/* Special Zones */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                ✈️ Special Zones (Optional)
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Add airports, railway stations, or other important locations that should always be serviceable
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  className="border rounded p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="Zone name"
                />
                <input
                  type="number"
                  value={newZone.lat}
                  onChange={(e) => setNewZone({ ...newZone, lat: Number(e.target.value) })}
                  className="border rounded p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="Latitude"
                  step="0.0001"
                />
                <input
                  type="number"
                  value={newZone.lng}
                  onChange={(e) => setNewZone({ ...newZone, lng: Number(e.target.value) })}
                  className="border rounded p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="Longitude"
                  step="0.0001"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newZone.radiusKm}
                    onChange={(e) => setNewZone({ ...newZone, radiusKm: Number(e.target.value) })}
                    className="border rounded p-2 focus:ring-2 focus:ring-orange-500 flex-1"
                    placeholder="Radius (km)"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={handleAddZone}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                  >
                    + Add
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {formData.specialZones.map((zone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-yellow-50 border border-yellow-200 p-3 rounded"
                  >
                    <div>
                      <span className="font-medium">{zone.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}) • {zone.radiusKm}km radius
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveZone(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}
                {formData.specialZones.length === 0 && (
                  <span className="text-sm text-gray-400">No special zones added</span>
                )}
              </div>
            </div>

            {/* Out of Service Message */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                💬 Out of Service Message
              </h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Message Title</label>
              <input
                type="text"
                name="messageTitle"
                value={formData.messageTitle}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Oops! We don't service your location"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Message Text</label>
              <textarea
                name="messageText"
                value={formData.messageText}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                rows={2}
                placeholder="e.g., Please select a different location within our service area"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Helpful Suggestions (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSuggestion()}
                  className="border rounded flex-1 p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., We serve all areas within 50km of city center"
                />
                <button
                  type="button"
                  onClick={handleAddSuggestion}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-1">
                {formData.messageSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded"
                  >
                    <span className="text-sm">• {suggestion}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSuggestion(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {formData.messageSuggestions.length === 0 && (
                  <span className="text-sm text-gray-400">No suggestions added</span>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingArea(null);
                resetForm();
              }}
              disabled={loading}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={editingArea ? handleUpdateServiceArea : handleCreateServiceArea}
              disabled={loading}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editingArea ? '💾 Update Service Area' : '➕ Create Service Area'}
            </button>
          </div>
        </div>
      )}

      {/* Service Areas List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">All Service Areas ({serviceAreas.length})</h2>
        </div>

        {loading && serviceAreas.length === 0 ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-10 w-10 mx-auto text-orange-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-gray-500">Loading service areas...</p>
          </div>
        ) : serviceAreas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-lg">No service areas created yet.</p>
            <p className="text-sm">Click "Create New Service Area" to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {serviceAreas.map((area) => (
              <div
                key={area._id}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {area.name}
                      {getStatusBadge(area)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ID: {area.id} • Radius: {area.radiusKm}km • Center: ({area.center.lat.toFixed(4)}, {area.center.lng.toFixed(4)})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleStatus(area)}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        area.enabled
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {area.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                    <button
                      onClick={() => handleEditServiceArea(area)}
                      className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteServiceArea(area)}
                      className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Cities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {area.allowedCities.length > 0 ? (
                        area.allowedCities.map((city) => (
                          <span
                            key={city}
                            className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs"
                          >
                            {city}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">States:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {area.allowedStates.length > 0 ? (
                        area.allowedStates.map((state) => (
                          <span
                            key={state}
                            className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs"
                          >
                            {state}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Special Zones:</span>
                    <div className="mt-1">
                      {area.specialZones && area.specialZones.length > 0 ? (
                        <span className="text-yellow-700">
                          {area.specialZones.length} zone(s)
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {area.outOfServiceMessage && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium text-gray-700">Out of Service Message:</p>
                    <p className="text-gray-600 mt-1">{area.outOfServiceMessage.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        🗺️ Service Area Management System • API: {API_BASE}
      </div>
    </div>
  );
};

export default ServiceAreaManagement;