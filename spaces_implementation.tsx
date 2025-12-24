// This file will be merged into TabScreens.tsx
// ENHANCED SPACES SCREEN IMPLEMENTATION

export const SpacesScreen: React.FC<{ spaces: Space[] }> = ({ spaces }) => {
    const { selectedSpaceId, spaceDetails } = useGlobalState();
    const dispatch = useGlobalDispatch();
    const [activeTab, setActiveTab] = useState<'joined' | 'explore'>('joined');
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [showCreate, setShowCreate] = useState(false);
    const [joinedSpaces, setJoinedSpaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSpaces();
    }, [activeTab]);

    const loadSpaces = async () => {
        setLoading(true);
        try {
            if (activeTab === 'joined') {
                const joined = await api.spaces.getJoinedSpaces();
                setJoinedSpaces(joined);
            }
        } catch (e) {
            console.error('Load spaces error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleJoin = async (space: Space) => {
        setLoadingIds(prev => new Set(prev).add(space.id));
        try {
            if (space.joined) {
                await api.spaces.leave(space.id);
            } else {
                await api.spaces.join(space.id);
            }
            dispatch({ type: 'JOIN_SPACE', payload: space.id });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: space.joined ? `Left ${space.name}` : `Joined ${space.name}` } });
            loadSpaces();
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        } finally {
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(space.id);
                return next;
            });
        }
    };

    const handleSpaceClick = async (spaceId: string) => {
        dispatch({ type: 'SELECT_SPACE', payload: spaceId });

        // Load space detail
        try {
            const detail = await api.spaces.getSpaceDetail(spaceId);
            if (detail) {
                dispatch({ type: 'SET_SPACE_DETAIL', payload: { spaceId, detail } });
            }
        } catch (e) {
            console.error('Load space detail error:', e);
        }
    };

    const displaySpaces = activeTab === 'joined' ? joinedSpaces : spaces.filter(s => !s.joined);

    // If a space is selected, show detail view
    if (selectedSpaceId && spaceDetails[selectedSpaceId]) {
        return <SpaceDetailView spaceId={selectedSpaceId} />;
    }

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
            <CreateSpaceModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Spaces</h2>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="p-3 bg-[#ff1744] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('joined')}
                        className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'joined'
                                ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20'
                                : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                            }`}
                    >
                        Joined
                    </button>
                    <button
                        onClick={() => setActiveTab('explore')}
                        className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'explore'
                                ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20'
                                : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                            }`}
                    >
                        Explore
                    </button>
                </div>
            </div>

            {/* Space Cards */}
            <div className="p-4 grid gap-4">
                {loading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading spaces...</p>
                    </div>
                ) : displaySpaces.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                        <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {activeTab === 'joined' ? 'No joined spaces' : 'No spaces found'}
                        </p>
                    </div>
                ) : (
                    displaySpaces.map(space => (
                        <SpaceCard
                            key={space.id}
                            space={space}
                            onToggleJoin={() => handleToggleJoin(space)}
                            onClick={() => handleSpaceClick(space.id)}
                            loading={loadingIds.has(space.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

// Space Card Component
const SpaceCard: React.FC<{ space: any; onToggleJoin: () => void; onClick: () => void; loading: boolean }> = ({ space, onToggleJoin, onClick, loading }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            {/* Banner */}
            {space.bannerImage && (
                <div className="h-32 bg-gradient-to-br from-[#ff1744] to-purple-600 overflow-hidden">
                    <img src={space.bannerImage} alt="" className="w-full h-full object-cover opacity-80" />
                </div>
            )}

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 flex-shrink-0 -mt-8 border-4 border-white dark:border-slate-900">
                        <img src={space.image} alt={space.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">{space.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{space.members.toLocaleString()} Members</p>
                    </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{space.description}</p>

                {/* Stats */}
                {space.postsCount !== undefined && (
                    <div className="flex gap-4 mb-4 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-900 dark:text-white font-black">{space.postsCount}</strong> Posts
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-900 dark:text-white font-black">{space.eventsCount}</strong> Events
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-900 dark:text-white font-black">{space.filesCount}</strong> Files
                        </span>
                    </div>
                )}

                {/* Latest Post Preview */}
                {space.latestPost && (
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 mb-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Latest Post</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{space.latestPost.content}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {space.joined ? (
                        <>
                            <button
                                onClick={onClick}
                                className="flex-1 py-3 bg-[#ff1744] text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                            >
                                Open
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleJoin(); }}
                                disabled={loading}
                                className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:text-red-500 transition-colors"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleJoin(); }}
                            disabled={loading}
                            className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Space'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Space Detail View Component
const SpaceDetailView: React.FC<{ spaceId: string }> = ({ spaceId }) => {
    const { spaceDetails, spacePosts, spaceEvents, spaceFiles, spaceMembers } = useGlobalState();
    const dispatch = useGlobalDispatch();
    const [activeTab, setActiveTab] = useState<'discussion' | 'events' | 'files' | 'members'>('discussion');
    const [loading, setLoading] = useState(false);

    const space = spaceDetails[spaceId];

    useEffect(() => {
        loadSpaceContent();
    }, [spaceId, activeTab]);

    const loadSpaceContent = async () => {
        setLoading(true);
        try {
            if (activeTab === 'discussion') {
                const posts = await api.spaces.getSpacePosts(spaceId);
                dispatch({ type: 'SET_SPACE_POSTS', payload: { spaceId, posts } });
            } else if (activeTab === 'events') {
                const events = await api.spaces.getSpaceEvents(spaceId);
                dispatch({ type: 'SET_SPACE_EVENTS', payload: { spaceId, events } });
            } else if (activeTab === 'files') {
                const files = await api.spaces.getSpaceFiles(spaceId);
                dispatch({ type: 'SET_SPACE_FILES', payload: { spaceId, files } });
            } else if (activeTab === 'members') {
                const members = await api.spaces.getSpaceMembers(spaceId);
                dispatch({ type: 'SET_SPACE_MEMBERS', payload: { spaceId, members } });
            }
        } catch (e) {
            console.error('Load space content error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        dispatch({ type: 'SELECT_SPACE', payload: null });
    };

    if (!space) return null;

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
            {/* Header with Banner */}
            <div className="relative">
                {space.bannerImage ? (
                    <div className="h-48 bg-gradient-to-br from-[#ff1744] to-purple-600 overflow-hidden">
                        <img src={space.bannerImage} alt="" className="w-full h-full object-cover opacity-80" />
                    </div>
                ) : (
                    <div className="h-48 bg-gradient-to-br from-[#ff1744] to-purple-600" />
                )}

                <button
                    onClick={handleBack}
                    className="absolute top-4 left-4 p-3 bg-black/50 backdrop-blur-md text-white rounded-2xl hover:scale-105 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-end gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900">
                            <img src={space.image} alt={space.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{space.name}</h1>
                            <p className="text-sm text-white/80">{space.members.toLocaleString()} members</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {(['discussion', 'events', 'files', 'members'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab
                                    ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20'
                                    : 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'discussion' && <SpaceDiscussionTab spaceId={spaceId} posts={spacePosts[spaceId] || []} loading={loading} />}
                {activeTab === 'events' && <SpaceEventsTab spaceId={spaceId} events={spaceEvents[spaceId] || []} loading={loading} />}
                {activeTab === 'files' && <SpaceFilesTab spaceId={spaceId} files={spaceFiles[spaceId] || []} loading={loading} />}
                {activeTab === 'members' && <SpaceMembersTab spaceId={spaceId} members={spaceMembers[spaceId] || []} loading={loading} />}
            </div>
        </div>
    );
};

// Space Discussion Tab
const SpaceDiscussionTab: React.FC<{ spaceId: string; posts: any[]; loading: boolean }> = ({ spaceId, posts, loading }) => {
    const dispatch = useGlobalDispatch();
    const [content, setContent] = useState('');
    const [posting, setPosting] = useState(false);

    const handlePost = async () => {
        if (!content.trim()) return;

        setPosting(true);
        try {
            const post = await api.spaces.createSpacePost(spaceId, { content });
            dispatch({ type: 'ADD_SPACE_POST', payload: { spaceId, post } });
            setContent('');
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Posted!' } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (postId: string, isLiked: boolean) => {
        try {
            if (isLiked) {
                await api.spaces.unlikeSpacePost(postId);
            } else {
                await api.spaces.likeSpacePost(postId);
            }
            dispatch({ type: 'TOGGLE_SPACE_POST_LIKE', payload: { spaceId, postId, isLiked: !isLiked } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        }
    };

    return (
        <div className="space-y-4">
            {/* Post Creation */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share something with the space..."
                    className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 min-h-[100px] mb-3"
                />
                <div className="flex justify-end">
                    <button
                        onClick={handlePost}
                        disabled={!content.trim() || posting}
                        className="px-6 py-2.5 bg-[#ff1744] text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {posting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Post
                    </button>
                </div>
            </div>

            {/* Posts Feed */}
            {loading ? (
                <div className="py-10 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" />
                </div>
            ) : posts.length === 0 ? (
                <div className="py-10 text-center opacity-30">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No posts yet</p>
                </div>
            ) : (
                posts.map(post => (
                    <div key={post.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 flex items-center gap-3">
                            <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                                <h4 className="font-black text-slate-900 dark:text-white text-sm">{post.userName}</h4>
                                <p className="text-[9px] text-slate-400 font-bold">{post.timestamp}</p>
                            </div>
                        </div>
                        <div className="px-4 pb-4">
                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{post.content}</p>
                        </div>
                        <div className="px-4 pb-4 flex items-center gap-6 border-t border-gray-100 dark:border-slate-800 pt-4">
                            <button
                                onClick={() => handleLike(post.id, post.isLiked || false)}
                                className="flex items-center gap-2 group"
                            >
                                <Heart className={`w-5 h-5 transition-all ${post.isLiked ? 'fill-[#ff1744] text-[#ff1744]' : 'text-slate-400 group-hover:text-[#ff1744]'}`} />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.likesCount}</span>
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Space Events Tab
const SpaceEventsTab: React.FC<{ spaceId: string; events: any[]; loading: boolean }> = ({ spaceId, events, loading }) => {
    const dispatch = useGlobalDispatch();

    const handleAttend = async (eventId: string, isAttending: boolean) => {
        try {
            if (isAttending) {
                await api.spaces.leaveEvent(eventId);
            } else {
                await api.spaces.attendEvent(eventId);
            }
            dispatch({ type: 'TOGGLE_EVENT_ATTENDANCE', payload: { spaceId, eventId, isAttending: !isAttending } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        }
    };

    if (loading) {
        return (
            <div className="py-10 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="py-10 text-center opacity-30">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No events scheduled</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-5">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#ff1744]/10 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-[#ff1744]" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-lg text-slate-900 dark:text-white mb-1">{event.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{new Date(event.eventDate).toLocaleDateString()}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{event.description}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500">{event.attendeesCount} attending</span>
                        <button
                            onClick={() => handleAttend(event.id, event.isAttending || false)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${event.isAttending
                                    ? 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                                    : 'bg-[#ff1744] text-white shadow-md'
                                }`}
                        >
                            {event.isAttending ? 'Attending' : 'Attend'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Space Files Tab
const SpaceFilesTab: React.FC<{ spaceId: string; files: any[]; loading: boolean }> = ({ spaceId, files, loading }) => {
    if (loading) {
        return (
            <div className="py-10 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" />
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="py-10 text-center opacity-30">
                <HardDrive className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No files uploaded</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            {files.map(file => (
                <div key={file.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                    <div className="w-full aspect-square bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                        <HardDrive className="w-12 h-12 text-slate-400" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-1">{file.fileName}</h4>
                    <p className="text-[9px] text-slate-400">{(file.fileSize / 1024).toFixed(1)} KB</p>
                </div>
            ))}
        </div>
    );
};

// Space Members Tab
const SpaceMembersTab: React.FC<{ spaceId: string; members: any[]; loading: boolean }> = ({ spaceId, members, loading }) => {
    if (loading) {
        return (
            <div className="py-10 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#ff1744] animate-spin" />
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="py-10 text-center opacity-30">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No members</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {members.map(member => (
                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 flex items-center gap-4">
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white">{member.name}</h4>
                            {member.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-[#ff1744] text-white text-[8px] font-black uppercase rounded-full">Admin</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">{member.bio || member.status}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
