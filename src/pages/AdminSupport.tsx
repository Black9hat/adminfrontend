import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  Bell, 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  X,
  RefreshCw,
  Send,
  User,
  FileText,
  MapPin,
  AlertTriangle,
  Car,
  Shield,
  CheckCheck,
  Clock,
  Headphones,
  Filter,
  ChevronRight,
  Star,
  Zap,
  Circle,
  MessageSquare,
  PhoneCall,
  ExternalLink,
  Award,
  Search  // ✅ Added Search icon
} from 'lucide-react';

const API_BASE = 'https://ghumobackend.onrender.com';
const getAuthToken = () => localStorage.getItem("adminToken") || "";

const getApiHeaders = () => {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache"
  };
};

interface SupportTrip {
  _id: string;
  status: string;
  supportReason?: string;
  supportRequestId?: string;
  createdAt: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
    socketId?: string;
  };
  assignedDriver?: {
    _id?: string;
    name?: string;
    phone?: string;
    vehicleNumber?: string;
    rating?: number;
    location?: {
      coordinates: [number, number];
    };
    socketId?: string;
  } | null;
  pickup: {
    address: string;
    coordinates?: [number, number];
  };
  drop: {
    address: string;
    coordinates?: [number, number];
  };
  issueType?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  isSOS?: boolean;
  autoChatAttempted?: boolean;
  autoChatTranscript?: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
}

interface DriverTicket {
  _id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  issueType: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolvedAt?: string;
  adminNotes?: string;
}

interface ChatMessage {
  _id?: string;
  senderId: string;
  senderType: 'customer' | 'driver' | 'admin' | 'system';
  message: string;
  timestamp?: string;
  createdAt?: string;
}

interface Document {
  _id: string;
  docType: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  remarks?: string;
  extractedData?: any;
}

interface DriverTrip {
  _id: string;
  pickup?: {
    address: string;
  };
  drop?: {
    address: string;
  };
  fare?: number;
  status: string;
  createdAt: string;
}

interface DriverInfo {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber?: string;
  rating?: number;
  totalTrips?: number;
  status?: string;
}

const isValidPriority = (p: string | undefined): p is 'low' | 'medium' | 'high' | 'critical' => {
  return p === 'low' || p === 'medium' || p === 'high' || p === 'critical';
};

