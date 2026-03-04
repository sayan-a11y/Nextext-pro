import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { MessageCircle } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate("/");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to register");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2c3246] rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#7b5cff] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#7b5cff]/30">
            <MessageCircle size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Join NexText Pro today</p>
        </div>

        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              className="w-full bg-[#1f2433] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7b5cff]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-[#1f2433] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7b5cff]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-[#1f2433] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7b5cff]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#7b5cff] text-white font-semibold rounded-xl py-3 hover:bg-[#6a4ce5] transition-colors shadow-lg shadow-[#7b5cff]/20"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-[#7b5cff] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
