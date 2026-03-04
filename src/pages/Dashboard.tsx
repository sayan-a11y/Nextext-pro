import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Search, Plus, MessageCircle, Phone, Camera, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Chat {
  id: string;
  participants: any[];
  last_message: string;
  last_message_time: string;
  unreadCount: number;
}

interface User {
  id: string;
  username: string;
  is_online: number;
  last_seen: string;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("chats"); // chats, calls, camera, profile
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    fetchChats();
    fetchUsers();

    if (socket) {
      socket.on("chat_updated", () => {
        fetchChats();
      });
    }

    return () => {
      if (socket) {
        socket.off("chat_updated");
      }
    };
  }, [socket]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChats(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startChat = async (participantId: string) => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/chat/${data.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#1f2433] relative shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 bg-[#2c3246] rounded-b-3xl shadow-lg z-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">NexText Pro</h1>
          <div className="w-10 h-10 rounded-full bg-[#7b5cff] flex items-center justify-center font-bold text-white shadow-lg shadow-[#7b5cff]/30">
            {user?.username.charAt(0).toUpperCase()}
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-[#1f2433] text-white rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7b5cff]"
          />
        </div>
      </div>

      {/* Stories (Mocked for now) */}
      <div className="px-6 py-4 flex gap-4 overflow-x-auto no-scrollbar">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center cursor-pointer">
            <Plus className="text-gray-400" />
          </div>
          <span className="text-xs text-gray-400">Add Story</span>
        </div>
        {users.slice(0, 5).map(u => (
          <div key={u.id} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer">
            <div className={`w-16 h-16 rounded-full p-[2px] ${onlineUsers.has(u.id) || u.is_online ? 'bg-gradient-to-tr from-[#7b5cff] to-[#ff5c8d]' : 'bg-gray-600'}`}>
              <div className="w-full h-full bg-[#2c3246] rounded-full flex items-center justify-center font-bold text-xl">
                {u.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="text-xs text-gray-300 truncate w-16 text-center">{u.username}</span>
          </div>
        ))}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {showNewChat ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-2 mb-4">
              <h2 className="text-lg font-semibold text-white">Select Contact</h2>
              <button onClick={() => setShowNewChat(false)} className="text-sm text-[#7b5cff]">Cancel</button>
            </div>
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => startChat(u.id)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#2c3246] cursor-pointer transition-colors"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center font-bold text-lg">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  {(onlineUsers.has(u.id) || u.is_online === 1) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f2433]"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{u.username}</h3>
                  <p className="text-sm text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {chats.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No chats yet. Start a new conversation!</div>
            ) : (
              chats.map(chat => {
                const otherParticipant = chat.participants.find(p => p.id !== user?.id);
                if (!otherParticipant) return null;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#2c3246] cursor-pointer transition-colors"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center font-bold text-xl">
                        {otherParticipant.username.charAt(0).toUpperCase()}
                      </div>
                      {(onlineUsers.has(otherParticipant.id) || otherParticipant.is_online === 1) && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#1f2433]"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-white truncate pr-2">{otherParticipant.username}</h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {chat.last_message_time ? formatDistanceToNow(new Date(chat.last_message_time), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400 truncate pr-4">{chat.last_message || "Started a chat"}</p>
                        {chat.unreadCount > 0 && (
                          <div className="w-5 h-5 rounded-full bg-[#7b5cff] flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-[#7b5cff]/30">
                            {chat.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {!showNewChat && (
        <button
          onClick={() => setShowNewChat(true)}
          className="absolute bottom-24 right-6 w-14 h-14 bg-[#7b5cff] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7b5cff]/40 hover:bg-[#6a4ce5] transition-colors z-20"
        >
          <Plus size={24} color="white" />
        </button>
      )}

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#2c3246] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex justify-around items-center px-6 z-30">
        <button onClick={() => setActiveTab('chats')} className={`flex flex-col items-center gap-1 ${activeTab === 'chats' ? 'text-[#7b5cff]' : 'text-gray-500'}`}>
          <MessageCircle size={24} className={activeTab === 'chats' ? 'fill-[#7b5cff]/20' : ''} />
          <span className="text-[10px] font-medium">Chats</span>
        </button>
        <button onClick={() => setActiveTab('calls')} className={`flex flex-col items-center gap-1 ${activeTab === 'calls' ? 'text-[#7b5cff]' : 'text-gray-500'}`}>
          <Phone size={24} />
          <span className="text-[10px] font-medium">Calls</span>
        </button>
        <button onClick={() => setActiveTab('camera')} className={`flex flex-col items-center gap-1 ${activeTab === 'camera' ? 'text-[#7b5cff]' : 'text-gray-500'}`}>
          <Camera size={24} />
          <span className="text-[10px] font-medium">Camera</span>
        </button>
        <button onClick={() => navigate('/profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#7b5cff]' : 'text-gray-500'}`}>
          <UserIcon size={24} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}
