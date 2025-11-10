import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../AuthContext";
import { CheckCircle, XCircle, Eye, ZoomIn, CreditCard, AlertCircle, FileText, Clock } from "lucide-react";

interface ExtractedData {
  fullName: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  dob: string;
}

interface Document {
  _id: string;
  userId: string | {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  docType: string;
  side?: string;
  extractedData: ExtractedData;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  remarks?: string;
  url?: string;
  imageUrl?: string;
  _debug?: any;
}

interface UserWithDocs {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  documents: Document[];
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
}

// Enhanced ImageWithFallback with debugging
const ImageWithFallback: React.FC<{ 
  src?: string; 
  alt: string; 
  className?: string;
  debug?: any;
}> = ({ src, alt, className, debug }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageInfo, setImageInfo] = useState<any>(null);

  useEffect(() => {
    if (src) {
      console.log('🖼️ Image component:', { src, debug });
      
      // Test image access
      fetch(src, { method: 'HEAD' })
        .then(response => {
          const info = {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
          };
          console.log('📡 Image response:', info);
          setImageInfo(info);
        })
        .catch(err => {
          console.error('❌ Image fetch test failed:', err);
          setImageInfo({ error: err.message });
        });
    }
  }, [src, debug]);

  if (!src) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
        <div className="text-center p-4 max-w-full overflow-hidden">
          <AlertCircle size={48} className="mx-auto mb-2" />
          <span className="text-sm font-semibold">No image source</span>
          {debug && (
            <details className="mt-2 text-left">
              <summary className="cursor-pointer text-xs text-blue-600 hover:underline">
                Show debug info
              </summary>
              <pre className="mt-2 text-xs bg-gray-200 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 text-red-600 border-2 border-red-200">
        <div className="text-center p-4 max-w-full overflow-hidden">
          <AlertCircle size={48} className="mx-auto mb-2" />
          <span className="text-sm font-semibold">Failed to load</span>
          <div className="text-xs mt-2 break-all px-2 text-gray-600 max-w-full">
            {src}
          </div>
          
          <details className="mt-2 text-left">
            <summary className="cursor-pointer text-xs text-blue-600 hover:underline">
              Show debug info
            </summary>
            <div className="mt-2 space-y-2">
              {debug && (
                <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(debug, null, 2)}
                </pre>
              )}
              {imageInfo && (
                <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                  Response: {JSON.stringify(imageInfo, null, 2)}
                </pre>
              )}
            </div>
          </details>
          
          <button
            onClick={() => {
              console.log('🔄 Retrying image load:', src);
              setError(false);
              setLoading(true);
            }}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
            <span className="text-xs text-gray-600">Loading...</span>
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => {
          console.log('✅ Image loaded successfully:', src);
          setLoading(false);
        }}
        onError={(e) => {
          console.error('❌ Image failed to load:', { src, error: e, debug, imageInfo });
          setError(true);
          setLoading(false);
        }}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
};

const DocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [usersWithDocs, setUsersWithDocs] = useState<UserWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithDocs | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [editableData, setEditableData] = useState<ExtractedData>({
    fullName: "",
    licenseNumber: "",
    issueDate: "",
    expiryDate: "",
    dob: "",
  });
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");

  const fetchAllDocuments = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('\n📡 ========== FETCHING DOCUMENTS ==========');
      console.log('🔑 Token present:', !!token);
      
      // Fetch all drivers
      const driversRes = await axiosInstance.get("/admin/drivers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const drivers = driversRes.data.drivers || [];
      console.log(`\n👥 Found ${drivers.length} drivers total`);
      
      const userDocsMap = new Map<string, UserWithDocs>();

      // Fetch documents for each driver
      for (const driver of drivers) {
        try {
          console.log(`\n📋 Fetching docs for: ${driver.name} (${driver._id})`);
          
          const docsRes = await axiosInstance.get(`/admin/documents/${driver._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          const docs = docsRes.data.docs || [];
          const debugInfo = docsRes.data._debug;
          
          console.log(`  📊 Response summary:`, {
            totalDocs: docs.length,
            docsWithUrls: docs.filter((d: any) => d.imageUrl).length,
            debug: debugInfo
          });
          
          if (docs.length > 0) {
            docs.forEach((doc: any, idx: number) => {
              console.log(`    ${idx + 1}. ${doc.docType}:`, {
                hasImageUrl: !!doc.imageUrl,
                imageUrl: doc.imageUrl,
                fileExists: doc._debug?.fileExists,
                status: doc.status
              });
            });

            const docsWithImageUrl = docs.map((doc: any) => ({
              ...doc,
              userId: driver._id,
            }));

            const pendingCount = docs.filter((d: Document) => d.status === "pending").length;
            const verifiedCount = docs.filter((d: Document) => d.status === "verified").length;
            const rejectedCount = docs.filter((d: Document) => d.status === "rejected").length;

            userDocsMap.set(driver._id, {
              userId: driver._id,
              userName: driver.name || "Unnamed User",
              userEmail: driver.email || "No email",
              userPhone: driver.phone,
              documents: docsWithImageUrl,
              pendingCount,
              verifiedCount,
              rejectedCount,
            });
          } else {
            console.log(`  ℹ️ No documents found`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to fetch docs for driver ${driver._id}:`, err.response?.data || err.message);
        }
      }

      const usersArray = Array.from(userDocsMap.values());
      console.log(`\n✅ ========== FETCH COMPLETE ==========`);
      console.log(`📊 Final stats:`, {
        totalDrivers: drivers.length,
        driversWithDocs: usersArray.length,
        totalDocuments: usersArray.reduce((sum, u) => sum + u.documents.length, 0)
      });
      
      setUsersWithDocs(usersArray);
      setError("");
    } catch (err: any) {
      console.error("❌ Failed to fetch documents:", err);
      setError(err.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllDocuments();
  }, [fetchAllDocuments]);

  const testImageAccess = async () => {
    try {
      console.log('🧪 Running test endpoint...');
      const res = await axiosInstance.get('/admin/test-images');
      console.log('🧪 Test results:', res.data);
      alert(`✅ Found ${res.data.totalFiles} files in uploads folder!\n\nCheck console for details.`);
    } catch (err: any) {
      console.error('❌ Test failed:', err);
      alert(`❌ Test failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const openUserModal = (user: UserWithDocs) => {
    setSelectedUser(user);
  };

  const closeUserModal = () => {
    setSelectedUser(null);
  };

  const openDocumentModal = (doc: Document) => {
    setSelectedDoc(doc);
    setRemarks(doc.remarks || "");
    setEditableData(doc.extractedData || {
      fullName: "",
      licenseNumber: "",
      issueDate: "",
      expiryDate: "",
      dob: "",
    });
  };

  const closeDocumentModal = () => {
    setSelectedDoc(null);
    setRemarks("");
  };

  const openImageModal = () => {
    if (selectedDoc?.imageUrl) {
      setImageModalOpen(true);
    }
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
  };

  const handleVerifyDocument = async (docId: string, status: "verified" | "rejected") => {
    if (!token) return;
    if (status === "rejected" && !remarks.trim()) {
      alert("Please add remarks for rejection.");
      return;
    }

    setProcessing(true);
    try {
      await axiosInstance.put(
        `/admin/verifyDocument/${docId}`,
        { status, remarks: status === "rejected" ? remarks : undefined, extractedData: editableData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchAllDocuments();
      closeDocumentModal();
      
      if (selectedUser) {
        const updatedUser = usersWithDocs.find(u => u.userId === selectedUser.userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (err: any) {
      console.error("Error verifying document:", err);
      alert(err.response?.data?.message || "Error verifying document.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedData, value: string) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      verified: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
    };
    
    const icons = {
      pending: <Clock size={14} />,
      verified: <CheckCircle size={14} />,
      rejected: <XCircle size={14} />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredUsers = usersWithDocs.filter(user => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return user.pendingCount > 0;
    if (statusFilter === "verified") return user.verifiedCount > 0;
    if (statusFilter === "rejected") return user.rejectedCount > 0;
    return true;
  });

  const renderUserTable = () => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Driver Name</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Contact</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Total Docs</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-yellow-700">Pending</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-green-700">Verified</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-red-700">Rejected</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{user.userName}</div>
                        <div className="text-xs text-gray-500">ID: {user.userId.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{user.userEmail}</div>
                    {user.userPhone && (
                      <div className="text-xs text-gray-500">{user.userPhone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {user.documents.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${user.pendingCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                      {user.pendingCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${user.verifiedCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {user.verifiedCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${user.rejectedCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                      {user.rejectedCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openUserModal(user)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      <Eye size={16} />
                      View Docs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUserDocumentsModal = () => {
    if (!selectedUser) return null;

    const pendingDocs = selectedUser.documents.filter(d => d.status === "pending");
    const verifiedDocs = selectedUser.documents.filter(d => d.status === "verified");
    const rejectedDocs = selectedUser.documents.filter(d => d.status === "rejected");

    const renderDocumentCard = (doc: Document) => (
      <div
        key={doc._id}
        onClick={() => openDocumentModal(doc)}
        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-bold text-gray-900 capitalize">
              {doc.docType?.replace(/_/g, ' ')}
              {doc.side && ` - ${doc.side}`}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
          {getStatusBadge(doc.status)}
        </div>
        
        <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden mb-3">
          <ImageWithFallback
            src={doc.imageUrl}
            alt={doc.docType}
            className="w-full h-full object-cover"
            debug={doc._debug}
          />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name:</span>
            <span className="font-medium text-gray-900">{doc.extractedData?.fullName || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Number:</span>
            <span className="font-mono text-gray-900">{doc.extractedData?.licenseNumber || "N/A"}</span>
          </div>
        </div>

        {doc.remarks && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <strong>Remarks:</strong> {doc.remarks}
          </div>
        )}
      </div>
    );

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-7xl w-full shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedUser.userName}'s Documents</h2>
                <p className="text-blue-100 text-sm">{selectedUser.userEmail}</p>
                {selectedUser.userPhone && (
                  <p className="text-blue-100 text-sm">{selectedUser.userPhone}</p>
                )}
              </div>
              <button 
                onClick={closeUserModal} 
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <XCircle size={28} />
              </button>
            </div>
            
            <div className="flex gap-4 mt-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{selectedUser.documents.length}</div>
                <div className="text-xs text-blue-100">Total</div>
              </div>
              <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{selectedUser.pendingCount}</div>
                <div className="text-xs text-blue-100">Pending</div>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{selectedUser.verifiedCount}</div>
                <div className="text-xs text-blue-100">Verified</div>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{selectedUser.rejectedCount}</div>
                <div className="text-xs text-blue-100">Rejected</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {pendingDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={20} className="text-yellow-600" />
                  <h3 className="text-xl font-bold text-gray-900">Pending Review ({pendingDocs.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingDocs.map(renderDocumentCard)}
                </div>
              </div>
            )}

            {verifiedDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={20} className="text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900">Verified ({verifiedDocs.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {verifiedDocs.map(renderDocumentCard)}
                </div>
              </div>
            )}

            {rejectedDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <XCircle size={20} className="text-red-600" />
                  <h3 className="text-xl font-bold text-gray-900">Rejected ({rejectedDocs.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rejectedDocs.map(renderDocumentCard)}
                </div>
              </div>
            )}

            {selectedUser.documents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText size={64} className="mx-auto mb-4 text-gray-300" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentDetailModal = () => {
    if (!selectedDoc) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1 capitalize">
                {selectedDoc.docType?.replace(/_/g, ' ')}
                {selectedDoc.side && ` - ${selectedDoc.side}`}
              </h2>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedDoc.status)}
              </div>
            </div>
            <button 
              onClick={closeDocumentModal} 
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <XCircle size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-4 min-h-[400px] flex items-center justify-center relative group">
                  {selectedDoc.imageUrl ? (
                    <>
                      <img
                        src={selectedDoc.imageUrl}
                        alt={selectedDoc.docType}
                        className="max-w-full max-h-[500px] rounded-lg shadow-md cursor-pointer"
                        onClick={openImageModal}
                      />
                      <button
                        onClick={openImageModal}
                        className="absolute top-6 right-6 bg-black/70 text-white p-3 rounded-full hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ZoomIn size={20} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-gray-400">
                      <AlertCircle size={64} className="mx-auto mb-3" />
                      <p>No image available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <CreditCard size={18} />
                    Extracted Information
                  </h3>
                  <p className="text-sm text-purple-700">Review and edit the OCR-extracted data below.</p>
                </div>

                <div className="space-y-4 mb-6 flex-1">
                  {(["fullName", "licenseNumber", "issueDate", "expiryDate", "dob"] as (keyof ExtractedData)[]).map(
                    (field) => (
                      <div key={field}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                          type="text"
                          value={editableData[field] || ""}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                          placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`}
                          disabled={selectedDoc.status !== "pending"}
                        />
                      </div>
                    )
                  )}
                </div>

                {selectedDoc.status === "pending" ? (
                  <div className="space-y-3 border-t pt-6">
                    <button
                      onClick={() => handleVerifyDocument(selectedDoc._id, "verified")}
                      disabled={processing}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                    >
                      <CheckCircle size={22} />
                      {processing ? "Processing..." : "Approve Document"}
                    </button>

                    <div className="space-y-2">
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Required: Provide detailed remarks for rejection..."
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all resize-none"
                        rows={3}
                        disabled={processing}
                      />
                      <button
                        onClick={() => handleVerifyDocument(selectedDoc._id, "rejected")}
                        disabled={!remarks.trim() || processing}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                      >
                        <XCircle size={22} />
                        {processing ? "Processing..." : "Reject Document"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-6 text-center border-2 ${
                    selectedDoc.status === "verified" 
                      ? "bg-green-50 border-green-200" 
                      : "bg-red-50 border-red-200"
                  }`}>
                    {selectedDoc.status === "verified" ? (
                      <>
                        <CheckCircle size={48} className="mx-auto text-green-600 mb-3" />
                        <h3 className="text-xl font-bold text-green-900 mb-1">Document Verified</h3>
                        <p className="text-green-700">This document has been approved.</p>
                      </>
                    ) : (
                      <>
                        <XCircle size={48} className="mx-auto text-red-600 mb-3" />
                        <h3 className="text-xl font-bold text-red-900 mb-1">Document Rejected</h3>
                        {selectedDoc.remarks && (
                          <div className="mt-3 p-3 bg-red-100 rounded text-sm text-red-800">
                            <strong>Reason:</strong> {selectedDoc.remarks}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImageModal = () => {
    if (!isImageModalOpen || !selectedDoc?.imageUrl) return null;

    return (
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100]"
        onClick={closeImageModal}
      >
        <button
          onClick={closeImageModal}
          className="absolute top-6 right-6 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-all"
        >
          <XCircle size={32} />
        </button>
        <img
          src={selectedDoc.imageUrl}
          alt="Enlarged document"
          className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-200">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Management</h1>
              <p className="text-gray-600">Review and manage driver document submissions</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === "all" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === "pending" 
                      ? "bg-white text-yellow-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter("verified")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === "verified" 
                      ? "bg-white text-green-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Verified
                </button>
                <button
                  onClick={() => setStatusFilter("rejected")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === "rejected" 
                      ? "bg-white text-red-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Rejected
                </button>
              </div>
              
              <button
                onClick={testImageAccess}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                🧪 Test Images
              </button>
              
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg">
                <div className="text-2xl font-bold">{filteredUsers.length}</div>
                <div className="text-xs text-blue-100">Drivers</div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">Loading documents...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Documents</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
            <div className="text-7xl mb-4">📄</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Drivers Found</h3>
            <p className="text-gray-600 text-lg">
              {statusFilter === "all" 
                ? "No drivers with documents yet." 
                : `No drivers with ${statusFilter} documents.`}
            </p>
          </div>
        )}

        {!loading && !error && filteredUsers.length > 0 && renderUserTable()}

        {renderUserDocumentsModal()}
        {renderDocumentDetailModal()}
        {renderImageModal()}
      </div>
    </div>
  );
};

export default DocumentsPage;