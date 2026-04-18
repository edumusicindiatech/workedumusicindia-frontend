import React, { useRef, useState } from "react";
import { X, Users, Camera, Trash, Edit2, ShieldAlert, ShieldCheck, MoreVertical, LogOut, Check } from "lucide-react";
import api from "../../api/axios";
import axios from "axios";
import toast from "react-hot-toast";
import { compressImage } from "../../utils/chatUtils";
import { useTranslation } from "react-i18next";

const ChatSidebar = ({
    currentUserId,
    activeChat,
    setActiveChat,
    setConversations,
    showProfileInfo,
    setShowProfileInfo,
    setShowAddMemberModal,
    setShowLeaveGroupModal
}) => {
    const { t } = useTranslation();
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [editGroupName, setEditGroupName] = useState("");
    const [memberMenuOpen, setMemberMenuOpen] = useState(null);
    const groupIconInputRef = useRef(null);

    const isGroupChat = activeChat?.members !== undefined || activeChat?.isGroup;

    const myRoleInGroup = () => {
        if (!isGroupChat) return null;
        if (String(activeChat.creator?._id || activeChat.creator) === String(currentUserId)) return 'creator';
        if (activeChat.admins?.some(a => String(a._id || a) === String(currentUserId))) return 'admin';
        return 'member';
    };

    const canEditGroup = isGroupChat && (myRoleInGroup() === 'admin' || myRoleInGroup() === 'creator');

    const handleSaveGroupName = async () => {
        if (!editGroupName.trim() || editGroupName === activeChat.name) {
            return setIsEditingGroupName(false);
        }
        const tid = toast.loading(t('toast.updating_group_name'));
        try {
            await api.put('/group/update', {
                groupId: activeChat._id,
                name: editGroupName,
                requesterId: currentUserId
            });

            setActiveChat(prev => ({ ...prev, name: editGroupName }));
            setConversations(prev => prev.map(c => String(c._id) === String(activeChat._id) ? { ...c, name: editGroupName } : c));

            setIsEditingGroupName(false);
            toast.success(t('toast.group_name_updated'), { id: tid });
        } catch (e) {
            toast.error(t('toast.failed_update_group_name'), { id: tid });
        }
    };

    const handleGroupIconChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const tid = toast.loading(t('toast.uploading_group_icon'));
        try {
            const compressedFile = await compressImage(file, 600, 0.8);
            let mimeType = compressedFile.type || 'image/jpeg';

            const urlRes = await api.post('/chat/generate-presigned-url', {
                fileType: mimeType,
                originalName: compressedFile.name
            });

            await axios.put(urlRes.data.presignedUrl, compressedFile, {
                headers: { 'Content-Type': mimeType }
            });

            const newIconUrl = urlRes.data.publicUrl.startsWith('http') ? urlRes.data.publicUrl : `https://${urlRes.data.publicUrl}`;

            await api.put('/group/update', {
                groupId: activeChat._id,
                groupIcon: newIconUrl,
                requesterId: currentUserId
            });

            setActiveChat(prev => ({ ...prev, groupIcon: newIconUrl }));
            setConversations(prev => prev.map(c => String(c._id) === String(activeChat._id) ? { ...c, groupIcon: newIconUrl } : c));

            toast.success(t('toast.group_icon_updated'), { id: tid });
        } catch (e) {
            toast.error(t('toast.failed_upload_group_icon'), { id: tid });
        } finally {
            if (groupIconInputRef.current) groupIconInputRef.current.value = null;
        }
    };

    const handleRemoveGroupIcon = async (e) => {
        if (e) e.stopPropagation();
        const tid = toast.loading(t('toast.removing_group_icon'));
        try {
            await api.put('/group/update', {
                groupId: activeChat._id,
                groupIcon: "",
                requesterId: currentUserId
            });

            setActiveChat(prev => ({ ...prev, groupIcon: "" }));
            setConversations(prev => prev.map(c => String(c._id) === String(activeChat._id) ? { ...c, groupIcon: "" } : c));

            toast.success(t('toast.group_icon_removed'), { id: tid });
        } catch (err) {
            toast.error(t('toast.failed_remove_group_icon'), { id: tid });
        }
    };

    const handleGroupAction = async (action, targetUserId) => {
        setMemberMenuOpen(null);
        try {
            let endpoint = '';
            if (action === 'remove') endpoint = '/group/remove-member';
            else if (action === 'promote') endpoint = '/group/promote';
            else if (action === 'demote') endpoint = '/group/demote';

            await api.put(endpoint, { groupId: activeChat._id, requesterId: currentUserId, targetUserId });
            toast.success(t('toast.action_completed'));
        } catch (e) { toast.error(t('toast.action_failed')); }
    };

    return (
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[320px] lg:w-87.5 bg-card border-l border-border/50 transform transition-transform duration-300 ease-out flex flex-col z-40 ${showProfileInfo ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
            <div className="h-16 md:h-17.5 px-3 md:px-4 flex items-center gap-3 border-b border-border/40 shrink-0">
                <button onClick={() => setShowProfileInfo(false)} className="p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5" /></button>
                <h2 className="text-lg font-semibold text-foreground">{isGroupChat ? t('chat_sidebar.group_info') : t('chat_sidebar.contact_info')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center pt-8 space-y-6 pb-20">

                {/* GROUP ICON / AVATAR */}
                <div className="w-36 h-36 md:w-44 md:h-44 relative group/avatar mx-auto">
                    {activeChat.profilePicture || activeChat.groupIcon ? (
                        <img src={activeChat.profilePicture || activeChat.groupIcon} className="w-full h-full rounded-full object-cover shadow-lg border-2 border-background" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-5xl md:text-6xl shadow-lg border-2 border-background">
                            {isGroupChat ? <Users className="w-20 h-20" /> : activeChat.name?.charAt(0)}
                        </div>
                    )}

                    {/* EDIT ICON OVERLAY */}
                    {canEditGroup && (
                        <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity duration-200 ease-out backdrop-blur-md gap-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); groupIconInputRef.current?.click(); }}
                                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex flex-col items-center justify-center text-white transition-colors"
                                title={t('chat_sidebar.change_photo')}
                            >
                                <Camera className="w-5 h-5" />
                            </button>

                            {activeChat.groupIcon && (
                                <button
                                    onClick={handleRemoveGroupIcon}
                                    className="w-12 h-12 bg-rose-500/20 hover:bg-rose-500/40 rounded-full flex flex-col items-center justify-center text-rose-500 hover:text-rose-100 transition-colors"
                                    title={t('chat_sidebar.remove_photo')}
                                >
                                    <Trash className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                    <input type="file" ref={groupIconInputRef} hidden accept="image/*" onChange={handleGroupIconChange} />
                </div>

                {/* GROUP NAME & DETAILS */}
                <div className="text-center px-6 w-full border-b border-border/40 pb-6">
                    {isEditingGroupName && canEditGroup ? (
                        <div className="flex items-center gap-2 max-w-62.5 mx-auto mb-2 animate-in fade-in zoom-in-95 duration-200 ease-out">
                            <input
                                type="text"
                                value={editGroupName}
                                onChange={e => setEditGroupName(e.target.value)}
                                className="flex-1 w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-all"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveGroupName()}
                            />
                            <button onClick={handleSaveGroupName} className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors shrink-0"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setIsEditingGroupName(false)} className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md transition-colors shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="text-2xl font-bold text-foreground tracking-tight">{activeChat.name}</h2>
                            {canEditGroup && (
                                <button
                                    onClick={() => { setEditGroupName(activeChat.name); setIsEditingGroupName(true); }}
                                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {!isGroupChat && (
                        <>
                            <p className="text-[15px] text-muted-foreground font-medium mt-1 truncate">{activeChat.email}</p>
                            <p className="text-[14px] text-muted-foreground mt-0.5">{activeChat.role || t('chat_sidebar.employee_role')}</p>
                        </>
                    )}
                    {isGroupChat && <p className="text-[14px] text-muted-foreground mt-1">{t('chat_sidebar.members_count', { count: activeChat.members?.length || 0 })}</p>}
                </div>

                {/* Group Members List */}
                {isGroupChat && (
                    <div className="w-full px-2">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('chat_sidebar.participants')}</span>
                            {(myRoleInGroup() === 'admin' || myRoleInGroup() === 'creator') && (
                                <button onClick={() => setShowAddMemberModal(true)} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-md">
                                    {t('chat_sidebar.add_member')}
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
                                            <span className="text-sm font-semibold text-foreground truncate">{isMeInGroup ? t('chat_sidebar.you') : mUser.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">{mUser.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isCreator && <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/20"><ShieldAlert className="w-3 h-3" /> {t('chat_sidebar.role_creator')}</span>}
                                        {isAdmin && !isCreator && <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-500/20"><ShieldCheck className="w-3 h-3" /> {t('chat_sidebar.role_admin')}</span>}

                                        {!isMeInGroup && (myRoleInGroup() === 'admin' || myRoleInGroup() === 'creator') && (
                                            <div className="relative">
                                                <button onClick={() => setMemberMenuOpen(memberMenuOpen === mUser._id ? null : mUser._id)} className="member-action-btn p-1.5 text-muted-foreground hover:bg-muted rounded-full opacity-0 group-hover/member:opacity-100 transition-opacity">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {memberMenuOpen === mUser._id && (
                                                    <div className="member-dropdown absolute right-0 top-8 w-40 bg-card border border-border shadow-2xl rounded-xl py-1 z-50 animate-in zoom-in-95 duration-200 ease-out origin-top-right">
                                                        {myRoleInGroup() === 'creator' && isAdmin && !isCreator && <button onClick={() => handleGroupAction('demote', mUser._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground font-medium transition-colors">{t('chat_sidebar.action_demote')}</button>}
                                                        {(myRoleInGroup() === 'creator' || myRoleInGroup() === 'admin') && !isAdmin && !isCreator && <button onClick={() => handleGroupAction('promote', mUser._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground font-medium transition-colors">{t('chat_sidebar.action_promote')}</button>}
                                                        {!isCreator && <button onClick={() => handleGroupAction('remove', mUser._id)} className="w-full text-left px-3 py-2 text-sm hover:bg-rose-500/10 text-rose-500 font-medium transition-colors">{t('chat_sidebar.action_remove')}</button>}
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
                        <LogOut className="w-5 h-5" /> {t('chat_sidebar.leave_group')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;