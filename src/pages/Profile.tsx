import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { ArrowLeft, Edit2, LogOut, Settings as SettingsIcon, Camera } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#1f2433] relative shadow-2xl overflow-hidden">
      <div className="px-6 pt-12 pb-4 bg-[#2c3246] rounded-b-3xl shadow-lg z-10 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <button onClick={() => navigate("/settings")} className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors">
          <SettingsIcon size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff5c8d] flex items-center justify-center font-bold text-5xl text-white shadow-2xl shadow-[#7b5cff]/40 mb-4">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <button className="absolute bottom-4 right-0 w-10 h-10 bg-[#2c3246] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-[#1f2433] hover:bg-[#363d55] transition-colors">
              <Camera size={18} />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
          <p className="text-gray-400">{user?.email}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-[#2c3246] rounded-2xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Bio</h3>
              <button className="text-[#7b5cff] hover:text-[#6a4ce5] transition-colors"><Edit2 size={16} /></button>
            </div>
            <p className="text-white">{user?.bio || "Available"}</p>
          </div>

          <div className="bg-[#2c3246] rounded-2xl p-4 shadow-md">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white">Username</span>
                <span className="text-gray-400">@{user?.username}</span>
              </div>
              <div className="h-px bg-white/5"></div>
              <div className="flex justify-between items-center">
                <span className="text-white">Phone</span>
                <span className="text-gray-400">+1 234 567 890</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full bg-red-500/10 text-red-500 font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors mt-8"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
