export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <form>
          <input
            type="text"
            placeholder="Email"
            className="w-full mb-3 p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full mb-3 p-2 border rounded"
          />
          <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
