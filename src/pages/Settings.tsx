import { useNavigate } from "react-router";
import { ArrowLeft, Bell, Lock, Shield, HelpCircle, Info } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#1f2433] relative shadow-2xl overflow-hidden">
      <div className="px-6 pt-12 pb-4 bg-[#2c3246] rounded-b-3xl shadow-lg z-10 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        <div className="bg-[#2c3246] rounded-2xl p-2 shadow-md">
          <button className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#7b5cff]/20 flex items-center justify-center text-[#7b5cff]">
              <Bell size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white">Notifications</h3>
              <p className="text-xs text-gray-400">Message, group & call tones</p>
            </div>
          </button>
          
          <div className="h-px bg-white/5 mx-4"></div>
          
          <button className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
              <Lock size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white">Privacy</h3>
              <p className="text-xs text-gray-400">Block contacts, disappearing messages</p>
            </div>
          </button>
          
          <div className="h-px bg-white/5 mx-4"></div>
          
          <button className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
              <Shield size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white">Security</h3>
              <p className="text-xs text-gray-400">Security notifications, two-step verification</p>
            </div>
          </button>
        </div>

        <div className="bg-[#2c3246] rounded-2xl p-2 shadow-md">
          <button className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
              <HelpCircle size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white">Help</h3>
              <p className="text-xs text-gray-400">Help center, contact us, privacy policy</p>
            </div>
          </button>
          
          <div className="h-px bg-white/5 mx-4"></div>
          
          <button className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400">
              <Info size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white">App Info</h3>
              <p className="text-xs text-gray-400">NexText Pro v1.0.0</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
