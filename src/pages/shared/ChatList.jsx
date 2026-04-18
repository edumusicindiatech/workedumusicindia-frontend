import React, { useState, useRef, useCallback, useEffect } from "react";
import { Search, MoreVertical, Users } from "lucide-react";

const ChatList = ({
    conversations,
    activeChat,
    unreadMap,
    onlineUsers,
    isLoadingChats,
    onSelectChat,
    onNewGroup
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSidebarMenu, setShowSidebarMenu] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const isResizing = useRef(false);
    const sidebarMenuRef = useRef(null);

    const isOnline = (id) => onlineUsers.includes(id?.toString());
    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        const handleClickOutside = (event) => {
            if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(event.target)) {
                setShowSidebarMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
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
                                <button onClick={() => { setShowSidebarMenu(false); onNewGroup(); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg text-sm font-medium"><Users className="w-4 h-4" /> New group</button>
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
                            <div key={userId} onClick={() => onSelectChat(chatUser)} className={`flex items-center gap-3.5 p-3 cursor-pointer rounded-xl transition-all duration-200 ${isActive ? 'bg-muted dark:bg-[#1A1D24]' : 'hover:bg-muted/50 dark:hover:bg-[#16181F]'}`}>
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
    );
};

export default ChatList;