import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { Search, ArrowLeft } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

if (!window.__GLOBAL_SOCKET__) {
    window.__GLOBAL_SOCKET__ = io(import.meta.env.VITE_BASE_URL || "http://localhost:5000", { autoConnect: true });
}
const socket = window.__GLOBAL_SOCKET__;

// FIX: Merge audio objects to prevent race conditions causing missing sounds
window.__GLOBAL_AUDIO__ = window.__GLOBAL_AUDIO__ || {};
if (!window.__GLOBAL_AUDIO__.notification) window.__GLOBAL_AUDIO__.notification = new Audio('/sounds/notification-ting.mp3');
if (!window.__GLOBAL_AUDIO__.sent) window.__GLOBAL_AUDIO__.sent = new Audio('/sounds/sent.mp3');
if (!window.__GLOBAL_AUDIO__.message) window.__GLOBAL_AUDIO__.message = new Audio('/sounds/message.mp3');
if (!window.__GLOBAL_AUDIO__.sos) window.__GLOBAL_AUDIO__.sos = new Audio('/sounds/sos.mp3');
if (!window.__GLOBAL_AUDIO__.incoming) window.__GLOBAL_AUDIO__.incoming = new Audio('/sounds/incoming.mp3');
if (!window.__GLOBAL_AUDIO__.hangup) window.__GLOBAL_AUDIO__.hangup = new Audio('/sounds/hangup.mp3');
if (!window.__GLOBAL_AUDIO__.calling) window.__GLOBAL_AUDIO__.calling = new Audio('/sounds/calling.mp3');
if (!window.__GLOBAL_AUDIO__.ringing) window.__GLOBAL_AUDIO__.ringing = new Audio('/sounds/ringing.mp3');

const playAudio = (type) => {
    try {
        // Use window.__GLOBAL_AUDIO__ for SharedChat, or globalAudio for the Navbars
        const audioStore = typeof globalAudio !== 'undefined' ? globalAudio : window.__GLOBAL_AUDIO__;
        const snd = audioStore?.[type];

        if (snd) {
            // Only play and reset if the audio is currently paused
            if (snd.paused) {
                snd.currentTime = 0;
                snd.play().catch(e => console.warn(`Audio blocked:`, e));
            }
        }
    } catch (e) { }
};

