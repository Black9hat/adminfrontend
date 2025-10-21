import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../AuthContext";

interface ExtractedData {
  fullName: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  dob: string;
}

interface Document {
  _id: string;
  userId: {
    name: string;
    email: string;
  };
  type: "license" | "aadhar" | "passport";
  extractedData: ExtractedData;
  status: "pending";
  createdAt: string;
  remarks?: string;
}

const DocumentsPage: React.FC = () => {
  const { token } = useAuth();
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [remarks, setRemarks] = useState("");

  // Fetch pending documents
  const fetchPendingDocs = async () => {
    if (!token) return; // ensure token exists
    try {
      setLoading(true);
      const res = await axiosInstance.get("/admin/documents/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingDocs(res.data.documents);
      setError("");
    } catch (err: any) {
      console.error("❌ Failed to fetch pending documents:", err);
      setError(err.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  // Open modal for single document
  const openDocumentModal = async (docId: string) => {
    if (!token) return;
    try {
      const res = await axiosInstance.get(`/admin/document/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedDoc(res.data.document);
      setShowModal(true);
    } catch (err) {
      console.error("❌ Failed to fetch document details:", err);
      alert("Failed to fetch document details.");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoc(null);
    setRemarks("");
  };

  // Approve or Reject document
  const handleVerifyDocument = async (docId: string, status: "verified" | "rejected") => {
    if (!token) return;
    if (status === "rejected" && !remarks.trim()) {
      alert("Please add remarks for rejection.");
      return;
    }

    try {
      await axiosInstance.put(
        `/admin/verifyDocument/${docId}`,
        { status, remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingDocs((prev) => prev.filter((doc) => doc._id !== docId));
      closeModal();
      alert(`Document ${status} successfully.`);
    } catch (err: any) {
      console.error("❌ Error verifying document:", err);
      alert(err.response?.data?.message || "Error verifying document.");
    }
  };

  useEffect(() => {
    fetchPendingDocs();
  }, [token]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Pending Document Reviews</h2>
        <span className="text-2xl font-semibold text-green-600">
          {pendingDocs.length} to review
        </span>
      </div>

      {loading && <div className="text-center py-12 text-gray-600">Loading documents...</div>}
      {error && <div className="text-center py-12 text-red-500">{error}</div>}

      {!loading && !error && pendingDocs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No pending documents</h3>
          <p className="text-gray-500">All documents are up to date. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingDocs.map((doc) => (
            <div
              key={doc._id}
              onClick={() => openDocumentModal(doc._id)}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow cursor-pointer p-6 border border-gray-100 hover:border-green-200"
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{doc.userId.name}</h3>
                <p className="text-sm text-gray-600">
                  {doc.userId.email} • {doc.type.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-40 flex items-center justify-center mb-4">
                <span className="text-gray-500">📄 Document Preview</span>
              </div>
              <div className="text-sm">
                <p><b>Name:</b> {doc.extractedData.fullName}</p>
                <p><b>Number:</b> {doc.extractedData.licenseNumber}</p>
                <p><b>Expiry:</b> {doc.extractedData.expiryDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Review Document</h2>
              <button onClick={closeModal} className="text-2xl">×</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl h-64 flex items-center justify-center">
                <span className="text-gray-500">🔍 Document Image</span>
              </div>
              <div>
                <h3 className="font-semibold mb-4">OCR Extracted Data</h3>
                <p><b>Name:</b> {selectedDoc.extractedData.fullName}</p>
                <p><b>Number:</b> {selectedDoc.extractedData.licenseNumber}</p>
                <p><b>Issue Date:</b> {selectedDoc.extractedData.issueDate}</p>
                <p><b>Expiry:</b> {selectedDoc.extractedData.expiryDate}</p>
                <p><b>DOB:</b> {selectedDoc.extractedData.dob}</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => handleVerifyDocument(selectedDoc._id, "verified")}
                    className="w-full bg-green-600 text-white py-2 rounded-lg"
                  >
                    ✅ Approve
                  </button>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Remarks for rejection..."
                    className="w-full p-2 border rounded-lg"
                  />
                  <button
                    onClick={() => handleVerifyDocument(selectedDoc._id, "rejected")}
                    className="w-full bg-red-600 text-white py-2 rounded-lg"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
