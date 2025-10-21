// src/components/DriverDetailsModal.tsx

import { useEffect, useState } from "react";
import axios from "axios";

// Define interfaces for our data structures
interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface Document {
  _id: string;
  docType: string;
  docUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  remarks?: string;
}

interface ModalProps {
  driver: Driver;
  onClose: () => void;
}

export default function DriverDetailsModal({ driver, onClose }: ModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!driver) return;
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/admin/documents/${driver._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocuments(res.data.documents);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          setError("No documents found for this driver.");
        } else {
          setError("Failed to fetch documents.");
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [driver]);
  
  const handleUpdateStatus = async (docId: string, status: 'verified' | 'rejected') => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`/api/admin/verifyDocument/${docId}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the document status in our local state to reflect the change instantly
      setDocuments(docs => docs.map(doc => doc._id === docId ? res.data.document : doc));

    } catch (err) {
      alert(`Failed to update document status.`);
      console.error(err);
    }
  };


  return (
    // Modal Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      {/* Modal Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Driver Details: {driver.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">&times;</button>
        </div>
        
        {/* Driver Info */}
        <div className="mb-6">
          <p><strong>Email:</strong> {driver.email}</p>
          <p><strong>Phone:</strong> {driver.phone}</p>
        </div>

        {/* Documents Section */}
        <h3 className="text-lg font-semibold mb-3">Documents</h3>
        {loading && <p>Loading documents...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="space-y-4">
            {documents.map(doc => (
              <div key={doc._id} className="border dark:border-gray-700 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{doc.docType}</p>
                  <a href={doc.docUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                    View Document
                  </a>
                  <span className={`ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                    doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{doc.status}</span>
                </div>
                {doc.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdateStatus(doc._id, 'verified')} className="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600">Approve</button>
                    <button onClick={() => handleUpdateStatus(doc._id, 'rejected')} className="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}