const SharedChat = () => {
    const { t } = useTranslation();
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const currentUserId = user?.id || user?._id;

    // Global Chat Data
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [unreadMap, setUnreadMap] = useState({});

    // Global Modals (Groups)
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [createGroupName, setCreateGroupName] = useState("");
    const [createGroupSearchQuery, setCreateGroupSearchQuery] = useState("");
    const [createGroupSelectedUsers, setCreateGroupSelectedUsers] = useState([]);

    // API loading states
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isFetchingMessages, setIsFetchingMessages] = useState(false);

    // Helper to get the most recent timestamp for a chat
    const getLatestTimestamp = (chat) => {
        // Check for a local temporary timestamp first (set by moveToTop)
        if (chat.tempUpdatedAt) return new Date(chat.tempUpdatedAt).getTime();

        // For groups, use updatedAt
        if (chat.isGroup) return new Date(chat.updatedAt || chat.createdAt || 0).getTime();

        // For 1-on-1, try to find the last message time if your API sends it
        // If your API doesn't send lastMessage time, it will fallback to 0 (bottom of list)
        return new Date(chat.lastMessageAt || chat.updatedAt || chat.createdAt || 0).getTime();
    };

    const moveToTop = useCallback((userId, messageData = null) => {
        setConversations(prev => {
            const index = prev.findIndex(c => String(c._id || c.id) === String(userId));
            if (index === -1) return prev;

            const updated = [...prev];
            const chat = { ...updated[index] }; // Clone to mutate safely

            // Set a temporary timestamp so it survives a simple re-render
            chat.tempUpdatedAt = new Date().toISOString();

            // 🟢 NEW: Attach the latest message data for the preview
            if (messageData) {
                chat.lastMessage = messageData;
            }

            if (index === 0) {
                updated[0] = chat;
                return updated;
            }

            updated.splice(index, 1);
            updated.unshift(chat);
            return updated;
        });
    }, []);

    useEffect(() => {
        if (conversations.length > 0 && !activeChat) {
            const savedChatId = sessionStorage.getItem('activeChatId');
            if (savedChatId) {
                const chatToRestore = conversations.find(c => String(c._id || c.id) === savedChatId);
                if (chatToRestore) handleSelectChat(chatToRestore);
            }
        }
    }, [conversations]);

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
            const incomingChatId = data.isGroup ? String(data.groupId || data.recipientId) : String(data.senderId || (data.sender?._id || data.sender));
            const isActivelyChatting = activeChat && (String(activeChat._id || activeChat.id) === incomingChatId);

            socket.emit("message_delivered", { senderId: data.senderId, recipientId: currentUserId });

            moveToTop(incomingChatId, data);

            if (isActivelyChatting) {
                setMessages((prev) => [...prev, data]);
                if (!data.isGroup) socket.emit("mark_chat_seen", { senderId: data.senderId, recipientId: currentUserId });
                if (!document.hidden) playAudio('message');
            } else {
                const isMobile = window.innerWidth < 768;
                const isDeepInAnotherChat = isMobile && activeChat !== null;

                if (!document.hidden && !isDeepInAnotherChat) {
                    playAudio('notification');
                    toast.success(data.isGroup ? t('toast.new_msg_group', { name: data.groupName || 'Group' }) : t('toast.new_msg'), { icon: '💬', id: `chat-msg-${data.senderId}` });
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

        const handleAddedToGroup = (groupData) => {
            groupData.isGroup = true;
            groupData.tempUpdatedAt = new Date().toISOString(); // Force to top
            setConversations(prev => {
                if (prev.some(c => String(c._id) === String(groupData._id))) return prev;
                return [groupData, ...prev];
            });
            toast.success(t('toast.added_to_group', { name: groupData.name }), { icon: '👥' });
            playAudio('notification');
            socket.emit('join_group_room', groupData._id);
        };

        const handleGroupUpdated = (updatedGroup) => {
            updatedGroup.isGroup = true;
            setConversations(prev => prev.map(c => String(c._id) === String(updatedGroup._id) ? updatedGroup : c));

            if (activeChat && String(activeChat._id) === String(updatedGroup._id)) {
                const amIMember = updatedGroup.members.some(m => String(m.user._id || m.user) === String(currentUserId));
                if (!amIMember) {
                    setActiveChat(null);
                    toast.error(t('toast.removed_from_group', { name: updatedGroup.name }));
                } else {
                    setActiveChat(updatedGroup);
                }
            }
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.map(m => (m._id === messageId || m.id === messageId) ? { ...m, text: "", mediaUrl: "", isDeletedForEveryone: true } : m));
        };

        const handleMessagesStatusUpdate = ({ viewerId, status }) => {
            if (activeChat && String(activeChat._id || activeChat.id) === String(viewerId)) {
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
            socket.off("connect", joinChatRoom);
            socket.off("online_users_updated", setOnlineUsers);
            socket.off("receive_message", handleReceiveMessage);
            socket.off("added_to_group", handleAddedToGroup);
            socket.off("group_updated", handleGroupUpdated);
            socket.off("message_deleted", handleMessageDeleted);
            socket.off("messages_status_update", handleMessagesStatusUpdate);
            socket.off("messages_deleted_everyone", handleMessagesDeletedEveryone);
        };
    }, [currentUserId, activeChat, moveToTop, t]);

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

            // --- WHATSAPP-LIKE SORTING ---
            // Sort by the most recent timestamp available for each chat
            allChats.sort((a, b) => {
                const timeA = getLatestTimestamp(a);
                const timeB = getLatestTimestamp(b);
                return timeB - timeA;
            });

            setConversations(allChats);
            setUnreadMap(initialUnread);

        } catch (error) { toast.error(t('toast.load_contacts_failed')); }
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
    };

    const handleCreateGroup = async () => {
        if (!createGroupName.trim()) return toast.error(t('toast.group_name_req'));
        if (createGroupSelectedUsers.length === 0) return toast.error(t('toast.select_member_req'));
        const tid = toast.loading(t('toast.creating_group'));
        try {
            const res = await api.post('/group/create', { name: createGroupName, creatorId: currentUserId, memberIds: createGroupSelectedUsers });
            if (res.data.success) {
                const newGroup = { ...res.data.data, isGroup: true, tempUpdatedAt: new Date().toISOString() };

                // Add new group to the top naturally
                setConversations(prev => [newGroup, ...prev]);
                setShowCreateGroupModal(false); setCreateGroupName(""); setCreateGroupSelectedUsers([]); setActiveChat(newGroup);
                toast.success(t('toast.group_created'), { id: tid });
                socket.emit('join_group_room', newGroup._id);
            }
        } catch (error) { toast.error(t('toast.group_create_failed'), { id: tid }); }
    };

    return (
        <>
            {/* CREATE GROUP MODAL */}
            {showCreateGroupModal && (
                <div className="fixed inset-0 z-1000000 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-sm md:max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[75vh]">
                        <div className="p-4 md:p-5 border-b border-border/50 bg-muted/20">
                            <h3 className="text-lg font-bold text-foreground mb-4">{t('shared_chat.modal.title')}</h3>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder={t('shared_chat.modal.name_placeholder')}
                                    value={createGroupName}
                                    onChange={(e) => setCreateGroupName(e.target.value)}
                                    className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                />
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input type="text" placeholder={t('shared_chat.modal.search_placeholder')} value={createGroupSearchQuery} onChange={(e) => setCreateGroupSearchQuery(e.target.value)} className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <div className="px-3 pt-2 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('shared_chat.modal.select_members')}</div>
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
                            <span className="text-sm font-medium text-muted-foreground">{t('shared_chat.modal.selected_count', { count: createGroupSelectedUsers.length })}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setShowCreateGroupModal(false); setCreateGroupSelectedUsers([]); setCreateGroupName(""); setCreateGroupSearchQuery(""); }} className="px-4 py-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">{t('shared_chat.modal.cancel')}</button>
                                <button onClick={handleCreateGroup} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-2">
                                    {t('shared_chat.modal.create')} <ArrowLeft className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed top-16 inset-x-0 bottom-16 xl:bottom-0 z-30 flex bg-background dark:bg-[#0B0D12] overflow-hidden animate-in fade-in duration-300">

                <ChatList
                    conversations={conversations}
                    activeChat={activeChat}
                    unreadMap={unreadMap}
                    onlineUsers={onlineUsers}
                    isLoadingChats={isLoadingChats}
                    onSelectChat={handleSelectChat}
                    onNewGroup={() => setShowCreateGroupModal(true)}
                />

                <ChatWindow
                    user={user}
                    currentUserId={currentUserId}
                    activeChat={activeChat}
                    setActiveChat={setActiveChat}
                    messages={messages}
                    setMessages={setMessages}
                    conversations={conversations}
                    setConversations={setConversations}
                    onlineUsers={onlineUsers}
                    isFetchingMessages={isFetchingMessages}
                    moveToTop={moveToTop}
                />
            </div>
        </>
    );
};

export default SharedChat;