import React, { useState, useEffect, useRef } from "react";
import { X, Search, ShieldAlert, Download, Trash2, Image as ImageIcon, Video, FileText, Users, ShieldCheck, ArrowLeft, AlertOctagon } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ChatAuditModal = ({ employee, onClose }) => {
    const { t } = useTranslation();
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Dialog States
    const [messageToWipe, setMessageToWipe] = useState(null);
    const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchAuditChats = async () => {
            try {
                const res = await api.get(`/admin/employees/${employee._id || employee.id}/audit-chats`);
                if (res.data.success) setChats(res.data.data);
            } catch (error) {
                toast.error(t('toast.error') || "Failed to load audit chats.");
            } finally {
                setIsLoadingChats(false);
            }
        };
        fetchAuditChats();
    }, [employee, t]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeChat) return;
            setIsLoadingMessages(true);
            setMessages([]);
            try {
                const res = await api.get(`/admin/audit/messages?targetId=${activeChat.id}&isGroup=${activeChat.isGroup}`);
                if (res.data.success) setMessages(res.data.data);
            } catch (error) {
                toast.error(t('toast.error') || "Failed to load messages.");
            } finally {
                setIsLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [activeChat, t]);

    useEffect(() => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Single Message Wipe Execute
    const executeHardDelete = async () => {
        if (!messageToWipe) return;
        const tid = toast.loading(t('toast.loading') || "Permanently deleting...");
        try {
            const res = await api.delete(`/admin/audit/message/${messageToWipe}`);
            if (res.data.success) {

                setMessages(prev => {
                    // 1. Filter out the deleted message
                    const newMessages = prev.filter(m => m._id !== messageToWipe);

                    // 2. 🟢 THE FIX: If this was the absolute last message, remove the chat from the sidebar
                    if (newMessages.length === 0 && activeChat) {
                        setChats(currentChats => currentChats.filter(c => c.id !== activeChat.id));
                        setActiveChat(null); // Deselect the chat since it no longer exists
                    }

                    return newMessages;
                });

                toast.success(t('toast.success') || "Message permanently wiped.", { id: tid });
            }
        } catch (error) {
            toast.error(t('toast.error') || "Failed to execute hard delete.", { id: tid });
        } finally {
            setMessageToWipe(null);
        }
    };

    // Bulk Chat Wipe Execute
    const executeClearChat = async () => {
        if (!activeChat) return;
        const tid = toast.loading(t('toast.loading') || "Destroying chat history...");
        try {
            const res = await api.delete(`/admin/audit/chat`, {
                data: { targetId: activeChat.id, isGroup: activeChat.isGroup }
            });
            if (res.data.success) {
                setMessages([]);
                toast.success(t('toast.success') || "Entire chat history wiped.", { id: tid });
            }
        } catch (error) {
            toast.error(t('toast.error') || "Failed to clear chat.", { id: tid });
        } finally {
            setShowClearChatConfirm(false);
        }
    };

    const handleDirectDownload = async (url, fileName) => {
        const tid = toast.loading(t('toast.loading') || "Downloading securely...");
        try {
            const response = await api.post('/admin/generate-download-url', { fileUrl: url }).catch(() => null);
            if (response?.data?.success && response.data.downloadUrl) {
                const a = document.createElement('a');
                a.href = response.data.downloadUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success(t('toast.success') || "Download started!", { id: tid });
            } else {
                const res = await fetch(url);
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = fileName || "secure_audit_file";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                toast.success(t('toast.success') || "Download complete!", { id: tid });
            }
        } catch (error) {
            toast.error(t('toast.error') || "Download failed. Opening in secure tab.", { id: tid });
            window.open(url, '_blank');
        }
    };

    const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="fixed inset-0 z-99999 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 pt-24 animate-in fade-in duration-300">

            {/* SINGLE MESSAGE WIPE DIALOG */}
            {messageToWipe && (
                <div className="absolute inset-0 z-100000 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 border border-rose-500/30">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-2">
                            <AlertOctagon className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-foreground mb-1">{t('modal.audit.wipe_message_title') || "Permanently Wipe Message?"}</h3>
                            <p className="text-sm text-muted-foreground">{t('modal.audit.wipe_message_desc') || "This will completely erase the message and its media from the server. This cannot be undone."}</p>
                        </div>
                        <div className="flex gap-3 w-full mt-4">
                            <button onClick={() => setMessageToWipe(null)} className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors">{t('modal.common.cancel') || "Cancel"}</button>
                            <button onClick={executeHardDelete} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors">{t('modal.audit.wipe') || "Wipe"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ENTIRE CHAT WIPE DIALOG */}
            {showClearChatConfirm && (
                <div className="absolute inset-0 z-100000 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 border border-rose-500/50">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-2 animate-pulse">
                            <Trash2 className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-foreground mb-2">{t('modal.audit.clear_audit_chat_title') || "Wipe Entire Chat History?"}</h3>
                            <p className="text-sm text-rose-500/80 font-medium">{t('modal.audit.clear_audit_chat_desc') || "WARNING: This destroys all messages and media in this conversation from the database and storage permanently."}</p>
                        </div>
                        <div className="flex gap-3 w-full mt-4">
                            <button onClick={() => setShowClearChatConfirm(false)} className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors">{t('modal.common.cancel') || "Cancel"}</button>
                            <button onClick={executeClearChat} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/20">{t('modal.audit.wipe_all') || "Wipe Everything"}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-card w-full max-w-6xl h-[75vh] min-h-125 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border shadow-black/50 transition-all duration-300 ease-out transform scale-100">

                {/* MODAL HEADER */}
                <div className="h-16 px-4 sm:px-6 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between shrink-0 transition-colors duration-300">
                    <div className="flex items-center gap-3 text-rose-500">
                        <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold leading-tight">Master Chat Audit</h2>
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-500/80">Inspecting: {employee.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-background/50 hover:bg-background rounded-full transition-all duration-200 active:scale-95 shadow-sm border border-transparent hover:border-border">
                        <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* LEFT SIDEBAR: CHAT LIST */}
                    <div className={`w-full md:w-1/3 md:min-w-75 border-r border-border/50 bg-background/50 flex-col transition-all duration-300 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-4 border-b border-border/40 shrink-0">
                            <div className="relative group">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder={t('chat.search_placeholder') || "Search chats..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-card border border-border/50 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {isLoadingChats ? (
                                <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading history...</div>
                            ) : filteredChats.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">No conversations found.</div>
                            ) : (
                                filteredChats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        onClick={() => setActiveChat(chat)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${activeChat?.id === chat.id ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'hover:bg-muted border border-transparent'}`}
                                    >
                                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                                            {chat.profilePicture ? (
                                                <img src={chat.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                chat.isGroup ? <Users className="w-5 h-5" /> : chat.name.charAt(0)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-foreground truncate">{chat.name}</h4>
                                            <p className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">{chat.isGroup ? 'Group Chat' : chat.role}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE: MESSAGES FEED */}
                    <div className={`flex-1 flex-col bg-[#0b141a]/95 dark:bg-[#0B0D12] relative overflow-hidden transition-all duration-300 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                        {!activeChat ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 p-6 text-center">
                                <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
                                <p className="font-medium">Select a conversation to view detailed audit logs</p>
                            </div>
                        ) : (
                            <>
                                {/* Audit Chat Header */}
                                <div className="h-16 bg-card border-b border-border/40 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-10 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button onClick={() => setActiveChat(null)} className="md:hidden p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors shrink-0">
                                            <ArrowLeft className="w-5 h-5 text-foreground" />
                                        </button>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="font-bold text-foreground truncate flex items-center gap-2 text-sm sm:text-base">
                                                Viewing: {activeChat.name}
                                                {activeChat.isGroup && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] uppercase rounded-full tracking-wider font-bold">Group</span>}
                                            </h3>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{activeChat.isGroup ? 'Group Conversation History' : 'Direct Conversation History'}</p>
                                        </div>
                                    </div>
                                    {/* CLEAR ENTIRE CHAT BUTTON */}
                                    {messages.length > 0 && (
                                        <button
                                            onClick={() => setShowClearChatConfirm(true)}
                                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-rose-500/50 text-rose-500 hover:bg-rose-500/10 rounded-lg text-xs font-bold transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Wipe Chat
                                        </button>
                                    )}
                                </div>

                                {/* Message Feed */}
                                <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar space-y-5 relative">
                                    {isLoadingMessages ? (
                                        <div className="text-center text-muted-foreground text-sm mt-10 animate-pulse">Fetching secure logs...</div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center text-muted-foreground text-sm mt-10">No messages exist in this conversation.</div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isFromAuditedUser = String(msg.sender?._id || msg.sender) === String(employee._id || employee.id);
                                            const isDeleted = msg.isDeletedForEveryone || msg.deletedFor?.includes(employee._id || employee.id);
                                            const senderName = isFromAuditedUser ? employee.name : (msg.sender?.name || activeChat.name);

                                            return (
                                                <div key={msg._id || idx} className={`flex w-full ${isFromAuditedUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                                    <div className={`relative max-w-[95%] sm:max-w-[85%] lg:max-w-[70%] group flex flex-col ${isDeleted ? 'opacity-100' : ''}`}>

                                                        {isDeleted && (
                                                            <div className="mb-2 bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)]">
                                                                <div className="bg-indigo-500/20 p-2.5 rounded-full shrink-0 self-start sm:self-auto hidden xs:block">
                                                                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1 xs:hidden">
                                                                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                                                        <h4 className="text-indigo-400 font-bold text-sm tracking-wide">Secure Archived Data.</h4>
                                                                    </div>
                                                                    <h4 className="text-indigo-400 font-bold text-sm tracking-wide hidden xs:block">Secure Archived Data.</h4>
                                                                    <p className="text-xs text-muted-foreground mt-1 whitespace-normal wrap-break-word">Media & Message Deleted by user at {formatTime(msg.createdAt)}.</p>
                                                                    {msg.mediaUrl && <p className="text-[11px] text-indigo-400/80 font-medium mt-1">Direct review download available:</p>}
                                                                </div>
                                                                {msg.mediaUrl && (
                                                                    <button onClick={() => handleDirectDownload(msg.mediaUrl, `audit_media_${msg._id}`)} className="shrink-0 mt-3 sm:mt-0 px-4 py-2 sm:p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all duration-300 active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 group/btn" title="Direct to Disk (Audit review)">
                                                                        <Download className="w-4 h-4 group-active/btn:translate-y-0.5 transition-transform" />
                                                                        <span className="text-xs font-bold sm:hidden">Download File</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl relative shadow-md border transition-all duration-300 ${isFromAuditedUser ? 'rounded-tr-sm bg-primary/20 border-primary/30 text-foreground' : 'rounded-tl-sm bg-card border-border/50 text-foreground'} ${isDeleted ? 'bg-[#1e1e24]/80! border-indigo-500/30!' : ''}`}>

                                                            <span className={`text-[11px] font-bold tracking-wide mb-1.5 block opacity-80 ${isFromAuditedUser ? 'text-primary' : 'text-blue-400'}`}>
                                                                {senderName}
                                                            </span>

                                                            {msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video') && (
                                                                <div className="relative mb-2 rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner flex flex-col">
                                                                    {msg.mediaType === 'image' ? (
                                                                        <img src={msg.mediaUrl} alt="attachment" className="max-h-56 sm:max-h-72 w-auto object-cover min-w-50" />
                                                                    ) : (
                                                                        <video src={msg.mediaUrl} controls className="max-h-56 sm:max-h-72 w-auto object-cover min-w-50" />
                                                                    )}
                                                                    <div className="bg-background/80 p-2 flex justify-between items-center border-t border-border/50">
                                                                        <span className="text-[10px] text-muted-foreground ml-2 font-medium uppercase tracking-wider">{formatBytes(msg.fileSize || 0)} • {msg.mediaType}</span>
                                                                        <button onClick={() => handleDirectDownload(msg.mediaUrl, `audit_media_${msg._id}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-bold transition-colors">
                                                                            <Download className="w-3.5 h-3.5" /> Download
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {msg.mediaUrl && msg.mediaType === 'document' && (
                                                                <div className="flex items-center gap-3 bg-background/60 p-2.5 rounded-lg mb-2 border border-border/50 shadow-sm transition-colors hover:bg-background/80">
                                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pr-4">
                                                                        <span className="text-xs sm:text-sm font-semibold truncate block">{msg.mediaUrl.split('/').pop().split('?')[0]}</span>
                                                                        <p className="text-[10px] sm:text-xs opacity-70 mt-0.5">{formatBytes(msg.fileSize || 0)}</p>
                                                                    </div>
                                                                    <button onClick={() => handleDirectDownload(msg.mediaUrl, `audit_doc_${msg._id}`)} className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-colors mr-1">
                                                                        <Download className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {msg.text && (
                                                                <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                                                                    {msg.text}
                                                                </p>
                                                            )}

                                                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/20">
                                                                <button onClick={() => setMessageToWipe(msg._id)} className="text-[10px] text-rose-500 flex items-center gap-1 hover:bg-rose-500/10 px-2 py-0.5 rounded transition-colors opacity-50 sm:opacity-0 group-hover:opacity-100">
                                                                    <Trash2 className="w-3 h-3" /> Wipe
                                                                </button>
                                                                <div className="flex items-center gap-2 opacity-60 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                                                                    {msg.isEdited && <span>Edited •</span>}
                                                                    <span>{formatTime(msg.createdAt)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                    <div ref={messagesEndRef} className="h-1" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatAuditModal;