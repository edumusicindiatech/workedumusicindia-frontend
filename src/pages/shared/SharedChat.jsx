import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
    Search, Phone, MoreVertical, Paperclip, Send, Download,
    ArrowLeft, Loader2, CheckCheck, Check, MessageSquare, Camera, Image as ImageIcon, X, FileCheck,
    Trash2, Link as LinkIcon, FileText, Users, Forward, PlaySquare, Lock, Copy, Ban, Trash, Info,
    Video, ChevronDown, ShieldAlert, ShieldCheck, LogOut
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import axios from "axios";

import chatBgLight from '../../assets/chat-light.jpg';
import chatBgDark from '../../assets/chat-dark.jpg';

if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { autoConnect: true });
}
const socket = window.__GLOBAL_SOCKET__;

if (!window.__GLOBAL_AUDIO__) {
    window.__GLOBAL_AUDIO__ = {
        notification: new Audio('/sounds/notification-ting.mp3'),
        sent: new Audio('/sounds/sent.mp3'),
        message: new Audio('/sounds/message.mp3'),
    };
}
const globalAudio = window.__GLOBAL_AUDIO__;
const playAudio = (type) => { try { const snd = globalAudio[type]; if (snd) { snd.currentTime = 0; snd.play().catch(e => { }); } } catch (e) { } };

const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    const safeName = file.name || `compressed_${Date.now()}.jpg`;
                    resolve(new File([blob], safeName, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', quality);
            };
        };
    });
};

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const isWithin30Mins = (timestamp) => {
    if (!timestamp) return false;
    return (Date.now() - new Date(timestamp).getTime()) <= 30 * 60 * 1000;
};

const renderTextWithLinks = (text, isMe) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline font-medium transition-opacity hover:opacity-80 wrap-break-word ${isMe ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} onClick={(e) => e.stopPropagation()}>
                    {part}
                </a>
            );
        }
        return <span key={i}>{part}</span>;
    });
};

