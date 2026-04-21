import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
    Search, Phone, MoreVertical, Paperclip, Send, Download, ArrowLeft,
    CheckCheck, Check, MessageSquare, Camera, Image as ImageIcon, X, FileCheck,
    Trash2, Link as LinkIcon, FileText, Users, Forward, PlaySquare, Lock, Copy, Ban, Trash, Info,
    Video, ChevronDown
} from "lucide-react";
import api from "../../api/axios";
import axios from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import chatBgLight from '../../assets/chat-light.jpg';
import chatBgDark from '../../assets/chat-dark.jpg';
import { compressImage, formatBytes, isWithin30Mins, formatTime } from "../../utils/chatUtils";
import ChatSidebar from "./ChatSidebar";

const playAudio = (type) => {
    try {
        const snd = window.__GLOBAL_AUDIO__?.[type];
        if (snd) { snd.currentTime = 0; snd.play().catch(e => { }); }
    } catch (e) { }
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

const ChatWindow = ({
    user,
    currentUserId,
    activeChat,
    setActiveChat,
    messages,
    setMessages,
    conversations,
    setConversations,
    onlineUsers,
    isFetchingMessages,
    moveToTop
}) => {
    const { t } = useTranslation();
    const socket = window.__GLOBAL_SOCKET__;

    const [newMessage, setNewMessage] = useState("");
    const [uploadProgress, setUploadProgress] = useState({});
    const [downloadedMedia, setDownloadedMedia] = useState(new Set());
    const [fullscreenMedia, setFullscreenMedia] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // UI states
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);
    const [slideDirection, setSlideDirection] = useState("slide-in-from-right-8");
    const [showForwardDialog, setShowForwardDialog] = useState(false);
    const [forwardSelectedUsers, setForwardSelectedUsers] = useState([]);
    const [forwardSearchQuery, setForwardSearchQuery] = useState("");
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
    const [createGroupSearchQuery, setCreateGroupSearchQuery] = useState("");
    const [createGroupSelectedUsers, setCreateGroupSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showProfileInfo, setShowProfileInfo] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showTopMenu, setShowTopMenu] = useState(false);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState("");
    const [sharedContentView, setSharedContentView] = useState(null);
    const [showClearChatModal, setShowClearChatModal] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showMobileNotice, setShowMobileNotice] = useState(false);

    const uploadControllers = useRef({});
    const messagesEndRef = useRef(null);

    const isInitialLoadRef = useRef(true);
    const prevChatIdRef = useRef(activeChat?._id || activeChat?.id);

    const fileInputRef = useRef(null);
    const docInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const attachMenuRef = useRef(null);
    const topMenuRef = useRef(null);
    const callMenuRef = useRef(null);
    const inputRef = useRef(null);
    const contextMenuRef = useRef(null);
    const touchTimer = useRef(null);
    const mobileNoticeTimer = useRef(null);

    const isGroupChat = activeChat?.members !== undefined || activeChat?.isGroup;
    const isOnline = (id) => onlineUsers.includes(id?.toString());

    // 🚀 NEW: Update incoming ticks natively (Delivered -> Seen)
    useEffect(() => {
        if (!socket) return;
        const handleStatusUpdate = (data) => {
            // If the person reading matches the chat we're in, turn grey ticks to blue
            if (String(data.viewerId) === String(activeChat?._id || activeChat?.id)) {
                setMessages(prev => prev.map(m => {
                    if (String(m.senderId || m.sender?._id || m.sender) === String(currentUserId) && m.status !== 'seen') {
                        if (data.status === 'seen') return { ...m, status: 'seen' };
                        if (data.status === 'delivered' && m.status !== 'seen') return { ...m, status: 'delivered' };
                    }
                    return m;
                }));
            }
        };
        socket.on("messages_status_update", handleStatusUpdate);
        return () => socket.off("messages_status_update", handleStatusUpdate);
    }, [socket, activeChat, setMessages, currentUserId]);

    // 🚀 NEW: Auto-mark messages as SEEN when user has chat open
    useEffect(() => {
        if (!activeChat || !socket) return;
        const unreadMessages = messages.filter(m =>
            String(m.senderId || m.sender?._id || m.sender) !== String(currentUserId) && m.status !== 'seen'
        );

        if (unreadMessages.length > 0) {
            setMessages(prev => prev.map(m =>
                (String(m.senderId || m.sender?._id || m.sender) !== String(currentUserId) && m.status !== 'seen')
                    ? { ...m, status: 'seen' } : m
            ));
            socket.emit("mark_chat_seen", {
                senderId: activeChat._id || activeChat.id,
                recipientId: currentUserId
            });
        }
    }, [messages, activeChat, socket, currentUserId, setMessages]);


    useEffect(() => {
        const storedRevealed = JSON.parse(localStorage.getItem('downloadedMessages') || '[]');
        if (storedRevealed.length > 0) setDownloadedMedia(new Set(storedRevealed));
    }, []);

    useEffect(() => {
        localStorage.setItem('downloadedMessages', JSON.stringify(Array.from(downloadedMedia)));
    }, [downloadedMedia]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) setShowAttachMenu(false);
            if (topMenuRef.current && !topMenuRef.current.contains(event.target)) setShowTopMenu(false);
            if (callMenuRef.current && !callMenuRef.current.contains(event.target)) setShowCallMenu(false);
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) setContextMenu(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [contextMenu]);

    useLayoutEffect(() => {
        const currentId = activeChat?._id || activeChat?.id;
        if (prevChatIdRef.current !== currentId) {
            prevChatIdRef.current = currentId;
            isInitialLoadRef.current = true;
        }

        if (messages.length > 0) {
            if (isInitialLoadRef.current) {
                messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
                isInitialLoadRef.current = false;
            } else {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                }, 50);
            }
        }
    }, [messages, activeChat]);

    const handleShowMobileNotice = () => {
        setShowMobileNotice(true);
        if (mobileNoticeTimer.current) clearTimeout(mobileNoticeTimer.current);
        mobileNoticeTimer.current = setTimeout(() => { setShowMobileNotice(false); }, 5000);
    };

    useEffect(() => { return () => { if (mobileNoticeTimer.current) clearTimeout(mobileNoticeTimer.current); }; }, []);

    const resetContextState = () => { setContextMenu(null); setIsSelectionMode(false); setSelectedMessages([]); setNewMessage(""); setShowTopMenu(false); setShowAttachMenu(false); setShowCallMenu(false); };

    const handleSendMessage = async (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
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

        setMessages((prev) => [...prev, payload]);
        playAudio('sent');
        moveToTop(targetId);

        try {
            const res = await api.post('/chat/message', payload);
            if (res.data && res.data._id) {
                const realId = res.data._id;
                setMessages(prev => prev.map(m => m._id === tempId ? { ...payload, _id: realId } : m));
                socket.emit("send_message", { ...payload, _id: realId });
            } else {
                socket.emit("send_message", payload);
            }
        } catch (error) {
            toast.error(t('toast.msg_send_fail') || "Message failed to send.");
            setMessages(prev => prev.filter(m => m._id !== tempId));
        }
    };

    const handleMediaUpload = async (e, options = {}) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const { compress = false, maxCount = 5, maxSizeCombinedMb = 50, asDocument = false } = options;
        if (files.length > maxCount) return toast.error(t('toast.max_items', { maxCount }) || `Maximum of ${maxCount} items allowed.`);
        const combinedSizeMb = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        if (combinedSizeMb > maxSizeCombinedMb) return toast.error(t('toast.max_size', { maxSize: maxSizeCombinedMb }) || `Total size cannot exceed ${maxSizeCombinedMb}MB.`);
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
                moveToTop(activeChat._id || activeChat.id);

                try {
                    const urlRes = await api.post('/chat/generate-presigned-url', { fileType: mimeType, originalName: finalFile.name || safeName });
                    await axios.put(urlRes.data.presignedUrl, finalFile, { headers: { 'Content-Type': mimeType }, signal: abortController.signal, onUploadProgress: (p) => setUploadProgress(prev => ({ ...prev, [tempId]: Math.round((p.loaded * 100) / p.total) })) });

                    const finalPayload = { ...optimisticPayload, mediaUrl: urlRes.data.publicUrl.startsWith('http') ? urlRes.data.publicUrl : `https://${urlRes.data.publicUrl}`, status: 'sent', isUploading: false };

                    const res = await api.post('/chat/message', finalPayload);

                    if (res.data && res.data._id) {
                        const realId = res.data._id;
                        setMessages(prev => prev.map(m => m._id === tempId ? { ...finalPayload, _id: realId } : m));
                        setDownloadedMedia(prev => { const n = new Set(prev); n.delete(tempId); n.add(realId); return n; });
                        socket.emit("send_message", { ...finalPayload, _id: realId });
                        playAudio('sent');
                    } else {
                        socket.emit("send_message", finalPayload);
                        playAudio('sent');
                    }

                } catch (err) {
                    if (err.name !== 'CanceledError') {
                        toast.error(t('toast.upload_fail') || "Upload failed.");
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
        const tid = toast.loading(t('toast.downloading') || "Downloading...");
        try {
            const response = await api.post('/chat/generate-download-url', {
                fileUrl: url
            });

            if (response.data.success && response.data.downloadUrl) {
                const a = document.createElement('a');
                a.href = response.data.downloadUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                toast.success(t('toast.download_success') || "Download started!", { id: tid });
            } else {
                throw new Error("Failed to get download URL");
            }
        } catch (error) {
            console.error("Download Error:", error);
            toast.error(t('toast.download_fail') || "Download failed.", { id: tid });
            window.open(url, '_blank');
        }
    };

    const handleDeleteMediaFromViewer = async (msg) => {
        if (!msg) return;
        const targetId = msg._id || msg.id;
        const localDeleted = JSON.parse(localStorage.getItem('deletedChatMessages') || '[]');
        if (!localDeleted.includes(targetId)) { localDeleted.push(targetId); localStorage.setItem('deletedChatMessages', JSON.stringify(localDeleted)); }
        setMessages(prev => prev.filter(m => (m._id || m.id) !== targetId)); toast.success(t('toast.msg_deleted') || "Message deleted"); setFullscreenMedia(null);
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
            toast.success(type === 'everyone' ? t('toast.del_everyone') || "Deleted for everyone" : t('toast.del_me') || "Deleted for you");
        } catch (e) { toast.error(t('toast.del_fail') || "Delete failed"); }
    };

    const handleBatchForward = async () => {
        const msgs = fullscreenMedia ? [fullscreenMedia] : messages.filter(m => selectedMessages.includes(m._id || m.id) && !m.isDeletedForEveryone);
        if (!msgs.length || forwardSelectedUsers.length === 0) return;
        const tid = toast.loading(t('toast.forwarding') || "Forwarding...");
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
            toast.success(t('toast.forward_success') || "Forwarded", { id: tid });
        } catch (error) { toast.error(t('toast.forward_fail') || "Forward failed", { id: tid }); }
        finally { setShowForwardDialog(false); setForwardSelectedUsers([]); setForwardSearchQuery(""); setFullscreenMedia(null); setIsSelectionMode(false); setSelectedMessages([]); }
    };

    const executeClearChat = async () => {
        setShowClearChatModal(false);
        try {
            const url = isGroupChat ? `/chat/clear/group/${activeChat._id || activeChat.id}/${currentUserId}` : `/chat/clear/${currentUserId}/${activeChat._id || activeChat.id}`;
            await api.put(url); setMessages([]); toast.success(t('toast.clear_success') || "Chat cleared");
        } catch (err) { toast.error(t('toast.clear_fail') || "Failed to clear"); }
    };

    const localDeletedIds = JSON.parse(localStorage.getItem('deletedChatMessages') || '[]');
    const visibleMessages = messages.filter(m => !localDeletedIds.includes(m._id || m.id));
    const displayedMessages = chatSearchQuery.trim() === "" ? visibleMessages : visibleMessages.filter(m => m.text && m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()));

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

    const initiateCall = (type) => { setShowCallMenu(false); if (activeChat) window.dispatchEvent(new CustomEvent('initiate_global_call', { detail: { ...activeChat, callType: type } })); };
    const handleChatAction = async (action) => { setShowTopMenu(false); setSharedContentView(action); };

    const renderMessageStatus = (msg) => {
        if (msg.status === 'seen') return <CheckCheck className="w-4 h-4 text-[#53bdeb] drop-shadow-sm" />;
        if (msg.status === 'delivered') return <CheckCheck className="w-4 h-4 text-white/70" />;
        return <Check className="w-4 h-4 text-white/70" />;
    };

    const getSharedContentPlaceholder = () => {
        if (sharedContentView === 'media') return t('chat_window.shared.no_shared_media');
        if (sharedContentView === 'docs') return t('chat_window.shared.no_shared_docs');
        if (sharedContentView === 'links') return t('chat_window.shared.no_shared_links');
        return '';
    };

    if (!activeChat) {
        return (
            <div className={`flex-1 flex flex-col h-full w-full max-w-full relative overflow-hidden transition-all duration-300 md:flex`}>
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background dark:bg-[#0B0D12] animate-in fade-in duration-700 w-full h-full">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-2xl scale-150"></div>
                        <div className="w-24 h-24 md:w-28 md:h-28 bg-card/80 dark:bg-[#13151A]/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-border/30 relative z-10">
                            <MessageSquare className="w-10 h-10 md:w-11 md:h-11 text-primary/60 dark:text-primary/40" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 border border-primary/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight z-10">{t('chat_window.empty.title') || "Communication Hub"}</h2>
                    <p className="text-[14px] md:text-[15px] mt-2 md:mt-3 font-medium opacity-70 max-w-70 md:max-w-[320px] text-center z-10 leading-relaxed">
                        {t('chat_window.empty.subtitle') || "Select a team member or group to start chatting."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex-1 flex flex-col h-full w-full max-w-full relative overflow-hidden transition-all duration-300 animate-in slide-in-from-right-4 md:animate-none`}>

            {fullscreenMedia && !showForwardDialog && (
                <div className="absolute inset-0 z-100 w-full h-full bg-[#0b141a] flex flex-col animate-in fade-in duration-200 ease-out overflow-hidden">

                    <div className="w-full flex items-center justify-between px-4 sm:px-6 h-16 min-h-16 shrink-0 bg-[#0b141a]/80 z-10 border-b border-white/10 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            {String(fullscreenMedia.senderId || fullscreenMedia.sender?._id || fullscreenMedia.sender) === String(currentUserId) ? (
                                user?.profilePicture ? (
                                    <img src={user.profilePicture} alt="You" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{user?.name?.charAt(0)}</div>
                                )
                            ) : (
                                fullscreenMedia.sender?.profilePicture || activeChat?.profilePicture ? (
                                    <img src={fullscreenMedia.sender?.profilePicture || activeChat.profilePicture} alt="Sender" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {(fullscreenMedia.sender?.name || activeChat?.name || 'U').charAt(0)}
                                    </div>
                                )
                            )}
                            <div className="text-white flex flex-col justify-center">
                                <span className="font-medium text-[15px] leading-tight">
                                    {String(fullscreenMedia.senderId || fullscreenMedia.sender?._id || fullscreenMedia.sender) === String(currentUserId) ? (t('chat_window.message.you') || "You") : (fullscreenMedia.sender?.name || activeChat?.name)}
                                </span>
                                <span className="text-xs text-white/60 mt-0.5">{formatTime(fullscreenMedia.timestamp || fullscreenMedia.createdAt)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 text-[#AEBAC1]">
                            <button onClick={() => handleDeleteMediaFromViewer(fullscreenMedia)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title={t('modal.delete.delete_me') || "Delete"}><Trash2 className="w-5 h-5 sm:w-5 sm:h-5" /></button>
                            <button onClick={() => setShowForwardDialog(true)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title={t('modal.forward.title') || "Forward"}><Forward className="w-5 h-5 sm:w-5 sm:h-5" /></button>
                            <button onClick={() => downloadToLocal(fullscreenMedia.mediaUrl)} className="p-2.5 hover:bg-white/10 hover:text-white rounded-full transition-colors" title="Download"><Download className="w-5 h-5 sm:w-5 sm:h-5" /></button>
                            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                            <button onClick={() => setFullscreenMedia(null)} className="p-2.5 hover:bg-white/10 text-white rounded-full transition-colors" title={t('modal.common.cancel') || "Close"}><X className="w-6 h-6 sm:w-6 sm:h-6" /></button>
                        </div>
                    </div>

                    <div
                        className="flex-1 w-full flex items-center justify-center overflow-hidden p-4 sm:p-8 select-none relative"
                        onTouchStart={onMediaTouchStart}
                        onTouchMove={onMediaTouchMove}
                        onTouchEnd={onMediaTouchEnd}
                    >
                        <div key={fullscreenMedia._id || fullscreenMedia.id} className={`w-full h-full flex items-center justify-center animate-in fade-in ${slideDirection} duration-300 ease-out`}>
                            {fullscreenMedia.mediaType === 'image' && <img src={fullscreenMedia.mediaUrl} alt="Fullscreen Preview" className="w-auto h-auto max-w-full max-h-full object-contain shadow-2xl" />}
                            {fullscreenMedia.mediaType === 'video' && <video src={fullscreenMedia.mediaUrl} controls autoPlay className="w-auto h-auto max-w-full max-h-full object-contain shadow-2xl" />}
                            {fullscreenMedia.mediaType === 'document' && (
                                <div className="w-full h-full max-w-4xl bg-[#13151A] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                                    <div className="bg-[#1A1D24] p-4 flex items-center gap-4 shrink-0 border-b border-white/10">
                                        <FileText className="w-8 h-8 text-blue-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{fullscreenMedia.mediaUrl.split('/').pop().split('?')[0]}</p>
                                            <p className="text-xs text-white/60">{t('chat_window.shared.preview') || "Document Preview"}</p>
                                        </div>
                                    </div>
                                    {fullscreenMedia.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)(?:\?.*)?$/i) ? (
                                        <div className="flex-1 w-full h-full bg-black/20 flex items-center justify-center p-4 overflow-hidden">
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
                        <div className="h-20 w-full shrink-0 border-t border-white/10 flex items-center justify-center px-4 gap-2 overflow-x-auto custom-scrollbar bg-[#0b141a]/80 backdrop-blur-md">
                            {chatMediaFiles.map((mediaMsg) => {
                                const isSelected = String(fullscreenMedia._id || fullscreenMedia.id) === String(mediaMsg._id || mediaMsg.id);
                                return (
                                    <div
                                        key={mediaMsg._id || mediaMsg.id}
                                        onClick={() => setFullscreenMedia(mediaMsg)}
                                        className={`w-12 h-12 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 ${isSelected ? 'border-primary scale-110 opacity-100 z-10 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    >
                                        {mediaMsg.mediaType === 'image' ? (
                                            <img src={mediaMsg.mediaUrl} className="w-full h-full object-cover" alt="thumb" />
                                        ) : mediaMsg.mediaType === 'video' ? (
                                            <div className="w-full h-full bg-white/10 flex items-center justify-center"><PlaySquare className="w-6 h-6 text-white" /></div>
                                        ) : (
                                            <div className="w-full h-full bg-white/10 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {showForwardDialog && (
                <div className="absolute inset-0 z-100 w-full h-full bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden">
                    <div className="w-full max-w-sm md:max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85%] animate-in zoom-in-95 duration-200 ease-out">
                        <div className="p-4 md:p-5 border-b border-border/50 bg-muted/20">
                            <h3 className="text-lg font-bold text-foreground mb-4">{t('modal.forward.title') || "Forward"}</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input type="text" placeholder={t('modal.forward.search') || "Search..."} value={forwardSearchQuery} onChange={(e) => setForwardSearchQuery(e.target.value)} className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" autoFocus />
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
                            {conversations.filter(c => c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && <p className="text-center text-muted-foreground p-6 text-sm font-medium">{t('modal.forward.no_chats') || "No chats"}</p>}
                        </div>

                        <div className="p-4 md:p-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
                            <span className="text-sm font-medium text-muted-foreground">{forwardSelectedUsers.length > 0 ? t('chat_window.top_bar.selected_count', { count: forwardSelectedUsers.length }) : (t('modal.forward.select_chats') || "Select chats")}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setShowForwardDialog(false); setForwardSelectedUsers([]); setForwardSearchQuery(""); }} className="px-4 py-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">{t('modal.common.cancel') || "Cancel"}</button>
                                {forwardSelectedUsers.length > 0 && <button onClick={handleBatchForward} className="w-11 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg animate-in zoom-in-95 duration-200"><Send className="w-5 h-5 ml-0.5" /></button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddMemberModal && (
                <div className="absolute inset-0 z-100 w-full h-full bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden">
                    <div className="w-full max-w-sm md:max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85%] animate-in zoom-in-95 duration-200 ease-out">
                        <div className="p-4 md:p-5 border-b border-border/50 bg-muted/20">
                            <h3 className="text-lg font-bold text-foreground mb-4">{t('modal.add_member.title', { name: activeChat?.name }) || "Add Members"}</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input type="text" placeholder={t('modal.add_member.search') || "Search..."} value={createGroupSearchQuery} onChange={(e) => setCreateGroupSearchQuery(e.target.value)} className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" autoFocus />
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
                        </div>

                        <div className="p-4 md:p-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
                            <span className="text-sm font-medium text-muted-foreground">{t('chat_window.top_bar.selected_count', { count: createGroupSelectedUsers.length }) || `${createGroupSelectedUsers.length} selected`}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setShowAddMemberModal(false); setCreateGroupSelectedUsers([]); setCreateGroupSearchQuery(""); }} className="px-4 py-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">{t('modal.common.cancel') || "Cancel"}</button>
                                {createGroupSelectedUsers.length > 0 && <button className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-2">{t('modal.add_member.add') || "Add"}</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="absolute inset-0 z-100 w-full h-full bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden">
                    <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-5 flex flex-col gap-2 animate-in zoom-in-95 duration-200 ease-out">
                        <h3 className="text-lg font-bold text-foreground mb-2">{t('modal.delete.title', { count: selectedMessages.length }) || "Delete Messages?"}</h3>
                        {canDeleteForEveryone && (
                            <button onClick={() => executeBatchDelete('everyone')} className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-medium text-rose-500 transition-colors">{t('modal.delete.delete_everyone') || "Delete for everyone"}</button>
                        )}
                        <button onClick={() => executeBatchDelete('me')} className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl font-medium text-foreground transition-colors">{t('modal.delete.delete_me') || "Delete for me"}</button>
                        <button onClick={() => setShowDeleteModal(false)} className="w-full text-center px-4 py-3 mt-2 font-medium text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors">{t('modal.common.cancel') || "Cancel"}</button>
                    </div>
                </div>
            )}

            {showClearChatModal && (
                <div className="absolute inset-0 z-100 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-hidden">
                    <div className="bg-card dark:bg-[#1f2c33] w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 ease-out border border-border/50">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-2">
                            <Trash className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-foreground mb-1">{t('modal.clear_chat.title') || "Clear Chat?"}</h3>
                            <p className="text-sm text-muted-foreground">{t('modal.clear_chat.desc') || "This cannot be undone."}</p>
                        </div>
                        <div className="flex gap-3 w-full mt-4">
                            <button onClick={() => setShowClearChatModal(false)} className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors">{t('modal.common.cancel') || "Cancel"}</button>
                            <button onClick={executeClearChat} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors">{t('modal.clear_chat.clear') || "Clear"}</button>
                        </div>
                    </div>
                </div>
            )}

            {contextMenu && (
                <div ref={contextMenuRef} className="fixed z-100 bg-card border border-border shadow-2xl rounded-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-150 ease-out origin-top-left" style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}>
                    <button onClick={() => executeBatchDelete('me', [contextMenu.msg._id || contextMenu.msg.id])} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm font-medium text-foreground transition-colors"><Trash2 className="w-4 h-4 text-muted-foreground" /> {t('chat_window.context_menu.delete_me') || "Delete for me"}</button>
                    {String(contextMenu.msg.senderId || contextMenu.msg.sender?._id || contextMenu.msg.sender) === String(currentUserId) && !contextMenu.msg.isDeletedForEveryone && isWithin30Mins(contextMenu.msg.createdAt || contextMenu.msg.timestamp) && (
                        <button onClick={() => executeBatchDelete('everyone', [contextMenu.msg._id || contextMenu.msg.id])} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-500/10 text-sm font-medium text-rose-500 transition-colors"><Ban className="w-4 h-4" /> {t('chat_window.context_menu.delete_everyone') || "Delete for everyone"}</button>
                    )}
                    <button onClick={() => enterSelectionMode(contextMenu.msg)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm font-medium transition-colors"><Check className="w-4 h-4 text-muted-foreground" /> {t('chat_window.context_menu.select') || "Select"}</button>
                </div>
            )}

            <div className="flex-1 flex w-full max-w-full h-full relative bg-[#EBEBEB] dark:bg-[#0B0D12] overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-30">
                    <img src={chatBgLight} alt="" className="w-full h-full object-cover dark:hidden" />
                    <img src={chatBgDark} alt="" className="w-full h-full object-cover hidden dark:block" />
                </div>

                <div className="flex-1 flex flex-col w-full h-full relative z-10 transition-all duration-300 overflow-hidden">

                    {isSelectionMode ? (
                        <div className="h-14 sm:h-16 md:h-17.5 px-2 sm:px-4 bg-primary/10 flex items-center justify-between shrink-0 z-20 border-b border-border/40 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm w-full">
                            <div className="flex items-center gap-2 sm:gap-4 text-foreground">
                                <button onClick={resetContextState} className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                                <span className="font-semibold text-base sm:text-lg">{t('chat_window.top_bar.selected_count', { count: selectedMessages.length }) || `${selectedMessages.length} selected`}</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                                {canCopy && <button onClick={() => { navigator.clipboard.writeText(selectedMsgsData.map(m => m.text).join('\n')); resetContextState(); toast.success(t('toast.copied') || "Copied"); }} className="p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors" title="Copy"><Copy className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                                {canForward && <button onClick={() => setShowForwardDialog(true)} className="p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors" title="Forward"><Forward className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                                <button onClick={() => setShowDeleteModal(true)} className="p-2 sm:p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors" title="Delete"><Trash className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" /></button>
                            </div>
                        </div>
                    ) : showSearchInput ? (
                        <div className="h-14 sm:h-16 md:h-17.5 px-1 sm:px-4 bg-card dark:bg-[#13151A] border-b border-border/40 flex items-center gap-1 sm:gap-2 shrink-0 z-20 sticky top-0 animate-in fade-in duration-200 w-full">
                            <button onClick={() => { setShowSearchInput(false); setChatSearchQuery(""); }} className="p-2 sm:p-3 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0"><ArrowLeft className="w-5 h-5" /></button>
                            <input autoFocus type="text" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder={t('chat_window.top_bar.search') || "Search..."} className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[14px] sm:text-[15px] text-foreground placeholder:text-muted-foreground min-w-0 transition-all" />
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
                                            {isGroupChat ? (t('chat_window.top_bar.group_chat') || "Group Chat") : (isOnline(activeChat._id || activeChat.id) ? (t('chat_window.top_bar.online') || "Online") : (t('chat_window.top_bar.offline') || "Offline"))}
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
                                            <div className="absolute top-12 right-0 w-40 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-50 animate-in zoom-in-95 duration-200 ease-out origin-top-right">
                                                <button onClick={(e) => { e.preventDefault(); initiateCall('video'); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors cursor-pointer"><Video className="w-4 h-4" /> {t('chat_window.top_menu.video_call') || "Video call"}</button>
                                                <button onClick={(e) => { e.preventDefault(); initiateCall('voice'); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors cursor-pointer"><Phone className="w-4 h-4" /> {t('chat_window.top_menu.voice_call') || "Voice call"}</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button onClick={(e) => { e.stopPropagation(); setShowTopMenu(!showTopMenu); }} className="p-2 sm:p-2.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"><MoreVertical className="w-5 h-5 sm:w-5 sm:h-5" /></button>

                                {showTopMenu && (
                                    <div className="absolute top-12 right-0 w-44 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-1 z-30 animate-in zoom-in-95 duration-200 ease-out origin-top-right" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleChatAction('media')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors"><ImageIcon className="w-4 h-4 text-blue-500" /> {t('chat_window.top_menu.media') || "Media"}</button>
                                        <button onClick={() => handleChatAction('docs')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors"><FileText className="w-4 h-4 text-amber-500" /> {t('chat_window.top_menu.docs') || "Docs"}</button>
                                        <button onClick={() => handleChatAction('links')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors"><LinkIcon className="w-4 h-4 text-emerald-500" /> {t('chat_window.top_menu.links') || "Links"}</button>
                                        <button onClick={() => setShowClearChatModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-500/10 rounded-lg text-sm font-medium text-rose-500 transition-colors"><Trash className="w-4 h-4" /> {t('chat_window.top_menu.clear_chat') || "Clear chat"}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`w-full flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0 relative z-10 transition-all duration-300 md:bg-amber-500/10 md:dark:bg-amber-500/5 md:border-b md:border-amber-500/20 md:backdrop-blur-md md:shadow-sm ${showMobileNotice ? 'bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 backdrop-blur-md shadow-sm py-1.5' : 'bg-transparent py-1'}`}>
                        <div className="hidden md:flex items-center gap-2.5 py-1 px-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                            <span className="text-[12px] font-semibold tracking-wide">{t('chat_window.privacy.desktop') || "Messages auto-delete after 7 days."}</span>
                        </div>
                        <div className="flex md:hidden w-full items-center justify-center transition-all duration-300" style={{ height: '28px' }}>
                            {showMobileNotice ? (
                                <div className="flex items-center gap-2 px-3 animate-in fade-in zoom-in-95 duration-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                    <span className="text-[11px] leading-tight font-semibold text-center">{t('chat_window.privacy.mobile_notice') || "Messages auto-delete after 7 days."}</span>
                                </div>
                            ) : (
                                <button onClick={handleShowMobileNotice} className="flex items-center gap-1.5 px-3 py-1 bg-background/80 dark:bg-[#13151A]/80 backdrop-blur-md rounded-full shadow-sm border border-border/50 text-muted-foreground hover:text-foreground transition-all animate-in fade-in zoom-in duration-300">
                                    <Info className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('chat_window.privacy.label') || "Privacy"}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-6 custom-scrollbar relative w-full">
                        <div className="relative z-10 flex flex-col space-y-4 pb-2">
                            {isFetchingMessages ? (
                                <div className="flex flex-col gap-4 p-4 w-full h-full justify-end opacity-70">
                                    <div className="self-start w-3/4 sm:w-1/2 bg-muted/60 dark:bg-white/5 h-16 rounded-2xl rounded-tl-sm animate-pulse"></div>
                                    <div className="self-end w-2/3 sm:w-1/2 bg-primary/20 h-12 rounded-2xl rounded-tr-sm animate-pulse"></div>
                                    <div className="self-start w-1/2 sm:w-1/3 bg-muted/60 dark:bg-white/5 h-20 rounded-2xl rounded-tl-sm animate-pulse"></div>
                                    <div className="self-end w-3/4 sm:w-2/3 bg-primary/20 h-24 rounded-2xl rounded-tr-sm animate-pulse"></div>
                                </div>
                            ) : displayedMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 m-auto mt-10">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-primary/20 backdrop-blur-sm">
                                        <MessageSquare className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">{t('chat_window.feed.say_hello', { name: activeChat.name.split(' ')[0] }) || `Say Hello to ${activeChat.name.split(' ')[0]}!`}</h3>
                                    <p className="text-muted-foreground text-[14px] sm:text-[15px] max-w-70 sm:max-w-sm mb-8 leading-relaxed">
                                        {t('chat_window.feed.start_secure', { type: isGroupChat ? (t('chat_window.feed.type_group_chat') || 'group chat') : (t('chat_window.feed.type_voice_call') || 'voice call') }) || "Send messages, share photos, or start a secure chat."}
                                    </p>
                                    <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[12px] px-4 py-2.5 rounded-xl flex flex-col sm:flex-row items-center gap-2.5 max-w-sm border border-amber-500/20 shadow-sm backdrop-blur-md mx-auto">
                                        <Lock className="w-4 h-4 shrink-0" />
                                        <span className="text-center sm:text-left leading-tight">{t('chat_window.feed.e2e') || "Messages are end-to-end encrypted."}</span>
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
                                            onClick={() => { if (isSelectionMode) toggleSelection(msg); }}
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
                                                {isGroupChat && !isMe && !msg.isDeletedForEveryone && (
                                                    <span className="text-[10.5px] text-[#6B66FF] font-bold mb-0.5 ml-1 drop-shadow-sm tracking-wide">
                                                        {msg.sender?.name || t('chat_window.message.member') || "Member"}
                                                    </span>
                                                )}

                                                <div className={`relative max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] px-3 py-2 shadow-sm select-none overflow-hidden ${isMe ? 'bg-[#6B66FF] text-white rounded-2xl rounded-tr-sm shadow-[0_4px_14px_-6px_rgba(var(--primary),0.3)]' : 'bg-card dark:bg-[#1C1F26] text-foreground rounded-2xl rounded-tl-sm border border-border/50 shadow-sm'}`}>
                                                    {msg.isDeletedForEveryone ? (
                                                        <div className={`flex items-center gap-2 italic text-[14.5px] py-1 ${isMe ? 'text-white/80' : 'text-muted-foreground/80'}`}>
                                                            <Ban className="w-4 h-4" /> {t('chat_window.message.deleted') || "This message was deleted"}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video') && (
                                                                !isMediaRevealed ? (
                                                                    <div onClick={(e) => { e.stopPropagation(); handleRevealMedia(msg._id); }} className="relative w-48 h-48 sm:w-64 sm:h-64 bg-[#2A2E35] rounded-xl flex flex-col items-center justify-center cursor-pointer mb-1 border border-white/10 hover:bg-[#31363F] transition-colors">
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
                                                                                        <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" fill="none" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * (uploadProgress[msg._id] || 0)) / 100} className="transition-all duration-200 ease-out" />
                                                                                    </svg>
                                                                                    <button onClick={(e) => { e.stopPropagation(); cancelUpload(msg._id); }} className="w-8 h-8 rounded-full flex items-center justify-center text-white z-30 hover:bg-black/40 transition-colors">
                                                                                        <X className="w-5 h-5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {msg.mediaType === 'image' && (
                                                                            <img src={msg.mediaUrl} alt="attachment" className={`w-48 sm:w-64 h-auto max-h-64 rounded-xl object-cover transition-opacity bg-black/20 ${msg.isUploading ? 'blur-sm' : 'group-hover/media:opacity-90'}`} onError={(e) => { e.target.src = "https://placehold.co/400x300/13151A/FFF?text=Image+Unavailable"; }} />
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
                                                                <div onClick={(e) => { if (!msg.isUploading) { e.stopPropagation(); setFullscreenMedia(msg); } }} className="relative flex items-center gap-3 bg-black/10 dark:bg-white/5 p-3 rounded-lg mb-1.5 border border-white/5 cursor-pointer hover:bg-black/20 dark:hover:bg-white/10 transition-colors w-60 sm:w-72 max-w-full overflow-hidden">
                                                                    {msg.isUploading && (
                                                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
                                                                            <div className="relative flex items-center justify-center w-10 h-10 bg-black/40 rounded-full">
                                                                                <svg className="w-10 h-10 absolute transform -rotate-90">
                                                                                    <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" fill="none" />
                                                                                    <circle cx="20" cy="20" r="16" stroke="white" strokeWidth="2.5" fill="none" strokeDasharray="100.5" strokeDashoffset={100.5 - (100.5 * (uploadProgress[msg._id] || 0)) / 100} className="transition-all duration-200 ease-out" />
                                                                                </svg>
                                                                                <button onClick={(e) => { e.stopPropagation(); cancelUpload(msg._id); }} className="w-6 h-6 rounded-full flex items-center justify-center text-white z-30 hover:bg-black/40 transition-colors"><X className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0"><FileCheck className="w-5 h-5 text-blue-500" /></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-[13.5px] font-semibold truncate block">{msg.mediaUrl.split('/').pop().split('?')[0] || t('chat_window.message.document_file') || "Document File"}</span>
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

                    <div className="p-2 sm:p-3 bg-card dark:bg-[#13151A] border-t border-border/40 shrink-0 z-20 sticky bottom-0 w-full max-w-full">
                        <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative w-full">
                            <div className="relative shrink-0" ref={attachMenuRef}>
                                <input type="file" multiple accept="image/*, video/*" className="hidden" ref={fileInputRef} onChange={(e) => handleMediaUpload(e, { compress: true, maxCount: 5, maxSizeCombinedMb: 50 })} />
                                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" className="hidden" ref={docInputRef} onChange={(e) => handleMediaUpload(e, { compress: false, maxCount: 5, maxSizeCombinedMb: 50, asDocument: true })} />
                                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => handleMediaUpload(e, { compress: true, maxCount: 1, maxSizeCombinedMb: 50 })} />
                                {showAttachMenu && (
                                    <div className="absolute bottom-full mb-2 left-0 w-48 bg-card border border-border shadow-2xl rounded-2xl p-1.5 flex flex-col gap-1 z-30 animate-in zoom-in-95 duration-200 ease-out origin-bottom-left">
                                        <button type="button" onClick={() => { setShowAttachMenu(false); cameraInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors"><div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center"><Camera className="w-4 h-4" /></div> {t('chat_window.input.camera') || "Camera"}</button>
                                        <button type="button" onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors"><div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></div> {t('chat_window.input.photos') || "Photos"}</button>
                                        <button type="button" onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium transition-colors"><div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center"><FileCheck className="w-4 h-4" /></div> {t('chat_window.input.document') || "Document"}</button>
                                    </div>
                                )}
                                <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={isUploading} className="p-2.5 sm:p-3 text-muted-foreground hover:bg-muted rounded-full shrink-0 disabled:opacity-50 transition-colors">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 bg-muted/50 dark:bg-[#1A1D24] rounded-2xl flex items-center pr-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all min-w-0 w-full">
                                <textarea value={newMessage} ref={inputRef} onChange={(e) => setNewMessage(e.target.value)} placeholder={t('chat_window.input.placeholder') || "Type a message..."} className="flex-1 w-full max-h-28 min-h-11 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-3 px-3 text-[14.5px] sm:text-[15px] text-foreground placeholder:text-muted-foreground/70 custom-scrollbar transition-all" rows="1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                                <button type="submit" disabled={!newMessage.trim() && !isUploading} className={`p-2 rounded-full transition-all shrink-0 ${newMessage.trim() ? 'bg-[#6B66FF] text-white hover:bg-[#5A55E5] scale-100' : 'bg-transparent text-muted-foreground scale-95'}`}>
                                    <Send className="w-4.5 h-4.5 sm:w-5 sm:h-5" style={{ marginLeft: newMessage.trim() ? '2px' : '0' }} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {sharedContentView && (
                    <div className="absolute inset-0 z-100 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300 ease-out overflow-hidden">
                        <div className="h-16 md:h-17.5 px-3 sm:px-5 border-b border-border/40 flex items-center gap-3 md:gap-4 shrink-0 bg-card/50">
                            <button onClick={() => setSharedContentView(null)} className="p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                            <h2 className="text-lg font-bold text-foreground capitalize flex items-center gap-2">
                                {sharedContentView === 'media' && <><ImageIcon className="w-5 h-5 text-blue-500" /> {t('chat_window.shared.media') || "Shared Media"}</>}
                                {sharedContentView === 'docs' && <><FileText className="w-5 h-5 text-amber-500" /> {t('chat_window.shared.docs') || "Shared Documents"}</>}
                                {sharedContentView === 'links' && <><LinkIcon className="w-5 h-5 text-emerald-500" /> {t('chat_window.shared.links') || "Shared Links"}</>}
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
                                    <p className="text-sm font-semibold">{getSharedContentPlaceholder()}</p>
                                    <p className="text-xs opacity-70 mt-1 max-w-xs">{t('chat_window.shared.will_appear') || "Items shared will appear here."}</p>
                                </div>
                            ) : (
                                sharedContentView === 'media' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                        {getFilteredSharedContent().map(msg => (
                                            <div key={msg._id} onClick={() => setFullscreenMedia(msg)} className="aspect-square relative cursor-pointer group rounded-lg overflow-hidden border border-border/50 shadow-sm transition-transform hover:scale-[1.02]">
                                                {msg.mediaType === 'image' ? <img src={msg.mediaUrl} alt="Shared" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/80 flex items-center justify-center"><PlaySquare className="w-10 h-10 text-white/70" /></div>}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ImageIcon className="w-6 h-6 text-white" /></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {getFilteredSharedContent().map(msg => (
                                            sharedContentView === 'docs' ? (
                                                <div key={msg._id} className="flex items-center gap-4 bg-muted/40 p-3.5 rounded-xl border border-border/50 shadow-sm transition-all hover:bg-muted/60">
                                                    <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20"><FileText className="w-5 h-5" /></div>
                                                    <div className="flex-1 min-w-0 cursor-pointer hover:underline" onClick={() => downloadToLocal(msg.mediaUrl)}>
                                                        <span className="text-[13.5px] font-semibold truncate block">{msg.mediaUrl.split('/').pop().split('?')[0] || t('chat_window.shared.shared_doc')}</span>
                                                        <p className="text-[11px] opacity-70 mt-0.5">{formatBytes(msg.fileSize)} • {msg.mediaUrl.split('.').pop().toUpperCase()}</p>
                                                    </div>
                                                    <button onClick={() => downloadToLocal(msg.mediaUrl)} className="p-2.5 text-muted-foreground hover:bg-muted rounded-full shrink-0 transition-colors"><Download className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div key={msg._id} className="flex items-center gap-4 bg-muted/40 p-3.5 rounded-xl border border-border/50 shadow-sm transition-all hover:bg-muted/60">
                                                    <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20"><LinkIcon className="w-5 h-5" /></div>
                                                    <a href={msg.text} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-medium text-blue-500 hover:underline truncate flex-1 block">{msg.text}</a>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                <ChatSidebar
                    currentUserId={currentUserId}
                    activeChat={activeChat}
                    setActiveChat={setActiveChat}
                    setConversations={setConversations}
                    showProfileInfo={showProfileInfo}
                    setShowProfileInfo={setShowProfileInfo}
                    setShowAddMemberModal={setShowAddMemberModal}
                    setShowLeaveGroupModal={setShowLeaveGroupModal}
                />
            </div>
        </div>
    );
};

export default ChatWindow;