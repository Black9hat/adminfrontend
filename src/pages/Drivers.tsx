import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isBlocked?: boolean;
  createdAt: string;
}

interface Trip {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  fare: number;
  status: string;
  createdAt: string;
}

interface Document {
  _id: string;
  type: string;
  status: string;
  createdAt: string;
  extractedData?: {
    fullName?: string;
    licenseNumber?: string;
    expiryDate?: string;
  };
}

const DriversPage: React.FC = () => {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTripsModal, setShowTripsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // ✅ Fetch all drivers
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/drivers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers(res.data.drivers);
      setFilteredDrivers(res.data.drivers);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch trips for a specific driver
  const fetchDriverTrips = async (driverId: string) => {
    try {
      setTripLoading(true);
      const res = await axios.get("/api/admin/trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allTrips: Trip[] = res.data.trips;
      const driverTrips = allTrips.filter((t) => (t as any).assignedDriver?._id === driverId);
      setTrips(driverTrips);
    } catch (err) {
      console.error("Error fetching trips", err);
    } finally {
      setTripLoading(false);
    }
  };

  // ✅ Fetch documents for a specific driver
  const fetchDriverDocuments = async (driverId: string) => {
    try {
      setDocLoading(true);
      const res = await axios.get(`/api/admin/documents/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error("Error fetching documents", err);
    } finally {
      setDocLoading(false);
    }
  };

  // ✅ Block / Unblock driver
  const toggleBlockDriver = async (driverId: string, block: boolean) => {
    try {
      await axios.put(
        `/api/admin/driver/${block ? "block" : "unblock"}/${driverId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDrivers((prev) =>
        prev.map((d) => (d._id === driverId ? { ...d, isBlocked: block } : d))
      );
      setFilteredDrivers((prev) =>
        prev.map((d) => (d._id === driverId ? { ...d, isBlocked: block } : d))
      );
    } catch (err) {
      alert("Failed to update driver status.");
    }
  };

  // ✅ Search drivers
  const handleSearch = (value: string) => {
    setSearch(value);
    const filtered = drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(value.toLowerCase()) ||
        d.email.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredDrivers(filtered);
  };

  const openTripModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowTripsModal(true);
    fetchDriverTrips(driver._id);
  };

  const closeTripModal = () => {
    setSelectedDriver(null);
    setTrips([]);
    setShowTripsModal(false);
  };

  const openDocsModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDocsModal(true);
    fetchDriverDocuments(driver._id);
  };

  const closeDocsModal = () => {
    setSelectedDriver(null);
    setDocuments([]);
    setShowDocsModal(false);
  };

  useEffect(() => {
    if (token) fetchDrivers();
  }, [token]);

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">All Drivers</h2>
        <div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="border p-2 rounded-lg w-72"
          />
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-600">Loading drivers...</div>}
      {error && <div className="text-center py-12 text-red-500">{error}</div>}

      {!loading && !error && filteredDrivers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧑‍✈️</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No drivers found</h3>
          <p className="text-gray-500">Try adjusting your search or check again later.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver._id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-semibold">{driver.name}</td>
                  <td className="p-4">{driver.email}</td>
                  <td className="p-4">{driver.phone || "-"}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(driver.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-sm font-medium ${
                        driver.isBlocked
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {driver.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => openTripModal(driver)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      View Trips
                    </button>
                    <button
                      onClick={() => openDocsModal(driver)}
                      className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm"
                    >
                      View Docs
                    </button>
                    <button
                      onClick={() =>
                        toggleBlockDriver(driver._id, !driver.isBlocked)
                      }
                      className={`${
                        driver.isBlocked
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      } text-white px-3 py-1 rounded text-sm`}
                    >
                      {driver.isBlocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Trip History Modal */}
      {showTripsModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative">
            <button
              onClick={closeTripModal}
              className="absolute top-4 right-4 text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6">
              Trip History — {selectedDriver.name}
            </h2>

            {tripLoading ? (
              <div className="text-center py-6 text-gray-500">Loading trips...</div>
            ) : trips.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No trips found for this driver.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-left">
                      <th className="p-3">Pickup</th>
                      <th className="p-3">Drop</th>
                      <th className="p-3">Fare</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip._id} className="border-t hover:bg-gray-50">
                        <td className="p-3">{trip.pickupLocation || "-"}</td>
                        <td className="p-3">{trip.dropLocation || "-"}</td>
                        <td className="p-3 font-semibold">₹{trip.fare.toFixed(2)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-medium ${
                              trip.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : trip.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : trip.status === "ongoing"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {trip.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(trip.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Documents Modal */}
      {showDocsModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative">
            <button
              onClick={closeDocsModal}
              className="absolute top-4 right-4 text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6">
              Documents — {selectedDriver.name}
            </h2>

            {docLoading ? (
              <div className="text-center py-6 text-gray-500">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No documents found for this driver.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-left">
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Number</th>
                      <th className="p-3">Expiry</th>
                      <th className="p-3">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc._id} className="border-t hover:bg-gray-50">
                        <td className="p-3 capitalize">{doc.type}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-medium ${
                              doc.status === "verified"
                                ? "bg-green-100 text-green-700"
                                : doc.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {doc.extractedData?.licenseNumber || "-"}
                        </td>
                        <td className="p-3">
                          {doc.extractedData?.expiryDate || "-"}
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(doc.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversPage;
