import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

interface Customer {
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

const CustomersPage: React.FC = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTripsModal, setShowTripsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // ✅ Fetch customers from backend
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(res.data.customers);
      setFilteredCustomers(res.data.customers);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch trips for a specific customer
  const fetchCustomerTrips = async (customerId: string) => {
    try {
      setTripLoading(true);
      const res = await axios.get("/api/admin/trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allTrips: Trip[] = res.data.trips;
      const customerTrips = allTrips.filter((t) => (t as any).customerId?._id === customerId);
      setTrips(customerTrips);
    } catch (err) {
      console.error("Error fetching trips", err);
    } finally {
      setTripLoading(false);
    }
  };

  // ✅ Block / Unblock customer
  const toggleBlockCustomer = async (customerId: string, block: boolean) => {
    try {
      await axios.put(
        `/api/admin/customer/${block ? "block" : "unblock"}/${customerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomers((prev) =>
        prev.map((c) =>
          c._id === customerId ? { ...c, isBlocked: block } : c
        )
      );
      setFilteredCustomers((prev) =>
        prev.map((c) =>
          c._id === customerId ? { ...c, isBlocked: block } : c
        )
      );
    } catch (err) {
      alert("Failed to update customer status.");
    }
  };

  // ✅ Search customers
  const handleSearch = (value: string) => {
    setSearch(value);
    const filtered = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        c.email.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const openTripModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowTripsModal(true);
    fetchCustomerTrips(customer._id);
  };

  const closeTripModal = () => {
    setSelectedCustomer(null);
    setTrips([]);
    setShowTripsModal(false);
  };

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token]);

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">All Customers</h2>
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

      {loading && <div className="text-center py-12 text-gray-600">Loading customers...</div>}
      {error && <div className="text-center py-12 text-red-500">{error}</div>}

      {!loading && !error && filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No customers found
          </h3>
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
              {filteredCustomers.map((customer) => (
                <tr key={customer._id} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-semibold">{customer.name}</td>
                  <td className="p-4">{customer.email}</td>
                  <td className="p-4">{customer.phone || "-"}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(customer.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-sm font-medium ${
                        customer.isBlocked
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {customer.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      onClick={() => openTripModal(customer)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      View Trips
                    </button>
                    <button
                      onClick={() =>
                        toggleBlockCustomer(customer._id, !customer.isBlocked)
                      }
                      className={`${
                        customer.isBlocked
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      } text-white px-3 py-1 rounded text-sm`}
                    >
                      {customer.isBlocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Trip History Modal */}
      {showTripsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative">
            <button
              onClick={closeTripModal}
              className="absolute top-4 right-4 text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6">
              Trip History — {selectedCustomer.name}
            </h2>

            {tripLoading ? (
              <div className="text-center py-6 text-gray-500">Loading trips...</div>
            ) : trips.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No trips found for this customer.
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
    </div>
  );
};

export default CustomersPage;
