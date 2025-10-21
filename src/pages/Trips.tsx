import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

interface TripDetails {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  fare: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  name: string;
  phone: string;
  address?: string;
}

interface Driver {
  name: string;
  phone: string;
  license?: string;
}

const TripDetailsPage: React.FC = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);

  const fetchTripDetails = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/admin/trip/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrip(res.data.trip);
      setCustomer(res.data.customer);
      setDriver(res.data.driver);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load trip details.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!tripId) return;
    try {
      await axios.put(
        `/api/admin/trip/${tripId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTripDetails();
      alert("✅ Trip marked as completed!");
    } catch (err) {
      alert("Failed to mark trip completed");
    }
  };

  const handleCancelTrip = async () => {
    if (!tripId) return;
    try {
      await axios.put(
        `/api/admin/trip/${tripId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTripDetails();
      alert("❌ Trip cancelled");
    } catch (err) {
      alert("Failed to cancel trip");
    }
  };

  useEffect(() => {
    if (token) fetchTripDetails();
  }, [token]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          ← Back
        </button>

        {trip?.status !== "completed" && (
          <button
            onClick={handleMarkCompleted}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✅ Mark Completed
          </button>
        )}

        {trip?.status !== "cancelled" && (
          <button
            onClick={handleCancelTrip}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ❌ Cancel Trip
          </button>
        )}

        <button
          onClick={() => setShowMap(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          📍 Show on Map
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-600">
          Loading trip details...
        </div>
      )}
      {error && <div className="text-center py-12 text-red-500">{error}</div>}

      {!loading && trip && (
        <div className="space-y-8">
          {/* Trip Info */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Trip Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p>
                  <b>Pickup Location:</b> {trip.pickupLocation || "-"}
                </p>
                <p>
                  <b>Drop Location:</b> {trip.dropLocation || "-"}
                </p>
                <p>
                  <b>Fare:</b> ₹{trip.fare.toFixed(2)}
                </p>
              </div>
              <div>
                <p>
                  <b>Status:</b>{" "}
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
                </p>
                <p>
                  <b>Created:</b>{" "}
                  {new Date(trip.createdAt).toLocaleString()}
                </p>
                <p>
                  <b>Updated:</b>{" "}
                  {new Date(trip.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    <b>Name:</b> {customer.name}
                  </p>
                  <p>
                    <b>Phone:</b> {customer.phone}
                  </p>
                </div>
                <div>
                  <p>
                    <b>Address:</b> {customer.address || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Driver Info */}
          {driver && (
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Driver Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    <b>Name:</b> {driver.name}
                  </p>
                  <p>
                    <b>Phone:</b> {driver.phone}
                  </p>
                </div>
                <div>
                  <p>
                    <b>License:</b> {driver.license || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📍 Map Modal */}
      {showMap && trip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative">
            <button
              onClick={() => setShowMap(false)}
              className="absolute top-4 right-4 text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6">Trip Route</h2>
            <iframe
              title="map"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                trip.pickupLocation
              )}+to+${encodeURIComponent(trip.dropLocation)}&output=embed`}
              className="w-full h-96 rounded-xl"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetailsPage;
