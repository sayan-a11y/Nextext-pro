import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { ArrowLeft, Phone, Video, MoreVertical, Paperclip, Send, Smile, Mic, PhoneOff, MicOff, CameraOff } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  media_url: string | null;
  message_type: string;
  created_at: string;
  status: string;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participant, setParticipant] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Call state
  const [callState, setCallState] = useState<"idle" | "calling" | "receiving" | "connected">("idle");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchChatDetails();
    fetchMessages();

    if (socket) {
      socket.on("receive_message", (msg: Message) => {
        if (msg.chat_id === id) {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        }
      });

      socket.on("user_typing", ({ chatId, userId, isTyping }) => {
        if (chatId === id && userId !== user?.id) {
          setOtherTyping(isTyping);
        }
      });

      socket.on("call_incoming", async (data) => {
        if (data.from === participant?.id || data.from === id) {
          // In a real app, we'd check if we're already in a call
          setIncomingCall(data);
          setCallState("receiving");
          setCallType(data.callType);
        }
      });

      socket.on("call_accepted", async (signal) => {
        setCallState("connected");
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      });

      socket.on("call_ended", () => {
        endCall(false);
      });
    }

    return () => {
      if (socket) {
        socket.off("receive_message");
        socket.off("user_typing");
        socket.off("call_incoming");
        socket.off("call_accepted");
        socket.off("call_ended");
      }
    };
  }, [id, socket, participant]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatDetails = async () => {
    try {
      const res = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const chats = await res.json();
        const currentChat = chats.find((c: any) => c.id === id);
        if (currentChat) {
          const other = currentChat.participants.find((p: any) => p.id !== user?.id);
          setParticipant(other);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { chatId: id, userId: user?.id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("typing", { chatId: id, userId: user?.id, isTyping: false });
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // We'll use socket to send text messages for instant delivery,
    // but for media we'd use the API. Let's use socket for text.
    if (socket && newMessage.trim()) {
      socket.emit("send_message", {
        chatId: id,
        senderId: user?.id,
        text: newMessage,
        messageType: "text",
        mediaUrl: null
      });
      setNewMessage("");
      socket.emit("typing", { chatId: id, userId: user?.id, isTyping: false });
    }
  };

  const startCall = async (type: "audio" | "video") => {
    if (!participant || !socket) return;
    setCallType(type);
    setCallState("calling");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === "video", audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // In a full implementation, we'd send ICE candidates separately
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call_user", {
        userToCall: participant.id,
        signalData: offer,
        from: user?.id,
        name: user?.username,
        callType: type
      });
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setCallState("idle");
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !socket) return;
    setCallState("connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.callType === "video", audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer_call", { signal: answer, to: incomingCall.from });
    } catch (err) {
      console.error("Error accessing media devices.", err);
      endCall();
    }
  };

  const endCall = (emit = true) => {
    if (emit && socket && participant) {
      socket.emit("end_call", { to: participant.id });
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    setCallState("idle");
    setIncomingCall(null);
    localStreamRef.current = null;
    peerConnectionRef.current = null;
  };

  const isOnline = participant && (onlineUsers.has(participant.id) || participant.is_online === 1);

  if (callState !== "idle") {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-[#1f2433] relative shadow-2xl overflow-hidden">
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center">
          {callType === "video" && (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 w-24 h-36 bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/10 z-10">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </>
          )}
          
          {callType === "audio" && (
            <div className="flex flex-col items-center gap-6 z-10">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#7b5cff] to-[#ff5c8d] flex items-center justify-center font-bold text-5xl text-white shadow-2xl shadow-[#7b5cff]/40 animate-pulse">
                {participant?.username?.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-white">{participant?.username}</h2>
              <p className="text-[#7b5cff]">
                {callState === "calling" ? "Calling..." : callState === "receiving" ? "Incoming Call..." : "Connected"}
              </p>
            </div>
          )}

          {/* Call Controls */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 z-20">
            {callState === "receiving" ? (
              <>
                <button onClick={() => endCall()} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors">
                  <PhoneOff size={28} />
                </button>
                <button onClick={answerCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg hover:bg-green-600 transition-colors animate-bounce">
                  <Phone size={28} />
                </button>
              </>
            ) : (
              <>
                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-lg hover:bg-white/20 transition-colors">
                  <MicOff size={24} />
                </button>
                {callType === "video" && (
                  <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-lg hover:bg-white/20 transition-colors">
                    <CameraOff size={24} />
                  </button>
                )}
                <button onClick={() => endCall()} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors">
                  <PhoneOff size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#1f2433] relative shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 bg-[#2c3246] rounded-b-3xl shadow-lg z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center font-bold text-lg text-white">
                {participant?.username?.charAt(0).toUpperCase()}
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2c3246]"></div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-white leading-tight">{participant?.username || "Loading..."}</h2>
              <p className="text-xs text-[#7b5cff]">
                {otherTyping ? "typing..." : isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => startCall("audio")} className="p-2 text-[#7b5cff] hover:bg-white/5 rounded-full transition-colors">
            <Phone size={20} />
          </button>
          <button onClick={() => startCall("video")} className="p-2 text-[#7b5cff] hover:bg-white/5 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:bg-white/5 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1f2433] pb-24">
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          const showDate = index === 0 || new Date(msg.created_at).getDate() !== new Date(messages[index - 1].created_at).getDate();
          
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 bg-[#2c3246] px-3 py-1 rounded-full">
                    {format(new Date(msg.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl relative ${
                  isMe 
                    ? "bg-[#7b5cff] text-white rounded-tr-sm shadow-lg shadow-[#7b5cff]/20" 
                    : "bg-[#2c3246] text-gray-100 rounded-tl-sm shadow-md"
                }`}>
                  <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-white/70" : "text-gray-400"}`}>
                    <span className="text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
                    {isMe && (
                      <span className="text-[10px]">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#1f2433]/90 backdrop-blur-md border-t border-white/5 z-20">
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <div className="flex-1 bg-[#2c3246] rounded-3xl flex items-center px-2 py-1 shadow-inner">
            <button type="button" className="p-2 text-gray-400 hover:text-[#7b5cff] transition-colors">
              <Smile size={24} />
            </button>
            <input
              type="text"
              placeholder="Message..."
              className="flex-1 bg-transparent text-white px-2 py-3 focus:outline-none placeholder-gray-500"
              value={newMessage}
              onChange={handleTyping}
            />
            <button type="button" className="p-2 text-gray-400 hover:text-[#7b5cff] transition-colors transform rotate-45">
              <Paperclip size={24} />
            </button>
          </div>
          
          {newMessage.trim() ? (
            <button 
              type="submit" 
              className="w-12 h-12 rounded-full bg-[#7b5cff] flex items-center justify-center text-white shadow-lg shadow-[#7b5cff]/40 hover:bg-[#6a4ce5] transition-colors flex-shrink-0"
            >
              <Send size={20} className="ml-1" />
            </button>
          ) : (
            <button 
              type="button" 
              className="w-12 h-12 rounded-full bg-[#2c3246] flex items-center justify-center text-[#7b5cff] shadow-md hover:bg-[#363d55] transition-colors flex-shrink-0"
            >
              <Mic size={24} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
