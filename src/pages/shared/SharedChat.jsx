import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
    Search, Phone, MoreVertical, Paperclip, Send,
    ArrowLeft, Loader2, CheckCheck, Check, MessageSquare, Camera, Image as ImageIcon, X, FileCheck,
    Trash2, Link as LinkIcon, FileText, Users, PhoneIncoming, PhoneOff
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

// --- GLOBAL SOCKET SINGLETON ---
if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", {
        autoConnect: true,
    });
}
const socket = window.__GLOBAL_SOCKET__;

// --- GLOBAL AUDIO SINGLETON ---
if (!window.__GLOBAL_AUDIO__) {
    window.__GLOBAL_AUDIO__ = {
        notification: new Audio('/sounds/notification-ting.mp3'),
        sos: new Audio('/sounds/beep.mp3'),
        message: new Audio('/sounds/message.mp3'),
        incoming: new Audio('/sounds/incoming.mp3'),
        hangup: new Audio('/sounds/hangup.mp3'),
        sent: new Audio('/sounds/sent.mp3'),
    };
}
const globalAudio = window.__GLOBAL_AUDIO__;

const playAudio = (type) => {
    try {
        const snd = globalAudio[type];
        if (snd) {
            snd.currentTime = 0;
            snd.play().catch(e => console.warn(`Audio blocked for ${type}:`, e));
        }
    } catch (e) { }
};

const pauseAudio = (type) => {
    try {
        const snd = globalAudio[type];
        if (snd) {
            snd.pause();
            snd.currentTime = 0;
        }
    } catch (e) { }
};

// --- NATIVE IMAGE COMPRESSOR ---
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
        };
    });
};