const SharedChat = () => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const currentUserId = user?.id || user?._id;

    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [unreadMap, setUnreadMap] = useState({});

    const [sidebarWidth, setSidebarWidth] = useState(380);
    const isResizing = useRef(false);

    const [downloadedMedia, setDownloadedMedia] = useState(new Set());
    const [fullscreenMedia, setFullscreenMedia] = useState(null);

    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);
    const [slideDirection, setSlideDirection] = useState("slide-in-from-right-8");

    const [showForwardDialog, setShowForwardDialog] = useState(false);
    const [forwardSelectedUsers, setForwardSelectedUsers] = useState([]);
    const [forwardSearchQuery, setForwardSearchQuery] = useState("");

    // Group State
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
    const [createGroupName, setCreateGroupName] = useState("");
    const [createGroupSearchQuery, setCreateGroupSearchQuery] = useState("");
    const [createGroupSelectedUsers, setCreateGroupSelectedUsers] = useState([]);
    const [memberMenuOpen, setMemberMenuOpen] = useState(null);

    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isFetchingMessages, setIsFetchingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showProfileInfo, setShowProfileInfo] = useState(false);

    const [contextMenu, setContextMenu] = useState(null);
    const touchTimer = useRef(null);
    const contextMenuRef = useRef(null);

    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showTopMenu, setShowTopMenu] = useState(false);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showSidebarMenu, setShowSidebarMenu] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState("");
    const [sharedContentView, setSharedContentView] = useState(null);
    const [showClearChatModal, setShowClearChatModal] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const uploadControllers = useRef({});
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const docInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const attachMenuRef = useRef(null);
    const topMenuRef = useRef(null);
    const sidebarMenuRef = useRef(null);
    const callMenuRef = useRef(null);

    const inputRef = useRef(null);

    const [showMobileNotice, setShowMobileNotice] = useState(false);
    const mobileNoticeTimer = useRef(null);

    const isGroupChat = activeChat?.members !== undefined || activeChat?.isGroup;

    const myRoleInGroup = () => {
        if (!isGroupChat) return null;
        if (String(activeChat.creator?._id || activeChat.creator) === String(currentUserId)) return 'creator';
        if (activeChat.admins?.some(a => String(a._id || a) === String(currentUserId))) return 'admin';
        return 'member';
    };

    const activeChatRef = useRef(activeChat);
    useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current) return;
        let newWidth = e.clientX;
        if (newWidth < 280) newWidth = 280;
        if (newWidth > 500) newWidth = 500;
        setSidebarWidth(newWidth);
    }, []);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    }, [handleMouseMove]);

    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (conversations.length > 0 && !activeChat) {
            const savedChatId = sessionStorage.getItem('activeChatId');
            if (savedChatId) {
                const chatToRestore = conversations.find(c => String(c._id || c.id) === savedChatId);
                if (chatToRestore) {
                    handleSelectChat(chatToRestore);
                }
            }
        }
    }, [conversations]);

    const handleShowMobileNotice = () => {
        setShowMobileNotice(true);
        if (mobileNoticeTimer.current) clearTimeout(mobileNoticeTimer.current);
        mobileNoticeTimer.current = setTimeout(() => { setShowMobileNotice(false); }, 5000);
    };

    useEffect(() => { return () => { if (mobileNoticeTimer.current) clearTimeout(mobileNoticeTimer.current); }; }, []);

    const moveToTop = useCallback((userId) => {
        setConversations(prev => {
            const index = prev.findIndex(c => String(c._id || c.id) === String(userId));
            if (index === -1) return prev;
            if (index === 0) return [...prev];
            const updated = [...prev];
            const [chat] = updated.splice(index, 1);
            updated.unshift(chat);
            return updated;
        });
    }, []);

    useEffect(() => {
        const storedRevealed = JSON.parse(localStorage.getItem('downloadedMessages') || '[]');
        if (storedRevealed.length > 0) setDownloadedMedia(new Set(storedRevealed));
    }, []);

    useEffect(() => {
        localStorage.setItem('downloadedMessages', JSON.stringify(Array.from(downloadedMedia)));
    }, [downloadedMedia]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => { if (currentUserId) fetchConversations(); }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;

        const joinChatRoom = () => { socket.emit("join_room", currentUserId); };
        if (socket.connected) joinChatRoom();
        socket.on("connect", joinChatRoom);

        const handleReceiveMessage = (data) => {
            const currentChat = activeChatRef.current;

            const incomingChatId = data.isGroup
                ? String(data.groupId || data.recipientId)
                : String(data.senderId || (data.sender?._id || data.sender));

            const activeChatId = currentChat ? String(currentChat._id || currentChat.id) : null;
            const isActivelyChatting = activeChatId === incomingChatId;

            socket.emit("message_delivered", {
                senderId: data.senderId,
                recipientId: currentUserId
            });

            moveToTop(incomingChatId);

            if (isActivelyChatting) {
                setMessages((prev) => [...prev, data]);
                scrollToBottom();

                if (!data.isGroup) {
                    socket.emit("mark_chat_seen", { senderId: data.senderId, recipientId: currentUserId });
                }

                if (!document.hidden) playAudio('message');
            } else {
                const isMobile = window.innerWidth < 768;
                const isDeepInAnotherChat = isMobile && currentChat !== null;

                if (!document.hidden && !isDeepInAnotherChat) {
                    playAudio('notification');
                    toast.success(
                        data.isGroup ? `New message in ${data.groupName || 'Group'}` : `New message received`,
                        { icon: '💬', id: `chat-msg-${data.senderId}` }
                    );
                }

                setUnreadMap(prev => ({ ...prev, [incomingChatId]: (prev[incomingChatId] || 0) + 1 }));

                try {
                    const missed = JSON.parse(localStorage.getItem('offline_missed_chats') || '{}');
                    if (!missed[incomingChatId]) missed[incomingChatId] = [];
                    if (!missed[incomingChatId].find(m => String(m._id || m.id) === String(data._id || data.id))) {
                        missed[incomingChatId].push(data);
                        localStorage.setItem('offline_missed_chats', JSON.stringify(missed));
                    }
                } catch (e) { }
            }
        };

        // NEW: Extracted anonymous functions
        const handleAddedToGroup = (groupData) => {
            groupData.isGroup = true;
            setConversations(prev => {
                if (prev.some(c => String(c._id) === String(groupData._id))) return prev;
                return [groupData, ...prev];
            });
            toast.success(`You were added to group: ${groupData.name}`, { icon: '👥' });
            playAudio('notification');
            socket.emit('join_group_room', groupData._id);
        };

        const handleGroupUpdated = (updatedGroup) => {
            updatedGroup.isGroup = true;
            setConversations(prev => prev.map(c => String(c._id) === String(updatedGroup._id) ? updatedGroup : c));

            if (activeChatRef.current && String(activeChatRef.current._id) === String(updatedGroup._id)) {
                const amIMember = updatedGroup.members.some(m => String(m.user._id || m.user) === String(currentUserId));
                if (!amIMember) {
                    setActiveChat(null);
                    setShowProfileInfo(false);
                    toast.error(`You are no longer a participant of ${updatedGroup.name}`);
                } else {
                    setActiveChat(updatedGroup);
                }
            }
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.map(m => (m._id === messageId || m.id === messageId) ? { ...m, text: "", mediaUrl: "", isDeletedForEveryone: true } : m));
        };

        const handleMessagesStatusUpdate = ({ viewerId, status }) => {
            if (activeChatRef.current && String(activeChatRef.current._id || activeChatRef.current.id) === String(viewerId)) {
                setMessages(prev => prev.map(m => {
                    if (String(m.senderId || m.sender) === String(currentUserId)) {
                        if (status === 'seen') return { ...m, status: 'seen' };
                        if (status === 'delivered' && m.status !== 'seen') return { ...m, status: 'delivered' };
                    }
                    return m;
                }));
            }
        };

        const handleMessagesDeletedEveryone = ({ messageIds }) => {
            const strIds = messageIds.map(id => String(id));
            setMessages(prev => prev.map(m => strIds.includes(String(m._id || m.id)) ? { ...m, text: "", mediaUrl: "", isDeletedForEveryone: true } : m));
        };

        socket.on("online_users_updated", setOnlineUsers);
        socket.on("receive_message", handleReceiveMessage);
        socket.on("added_to_group", handleAddedToGroup);
        socket.on("group_updated", handleGroupUpdated);
        socket.on("message_deleted", handleMessageDeleted);
        socket.on("messages_status_update", handleMessagesStatusUpdate);
        socket.on("messages_deleted_everyone", handleMessagesDeletedEveryone);

        return () => {
            // PROPER CLEANUP
            socket.off("connect", joinChatRoom);
            socket.off("online_users_updated", setOnlineUsers);
            socket.off("receive_message", handleReceiveMessage);
            socket.off("added_to_group", handleAddedToGroup);
            socket.off("group_updated", handleGroupUpdated);
            socket.off("message_deleted", handleMessageDeleted);
            socket.off("messages_status_update", handleMessagesStatusUpdate);
            socket.off("messages_deleted_everyone", handleMessagesDeletedEveryone);
        };
    }, [currentUserId, moveToTop]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) setShowAttachMenu(false);
            if (topMenuRef.current && !topMenuRef.current.contains(event.target)) setShowTopMenu(false);
            if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target)) setShowSidebarMenu(false);
            if (callMenuRef.current && !callMenuRef.current.contains(event.target)) setShowCallMenu(false);
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) setContextMenu(null);

            if (!event.target.closest('.member-action-btn') && !event.target.closest('.member-dropdown')) {
                setMemberMenuOpen(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [contextMenu]);

    const scrollToBottom = () => { setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 150); };
    const formatTime = (timeString) => {
        if (!timeString) return '';
        const date = new Date(timeString);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    const resetContextState = () => { setContextMenu(null); setIsSelectionMode(false); setSelectedMessages([]); setNewMessage(""); setShowTopMenu(false); setShowAttachMenu(false); setShowCallMenu(false); };

    const fetchConversations = async () => {
        try {
            setIsLoadingChats(true);
            const endpoint = user.role === 'Employee' ? '/employee/peers' : '/admin/chat-contacts';

            const [peersRes, groupsRes] = await Promise.all([
                api.get(endpoint).catch(() => ({ data: { success: false, data: [] } })),
                api.get(`/group/my-groups/${currentUserId}`).catch(() => ({ data: { success: false, data: [] } }))
            ]);

            let allChats = [];

            if (peersRes.data.success) {
                const peers = peersRes.data.data.filter(p => String(p._id || p.id) !== String(currentUserId));
                allChats = [...peers];
            }

            if (groupsRes.data.success) {
                const groups = groupsRes.data.data.map(g => ({ ...g, isGroup: true }));
                allChats = [...allChats, ...groups];
                groups.forEach(g => socket.emit('join_group_room', g._id));
            }

            const missedChats = JSON.parse(localStorage.getItem('offline_missed_chats') || '{}');
            const initialUnread = {};

            allChats.forEach(p => {
                const uid = String(p._id || p.id);
                const offlineCount = missedChats[uid] ? missedChats[uid].length : 0;
                p.unreadCount = (p.unreadCount || 0) + offlineCount;
                if (p.unreadCount > 0) initialUnread[uid] = p.unreadCount;
            });

            allChats.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
            setConversations(allChats);
            setUnreadMap(initialUnread);

        } catch (error) { toast.error("Could not load contact list."); }
        finally { setIsLoadingChats(false); }
    };

    const fetchMessages = async (recipientId, isGroup = false) => {
        try {
            setIsFetchingMessages(true);
            setMessages([]);
            const endpoint = isGroup ? `/chat/history/group/${recipientId}/${currentUserId}` : `/chat/history/${currentUserId}/${recipientId}`;
            const res = await api.get(endpoint).catch(() => ({ data: { success: true, data: [] } }));

            if (res.data.success) {
                let fetchedMsgs = res.data.data || [];
                const missedChats = JSON.parse(localStorage.getItem('offline_missed_chats') || '{}');
                if (missedChats[recipientId] && missedChats[recipientId].length > 0) {
                    const existingIds = new Set(fetchedMsgs.map(m => String(m._id || m.id)));
                    const uniqueMissed = missedChats[recipientId].filter(m => !existingIds.has(String(m._id || m.id)));
                    fetchedMsgs = [...fetchedMsgs, ...uniqueMissed];
                    delete missedChats[recipientId];
                    localStorage.setItem('offline_missed_chats', JSON.stringify(missedChats));
                }

                setMessages(fetchedMsgs);
                if (!isGroup) socket.emit("mark_chat_seen", { senderId: recipientId, recipientId: currentUserId });
                setUnreadMap(prev => ({ ...prev, [recipientId]: 0 }));
            }
            setShowProfileInfo(false);
            setSharedContentView(null);
            scrollToBottom();
        } catch (error) { }
        finally { setIsFetchingMessages(false); }
    };

    const handleSelectChat = (chatUser) => {
        const userId = String(chatUser._id || chatUser.id);
        const checkIsGroup = chatUser.isGroup || chatUser.members !== undefined;
        setUnreadMap(prev => ({ ...prev, [userId]: 0 }));
        if (activeChat && String(activeChat._id || activeChat.id) === userId) return;

        setActiveChat(chatUser);
        sessionStorage.setItem('activeChatId', userId);

        fetchMessages(userId, checkIsGroup);
        resetContextState();
        setShowSearchInput(false);
        setChatSearchQuery("");
    };

    const handleSendMessage = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!newMessage.trim() || isUploading) return;

        const messageText = newMessage.trim();
        setNewMessage("");

        inputRef.current?.focus();

        const tempId = `temp-${Date.now()}`;
        const targetId = activeChat._id || activeChat.id;

        const payload = {
            _id: tempId,
            senderId: currentUserId,
            sender: { _id: currentUserId, name: user.name, profilePicture: user.profilePicture },
            recipientId: targetId,
            groupId: isGroupChat ? targetId : null,
            text: messageText,
            mediaUrl: null,
            mediaType: 'text',
            fileSize: 0,
            status: 'sent',
            isGroup: isGroupChat,
            timestamp: new Date().toISOString()
        };

        // 1. Optimistic UI: Show instantly on the sender's screen
        setMessages((prev) => [...prev, payload]);
        scrollToBottom();
        playAudio('sent');
        moveToTop(targetId);

        try {
            // 2. Await the Real ID from the database BEFORE emitting to the socket
            const res = await api.post('/chat/message', payload);

            if (res.data && res.data._id) {
                const realId = res.data._id;

                // Update local state so the sender now has the Real ID
                setMessages(prev => prev.map(m => m._id === tempId ? { ...payload, _id: realId } : m));

                // 3. Broadcast to the recipient with the Real ID
                socket.emit("send_message", { ...payload, _id: realId });
            } else {
                // Fallback just in case the API response is malformed
                socket.emit("send_message", payload);
            }
        } catch (error) {
            console.error("API Send Error:", error);
            toast.error("Message failed to send. Check connection.");
            setMessages(prev => prev.filter(m => m._id !== tempId));
        }
    };

    const handleCreateGroup = async () => {
        if (!createGroupName.trim()) return toast.error("Group name is required");
        if (createGroupSelectedUsers.length === 0) return toast.error("Select at least 1 member");
        const tid = toast.loading("Creating group...");
        try {
            const res = await api.post('/group/create', { name: createGroupName, creatorId: currentUserId, memberIds: createGroupSelectedUsers });
            if (res.data.success) {
                const newGroup = { ...res.data.data, isGroup: true };
                setConversations(prev => [newGroup, ...prev]);
                setShowCreateGroupModal(false); setCreateGroupName(""); setCreateGroupSelectedUsers([]); setActiveChat(newGroup);
                toast.success("Group created successfully!", { id: tid });
                socket.emit('join_group_room', newGroup._id);
            }
        } catch (error) { toast.error("Failed to create group", { id: tid }); }
    };

    const handleAddMembers = async () => {
        if (createGroupSelectedUsers.length === 0) return;
        const tid = toast.loading("Adding members...");
        try {
            await api.put('/group/add-members', { groupId: activeChat._id, requesterId: currentUserId, newMemberIds: createGroupSelectedUsers });
            toast.success("Members added", { id: tid });
            setShowAddMemberModal(false);
            setCreateGroupSelectedUsers([]);
        } catch (e) { toast.error("Failed to add members", { id: tid }); }
    };

    const handleGroupAction = async (action, targetUserId) => {
        setMemberMenuOpen(null);
        try {
            let endpoint = '';
            if (action === 'remove') endpoint = '/group/remove-member';
            else if (action === 'promote') endpoint = '/group/promote';
            else if (action === 'demote') endpoint = '/group/demote';

            await api.put(endpoint, { groupId: activeChat._id, requesterId: currentUserId, targetUserId });
            toast.success("Action completed successfully");
        } catch (e) { toast.error("Failed to perform action"); }
    };

    const handleLeaveGroup = async () => {
        setShowLeaveGroupModal(false);
        try {
            await api.put('/group/leave', { groupId: activeChat._id, userId: currentUserId });
            toast.success("You left the group");
            setActiveChat(null);
            setShowProfileInfo(false);
            setConversations(prev => prev.filter(c => String(c._id) !== String(activeChat._id)));
        } catch (e) { toast.error("Failed to leave group"); }
    };

    const handleMediaUpload = async (e, options = {}) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const { compress = false, maxCount = 5, maxSizeCombinedMb = 50, asDocument = false } = options;
        if (files.length > maxCount) return toast.error(`Maximum of ${maxCount} items allowed at once.`);
        const combinedSizeMb = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        if (combinedSizeMb > maxSizeCombinedMb) return toast.error(`Total size cannot exceed ${maxSizeCombinedMb}MB.`);
        setShowAttachMenu(false); setIsUploading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                let fileToUpload = files[i];
                let safeName = fileToUpload.name || `capture_${Date.now()}_${i}.jpg`;
                let mimeType = fileToUpload.type;
                if (!mimeType) {
                    if (safeName.endsWith('.jpg') || safeName.endsWith('.jpeg')) mimeType = 'image/jpeg';
                    else if (safeName.endsWith('.png')) mimeType = 'image/png';
                    else if (safeName.endsWith('.pdf')) mimeType = 'application/pdf';
                    else mimeType = 'application/octet-stream';
                }
                let type = asDocument ? 'document' : (mimeType.startsWith('image/') ? 'image' : (mimeType.startsWith('video/') ? 'video' : 'document'));
                let finalFile = fileToUpload;
                if (compress && type === 'image') {
                    finalFile = await compressImage(fileToUpload, 1200, 0.7);
                    finalFile = new File([finalFile], safeName.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
                }
                const tempId = `temp-${Date.now()}-${i}`;
                const abortController = new AbortController();
                uploadControllers.current[tempId] = abortController;
                const previewUrl = URL.createObjectURL(finalFile);

                const optimisticPayload = {
                    _id: tempId, senderId: currentUserId, sender: { _id: currentUserId, name: user.name, profilePicture: user.profilePicture },
                    recipientId: activeChat._id || activeChat.id,
                    groupId: isGroupChat ? (activeChat._id || activeChat.id) : null,
                    text: "", mediaUrl: previewUrl, mediaType: type, fileSize: finalFile.size, status: 'uploading', isGroup: isGroupChat, isUploading: true, timestamp: new Date().toISOString()
                };

                setDownloadedMedia(prev => new Set(prev).add(tempId));
                setMessages(prev => [...prev, optimisticPayload]);
                scrollToBottom(); moveToTop(activeChat._id || activeChat.id);

                try {
                    const urlRes = await api.post('/chat/generate-presigned-url', { fileType: mimeType, originalName: finalFile.name || safeName });
                    await axios.put(urlRes.data.presignedUrl, finalFile, { headers: { 'Content-Type': mimeType }, signal: abortController.signal, onUploadProgress: (p) => setUploadProgress(prev => ({ ...prev, [tempId]: Math.round((p.loaded * 100) / p.total) })) });

                    const finalPayload = { ...optimisticPayload, mediaUrl: urlRes.data.publicUrl.startsWith('http') ? urlRes.data.publicUrl : `https://${urlRes.data.publicUrl}`, status: 'sent', isUploading: false };

                    // 1. Await the Real ID from the database BEFORE emitting to the socket
                    const res = await api.post('/chat/message', finalPayload);

                    if (res.data && res.data._id) {
                        const realId = res.data._id;

                        // Update local state so the sender now has the Real ID
                        setMessages(prev => prev.map(m => m._id === tempId ? { ...finalPayload, _id: realId } : m));
                        setDownloadedMedia(prev => { const n = new Set(prev); n.delete(tempId); n.add(realId); return n; });

                        // 2. Broadcast to the recipient with the Real ID
                        socket.emit("send_message", { ...finalPayload, _id: realId });
                        playAudio('sent');
                    } else {
                        socket.emit("send_message", finalPayload);
                        playAudio('sent');
                    }

                } catch (err) {
                    if (err.name !== 'CanceledError') {
                        toast.error("Upload process failed.");
                        setMessages(prev => prev.filter(m => m._id !== tempId));
                    }
                } finally {
                    delete uploadControllers.current[tempId];
                }
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
            if (cameraInputRef.current) cameraInputRef.current.value = null;
            if (docInputRef.current) docInputRef.current.value = null;
        }
    };

    const cancelUpload = (tempId) => { if (uploadControllers.current[tempId]) uploadControllers.current[tempId].abort(); setMessages(prev => prev.filter(m => m._id !== tempId && m.id !== tempId)); };
    const handleRevealMedia = (msgId) => setDownloadedMedia(prev => new Set(prev).add(msgId));
    const downloadToLocal = async (url) => {
        const tid = toast.loading("Downloading...");
        try {
            const res = await fetch(url); const blob = await res.blob(); const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = blobUrl; a.download = url.split('/').pop().split('?')[0] || `File_${Date.now()}`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl);
            toast.success("Downloaded successfully!", { id: tid });
        } catch (error) { toast.error("Download failed.", { id: tid }); }
    };
    const handleDeleteMediaFromViewer = async (msg) => {
        if (!msg) return;
        const targetId = msg._id || msg.id;
        const localDeleted = JSON.parse(localStorage.getItem('deletedChatMessages') || '[]');
        if (!localDeleted.includes(targetId)) { localDeleted.push(targetId); localStorage.setItem('deletedChatMessages', JSON.stringify(localDeleted)); }
        setMessages(prev => prev.filter(m => (m._id || m.id) !== targetId)); toast.success("Message deleted"); setFullscreenMedia(null);
    };

    const handleBatchForward = async () => {
        const msgs = fullscreenMedia ? [fullscreenMedia] : messages.filter(m => selectedMessages.includes(m._id || m.id) && !m.isDeletedForEveryone);
        if (!msgs.length || forwardSelectedUsers.length === 0) return;
        const tid = toast.loading(`Forwarding...`);
        try {
            for (const recipientId of forwardSelectedUsers) {
                const targetConv = conversations.find(c => String(c._id || c.id) === String(recipientId));
                const isTargetGroup = targetConv?.isGroup || targetConv?.members;
                for (const msg of msgs) {
                    const payload = {
                        _id: `temp-fwd-${Date.now()}-${Math.random().toString(36).substring(7)}`, senderId: currentUserId, recipientId: recipientId, text: msg.text || "",
                        mediaUrl: msg.mediaUrl, mediaType: msg.mediaType, fileSize: msg.fileSize, status: 'sent', isGroup: isTargetGroup, timestamp: new Date().toISOString()
                    };
                    socket.emit("send_message", payload);
                    if (activeChat && (activeChat._id === recipientId || activeChat.id === recipientId)) setMessages((prev) => [...prev, payload]);
                    await api.post('/chat/message', payload);
                }
                moveToTop(recipientId);
            }
            toast.success("Forwarded successfully", { id: tid });
        } catch (error) { toast.error("Failed to forward", { id: tid }); }
        finally { setShowForwardDialog(false); setForwardSelectedUsers([]); setForwardSearchQuery(""); setFullscreenMedia(null); setIsSelectionMode(false); setSelectedMessages([]); }
    };

    const toggleSelection = (msg) => { const id = msg._id || msg.id; setSelectedMessages(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]); };
    const enterSelectionMode = (msg) => { setIsSelectionMode(true); setSelectedMessages([msg._id || msg.id]); setContextMenu(null); };
    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        if (isSelectionMode) { toggleSelection(msg); return; }
        const clientX = e.clientX || (e.touches && e.touches.length > 0 ? e.touches[0].clientX : window.innerWidth / 2);
        const clientY = e.clientY || (e.touches && e.touches.length > 0 ? e.touches[0].clientY : window.innerHeight / 2);
        setContextMenu({ mouseX: (clientX + 200 > window.innerWidth) ? (window.innerWidth - 220) : clientX, mouseY: clientY, msg });
    };
    const handleTouchStart = (e, msg) => { touchTimer.current = setTimeout(() => { handleContextMenu(e, msg); }, 600); };
    const handleTouchEnd = () => { if (touchTimer.current) clearTimeout(touchTimer.current); };

    const executeBatchDelete = async (type, overrideIds = null) => {
        setShowDeleteModal(false); const ids = overrideIds || selectedMessages; if (!ids || ids.length === 0) return;
        setIsSelectionMode(false); setSelectedMessages([]); setContextMenu(null);
        try {
            if (type === 'everyone') {
                await api.put('/chat/message/delete-everyone', { messageIds: ids, userId: currentUserId, recipientId: activeChat._id || activeChat.id });
                setMessages(prev => prev.map(m => ids.includes(m._id || m.id) ? { ...m, text: "", mediaUrl: "", isDeletedForEveryone: true } : m));
            } else {
                await api.put('/chat/message/delete-me', { messageIds: ids, userId: currentUserId });
                setMessages(prev => prev.filter(m => !ids.includes(m._id || m.id)));
            }
            toast.success(type === 'everyone' ? "Deleted for everyone" : "Deleted for you");
        } catch (e) { toast.error("Delete failed"); }
    };

    const initiateCall = (type) => { setShowCallMenu(false); if (activeChat) window.dispatchEvent(new CustomEvent('initiate_global_call', { detail: { ...activeChat, callType: type } })); };
    const handleChatAction = async (action) => { setShowTopMenu(false); setSharedContentView(action); };
    const handleClearChatClick = () => { setShowTopMenu(false); setShowClearChatModal(true); };
    const executeClearChat = async () => {
        setShowClearChatModal(false);
        try {
            const url = isGroupChat ? `/chat/clear/group/${activeChat._id || activeChat.id}/${currentUserId}` : `/chat/clear/${currentUserId}/${activeChat._id || activeChat.id}`;
            await api.put(url); setMessages([]); toast.success("Chat cleared visually.");
        } catch (err) { toast.error("Failed to clear chat"); }
    };

    const isOnline = (id) => onlineUsers.includes(id?.toString());
    const filteredConversations = conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const localDeletedIds = JSON.parse(localStorage.getItem('deletedChatMessages') || '[]');
    const visibleMessages = messages.filter(m => !localDeletedIds.includes(m._id || m.id));
    const displayedMessages = chatSearchQuery.trim() === "" ? visibleMessages : visibleMessages.filter(m => m.text && m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()));

    const renderMessageStatus = (msg) => {
        if (msg.status === 'seen') return <CheckCheck className="w-4 h-4 text-[#53bdeb] drop-shadow-sm" />;
        if (msg.status === 'delivered') return <CheckCheck className="w-4 h-4 text-white/70" />;
        return <Check className="w-4 h-4 text-white/70" />;
    };

    const getFilteredSharedContent = () => {
        if (!sharedContentView) return [];
        return visibleMessages.filter(m => {
            if (sharedContentView === 'media') return m.mediaType === 'image' || m.mediaType === 'video';
            if (sharedContentView === 'docs') return m.mediaType === 'document';
            if (sharedContentView === 'links') return m.mediaType === 'text' && m.text?.includes('http');
            return false;
        }).filter(m => m.mediaUrl || m.text && !m.isDeletedForEveryone);
    };

    const chatMediaFiles = visibleMessages.filter(m => m.mediaUrl && !m.isDeletedForEveryone && (m.mediaType === 'image' || m.mediaType === 'video' || m.mediaType === 'document'));

    const onMediaTouchStart = (e) => { setTouchEndX(null); setTouchStartX(e.targetTouches[0].clientX); };
    const onMediaTouchMove = (e) => { setTouchEndX(e.targetTouches[0].clientX); };
    const onMediaTouchEnd = () => {
        if (!touchStartX || !touchEndX || !fullscreenMedia) return;
        const dist = touchStartX - touchEndX;
        const i = chatMediaFiles.findIndex(m => String(m._id || m.id) === String(fullscreenMedia._id || fullscreenMedia.id));
        if (dist > 50 && i < chatMediaFiles.length - 1) { setSlideDirection("slide-in-from-right-16"); setFullscreenMedia(chatMediaFiles[i + 1]); }
        else if (dist < -50 && i > 0) { setSlideDirection("slide-in-from-left-16"); setFullscreenMedia(chatMediaFiles[i - 1]); }
    };

    const selectedMsgsData = visibleMessages.filter(m => selectedMessages.includes(m._id || m.id));
    const canCopy = selectedMsgsData.some(m => m.text && !m.isDeletedForEveryone);
    const canForward = selectedMsgsData.some(m => !m.isDeletedForEveryone);
    const canDeleteForEveryone = selectedMsgsData.length > 0 && selectedMsgsData.every(m => String(m.senderId || m.sender?._id || m.sender) === String(currentUserId) && !m.isDeletedForEveryone && isWithin30Mins(m.createdAt || m.timestamp));

    return (
        <>
            {/* FULLSCREEN MEDIA VIEWER */}
            {fullscreenMedia && !showForwardDialog && (
                <div className="fixed inset-0 z-999999 w-screen h-screen bg-[#0b141a] flex flex-col animate-in fade-in duration-200">
                    <div className="w-full flex items-center justify-between px-4 sm:px-6 h-16 min-h-16 shrink-0 bg-[#0b141a] z-10 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            {String(fullscreenMedia.senderId || fullscreenMedia.sender?._id || fullscreenMedia.sender) === String(currentUserId) ? (
                                user?.profilePicture ? (
                                    <img src={user.profilePicture} alt="You" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{user?.name?.charAt(0)}</div>
                                )
                            ) : (
                                fullscreenMedia.sender?.profilePicture || activeChat?.profilePicture ? (
                                    <img src={fullscreenMedia.sender?.profilePicture || activeChat.profilePicture} alt="Sender" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {(fullscreenMedia.sender?.name || activeChat?.name || 'U').charAt(0)}
                                    </div>
                                )
                            )}
                            <div className="text-white flex flex-col justify-center">
                                <span className="font-medium text-[15px] leading-tight">
                                    {String(fullscreenMedia.senderId || fullscreenMedia.sender?._id || fullscreenMedia.sender) === String(currentUserId) ? "You" : (fullscreenMedia.sender?.name || activeChat?.name)}
                                </span>
                                <span className="text-xs text-white/60 mt-0.5">{formatTime(fullscreenMedia.timestamp || fullscreenMedia.createdAt)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 text-[#AEBAC1]">
                            <button onClick={() => handleDeleteMediaFromViewer(fullscreenMedia)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title="Delete for me"><Trash2 className="w-5 h-5 sm:w-5 sm:h-5" /></button>
                            <button onClick={() => setShowForwardDialog(true)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title="Forward"><Forward className="w-5 h-5 sm:w-5 sm:h-5" /></button>
                            <button onClick={() => downloadToLocal(fullscreenMedia.mediaUrl, fullscreenMedia.mediaType)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title="Download"><Download className="w-5 h-5 sm:w-5 sm:h-5" /></button>
                            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                            <button onClick={() => setFullscreenMedia(null)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title="Close"><X className="w-6 h-6 sm:w-6 sm:h-6 text-white" /></button>
                        </div>
                    </div>

                    <div
                        className="flex-1 w-full flex items-center justify-center overflow-hidden p-4 sm:p-8 select-none relative"
                        onTouchStart={onMediaTouchStart}
                        onTouchMove={onMediaTouchMove}
                        onTouchEnd={onMediaTouchEnd}
                    >
                        <div key={fullscreenMedia._id || fullscreenMedia.id} className={`w-full h-full flex items-center justify-center animate-in fade-in ${slideDirection} duration-300`}>
                            {fullscreenMedia.mediaType === 'image' && <img src={fullscreenMedia.mediaUrl} alt="Fullscreen Preview" className="w-auto h-auto max-w-full max-h-full object-contain shadow-2xl" />}
                            {fullscreenMedia.mediaType === 'video' && <video src={fullscreenMedia.mediaUrl} controls autoPlay className="w-auto h-auto max-w-full max-h-full object-contain shadow-2xl" />}
                            {fullscreenMedia.mediaType === 'document' && (
                                <div className="w-full h-full max-w-4xl bg-[#EBEBEB] dark:bg-card rounded-xl overflow-hidden shadow-2xl flex flex-col">
                                    <div className="bg-muted p-4 flex items-center gap-4 shrink-0 border-b border-border">
                                        <FileText className="w-8 h-8 text-blue-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">{fullscreenMedia.mediaUrl.split('/').pop().split('?')[0]}</p>
                                            <p className="text-xs text-muted-foreground">Document Preview</p>
                                        </div>
                                    </div>
                                    {fullscreenMedia.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)(?:\?.*)?$/i) ? (
                                        <div className="flex-1 w-full h-full bg-black/5 dark:bg-black/20 flex items-center justify-center p-4 overflow-hidden">
                                            <img src={fullscreenMedia.mediaUrl} alt="Document Preview" className="max-w-full max-h-full object-contain drop-shadow-md rounded-md" />
                                        </div>
                                    ) : (
                                        <iframe src={fullscreenMedia.mediaUrl} className="flex-1 w-full h-full border-none bg-white" title="Document Viewer" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {chatMediaFiles.length > 0 && (
                        <div className="h-20 w-full shrink-0 border-t border-white/10 flex items-center justify-center px-4 gap-2 overflow-x-auto custom-scrollbar bg-[#0b141a]">
                            {chatMediaFiles.map((mediaMsg) => {
                                const isSelected = String(fullscreenMedia._id || fullscreenMedia.id) === String(mediaMsg._id || mediaMsg.id);
                                return (
                                    <div
                                        key={mediaMsg._id || mediaMsg.id}
                                        onClick={() => setFullscreenMedia(mediaMsg)}
                                        className={`w-12 h-12 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 ${isSelected ? 'border-white scale-110 opacity-100 z-10' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    >
                                        {mediaMsg.mediaType === 'image' ? <img src={mediaMsg.mediaUrl} className="w-full h-full object-cover" alt="thumb" /> : mediaMsg.mediaType === 'video' ? <div className="w-full h-full bg-white/10 flex items-center justify-center"><PlaySquare className="w-6 h-6 text-white" /></div> : <div className="w-full h-full bg-white/10 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* FORWARD DIALOG BOX */}
            {showForwardDialog && (
                <div className="fixed inset-0 z-1000000 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-sm md:max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[75vh]">
                        <div className="p-4 md:p-5 border-b border-border/50 bg-muted/20">
                            <h3 className="text-lg font-bold text-foreground mb-4">Forward message</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input type="text" placeholder="Search chats..." value={forwardSearchQuery} onChange={(e) => setForwardSearchQuery(e.target.value)} className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" autoFocus />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {conversations.filter(c => c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(user => {
                                const isSelected = forwardSelectedUsers.includes(user._id || user.id);
                                return (
                                    <label key={user._id || user.id} className={`flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'}`}>
                                        <div className="relative flex items-center justify-center">
                                            <input type="checkbox" checked={isSelected} onChange={(e) => { const id = user._id || user.id; if (e.target.checked) setForwardSelectedUsers(prev => [...prev, id]); else setForwardSelectedUsers(prev => prev.filter(userId => userId !== id)); }} className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                                        </div>
                                        <div className="shrink-0">
                                            {user.profilePicture || user.groupIcon ? <img src={user.profilePicture || user.groupIcon} alt={user.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-bold">{user.isGroup || user.members ? <Users className="w-5 h-5" /> : user.name?.charAt(0)}</div>}
                                        </div>
                                        <div className="flex-1 min-w-0"><span className="font-semibold text-[15px] text-foreground truncate block">{user.name}</span></div>
                                    </label>
                                );
                            })}
                            {conversations.filter(c => c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && <p className="text-center text-muted-foreground p-6 text-sm font-medium">No chats found</p>}
                        </div>

                        <div className="p-4 md:p-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
                            <span className="text-sm font-medium text-muted-foreground">{forwardSelectedUsers.length > 0 ? `${forwardSelectedUsers.length} selected` : 'Select chats'}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setShowForwardDialog(false); setForwardSelectedUsers([]); setForwardSearchQuery(""); }} className="px-4 py-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                                {forwardSelectedUsers.length > 0 && <button onClick={handleBatchForward} className="w-11 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg animate-in zoom-in-95 duration-200"><Send className="w-5 h-5 ml-0.5" /></button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE GROUP MODAL */}
            {showCreateGroupModal && (
                <div className="fixed inset-0 z-1000000 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-sm md:max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[75vh]">
                        <div className="p-4 md:p-5 border-b border-border/50 bg-muted/20">
                            <h3 className="text-lg font-bold text-foreground mb-4">Create New Group</h3>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="Group Name"
                                    value={createGroupName}
                                    onChange={(e) => setCreateGroupName(e.target.value)}
                                    className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                />
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input type="text" placeholder="Search contacts..." value={createGroupSearchQuery} onChange={(e) => setCreateGroupSearchQuery(e.target.value)} className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <div className="px-3 pt-2 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Members</div>
                            {conversations.filter(c => !c.isGroup && !c.members && c.name.toLowerCase().includes(createGroupSearchQuery.toLowerCase())).map(user => {
                                const isSelected = createGroupSelectedUsers.includes(user._id || user.id);
                                return (
                                    <label key={user._id || user.id} className={`flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'}`}>
                                        <div className="relative flex items-center justify-center">
                                            <input type="checkbox" checked={isSelected} onChange={(e) => { const id = user._id || user.id; if (e.target.checked) setCreateGroupSelectedUsers(prev => [...prev, id]); else setCreateGroupSelectedUsers(prev => prev.filter(userId => userId !== id)); }} className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                                        </div>
                                        <div className="shrink-0">
                                            {user.profilePicture ? <img src={user.profilePicture} alt={user.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{user.name?.charAt(0)}</div>}
                                        </div>
                                        <div className="flex-1 min-w-0"><span className="font-semibold text-[15px] text-foreground truncate block">{user.name}</span></div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="p-4 md:p-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
                            <span className="text-sm font-medium text-muted-foreground">{createGroupSelectedUsers.length} selected</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setShowCreateGroupModal(false); setCreateGroupSelectedUsers([]); setCreateGroupName(""); setCreateGroupSearchQuery(""); }} className="px-4 py-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleCreateGroup} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-2">
                                    Create <ArrowLeft className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD MEMBER MODAL (For existing groups) */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-1000000 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-sm md:max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[75vh]">
                        <div className="p-4 md:p-5 border-b border-border/50 bg-muted/20">
                            <h3 className="text-lg font-bold text-foreground mb-4">Add Members to {activeChat?.name}</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input type="text" placeholder="Search contacts..." value={createGroupSearchQuery} onChange={(e) => setCreateGroupSearchQuery(e.target.value)} className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" autoFocus />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {conversations.filter(c => {
                                if (c.isGroup || c.members) return false;
                                const isAlreadyMember = activeChat?.members?.some(m => String(m.user._id || m.user) === String(c._id || c.id));
                                return !isAlreadyMember && c.name.toLowerCase().includes(createGroupSearchQuery.toLowerCase());
                            }).map(u => {
                                const isSelected = createGroupSelectedUsers.includes(u._id || u.id);
                                return (
                                    <label key={u._id || u.id} className={`flex items-center gap-3.5 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'}`}>
                                        <div className="relative flex items-center justify-center">
                                            <input type="checkbox" checked={isSelected} onChange={(e) => { const id = u._id || u.id; if (e.target.checked) setCreateGroupSelectedUsers(prev => [...prev, id]); else setCreateGroupSelectedUsers(prev => prev.filter(userId => userId !== id)); }} className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                                        </div>
                                        <div className="shrink-0">
                                            {u.profilePicture ? <img src={u.profilePicture} alt={u.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{u.name?.charAt(0)}</div>}
                                        </div>
                                        <div className="flex-1 min-w-0"><span className="font-semibold text-[15px] text-foreground truncate block">{u.name}</span></div>
                                    </label>
                                );
                            })}
                            {conversations.filter(c => !c.isGroup && !c.members && !activeChat?.members?.some(m => String(m.user._id || m.user) === String(c._id || c.id)) && c.name.toLowerCase().includes(createGroupSearchQuery.toLowerCase())).length === 0 && <p className="text-center text-muted-foreground p-6 text-sm font-medium">No available contacts</p>}
                        </div>

                        <div className="p-4 md:p-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
                            <span className="text-sm font-medium text-muted-foreground">{createGroupSelectedUsers.length} selected</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setShowAddMemberModal(false); setCreateGroupSelectedUsers([]); setCreateGroupSearchQuery(""); }} className="px-4 py-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                                {createGroupSelectedUsers.length > 0 && <button onClick={handleAddMembers} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-2">Add</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-10000 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-5 flex flex-col gap-2 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-foreground mb-2">Delete {selectedMessages.length} Message{selectedMessages.length > 1 ? 's' : ''}?</h3>
                        {canDeleteForEveryone && (
                            <button onClick={() => executeBatchDelete('everyone')} className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-medium text-rose-500">Delete for everyone</button>
                        )}
                        <button onClick={() => executeBatchDelete('me')} className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-medium text-foreground">Delete for me</button>
                        <button onClick={() => setShowDeleteModal(false)} className="w-full text-center px-4 py-3 mt-2 font-medium text-muted-foreground hover:bg-muted/50 rounded-xl">Cancel</button>
                    </div>
                </div>
            )}

            {/* CUSTOM CLEAR CHAT MODAL */}
            {showClearChatModal && (
                <div className="fixed inset-0 z-1000000 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-card dark:bg-[#1f2c33] w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 border border-border/50">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-2">
                            <Trash className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-foreground mb-1">Clear this chat?</h3>
                            <p className="text-sm text-muted-foreground">Messages will be removed from your view. This cannot be undone.</p>
                        </div>
                        <div className="flex gap-3 w-full mt-4">
                            <button onClick={() => setShowClearChatModal(false)} className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors">Cancel</button>
                            <button onClick={executeClearChat} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors">Clear chat</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM LEAVE GROUP MODAL */}
            {showLeaveGroupModal && (
                <div className="fixed inset-0 z-1000000 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-card dark:bg-[#1f2c33] w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 border border-border/50">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-2">
                            <LogOut className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-foreground mb-1">Leave {activeChat?.name}?</h3>
                            <p className="text-sm text-muted-foreground">You will no longer receive messages from this group.</p>
                        </div>
                        <div className="flex gap-3 w-full mt-4">
                            <button onClick={() => setShowLeaveGroupModal(false)} className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleLeaveGroup} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors">Leave</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed top-16 inset-x-0 bottom-16 xl:bottom-0 z-30 flex bg-background dark:bg-[#0B0D12] overflow-hidden animate-in fade-in duration-300">

                {/* DELETE CONTEXT MENU */}
                {contextMenu && (
                    <div ref={contextMenuRef} className="fixed z-50 bg-card border border-border shadow-2xl rounded-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-150" style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}>
                        <button onClick={() => executeBatchDelete('me', [contextMenu.msg._id || contextMenu.msg.id])} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm font-medium text-foreground transition-colors"><Trash2 className="w-4 h-4 text-muted-foreground" /> Delete for me</button>
                        {String(contextMenu.msg.senderId || contextMenu.msg.sender?._id || contextMenu.msg.sender) === String(currentUserId) && !contextMenu.msg.isDeletedForEveryone && isWithin30Mins(contextMenu.msg.createdAt || contextMenu.msg.timestamp) && (
                            <>
                                <button onClick={() => executeBatchDelete('everyone', [contextMenu.msg._id || contextMenu.msg.id])} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-500/10 text-sm font-medium text-rose-500 transition-colors"><Ban className="w-4 h-4" /> Delete for everyone</button>
                            </>
                        )}
                        <button onClick={() => enterSelectionMode(contextMenu.msg)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm font-medium"><Check className="w-4 h-4 text-muted-foreground" /> Select</button>
                    </div>
                )}

                {/* LEFT SIDEBAR (Contacts) */}
                <div
                    className={`relative flex-col h-full bg-card dark:bg-[#11131A] border-r border-border/40 z-20 transition-all duration-300 ease-in-out ${activeChat ? 'hidden md:flex' : 'flex w-full animate-in slide-in-from-left-4 md:animate-none'}`}
                    style={{ width: (activeChat || window.innerWidth >= 768) ? `${sidebarWidth}px` : '100%', minWidth: (activeChat || window.innerWidth >= 768) ? '280px' : '100%', maxWidth: (activeChat || window.innerWidth >= 768) ? '500px' : '100%' }}
                >
                    <div onMouseDown={handleMouseDown} className="absolute top-0 -right-0.75 w-1.5 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary z-50 hidden md:block transition-colors" />

                    <div className="p-4 sm:p-5 shrink-0 space-y-4 bg-card dark:bg-[#11131A]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black tracking-tight text-foreground">Messages</h2>
                            <div className="relative" ref={sidebarMenuRef}>
                                <button onClick={() => setShowSidebarMenu(!showSidebarMenu)} className="p-2 rounded-full text-muted-foreground hover:bg-muted"><MoreVertical className="w-5 h-5" /></button>
                                {showSidebarMenu && (
                                    <div className="absolute top-10 right-0 w-48 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-30">
                                        <button onClick={() => { setShowSidebarMenu(false); setShowCreateGroupModal(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><Users className="w-4 h-4" /> New group</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search chats..." className="w-full bg-muted/40 dark:bg-[#1A1D24] border-none text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-0.5">
                        {isLoadingChats ? (
                            <div className="space-y-3 p-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl animate-pulse bg-transparent">
                                        <div className="w-12 h-12 rounded-full bg-muted/60 dark:bg-white/5 shrink-0"></div>
                                        <div className="flex-1 space-y-2.5">
                                            <div className="h-3.5 bg-muted/60 dark:bg-white/5 rounded-md w-3/4"></div>
                                            <div className="h-2.5 bg-muted/60 dark:bg-white/5 rounded-md w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex justify-center p-8 text-center text-sm font-medium text-muted-foreground">No chats found.</div>
                        ) : (
                            filteredConversations.map((chatUser) => {
                                const userId = String(chatUser._id || chatUser.id);
                                const isActive = activeChat && String(activeChat._id || activeChat.id) === userId;
                                const unreadCount = unreadMap[userId] || 0;
                                const isGroup = chatUser.isGroup || chatUser.members !== undefined;

                                return (
                                    <div key={userId} onClick={() => handleSelectChat(chatUser)} className={`flex items-center gap-3.5 p-3 cursor-pointer rounded-xl transition-all duration-200 ${isActive ? 'bg-muted dark:bg-[#1A1D24]' : 'hover:bg-muted/50 dark:hover:bg-[#16181F]'}`}>
                                        <div className="relative shrink-0">
                                            {chatUser.profilePicture || chatUser.groupIcon ? (
                                                <img src={chatUser.profilePicture || chatUser.groupIcon} alt={chatUser.name} className="w-12 h-12 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-base">
                                                    {isGroup ? <Users className="w-5 h-5" /> : (chatUser.name?.charAt(0) || 'U')}
                                                </div>
                                            )}
                                            {isOnline(userId) && !isGroup && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full"></span>}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h3 className={`text-[15px] font-semibold truncate ${unreadCount > 0 ? 'text-foreground' : (isActive ? 'text-foreground' : 'text-foreground/90')}`}>{chatUser.name}</h3>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-[13px] truncate font-medium ${unreadCount > 0 ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                                                    {isGroup ? `${chatUser.members?.length || 0} members` : (chatUser.role || 'Employee')}
                                                </p>
                                                {unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2 animate-in zoom-in duration-200 shadow-sm">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* MAIN CONVERSATION WINDOW */}
                <div className={`flex-1 flex flex-col h-full w-full max-w-full relative overflow-hidden transition-all duration-300 ${!activeChat ? 'hidden md:flex' : 'flex animate-in slide-in-from-right-4 md:animate-none'}`}>
                    {activeChat ? (
                        <div className="flex-1 flex w-full max-w-full h-full relative bg-[#EBEBEB] dark:bg-[#0B0D12] overflow-hidden">

                            {/* CHAT BACKGROUND IMAGES */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-30">
                                <img src={chatBgLight} alt="" className="w-full h-full object-cover dark:hidden" />
                                <img src={chatBgDark} alt="" className="w-full h-full object-cover hidden dark:block" />
                            </div>

                            <div className="flex-1 flex flex-col w-full h-full relative z-10 transition-all duration-300 overflow-hidden">

                                {/* TOP BAR */}
                                {isSelectionMode ? (
                                    <div className="h-14 sm:h-16 md:h-17.5 px-2 sm:px-4 bg-primary/10 flex items-center justify-between shrink-0 z-20 border-b border-border/40 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm w-full">
                                        <div className="flex items-center gap-2 sm:gap-4 text-foreground">
                                            <button onClick={resetContextState} className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                                            <span className="font-semibold text-base sm:text-lg">{selectedMessages.length} selected</span>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            {canCopy && <button onClick={() => { navigator.clipboard.writeText(selectedMsgsData.map(m => m.text).join('\n')); resetContextState(); toast.success('Copied'); }} className="p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" title="Copy"><Copy className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                                            {canForward && <button onClick={() => setShowForwardDialog(true)} className="p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" title="Forward"><Forward className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                                            <button onClick={() => setShowDeleteModal(true)} className="p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full" title="Delete"><Trash className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" /></button>
                                        </div>
                                    </div>
                                ) : showSearchInput ? (
                                    <div className="h-14 sm:h-16 md:h-17.5 px-1 sm:px-4 bg-card dark:bg-[#13151A] border-b border-border/40 flex items-center gap-1 sm:gap-2 shrink-0 z-20 sticky top-0 animate-in fade-in duration-200 w-full">
                                        <button onClick={() => { setShowSearchInput(false); setChatSearchQuery(""); }} className="p-2 sm:p-3 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0"><ArrowLeft className="w-5 h-5" /></button>
                                        <input autoFocus type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[14px] sm:text-[15px] text-foreground placeholder:text-muted-foreground min-w-0" />
                                        {chatSearchQuery && <button onClick={() => setChatSearchQuery("")} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                                    </div>
                                ) : (
                                    <div className="h-14 sm:h-16 md:h-17.5 px-1.5 sm:px-5 bg-card dark:bg-[#13151A] border-b border-border/40 flex items-center justify-between shrink-0 z-20 sticky top-0 w-full">
                                        <div className="flex items-center flex-1 gap-1.5 sm:gap-3 min-w-0 cursor-pointer pr-2" onClick={() => setShowProfileInfo(true)}>
                                            <button onClick={(e) => { e.stopPropagation(); setActiveChat(null); sessionStorage.removeItem('activeChatId'); }} className="md:hidden p-1.5 text-muted-foreground hover:bg-muted rounded-full shrink-0">
                                                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </button>
                                            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 shrink-0 rounded-full overflow-hidden">
                                                {activeChat.profilePicture || activeChat.groupIcon ? (
                                                    <img src={activeChat.profilePicture || activeChat.groupIcon} alt={activeChat.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                        {isGroupChat ? <Users className="w-5 h-5" /> : activeChat.name?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="leading-tight flex-1 min-w-0 flex flex-col justify-center">
                                                <h3 className="text-[14px] sm:text-[15px] md:text-[16px] font-bold text-foreground truncate tracking-wide">{activeChat.name}</h3>
                                                <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
                                                    {!isGroupChat && <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 ${isOnline(activeChat._id || activeChat.id) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>}
                                                    <p className="text-[11px] md:text-[12px] text-muted-foreground font-medium truncate">
                                                        {isGroupChat ? 'Group Chat' : (isOnline(activeChat._id || activeChat.id) ? 'Online' : 'Offline')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end shrink-0 gap-0.5 sm:gap-1 relative" ref={topMenuRef}>
                                            <button onClick={() => setShowSearchInput(true)} className="p-2 sm:p-2.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"><Search className="w-5 h-5 sm:w-5 sm:h-5" /></button>

                                            {!isGroupChat && (
                                                <div className="relative" ref={callMenuRef}>
                                                    <button onClick={() => setShowCallMenu(!showCallMenu)} className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[13px] sm:text-[14px] font-bold text-white bg-[#6B66FF] hover:bg-[#5A55E5] rounded-xl transition-all active:scale-95 shadow-sm">
                                                        <Video className="w-4 h-4 fill-current shrink-0" />
                                                        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                                    </button>
                                                    {showCallMenu && (
                                                        <div className="absolute top-12 right-0 w-40 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-50">
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); initiateCall('video'); }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors cursor-pointer"
                                                            >
                                                                <Video className="w-4 h-4" /> Video call
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); initiateCall('voice'); }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors cursor-pointer"
                                                            >
                                                                <Phone className="w-4 h-4" /> Voice call
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button onClick={(e) => { e.stopPropagation(); setShowTopMenu(!showTopMenu); }} className="p-2 sm:p-2.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"><MoreVertical className="w-5 h-5 sm:w-5 sm:h-5" /></button>

                                            {showTopMenu && (
                                                <div className="absolute top-12 right-0 w-44 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-30" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleChatAction('media')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><ImageIcon className="w-4 h-4 text-blue-500" /> Media</button>
                                                    <button onClick={() => handleChatAction('docs')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><FileText className="w-4 h-4 text-amber-500" /> Docs</button>
                                                    <button onClick={() => handleChatAction('links')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><LinkIcon className="w-4 h-4 text-emerald-500" /> Links</button>

                                                    <button onClick={handleClearChatClick} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-500/10 rounded-lg text-sm font-medium text-rose-500"><Trash className="w-4 h-4" /> Clear chat</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 7-DAY WARNING BANNER */}
                                <div className={`w-full flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0 relative z-10 transition-all duration-300 md:bg-amber-500/10 md:dark:bg-amber-500/5 md:border-b md:border-amber-500/20 md:backdrop-blur-md md:shadow-sm ${showMobileNotice ? 'bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 backdrop-blur-md shadow-sm py-1.5' : 'bg-transparent py-1'}`}>

                                    <div className="hidden md:flex items-center gap-2.5 py-1 px-4">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                        <span className="text-[12px] font-semibold tracking-wide">These messages will be automatically deleted after 7 days for privacy.</span>
                                    </div>

                                    <div className="flex md:hidden w-full items-center justify-center transition-all duration-300" style={{ height: '28px' }}>
                                        {showMobileNotice ? (
                                            <div className="flex items-center gap-2 px-3 animate-in fade-in zoom-in-95 duration-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                                <span className="text-[11px] leading-tight font-semibold text-center">Messages auto-delete after 7 days.</span>
                                            </div>
                                        ) : (
                                            <button onClick={handleShowMobileNotice} className="flex items-center gap-1.5 px-3 py-1 bg-background/80 dark:bg-[#13151A]/80 backdrop-blur-md rounded-full shadow-sm border border-border/50 text-muted-foreground hover:text-foreground transition-all animate-in fade-in zoom-in duration-300">
                                                <Info className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Privacy</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Message Feed */}
                                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-6 custom-scrollbar relative w-full">
                                    <div className="relative z-10 flex flex-col space-y-4 pb-2">
                                        {isFetchingMessages ? (
                                            <div className="flex flex-col gap-4 p-4 w-full h-full justify-end opacity-70">
                                                <div className="self-start w-3/4 sm:w-1/2 bg-muted/60 dark:bg-white/5 h-16 rounded-2xl rounded-tl-sm animate-pulse"></div>
                                                <div className="self-end w-2/3 sm:w-1/2 bg-primary/20 h-12 rounded-2xl rounded-tr-sm animate-pulse"></div>
                                                <div className="self-start w-1/2 sm:w-1/3 bg-muted/60 dark:bg-white/5 h-20 rounded-2xl rounded-tl-sm animate-pulse"></div>
                                                <div className="self-end w-3/4 sm:w-2/3 bg-primary/20 h-24 rounded-2xl rounded-tr-sm animate-pulse"></div>
                                                <div className="self-start w-2/3 sm:w-1/2 bg-muted/60 dark:bg-white/5 h-12 rounded-2xl rounded-tl-sm animate-pulse"></div>
                                            </div>
                                        ) : displayedMessages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 m-auto mt-10">
                                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-primary/20 backdrop-blur-sm">
                                                    <MessageSquare className="w-10 h-10 text-primary" />
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">Say Hello to {activeChat.name.split(' ')[0]}!</h3>
                                                <p className="text-muted-foreground text-[14px] sm:text-[15px] max-w-70 sm:max-w-sm mb-8 leading-relaxed">
                                                    Send messages, share photos, or start a secure {isGroupChat ? 'group chat' : 'voice call'}.
                                                </p>
                                                <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[12px] px-4 py-2.5 rounded-xl flex flex-col sm:flex-row items-center gap-2.5 max-w-sm border border-amber-500/20 shadow-sm backdrop-blur-md mx-auto">
                                                    <Lock className="w-4 h-4 shrink-0" />
                                                    <span className="text-center sm:text-left leading-tight">Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.</span>
                                                </div>
                                            </div>
                                        ) : (
                                            displayedMessages.map((msg, idx) => {
                                                const isMe = String(msg.senderId || msg.sender?._id || msg.sender) === String(currentUserId);
                                                const isMediaRevealed = downloadedMedia.has(msg._id);
                                                const isSelected = selectedMessages.includes(msg._id || msg.id);

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center w-full py-1.5 transition-colors ${isSelected ? 'bg-primary/20 backdrop-blur-xs' : 'hover:bg-black/5 dark:hover:bg-white/5'} cursor-pointer group`}
                                                        onContextMenu={(e) => handleContextMenu(e, msg)}
                                                        onClick={() => {
                                                            if (isSelectionMode) toggleSelection(msg);
                                                        }}
                                                        onTouchStart={(e) => handleTouchStart(e, msg)}
                                                        onTouchEnd={handleTouchEnd}
                                                        onTouchMove={handleTouchEnd}
                                                    >
                                                        {isSelectionMode && (
                                                            <div className="pl-4 pr-2 shrink-0 animate-in slide-in-from-left-2">
                                                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground bg-background/50'}`}>
                                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className={`flex flex-col flex-1 px-2 sm:px-6 pointer-events-auto ${isMe ? 'items-end' : 'items-start'}`}>

                                                            {/* GROUP SENDER NAME */}
                                                            {isGroupChat && !isMe && !msg.isDeletedForEveryone && (
                                                                <span className="text-[10.5px] text-[#6B66FF] font-bold mb-0.5 ml-1 drop-shadow-sm tracking-wide">
                                                                    {msg.sender?.name || "Member"}
                                                                </span>
                                                            )}

                                                            <div className={`relative max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] px-3 py-2 shadow-sm select-none overflow-hidden ${isMe ? 'bg-[#6B66FF] text-white rounded-2xl rounded-tr-sm shadow-[0_4px_14px_-6px_rgba(var(--primary),0.3)]' : 'bg-card dark:bg-[#1C1F26] text-foreground rounded-2xl rounded-tl-sm border border-border/50 shadow-sm'}`}>

                                                                {msg.isDeletedForEveryone ? (
                                                                    <div className={`flex items-center gap-2 italic text-[14.5px] py-1 ${isMe ? 'text-white/80' : 'text-muted-foreground/80'}`}>
                                                                        <Ban className="w-4 h-4" /> This message was deleted
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video') && (
                                                                            !isMediaRevealed ? (
                                                                                <div
                                                                                    onClick={(e) => { e.stopPropagation(); handleRevealMedia(msg._id); }}
                                                                                    className="relative w-48 h-48 sm:w-64 sm:h-64 bg-[#2A2E35] rounded-xl flex flex-col items-center justify-center cursor-pointer mb-1 border border-white/10 hover:bg-[#31363F] transition-colors"
                                                                                >
                                                                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md mb-2 hover:scale-105 transition-transform border border-white/20">
                                                                                        <Download className="w-6 h-6 text-white" />
                                                                                    </div>
                                                                                    <span className="text-white/80 text-xs font-semibold">{formatBytes(msg.fileSize || 0)}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="relative mb-1 cursor-pointer group/media max-w-full" onClick={(e) => { if (!msg.isUploading) { e.stopPropagation(); setFullscreenMedia(msg); } }}>
                                                                                    {msg.isUploading && (
                                                                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-sm">
                                                                                            <div className="relative flex items-center justify-center w-12 h-12 bg-black/40 rounded-full">
                                                                                                <svg className="w-12 h-12 absolute transform -rotate-90">
                                                                                                    <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                                                                                                    <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none"
                                                                                                        strokeDasharray="125.6"
                                                                                                        strokeDashoffset={125.6 - (125.6 * (uploadProgress[msg._id] || 0)) / 100}
                                                                                                        className="transition-all duration-200 ease-out"
                                                                                                    />
                                                                                                </svg>
                                                                                                <button onClick={(e) => { e.stopPropagation(); cancelUpload(msg._id); }} className="w-8 h-8 rounded-full flex items-center justify-center text-white z-30 hover:bg-black/40 transition-colors">
                                                                                                    <X className="w-5 h-5" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    {msg.mediaType === 'image' && (
                                                                                        <img
                                                                                            src={msg.mediaUrl}
                                                                                            alt="Image attachment"
                                                                                            className={`w-48 sm:w-64 h-auto max-h-64 rounded-xl object-cover transition-opacity bg-black/20 ${msg.isUploading ? 'blur-sm' : 'group-hover/media:opacity-90'}`}
                                                                                            onError={(e) => {
                                                                                                e.target.src = "https://placehold.co/400x300/13151A/FFF?text=Image+Unavailable";
                                                                                            }}
                                                                                        />
                                                                                    )}
                                                                                    {msg.mediaType === 'video' && (
                                                                                        <div className="relative w-48 sm:w-64 max-w-full">
                                                                                            <video src={msg.mediaUrl} className={`w-full h-auto max-h-64 rounded-xl object-cover ${msg.isUploading ? 'blur-sm' : ''}`} />
                                                                                            {!msg.isUploading && (
                                                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl group-hover/media:bg-black/30 transition-colors">
                                                                                                    <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40"><PlaySquare className="w-6 h-6 text-white fill-white/80" /></div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        )}

                                                                        {msg.mediaType === 'document' && msg.mediaUrl && (
                                                                            <div
                                                                                onClick={(e) => { if (!msg.isUploading) { e.stopPropagation(); setFullscreenMedia(msg); } }}
                                                                                className="relative flex items-center gap-3 bg-black/10 dark:bg-white/5 p-3 rounded-lg mb-1.5 border border-white/5 cursor-pointer hover:bg-black/20 dark:hover:bg-white/10 transition-colors w-60 sm:w-72 max-w-full overflow-hidden"
                                                                            >
                                                                                {msg.isUploading && (
                                                                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
                                                                                        <div className="relative flex items-center justify-center w-10 h-10 bg-black/40 rounded-full">
                                                                                            <svg className="w-10 h-10 absolute transform -rotate-90">
                                                                                                <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" fill="none" />
                                                                                                <circle cx="20" cy="20" r="16" stroke="white" strokeWidth="2.5" fill="none"
                                                                                                    strokeDasharray="100.5"
                                                                                                    strokeDashoffset={100.5 - (100.5 * (uploadProgress[msg._id] || 0)) / 100}
                                                                                                    className="transition-all duration-200 ease-out"
                                                                                                />
                                                                                            </svg>
                                                                                            <button onClick={(e) => { e.stopPropagation(); cancelUpload(msg._id); }} className="w-6 h-6 rounded-full flex items-center justify-center text-white z-30 hover:bg-black/40 transition-colors">
                                                                                                <X className="w-4 h-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                    <FileCheck className="w-5 h-5 text-blue-500" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span className="text-[13.5px] font-semibold truncate block">{msg.mediaUrl.split('/').pop().split('?')[0] || "Document File"}</span>
                                                                                    <p className="text-[11px] opacity-70 mt-0.5">{formatBytes(msg.fileSize || 0)} • {msg.mediaUrl.split('.').pop().split('?')[0].toUpperCase()}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {msg.text && (
                                                                            <p className="text-[14px] sm:text-[14.5px] leading-snug whitespace-pre-wrap wrap-break-word w-full">
                                                                                {renderTextWithLinks(msg.text, isMe)}
                                                                            </p>
                                                                        )}
                                                                    </>
                                                                )}

                                                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium uppercase ${isMe ? 'text-white/80' : 'text-muted-foreground/80'}`}>
                                                                    <span>{formatTime(msg.createdAt || msg.timestamp)}</span>
                                                                    {isMe && !msg.isDeletedForEveryone && renderMessageStatus(msg)}
                                                                </div>
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
                                <div className="p-2 sm:p-3 bg-card dark:bg-[#13151A] border-t border-border/40 shrink-0 z-20 sticky bottom-0 w-full max-w-full">
                                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative w-full">
                                        <div className="relative shrink-0" ref={attachMenuRef}>
                                            <input type="file" multiple accept="image/*, video/*" className="hidden" ref={fileInputRef} onChange={(e) => handleMediaUpload(e, { compress: true, maxCount: 5, maxSizeCombinedMb: 50 })} />
                                            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" className="hidden" ref={docInputRef} onChange={(e) => handleMediaUpload(e, { compress: false, maxCount: 5, maxSizeCombinedMb: 50, asDocument: true })} />
                                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => handleMediaUpload(e, { compress: true, maxCount: 1, maxSizeCombinedMb: 50 })} />

                                            {showAttachMenu && (
                                                <div className="absolute bottom-full mb-2 left-0 w-48 bg-card border border-border shadow-2xl rounded-2xl p-1.5 flex flex-col gap-1 z-30 animate-in zoom-in-95 duration-200 origin-bottom-left">
                                                    <button type="button" onClick={() => { setShowAttachMenu(false); cameraInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center"><Camera className="w-4 h-4" /></div> Camera</button>
                                                    <button type="button" onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></div> Photos</button>
                                                    <button type="button" onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center"><FileCheck className="w-4 h-4" /></div> Document</button>
                                                </div>
                                            )}
                                            <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={isUploading} className="p-2.5 sm:p-3 text-muted-foreground hover:bg-muted rounded-full shrink-0 disabled:opacity-50 transition-colors">
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex-1 bg-muted/50 dark:bg-[#1A1D24] rounded-2xl flex items-center pr-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all min-w-0 w-full">
                                            <textarea value={newMessage} ref={inputRef} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 w-full max-h-28 min-h-11 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 px-3 text-[14.5px] sm:text-[15px] text-foreground placeholder:text-muted-foreground/70 custom-scrollbar" rows="1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
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
                                        {getFilteredSharedContent().length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
                                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border/50">
                                                    {sharedContentView === 'media' && <ImageIcon className="w-8 h-8 opacity-50" />}
                                                    {sharedContentView === 'docs' && <FileText className="w-8 h-8 opacity-50" />}
                                                    {sharedContentView === 'links' && <LinkIcon className="w-8 h-8 opacity-50" />}
                                                </div>
                                                <p className="text-sm font-semibold">No shared {sharedContentView} yet.</p>
                                                <p className="text-xs opacity-70 mt-1 max-w-xs">Files shared in this chat will appear here.</p>
                                            </div>
                                        ) : (
                                            sharedContentView === 'media' ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                    {getFilteredSharedContent().map(msg => (
                                                        <div key={msg._id} onClick={() => setFullscreenMedia(msg)} className="aspect-square relative cursor-pointer group rounded-lg overflow-hidden border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                                                            {msg.mediaType === 'image' ? (
                                                                <img src={msg.mediaUrl} alt="Shared" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-black/80 flex items-center justify-center"><PlaySquare className="w-10 h-10 text-white/70" /></div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ImageIcon className="w-6 h-6 text-white" /></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {getFilteredSharedContent().map(msg => (
                                                        sharedContentView === 'docs' ? (
                                                            <div key={msg._id} className="flex items-center gap-4 bg-muted/40 p-3.5 rounded-xl border border-border/50 shadow-sm">
                                                                <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20"><FileText className="w-5 h-5" /></div>
                                                                <div className="flex-1 min-w-0 cursor-pointer hover:underline" onClick={() => downloadToLocal(msg.mediaUrl, 'document')}>
                                                                    <span className="text-[13.5px] font-semibold truncate block">{msg.mediaUrl.split('/').pop().split('?')[0] || "Shared Document"}</span>
                                                                    <p className="text-[11px] opacity-70 mt-0.5">{formatBytes(msg.fileSize)} • {msg.mediaUrl.split('.').pop().toUpperCase()}</p>
                                                                </div>
                                                                <button onClick={() => downloadToLocal(msg.mediaUrl, 'document')} className="p-2.5 text-muted-foreground hover:bg-muted rounded-full shrink-0"><Download className="w-4 h-4" /></button>
                                                            </div>
                                                        ) : (
                                                            <div key={msg._id} className="flex items-center gap-4 bg-muted/40 p-3.5 rounded-xl border border-border/50 shadow-sm">
                                                                <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20"><LinkIcon className="w-5 h-5" /></div>
                                                                <a href={msg.text} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-medium text-blue-500 hover:underline truncate flex-1 block">
                                                                    {msg.text}
                                                                </a>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* RIGHT SIDEBAR - GROUP MANAGEMENT */}
                            <div className={`absolute right-0 top-0 h-full w-full sm:w-[320px] lg:w-87.5 bg-card border-l border-border/50 transform transition-transform duration-300 flex flex-col z-40 ${showProfileInfo ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
                                <div className="h-16 md:h-17.5 px-3 md:px-4 flex items-center gap-3 border-b border-border/40 shrink-0">
                                    <button onClick={() => setShowProfileInfo(false)} className="p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
                                    <h2 className="text-lg font-semibold text-foreground">{isGroupChat ? 'Group Info' : 'Contact Info'}</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center pt-8 space-y-6 pb-20">
                                    <div className="w-36 h-36 md:w-44 md:h-44">
                                        {activeChat.profilePicture || activeChat.groupIcon ? (
                                            <img src={activeChat.profilePicture || activeChat.groupIcon} className="w-full h-full rounded-full object-cover shadow-lg border-2 border-background" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-5xl md:text-6xl shadow-lg border-2 border-background">
                                                {isGroupChat ? <Users className="w-20 h-20" /> : activeChat.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center px-6 w-full border-b border-border/40 pb-6">
                                        <h2 className="text-2xl font-bold text-foreground tracking-tight">{activeChat.name}</h2>
                                        {!isGroupChat && (
                                            <>
                                                <p className="text-[15px] text-muted-foreground font-medium mt-1 truncate">{activeChat.email}</p>
                                                <p className="text-[14px] text-muted-foreground mt-0.5">{activeChat.role || 'Employee'}</p>
                                            </>
                                        )}
                                        {isGroupChat && (
                                            <p className="text-[14px] text-muted-foreground mt-1">{activeChat.members?.length || 0} Members</p>
                                        )}
                                    </div>

                                    {/* GROUP MEMBERS LIST */}
                                    {isGroupChat && (
                                        <div className="w-full px-2">
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 mb-2">
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Participants</span>
                                                {(myRoleInGroup() === 'admin' || myRoleInGroup() === 'creator') && (
                                                    <button onClick={() => setShowAddMemberModal(true)} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-md">
                                                        + Add Member
                                                    </button>
                                                )}
                                            </div>

                                            {activeChat.members?.map(member => {
                                                const mUser = member.user;
                                                if (!mUser) return null;
                                                const isMeInGroup = String(mUser._id) === String(currentUserId);
                                                const isCreator = String(activeChat.creator?._id || activeChat.creator) === String(mUser._id);
                                                const isAdmin = activeChat.admins?.some(a => String(a._id || a) === String(mUser._id));

                                                return (
                                                    <div key={mUser._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group/member relative">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {mUser.profilePicture ? (
                                                                <img src={mUser.profilePicture} alt={mUser.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">{mUser.name?.charAt(0)}</div>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-semibold text-foreground truncate">{isMeInGroup ? "You" : mUser.name}</span>
                                                                <span className="text-xs text-muted-foreground truncate">{mUser.email}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isCreator && <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/20"><ShieldAlert className="w-3 h-3" /> Creator</span>}
                                                            {isAdmin && !isCreator && <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-500/20"><ShieldCheck className="w-3 h-3" /> Admin</span>}

                                                            {!isMeInGroup && (myRoleInGroup() === 'admin' || myRoleInGroup() === 'creator') && (
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={() => setMemberMenuOpen(memberMenuOpen === mUser._id ? null : mUser._id)}
                                                                        className="member-action-btn p-1.5 text-muted-foreground hover:bg-muted rounded-full opacity-0 group-hover/member:opacity-100 transition-opacity"
                                                                    >
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </button>
                                                                    {memberMenuOpen === mUser._id && (
                                                                        <div className="member-dropdown absolute right-0 top-8 w-40 bg-card border border-border shadow-2xl rounded-xl py-1 z-50 animate-in zoom-in-95">
                                                                            {myRoleInGroup() === 'creator' && isAdmin && !isCreator && (
                                                                                <button onClick={() => handleGroupAction('demote', mUser._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground font-medium">Dismiss as admin</button>
                                                                            )}
                                                                            {(myRoleInGroup() === 'creator' || myRoleInGroup() === 'admin') && !isAdmin && !isCreator && (
                                                                                <button onClick={() => handleGroupAction('promote', mUser._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground font-medium">Make group admin</button>
                                                                            )}
                                                                            {!isCreator && (
                                                                                <button onClick={() => handleGroupAction('remove', mUser._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-rose-500/10 text-rose-500 font-medium">Remove member</button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {isGroupChat && (
                                    <div className="absolute bottom-0 left-0 w-full p-4 bg-card border-t border-border/50">
                                        <button onClick={() => setShowLeaveGroupModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold rounded-xl transition-colors">
                                            <LogOut className="w-5 h-5" /> Leave Group
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background dark:bg-[#0B0D12] animate-in fade-in duration-700 w-full h-full">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-2xl scale-150"></div>
                                <div className="w-24 h-24 md:w-28 md:h-28 bg-card/80 dark:bg-[#13151A]/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-border/30 relative z-10">
                                    <MessageSquare className="w-10 h-10 md:w-11 md:h-11 text-primary/60 dark:text-primary/40" />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 border border-primary/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight z-10">Communication Hub</h2>
                            <p className="text-[14px] md:text-[15px] mt-2 md:mt-3 font-medium opacity-70 max-w-70 md:max-w-[320px] text-center z-10 leading-relaxed">
                                Select a team member or group from the sidebar to send direct messages, share media, and collaborate.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SharedChat;