export default function AdminSupport() {
  const [trips, setTrips] = useState<SupportTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<SupportTrip | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [driverTickets, setDriverTickets] = useState<DriverTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<DriverTicket | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [driverTrips, setDriverTrips] = useState<DriverTrip[]>([]);
  const [loadingDriverData, setLoadingDriverData] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [filter, setFilter] = useState<'all' | 'sos' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [activeTab, setActiveTab] = useState<'customer' | 'driver'>('customer');
  const [searchQuery, setSearchQuery] = useState(''); // ✅ Added search state
  
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = localStorage.getItem('adminToken');

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchSupportTrips = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/support/admin/active`, {
        headers: getApiHeaders()
      });
      const tripData = Array.isArray(res.data?.requests) ? res.data.requests : [];
      if (tripData.length > 0) {
        setTrips(tripData);
      }
    } catch (error: unknown) {
      console.error('Error fetching support trips:', error);
    }
  };

  const fetchDriverTickets = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/support/driver/tickets`, {
        headers: getApiHeaders()
      });
      const tickets = Array.isArray(res.data?.tickets) ? res.data.tickets : [];
      setDriverTickets(tickets);
    } catch (error) {
      console.error('Error fetching driver tickets:', error);
    }
  };

  const loadDriverData = async (driverId: string) => {
    setLoadingDriverData(true);
    setDriver(null);
    setDocuments([]);
    setDriverTrips([]);

    try {
      const headers = getApiHeaders();
      const ts = Date.now();

      const [driverRes, docsRes, tripsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/driver/${driverId}?t=${ts}`, { headers }),
        axios.get(`${API_BASE}/api/admin/documents/${driverId}?t=${ts}`, { headers }),
        axios.get(`${API_BASE}/api/admin/driver-trips/${driverId}?t=${ts}`, { headers })
      ]);

      const driverData = driverRes.data.driver || driverRes.data;
      const docs = docsRes.data.docs || [];
      const trips = tripsRes.data.trips || [];

      setDriver(driverData);
      setDocuments(docs);
      setDriverTrips(trips);
    } catch (err) {
      console.error("Failed loading driver data", err);
      setDriver(null);
      setDocuments([]);
      setDriverTrips([]);
    } finally {
      setLoadingDriverData(false);
    }
  };

  const fetchChatHistory = async (supportRequestId: string) => {
    try {
      const res = await axios.get(
        `${API_BASE}/api/support/admin/${supportRequestId}/chat`,
        { headers: getApiHeaders() }
      );
      if (res.data.success) {
        setChatMessages(res.data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const sendAdminMessage = async () => {
    if (!newMessage.trim() || (!selectedTrip?.supportRequestId && !selectedTicket)) return;

    try {
      if (activeTab === 'customer' && selectedTrip?.supportRequestId) {
        await axios.post(
          `${API_BASE}/api/support/admin/message`,
          {
            supportRequestId: selectedTrip.supportRequestId,
            message: newMessage,
          },
          { headers: getApiHeaders() }
        );

        setChatMessages(prev => [...prev, {
          senderId: 'admin',
          senderType: 'admin',
          message: newMessage,
          timestamp: new Date().toISOString()
        }]);
      } else if (activeTab === 'driver' && selectedTicket) {
        await axios.post(
          `${API_BASE}/api/support/driver/ticket/${selectedTicket._id}/message`,
          { message: newMessage },
          { headers: getApiHeaders() }
        );

        setChatMessages(prev => [...prev, {
          senderId: 'admin',
          senderType: 'admin',
          message: newMessage,
          timestamp: new Date().toISOString()
        }]);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const resolveSupport = async () => {
    if (activeTab === 'customer' && !selectedTrip?.supportRequestId) return;
    if (activeTab === 'driver' && !selectedTicket) return;

    const notes = prompt('Add resolution notes:');
    if (!notes) return;

    try {
      if (activeTab === 'customer' && selectedTrip?.supportRequestId) {
        await axios.post(
          `${API_BASE}/api/support/admin/resolve`,
          {
            supportRequestId: selectedTrip.supportRequestId,
            resolutionNotes: notes,
          },
          { headers: getApiHeaders() }
        );

        setTrips(prev => prev.filter(t => t._id !== selectedTrip._id));
        setSelectedTrip(null);
        setChatMessages([]);
      } else if (activeTab === 'driver' && selectedTicket) {
        await axios.post(
          `${API_BASE}/api/support/driver/ticket/${selectedTicket._id}/resolve`,
          { resolutionNotes: notes },
          { headers: getApiHeaders() }
        );

        setDriverTickets(prev => prev.filter(t => t._id !== selectedTicket._id));
        setSelectedTicket(null);
        setChatMessages([]);
        setDriver(null);
        setDocuments([]);
        setDriverTrips([]);
      }

      alert('Support request resolved!');
    } catch (error) {
      console.error('Error resolving:', error);
      alert('Failed to resolve support request');
    }
  };

  const playAlertSound = (isEmergency?: boolean) => {
    try {
      const frequency = isEmergency ? 800 : 600;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not available');
    }
  };

  const openCustomerSupport = (trip: SupportTrip) => {
    setActiveTab('customer');
    setSelectedTrip(trip);
    setSelectedTicket(null);
    
    if (trip.supportRequestId) {
      fetchChatHistory(trip.supportRequestId);
      
      socketRef.current?.emit('admin:join_support', {
        supportRequestId: trip.supportRequestId,
        adminId: 'admin_' + Date.now()
      });
    }
  };

  const openDriverTicket = (ticket: DriverTicket) => {
    setActiveTab('driver');
    setSelectedTicket(ticket);
    setSelectedTrip(null);
    setChatMessages([]);
    loadDriverData(ticket.driverId);
  };

  const hasDriver = (trip: SupportTrip): boolean => {
    return trip.assignedDriver !== null && trip.assignedDriver !== undefined;
  };

  const getPriorityConfig = (priority?: string) => {
    switch (priority) {
      case 'critical': return { 
        bg: 'bg-gradient-to-r from-red-500 to-red-600', 
        light: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        dot: 'bg-red-500',
        label: 'CRITICAL'
      };
      case 'high': return { 
        bg: 'bg-gradient-to-r from-orange-500 to-orange-600', 
        light: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        dot: 'bg-orange-500',
        label: 'HIGH'
      };
      case 'medium': return { 
        bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', 
        light: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        label: 'MEDIUM'
      };
      case 'low': return { 
        bg: 'bg-gradient-to-r from-blue-500 to-blue-600', 
        light: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
        label: 'LOW'
      };
      default: return { 
        bg: 'bg-gradient-to-r from-gray-500 to-gray-600', 
        light: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        dot: 'bg-gray-500',
        label: 'NORMAL'
      };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  useEffect(() => {
    const newSocket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: {
        token: token,
        role: 'admin'
      }
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      newSocket.emit('admin:join');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('admin:support_request', (data: any) => {
      if (!data?.trip) return;

      const validPriority: 'low' | 'medium' | 'high' | 'critical' = isValidPriority(data.priority) 
        ? data.priority 
        : 'medium';

      const tripWithSupport: SupportTrip = {
        ...data.trip,
        supportRequestId: data.supportRequestId,
        issueType: data.issueType,
        priority: validPriority,
        isSOS: data.isSOS
      };

      setTrips((prev) => {
        const exists = prev.some((t) => t._id === data.trip!._id);
        if (exists) return prev;
        return [tripWithSupport, ...prev];
      });
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 New Support Request', {
          body: `${data.trip?.customerId?.name || 'Customer'} needs help`,
          requireInteraction: data.isSOS
        });
      }
      
      playAlertSound(data.isSOS);
    });

    newSocket.on('admin:driver_ticket', (data: any) => {
      setDriverTickets(prev => [data.ticket, ...prev]);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎫 New Driver Ticket', {
          body: `${data.ticket.driverName} reported: ${data.ticket.issueType}`
        });
      }
      
      playAlertSound(false);
    });

    newSocket.on('support:chat_message', (data: any) => {
      setChatMessages(prev => [...prev, {
        senderId: 'user',
        senderType: data.from as any,
        message: data.message,
        timestamp: data.timestamp
      }]);
    });

    fetchSupportTrips();
    fetchDriverTickets();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // ✅ Filter with Search
  const filteredCustomerTrips = trips.filter(trip => {
    // Priority filter
    const passesFilter = filter === 'all' ? true : filter === 'sos' ? trip.isSOS : trip.priority === filter;
    
    // Search filter
    const searchLower = searchQuery.toLowerCase().trim();
    const passesSearch = searchLower === '' ? true : 
      trip._id.toLowerCase().includes(searchLower) ||
      trip.supportRequestId?.toLowerCase().includes(searchLower) ||
      trip.customerId?.name?.toLowerCase().includes(searchLower) ||
      trip.customerId?.phone?.includes(searchLower) ||
      trip.issueType?.toLowerCase().includes(searchLower);
    
    return passesFilter && passesSearch;
  });

  const filteredDriverTickets = driverTickets.filter(ticket => {
    // Priority filter
    const passesFilter = filter === 'all' ? true : ticket.priority === filter;
    
    // Search filter
    const searchLower = searchQuery.toLowerCase().trim();
    const passesSearch = searchLower === '' ? true :
      ticket._id.toLowerCase().includes(searchLower) ||
      ticket.driverName?.toLowerCase().includes(searchLower) ||
      ticket.driverPhone?.includes(searchLower) ||
      ticket.issueType?.toLowerCase().includes(searchLower);
    
    return passesFilter && passesSearch;
  });

  return (
    <div className="fixed inset-0 flex bg-slate-100">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[380px] min-w-[380px] bg-white shadow-2xl flex flex-col border-r border-slate-200 h-full">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Support Center</h1>
                <p className="text-indigo-200 text-xs">Live assistance dashboard</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-emerald-500/20 text-emerald-100' 
                : 'bg-red-500/20 text-red-100'
            }`}>
              <Circle className={`w-2 h-2 fill-current ${
                connectionStatus === 'connected' ? 'animate-pulse' : ''
              }`} />
              <span className="text-xs font-medium">
                {connectionStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {/* ✅ Search Box */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-indigo-300" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID, name, phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="w-4 h-4 text-indigo-300 hover:text-white transition-colors" />
              </button>
            )}
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('customer')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'customer'
                  ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <User className="w-4 h-4" />
              Customers
              {trips.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'customer' ? 'bg-indigo-100 text-indigo-600' : 'bg-white/20'
                }`}>
                  {trips.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('driver')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'driver'
                  ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Car className="w-4 h-4" />
              Drivers
              {driverTickets.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'driver' ? 'bg-indigo-100 text-indigo-600' : 'bg-white/20'
                }`}>
                  {driverTickets.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-indigo-200" />
            {(['all', 'sos', 'critical', 'high', 'medium', 'low'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  filter === f 
                    ? 'bg-white text-indigo-600 shadow-md' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {f === 'sos' ? '🚨 SOS' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Refresh Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-slate-500">
            {activeTab === 'customer' ? filteredCustomerTrips.length : filteredDriverTickets.length} active tickets
            {searchQuery && (
              <span className="text-indigo-600 ml-1">
                (filtered)
              </span>
            )}
          </span>
          <button
            onClick={() => {
              fetchSupportTrips();
              fetchDriverTickets();
            }}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'customer' ? (
            filteredCustomerTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  {searchQuery ? (
                    <Search className="w-8 h-8 text-slate-400" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  )}
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">
                  {searchQuery ? 'No Results Found' : 'All Clear!'}
                </h3>
                <p className="text-slate-500 text-sm text-center px-4">
                  {searchQuery 
                    ? `No tickets match "${searchQuery}"` 
                    : 'No pending customer requests'
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredCustomerTrips.map((trip) => {
                const priority = getPriorityConfig(trip.priority);
                return (
                  <div
                    key={trip._id}
                    onClick={() => openCustomerSupport(trip)}
                    className={`group relative bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                      selectedTrip?._id === trip._id 
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/10' 
                        : `${priority.border} hover:border-indigo-300`
                    }`}
                  >
                    {trip.isSOS && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${priority.bg}`}>
                            {priority.label}
                          </span>
                          {trip.isSOS && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                              SOS
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(trip.createdAt)}
                        </span>
                      </div>
                      
                      {/* ✅ Show Ticket ID */}
                      <div className="mb-2">
                        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          #{trip.supportRequestId?.slice(-8) || trip._id.slice(-8)}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-sm mb-2.5 leading-tight">
                        {trip.issueType?.replace(/_/g, ' ').toUpperCase() || 'SUPPORT REQUEST'}
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500">Customer</p>
                            <p className="font-medium text-slate-700 text-sm truncate">{trip.customerId?.name || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Car className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500">Driver</p>
                            <p className="font-medium text-slate-700 text-sm truncate">
                              {hasDriver(trip) ? trip.assignedDriver?.name : 'Not assigned'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-2 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Click to view</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            )
          ) : (
            filteredDriverTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  {searchQuery ? (
                    <Search className="w-8 h-8 text-slate-400" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  )}
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">
                  {searchQuery ? 'No Results Found' : 'No Tickets'}
                </h3>
                <p className="text-slate-500 text-sm text-center px-4">
                  {searchQuery 
                    ? `No tickets match "${searchQuery}"` 
                    : 'All driver issues resolved'
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredDriverTickets.map((ticket) => {
                const priority = getPriorityConfig(ticket.priority);
                return (
                  <div
                    key={ticket._id}
                    onClick={() => openDriverTicket(ticket)}
                    className={`group relative bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                      selectedTicket?._id === ticket._id 
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/10' 
                        : `${priority.border} hover:border-indigo-300`
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${priority.bg}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(ticket.createdAt)}
                        </span>
                      </div>
                      
                      {/* ✅ Show Ticket ID */}
                      <div className="mb-2">
                        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          #{ticket._id.slice(-8)}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-sm mb-2.5 leading-tight">
                        {ticket.issueType.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {ticket.driverName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 text-sm">{ticket.driverName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {ticket.driverPhone}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 rounded-lg p-2">
                        "{ticket.message}"
                      </p>
                    </div>

                    <div className="px-4 py-2 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Click to manage</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Same as before */}
      <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
        {!selectedTrip && !selectedTicket ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <MessageSquare className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Select a Support Request</h2>
              <p className="text-slate-500 max-w-sm">
                Choose a ticket from the left panel to view details and communicate with users
              </p>
            </div>
          </div>
        ) : activeTab === 'customer' && selectedTrip ? (
          <>
            {/* Customer Support Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
              <div className="p-5">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getPriorityConfig(selectedTrip.priority).light}`}>
                      <AlertTriangle className={`w-6 h-6 ${getPriorityConfig(selectedTrip.priority).text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-slate-800">
                          {selectedTrip.issueType?.replace(/_/g, ' ').toUpperCase()}
                        </h2>
                        {selectedTrip.isSOS && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                            🚨 EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        Ticket: <span className="font-mono font-medium">#{selectedTrip.supportRequestId?.slice(-8) || selectedTrip._id.slice(-8)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTrip(null);
                      setChatMessages([]);
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Customer</p>
                    </div>
                    <p className="font-bold text-slate-800 mb-0.5">{selectedTrip.customerId?.name}</p>
                    <p className="text-slate-600 text-sm mb-3">{selectedTrip.customerId?.phone}</p>
                    {selectedTrip.customerId?.phone && (
                      <a
                        href={`tel:${selectedTrip.customerId.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call
                      </a>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="w-4 h-4 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Driver</p>
                    </div>
                    {hasDriver(selectedTrip) ? (
                      <>
                        <p className="font-bold text-slate-800 mb-0.5">{selectedTrip.assignedDriver?.name}</p>
                        <p className="text-slate-600 text-sm mb-3">{selectedTrip.assignedDriver?.phone}</p>
                        {selectedTrip.assignedDriver?.phone && (
                          <a
                            href={`tel:${selectedTrip.assignedDriver.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            Call
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500 italic text-sm">No driver assigned</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={resolveSupport}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Resolved
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-slate-50 to-slate-100">
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
                      msg.senderType === 'admin'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.senderType === 'admin' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp || msg.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 bg-slate-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                />
                <button
                  onClick={sendAdminMessage}
                  disabled={!newMessage.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'driver' && selectedTicket ? (
          <>
            {/* Driver Ticket Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getPriorityConfig(selectedTicket.priority).light}`}>
                      <FileText className={`w-6 h-6 ${getPriorityConfig(selectedTicket.priority).text}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 mb-0.5">
                        {selectedTicket.issueType.replace(/_/g, ' ').toUpperCase()}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Ticket: <span className="font-mono font-medium">#{selectedTicket._id.slice(-8)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      setDriver(null);
                      setDocuments([]);
                      setDriverTrips([]);
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Driver Card */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-4 rounded-xl mb-4 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl font-bold">
                        {selectedTicket.driverName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{selectedTicket.driverName}</h3>
                        <p className="text-indigo-200 text-sm flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {selectedTicket.driverPhone}
                        </p>
                        {driver && (
                          <div className="flex items-center gap-2 mt-1">
                            {driver.vehicleNumber && (
                              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                                🚗 {driver.vehicleNumber}
                              </span>
                            )}
                            {driver.rating && (
                              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {driver.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={`tel:${selectedTicket.driverPhone}`}
                      className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 flex items-center gap-2 shadow-lg transition-colors text-sm"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Call
                    </a>
                  </div>
                </div>

                {/* Issue */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-amber-800 text-sm">Issue Description</h4>
                  </div>
                  <p className="text-amber-900 text-sm leading-relaxed">{selectedTicket.message}</p>
                </div>

                <button
                  onClick={resolveSupport}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Resolve Ticket
                </button>
              </div>
            </div>

            {/* Driver Details */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {loadingDriverData ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-600 font-medium text-sm">Loading driver details...</p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Documents */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Documents</h3>
                          <p className="text-xs text-slate-500">Verification status</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        {documents.length} files
                      </span>
                    </div>
                    
                    <div className="p-4">
                      {documents.length === 0 ? (
                        <div className="text-center py-6">
                          <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No documents uploaded</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {documents.map((doc) => (
                            <div
                              key={doc._id}
                              className={`p-3 rounded-lg border ${
                                doc.status === 'verified' 
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : doc.status === 'rejected'
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-amber-50 border-amber-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  doc.status === 'verified'
                                    ? 'bg-emerald-500'
                                    : doc.status === 'rejected'
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }`}>
                                  {doc.status === 'verified' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-white" />
                                  ) : doc.status === 'rejected' ? (
                                    <X className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 capitalize text-xs truncate">
                                    {doc.docType.replace(/_/g, ' ')}
                                  </p>
                                  <span className={`text-xs font-medium capitalize ${
                                    doc.status === 'verified'
                                      ? 'text-emerald-600'
                                      : doc.status === 'rejected'
                                      ? 'text-red-600'
                                      : 'text-amber-600'
                                  }`}>
                                    {doc.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trips */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Car className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Recent Trips</h3>
                          <p className="text-xs text-slate-500">Trip history</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {driverTrips.length} trips
                      </span>
                    </div>
                    
                    <div className="p-4">
                      {driverTrips.length === 0 ? (
                        <div className="text-center py-6">
                          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No trips found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {driverTrips.slice(0, 5).map((t) => (
                            <div
                              key={t._id}
                              className="bg-slate-50 rounded-lg p-4 border border-slate-100"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-slate-500">Pickup</p>
                                      <p className="text-sm font-medium text-slate-800 truncate">
                                        {t.pickup?.address || 'Unknown'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start gap-2">
                                    <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-slate-500">Drop</p>
                                      <p className="text-sm font-medium text-slate-800 truncate">
                                        {t.drop?.address || 'Unknown'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right ml-3">
                                  {t.fare && (
                                    <p className="text-lg font-bold text-slate-800">₹{t.fare}</p>
                                  )}
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${
                                      t.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : t.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(t.createdAt).toLocaleString()}
                                </span>
                                <button className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1">
                                  Details
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {selectedTicket.adminNotes && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-blue-900 text-sm">Admin Notes</h4>
                      </div>
                      <p className="text-blue-800 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.adminNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
                  placeholder="Add notes or send message..."
                  className="flex-1 px-4 py-3 bg-slate-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                />
                <button
                  onClick={sendAdminMessage}
                  disabled={!newMessage.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}