const SharedChat = () => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const currentUserId = user?.id || user?._id;

    // --- STATE ---
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([]);

    // Unread Badges State
    const [unreadMap, setUnreadMap] = useState({});

    // UI States
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showProfileInfo, setShowProfileInfo] = useState(false);

    // Call States (WebRTC)
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(false);
    const [callPeer, setCallPeer] = useState(null);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);

    // Delete Context Menu State
    const [contextMenu, setContextMenu] = useState(null);
    const touchTimer = useRef(null);
    const contextMenuRef = useRef(null);

    // Menu & Modal States
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showTopMenu, setShowTopMenu] = useState(false);
    const [showSidebarMenu, setShowSidebarMenu] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState("");
    const [sharedContentView, setSharedContentView] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const docInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const attachMenuRef = useRef(null);
    const topMenuRef = useRef(null);
    const sidebarMenuRef = useRef(null);

    const activeChatRef = useRef(activeChat);
    useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

    // --- LAYOUT LOCK ---
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // --- HANDLE INCOMING CALL AUDIO PLAYBACK ---
    useEffect(() => {
        if (incomingCall && !activeCall) {
            globalAudio.incoming.loop = true;
            playAudio('incoming');
        } else {
            pauseAudio('incoming');
        }
    }, [incomingCall, activeCall]);

    // --- FETCH INITIAL CHATS ---
    useEffect(() => {
        if (currentUserId) fetchConversations();
    }, [currentUserId]);

    // --- WEBRTC CONFIG ---
    const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    const setupMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (e) {
            toast.error("Microphone access denied or not found.");
            return null;
        }
    };

    const cleanupCall = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (pcRef.current) pcRef.current.close();
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

        pcRef.current = null;
        localStreamRef.current = null;
        setActiveCall(false);
        setCallPeer(null);
        setIncomingCall(null);
    };

    const rejectCall = () => {
        if (incomingCall) socket.emit('end_call', { to: incomingCall.from });
        setIncomingCall(null);
    };

    // --- AUTO-HANGUP TIMEOUT ---
    useEffect(() => {
        let timer;
        if (incomingCall && !activeCall) {
            timer = setTimeout(() => {
                rejectCall();
                toast.error("Missed call", { icon: '📵' });
            }, 60000);
        }
        return () => clearTimeout(timer);
    }, [incomingCall, activeCall]);

    // --- SOCKET INIT & EVENT LISTENERS ---
    useEffect(() => {
        if (!currentUserId) return;

        const joinChatRoom = () => { socket.emit("join_room", currentUserId); };
        if (socket.connected) joinChatRoom();
        socket.on("connect", joinChatRoom);

        const handleOnlineUsers = (users) => setOnlineUsers(users);

        const handleReceiveMessage = (data) => {
            const currentChat = activeChatRef.current;
            const isActivelyChatting = currentChat && (data.senderId === currentChat._id || data.senderId === currentChat.id);

            // 1. Tell the sender the message was delivered to our device
            socket.emit("message_delivered", { senderId: data.senderId, recipientId: currentUserId });

            if (isActivelyChatting) {
                // 2. We are currently looking at the chat! Don't play sound/toast.
                setMessages((prev) => [...prev, data]);
                scrollToBottom();

                // Tell the sender we saw it immediately (Blue ticks)
                socket.emit("mark_chat_seen", { senderId: data.senderId, recipientId: currentUserId });
            } else {
                // 3. We are NOT looking at this person's chat right now. Play notification.
                if (!document.hidden) {
                    playAudio('message');
                    toast.success(`New message received`, { icon: '💬', id: `chat-msg-${data.senderId}` });
                }
                // Increment unread badge for the sender
                setUnreadMap(prev => ({
                    ...prev,
                    [data.senderId]: (prev[data.senderId] || 0) + 1
                }));
            }
        };

        const handleMessageDeleted = ({ messageId, timestamp }) => {
            setMessages((prev) => prev.filter(m => (m._id || m.id) !== messageId && m.timestamp !== timestamp));
        };

        // Message Status Update Listener (For Sent/Delivered/Seen Ticks)
        const handleMessageStatusUpdate = ({ viewerId, status }) => {
            if (activeChatRef.current && (activeChatRef.current._id === viewerId || activeChatRef.current.id === viewerId)) {
                setMessages(prev => prev.map(m => {
                    // Update only if we sent it, and don't downgrade from seen to delivered
                    if (m.senderId === currentUserId) {
                        if (status === 'seen') return { ...m, status: 'seen' };
                        if (status === 'delivered' && m.status !== 'seen') return { ...m, status: 'delivered' };
                    }
                    return m;
                }));
            }
        };

        const handleIncomingCall = (data) => {
            setIncomingCall({ from: data.from, callerName: data.callerName, signal: data.signal });
        };

        const handleCallAccepted = async (signal) => {
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                toast.success("Call connected", { icon: '📞' });
            }
        };

        const handleIceCandidate = async (data) => {
            if (pcRef.current && data.candidate) {
                try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); }
                catch (e) { console.error("Error adding ICE candidate", e); }
            }
        };

        const handleCallEnded = () => {
            cleanupCall();
            playAudio('hangup');
            toast("Call ended", { icon: '📵' });
        };

        socket.on("online_users_updated", handleOnlineUsers);
        socket.on("receive_message", handleReceiveMessage);
        socket.on("message_deleted", handleMessageDeleted);
        socket.on("messages_status_update", handleMessageStatusUpdate); // Listens for delivered/seen updates
        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_accepted", handleCallAccepted);
        socket.on("ice_candidate", handleIceCandidate);
        socket.on("call_ended", handleCallEnded);

        return () => {
            socket.off("connect", joinChatRoom);
            socket.off("online_users_updated", handleOnlineUsers);
            socket.off("receive_message", handleReceiveMessage);
            socket.off("message_deleted", handleMessageDeleted);
            socket.off("messages_status_update", handleMessageStatusUpdate);
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_accepted", handleCallAccepted);
            socket.off("ice_candidate", handleIceCandidate);
            socket.off("call_ended", handleCallEnded);
        };
    }, [currentUserId]);

    // --- CHECK FOR GLOBAL INCOMING CALL REDIRECTION ---
    useEffect(() => {
        if (location.state?.incomingCall) {
            if (location.state.autoAccept) {
                acceptCall(location.state.incomingCall);
            } else {
                setIncomingCall(location.state.incomingCall);
            }
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // --- CLICK OUTSIDE HANDLER ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) setShowAttachMenu(false);
            if (topMenuRef.current && !topMenuRef.current.contains(event.target)) setShowTopMenu(false);
            if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target)) setShowSidebarMenu(false);

            // Close context menu ONLY if clicked outside the actual menu
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [contextMenu]);

    const scrollToBottom = () => {
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 150);
    };

    // Updated to 12-Hour Format (e.g. 10:30 AM)
    const formatTime = (timeString) => {
        if (!timeString) return '';
        const date = new Date(timeString);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // --- API CALLS ---
    const fetchConversations = async () => {
        try {
            setIsLoadingChats(true);
            const endpoint = user.role === 'Employee' ? '/employee/peers' : '/admin/employees';
            const res = await api.get(endpoint);
            if (res.data.success) {
                const peers = res.data.data.filter(p => (p._id || p.id) !== currentUserId);
                setConversations(peers);

                // Initialize unread map if backend provides it
                const initialUnread = {};
                peers.forEach(p => {
                    if (p.unreadCount) initialUnread[p._id || p.id] = p.unreadCount;
                });
                setUnreadMap(initialUnread);
            }
        } catch (error) { toast.error("Could not load contact list."); }
        finally { setIsLoadingChats(false); }
    };

    const fetchMessages = async (recipientId) => {
        try {
            setMessages([]);
            const res = await api.get(`/chat/history/${currentUserId}/${recipientId}`).catch(() => ({ data: { success: true, data: [] } }));
            if (res.data.success) {
                setMessages(res.data.data || []);
                // Once messages are fetched, tell the sender we've seen them (Blue Ticks)
                socket.emit("mark_chat_seen", { senderId: recipientId, recipientId: currentUserId });
            }
            setShowProfileInfo(false);
            setSharedContentView(null);
            scrollToBottom();
        } catch (error) { console.error("Failed to load messages:", error); }
    };

    // --- MESSAGE ACTIONS ---
    const handleSelectChat = (chatUser) => {
        const userId = chatUser._id || chatUser.id;

        // Clear unread badge instantly
        setUnreadMap(prev => ({ ...prev, [userId]: 0 }));

        if (activeChat && (activeChat._id || activeChat.id) === userId) return;

        setActiveChat(chatUser);
        fetchMessages(userId);

        setShowAttachMenu(false);
        setShowTopMenu(false);
        setShowSidebarMenu(false);
        setShowSearchInput(false);
        setSharedContentView(null);
        setChatSearchQuery("");
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() && !isUploading) return;

        const tempId = `temp-${Date.now()}`;

        const payload = {
            _id: tempId,
            senderId: currentUserId,
            recipientId: activeChat._id || activeChat.id,
            text: newMessage,
            mediaUrl: null,
            mediaType: 'text',
            status: 'sent', // Initially sent (single tick)
            timestamp: new Date().toISOString()
        };

        setMessages((prev) => [...prev, payload]);
        setNewMessage("");
        scrollToBottom();
        playAudio('sent');

        socket.emit("send_message", payload);

        try {
            const res = await api.post('/chat/message', payload);
            if (res.data && res.data._id) {
                setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: res.data._id } : m));
            }
        } catch (error) {
            console.error("Failed to save message");
        }
    };

    const handleMediaUpload = async (e, options = {}) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const { compress = false, maxCount = 1, maxSizeCombinedMb = 50 } = options;

        if (files.length > maxCount) return toast.error(`Maximum of ${maxCount} items allowed at once.`);
        const combinedSizeMb = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        if (combinedSizeMb > maxSizeCombinedMb) return toast.error(`Size cannot exceed ${maxSizeCombinedMb}MB.`);

        setShowAttachMenu(false);
        setIsUploading(true);
        const loadingToast = toast.loading(`Preparing ${files.length} item(s)...`);

        try {
            for (let i = 0; i < files.length; i++) {
                let fileToUpload = files[i];
                let type = fileToUpload.type.startsWith('image/') ? 'image' : (fileToUpload.type.startsWith('video/') ? 'video' : 'document');

                if (compress && type === 'image') fileToUpload = await compressImage(fileToUpload, 1200, 0.7);

                toast.loading(`Uploading item ${i + 1}/${files.length}...`, { id: loadingToast });

                const urlRes = await api.post('/chat/generate-presigned-url', { fileType: fileToUpload.type, originalName: fileToUpload.name });
                const { presignedUrl, publicUrl } = urlRes.data;

                await fetch(presignedUrl, { method: 'PUT', body: fileToUpload, headers: { 'Content-Type': fileToUpload.type } });

                const tempId = `temp-${Date.now()}-${i}`;
                const payload = {
                    _id: tempId,
                    senderId: currentUserId,
                    recipientId: activeChat._id || activeChat.id,
                    text: "",
                    mediaUrl: publicUrl,
                    mediaType: type,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                };

                socket.emit("send_message", payload);
                setMessages((prev) => [...prev, payload]);
                playAudio('sent');

                const res = await api.post('/chat/message', payload);
                if (res.data && res.data._id) {
                    setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: res.data._id } : m));
                }
            }
            toast.success("Sent successfully!", { id: loadingToast });
            scrollToBottom();
        } catch (error) {
            toast.error("Upload failed.", { id: loadingToast });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
            if (cameraInputRef.current) cameraInputRef.current.value = null;
            if (docInputRef.current) docInputRef.current.value = null;
        }
    };

    // --- WHATSAPP STYLE DELETE LOGIC ---
    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches.length > 0 ? e.touches[0].clientX : window.innerWidth / 2);
        const clientY = e.clientY || (e.touches && e.touches.length > 0 ? e.touches[0].clientY : window.innerHeight / 2);
        setContextMenu({ mouseX: clientX, mouseY: clientY, msg });
    };

    const handleTouchStart = (e, msg) => {
        touchTimer.current = setTimeout(() => { handleContextMenu(e, msg); }, 600);
    };

    const handleTouchEnd = () => { if (touchTimer.current) clearTimeout(touchTimer.current); };

    const executeDelete = async (type) => {
        if (!contextMenu) return;
        const { msg } = contextMenu;
        setContextMenu(null);
        const targetId = msg._id || msg.id;

        if (type === 'me') {
            const localDeleted = JSON.parse(localStorage.getItem('deletedChatMessages') || '[]');
            if (targetId) localDeleted.push(targetId);
            localStorage.setItem('deletedChatMessages', JSON.stringify(localDeleted));
            setMessages(prev => prev.filter(m => (m._id || m.id) !== targetId && m.timestamp !== msg.timestamp));
            toast.success("Message deleted for you");
            return;
        }

        if (type === 'everyone') {
            setMessages(prev => prev.filter(m => (m._id || m.id) !== targetId && m.timestamp !== msg.timestamp));
            socket.emit("delete_message", { messageId: targetId, timestamp: msg.timestamp, recipientId: activeChat._id || activeChat.id });
            if (targetId && !targetId.startsWith('temp-')) {
                try { await api.delete(`/chat/message/${targetId}`); }
                catch (e) { console.error("Failed to delete from DB"); }
            }
        }
    };

    // --- CALL ACTIONS ---
    const initiateVoiceCall = async () => {
        if (!activeChat) return;
        const stream = await setupMedia();
        if (!stream) return;

        setCallPeer(activeChat.name);
        setActiveCall(true);

        const pc = new RTCPeerConnection(iceServers);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('ice_candidate', { to: activeChat._id || activeChat.id, candidate: e.candidate, from: currentUserId });
            }
        };

        pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call_user', { userToCall: activeChat._id || activeChat.id, from: currentUserId, callerName: user.name, signalData: offer });
    };

    const acceptCall = async (callData = incomingCall) => {
        if (!callData) return;
        const stream = await setupMedia();
        if (!stream) return;

        setActiveCall(true);
        setCallPeer(callData.callerName);

        const pc = new RTCPeerConnection(iceServers);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit('ice_candidate', { to: callData.from, candidate: e.candidate, from: currentUserId });
        };

        pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };

        await pc.setRemoteDescription(new RTCSessionDescription(callData.signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer_call', { to: callData.from, signal: answer });
        setIncomingCall(null);
    };

    const endCurrentCall = () => {
        const recipient = incomingCall?.from || (activeChat?._id || activeChat?.id);
        if (recipient) socket.emit('end_call', { to: recipient });
        cleanupCall();
        playAudio('hangup');
    };

    // --- MENU ACTIONS ---
    const handleChatAction = async (action) => {
        setShowTopMenu(false);
        if (action === 'clear') {
            setMessages([]);
            toast.success(`Chat cleared visually.`, { icon: '🗑️' });
        } else { setSharedContentView(action); }
    };

    // --- UI HELPERS ---
    const isOnline = (id) => onlineUsers.includes(id?.toString());
    const filteredConversations = conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const localDeletedIds = JSON.parse(localStorage.getItem('deletedChatMessages') || '[]');
    const visibleMessages = messages.filter(m => !localDeletedIds.includes(m._id || m.id));

    const displayedMessages = chatSearchQuery.trim() === "" ? visibleMessages : visibleMessages.filter(m => m.text && m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()));

    const sharedMedia = visibleMessages.filter(m => m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'video'));
    const sharedDocs = visibleMessages.filter(m => m.mediaUrl && m.mediaType === 'document');
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const sharedLinks = visibleMessages.filter(m => m.text && m.text.match(urlRegex));

    // Renders WhatsApp Style Status Ticks
    const renderMessageStatus = (msg) => {
        if (msg.status === 'seen') return <CheckCheck className="w-4 h-4 text-[#53bdeb] drop-shadow-sm" />; // WhatsApp Blue
        if (msg.status === 'delivered') return <CheckCheck className="w-4 h-4 text-white/70" />; // Double Gray
        return <Check className="w-4 h-4 text-white/70" />; // Single Gray Default
    };

    return (
        <div className="fixed top-16 inset-x-0 bottom-16 xl:bottom-0 z-30 flex bg-background dark:bg-[#0B0D12] overflow-hidden animate-in fade-in duration-300">

            {/* HIDDEN AUDIO ELEMENT FOR WEBRTC VOICE CALLS */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {/* DELETE CONTEXT MENU */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-50 bg-card border border-border shadow-2xl rounded-xl py-1 w-44 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
                >
                    <button onClick={() => executeDelete('me')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-sm font-medium text-foreground transition-colors">
                        <Trash2 className="w-4 h-4 text-muted-foreground" /> Delete for me
                    </button>

                    {String(contextMenu.msg.senderId || contextMenu.msg.sender) === String(currentUserId) && (
                        <button onClick={() => executeDelete('everyone')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 text-sm font-medium text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" /> Delete for everyone
                        </button>
                    )}
                </div>
            )}

            {/* INCOMING CALL MODAL OVERLAY */}
            {incomingCall && !activeCall && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                    <div className="bg-card dark:bg-[#13151A] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-6 w-80 text-center animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.4)]">
                            <PhoneIncoming className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{incomingCall.callerName}</h2>
                            <p className="text-sm text-muted-foreground mt-1">is calling you...</p>
                        </div>
                        <div className="flex items-center gap-6 w-full justify-center mt-2">
                            <button onClick={rejectCall} className="w-14 h-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                <PhoneOff className="w-6 h-6" />
                            </button>
                            <button onClick={() => acceptCall()} className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white">
                                <Phone className="w-6 h-6 fill-current" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT SIDEBAR (Contacts) */}
            <div className={`w-full md:w-90 lg:w-95 flex flex-col h-full bg-card dark:bg-[#11131A] border-r border-border/40 z-20 transition-all duration-300 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 sm:p-5 shrink-0 space-y-4 bg-card dark:bg-[#11131A]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black tracking-tight text-foreground">Messages</h2>
                        <div className="relative" ref={sidebarMenuRef}>
                            <button onClick={() => setShowSidebarMenu(!showSidebarMenu)} className="p-2 rounded-full text-muted-foreground hover:bg-muted">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            {showSidebarMenu && (
                                <div className="absolute top-10 right-0 w-48 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-30">
                                    <button onClick={() => { setShowSidebarMenu(false); toast("Groups coming soon!"); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium">
                                        <Users className="w-4 h-4" /> New group
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="w-full bg-muted/40 dark:bg-[#1A1D24] border-none text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-0.5">
                    {isLoadingChats ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex justify-center p-8 text-center text-sm font-medium text-muted-foreground">No contacts found.</div>
                    ) : (
                        filteredConversations.map((chatUser) => {
                            const userId = chatUser._id || chatUser.id;
                            const isActive = activeChat && (activeChat._id === userId || activeChat.id === userId);
                            const unreadCount = unreadMap[userId] || 0;

                            return (
                                <div key={userId} onClick={() => handleSelectChat(chatUser)} className={`flex items-center gap-3.5 p-3 cursor-pointer rounded-xl transition-all duration-200 ${isActive ? 'bg-muted dark:bg-[#1A1D24]' : 'hover:bg-muted/50 dark:hover:bg-[#16181F]'}`}>
                                    <div className="relative shrink-0">
                                        {chatUser.profilePicture ? (
                                            <img src={chatUser.profilePicture} alt={chatUser.name} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-base">
                                                {chatUser.name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        {isOnline(userId) && (
                                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full"></span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h3 className={`text-[15px] font-semibold truncate ${unreadCount > 0 ? 'text-foreground' : (isActive ? 'text-foreground' : 'text-foreground/90')}`}>
                                                {chatUser.name}
                                            </h3>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={`text-[13px] truncate font-medium ${unreadCount > 0 ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                                                {chatUser.role || 'Employee'}
                                            </p>
                                            {/* Unread WhatsApp Badge */}
                                            {unreadCount > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2 animate-in zoom-in duration-200 shadow-sm">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* MAIN CONVERSATION WINDOW */}
            <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                {activeChat ? (
                    <div className="flex-1 flex w-full h-full relative bg-[#EBEBEB] dark:bg-[#0B0D12]">
                        <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300">

                            {/* ACTIVE CALL BANNER */}
                            {activeCall && (
                                <div className="bg-emerald-500 text-white px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 z-30 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3 font-medium text-sm">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        <span>In call with {callPeer || activeChat.name}</span>
                                    </div>
                                    <button onClick={endCurrentCall} className="bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                                        <PhoneOff className="w-3.5 h-3.5" /> End Call
                                    </button>
                                </div>
                            )}

                            {/* TOP BAR (Dynamic Search vs Standard Header) */}
                            {showSearchInput ? (
                                <div className="h-16 md:h-17.5 px-2 sm:px-4 bg-card dark:bg-[#13151A] border-b border-border/40 flex items-center gap-2 shrink-0 z-20 sticky top-0 animate-in fade-in duration-200">
                                    <button onClick={() => { setShowSearchInput(false); setChatSearchQuery(""); }} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={chatSearchQuery}
                                        onChange={(e) => setChatSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="flex-1 bg-transparent border-none text-[15px] focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground min-w-0"
                                    />
                                    {chatSearchQuery && (
                                        <button onClick={() => setChatSearchQuery("")} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0">
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="h-16 md:h-17.5 px-3 sm:px-5 bg-card dark:bg-[#13151A] border-b border-border/40 flex items-center justify-between shrink-0 z-20 sticky top-0">
                                    <div className="flex items-center flex-1 gap-2 sm:gap-4 cursor-pointer" onClick={() => setShowProfileInfo(true)}>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveChat(null); }} className="md:hidden p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div className="relative shrink-0">
                                            {activeChat.profilePicture ? (
                                                <img src={activeChat.profilePicture} alt="Profile" className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">{activeChat.name?.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div className="leading-tight flex-1 min-w-0">
                                            <h3 className="text-[15px] md:text-[16px] font-bold text-foreground truncate tracking-wide">{activeChat.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                                                <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isOnline(activeChat._id || activeChat.id) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                                <p className="text-[11px] md:text-[12px] text-muted-foreground font-medium">{isOnline(activeChat._id || activeChat.id) ? 'Online' : 'Offline'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-0.5 md:gap-1 relative" ref={topMenuRef}>
                                        <button onClick={() => setShowSearchInput(true)} className="p-2 md:p-2.5 rounded-full text-muted-foreground hover:bg-muted transition-colors">
                                            <Search className="w-5 h-5" />
                                        </button>

                                        {!activeCall && (
                                            <button onClick={initiateVoiceCall} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-[13px] md:text-[14px] font-bold text-white bg-[#6B66FF] hover:bg-[#5A55E5] rounded-xl transition-all active:scale-95 shadow-sm mx-0.5 md:mx-1">
                                                <Phone className="w-4 h-4 fill-current" /> <span className="hidden sm:inline">Call</span>
                                            </button>
                                        )}

                                        <button onClick={() => setShowTopMenu(!showTopMenu)} className="p-2 md:p-2.5 rounded-full text-muted-foreground hover:bg-muted transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>

                                        {showTopMenu && (
                                            <div className="absolute top-12 right-0 w-44 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-30">
                                                <button onClick={() => handleChatAction('media')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><ImageIcon className="w-4 h-4 text-blue-500" /> Media</button>
                                                <button onClick={() => handleChatAction('docs')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><FileText className="w-4 h-4 text-amber-500" /> Docs</button>
                                                <button onClick={() => handleChatAction('links')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><LinkIcon className="w-4 h-4 text-emerald-500" /> Links</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Message Feed */}
                            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 custom-scrollbar relative bg-linear-to-b from-[#f0f2f5] to-[#e5e7eb] dark:from-[#0B0D12] dark:to-[#0F1115]">
                                <div className="relative z-10 flex flex-col space-y-4">
                                    {displayedMessages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground mt-20">
                                            <p className="text-sm font-medium bg-card/80 px-4 py-2 rounded-lg shadow-sm text-center mx-4">Send a message to start the conversation.</p>
                                        </div>
                                    ) : (
                                        displayedMessages.map((msg, idx) => {
                                            const isMe = String(msg.senderId || msg.sender) === String(currentUserId);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-200`}
                                                    onContextMenu={(e) => handleContextMenu(e, msg)}
                                                    onTouchStart={(e) => handleTouchStart(e, msg)}
                                                    onTouchEnd={handleTouchEnd}
                                                    onTouchMove={handleTouchEnd}
                                                >
                                                    <div className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] px-3 py-2 shadow-sm cursor-pointer select-none ${isMe ? 'bg-[#6B66FF] text-white rounded-2xl rounded-tr-sm shadow-[0_4px_14px_-6px_rgba(var(--primary),0.3)]' : 'bg-card dark:bg-[#1C1F26] text-foreground rounded-2xl rounded-tl-sm border border-border/50 shadow-sm'}`}>
                                                        {msg.mediaType === 'image' && msg.mediaUrl && <img src={msg.mediaUrl} alt="attachment" className="max-w-full rounded-xl mb-1 object-cover hover:opacity-90 transition-transform" style={{ maxHeight: '280px' }} />}
                                                        {msg.mediaType === 'video' && msg.mediaUrl && <video src={msg.mediaUrl} controls className="max-w-full rounded-xl mb-1" style={{ maxHeight: '280px' }} />}
                                                        {msg.mediaType === 'document' && msg.mediaUrl && (
                                                            <div className="flex items-center gap-2 bg-black/10 dark:bg-black/20 p-2 rounded-lg mb-1">
                                                                <FileCheck className="w-5 h-5 shrink-0" />
                                                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline font-medium truncate">View Document</a>
                                                            </div>
                                                        )}
                                                        {msg.text && <p className="text-[14.5px] leading-snug whitespace-pre-wrap wrap-break-word">{msg.text}</p>}

                                                        {/* Status Ticks & Timestamp */}
                                                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium uppercase ${isMe ? 'text-white/80' : 'text-muted-foreground/80'}`}>
                                                            <span>{formatTime(msg.createdAt || msg.timestamp)}</span>
                                                            {isMe && renderMessageStatus(msg)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} className="h-1" />
                                </div>
                            </div>

                            {/* Message Prompt */}
                            <div className="p-2.5 sm:p-3 bg-card dark:bg-[#13151A] border-t border-border/40 shrink-0 z-20 sticky bottom-0">
                                <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
                                    <div className="relative" ref={attachMenuRef}>
                                        <input type="file" multiple accept="image/*, video/*" className="hidden" ref={fileInputRef} onChange={(e) => handleMediaUpload(e, { compress: true, maxCount: 5, maxSizeCombinedMb: 50 })} />
                                        <input type="file" multiple accept="*" className="hidden" ref={docInputRef} onChange={(e) => handleMediaUpload(e, { compress: false, maxCount: 5, maxSizeCombinedMb: 50 })} />
                                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => handleMediaUpload(e, { compress: true, maxCount: 1, maxSizeCombinedMb: 50 })} />

                                        {showAttachMenu && (
                                            <div className="absolute bottom-12 left-0 w-48 bg-card border border-border shadow-2xl rounded-2xl p-1.5 flex flex-col gap-1 z-30 animate-in zoom-in-95 duration-200">
                                                <button type="button" onClick={() => { setShowAttachMenu(false); cameraInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center"><Camera className="w-4 h-4" /></div> Camera</button>
                                                <button type="button" onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></div> Photos & Videos</button>
                                                <button type="button" onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center"><FileCheck className="w-4 h-4" /></div> Document</button>
                                            </div>
                                        )}
                                        <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={isUploading} className="p-2.5 sm:p-3 text-muted-foreground hover:bg-muted rounded-full shrink-0 disabled:opacity-50 transition-colors">
                                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="flex-1 bg-muted/50 dark:bg-[#1A1D24] rounded-2xl flex items-center pr-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all min-w-0">
                                        <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 max-h-28 min-h-11 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 px-3 text-[14.5px] sm:text-[15px] text-foreground placeholder:text-muted-foreground/70 custom-scrollbar" rows="1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                                        <button type="submit" disabled={!newMessage.trim() && !isUploading} className={`p-2 rounded-full transition-all shrink-0 ${newMessage.trim() ? 'bg-[#6B66FF] text-white hover:bg-[#5A55E5] scale-100' : 'bg-transparent text-muted-foreground scale-95'}`}>
                                            <Send className="w-4.5 h-4.5 sm:w-5 sm:h-5" style={{ marginLeft: newMessage.trim() ? '2px' : '0' }} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Shared Content Overlay */}
                        {sharedContentView && (
                            <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
                                <div className="h-16 md:h-17.5 px-3 sm:px-5 border-b border-border/40 flex items-center gap-3 md:gap-4 shrink-0 bg-card/50">
                                    <button onClick={() => setSharedContentView(null)} className="p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-lg font-bold text-foreground capitalize flex items-center gap-2">
                                        {sharedContentView === 'media' && <><ImageIcon className="w-5 h-5 text-blue-500" /> Shared Media</>}
                                        {sharedContentView === 'docs' && <><FileText className="w-5 h-5 text-amber-500" /> Shared Documents</>}
                                        {sharedContentView === 'links' && <><LinkIcon className="w-5 h-5 text-emerald-500" /> Shared Links</>}
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                                    {/* Map content... */}
                                </div>
                            </div>
                        )}

                        {/* Profile Sidebar */}
                        <div className={`absolute right-0 top-0 h-full w-full sm:w-[320px] lg:w-87.5 bg-card border-l border-border/50 transform transition-transform duration-300 flex flex-col z-40 ${showProfileInfo ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
                            <div className="h-16 md:h-17.5 px-3 md:px-4 flex items-center gap-3 border-b border-border/40 shrink-0">
                                <button onClick={() => setShowProfileInfo(false)} className="p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
                                <h2 className="text-lg font-semibold text-foreground">Contact Info</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center pt-8 pb-4 space-y-6">
                                <div className="w-36 h-36 md:w-44 md:h-44">
                                    {activeChat.profilePicture ? <img src={activeChat.profilePicture} className="w-full h-full rounded-full object-cover shadow-lg border-2 border-background" /> : <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-5xl md:text-6xl shadow-lg border-2 border-background">{activeChat.name?.charAt(0)}</div>}
                                </div>
                                <div className="text-center px-6 w-full border-b border-border/40 pb-6">
                                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{activeChat.name}</h2>
                                    <p className="text-[15px] text-muted-foreground font-medium mt-1 truncate">{activeChat.email}</p>
                                    <p className="text-[14px] text-muted-foreground mt-0.5">{activeChat.role || 'Employee'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background dark:bg-[#0B0D12] animate-in fade-in duration-700">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-2xl scale-150"></div>
                            <div className="w-24 h-24 md:w-28 md:h-28 bg-card/80 dark:bg-[#13151A]/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-border/30 relative z-10">
                                <MessageSquare className="w-10 h-10 md:w-11 md:h-11 text-primary/60 dark:text-primary/40" />
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 border border-primary/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight z-10">Communication Hub</h2>
                        <p className="text-[14px] md:text-[15px] mt-2 md:mt-3 font-medium opacity-70 max-w-70 md:max-w-[320px] text-center z-10 leading-relaxed">
                            Select a team member from the sidebar to send direct messages, compress images, and start voice calls.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SharedChat;