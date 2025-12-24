// This file will be merged into TabScreens.tsx
// DISCOVERY SCREEN IMPLEMENTATION

export const DiscoveryScreen: React.FC = () => {
    const { posts, trendingUsers, products } = useGlobalState();
    const dispatch = useGlobalDispatch();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'people' | 'posts' | 'products' | 'spaces'>('all');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any>(null);
    const [showCreatePost, setShowCreatePost] = useState(false);

    // Load initial data
    useEffect(() => {
        loadDiscoveryData();
    }, []);

    const loadDiscoveryData = async () => {
        setLoading(true);
        try {
            const [trendingPeople, publicPosts, popularProducts] = await Promise.all([
                api.discovery.getTrendingPeople(10),
                api.discovery.getPublicPosts(20),
                api.discovery.getPopularProducts(20)
            ]);

            dispatch({ type: 'SET_TRENDING_USERS', payload: trendingPeople });
            dispatch({ type: 'SET_POSTS', payload: publicPosts });
            // Products already loaded in global state
        } catch (e) {
            console.error('Load discovery data error:', e);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await api.discovery.search(searchQuery, activeFilter);
                setSearchResults(results);
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter]);

    const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
        try {
            if (isFollowing) {
                await api.discovery.unfollowUser(userId);
            } else {
                await api.discovery.followUser(userId);
            }
            dispatch({ type: 'TOGGLE_FOLLOW_USER', payload: { userId, isFollowing: !isFollowing } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        }
    };

    const handlePostLike = async (postId: string, isLiked: boolean) => {
        try {
            if (isLiked) {
                await api.discovery.unlikePost(postId);
            } else {
                await api.discovery.likePost(postId);
            }
            dispatch({ type: 'TOGGLE_POST_LIKE', payload: { postId, isLiked: !isLiked } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        }
    };

    const handleShare = async (postId: string) => {
        try {
            await api.discovery.sharePost(postId);
            dispatch({ type: 'UPDATE_POST_COUNTS', payload: { postId, sharesCount: undefined } });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Post shared!' } });
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        }
    };

    const displayPosts = searchResults ? searchResults.posts : posts;
    const displayPeople = searchResults ? searchResults.people : trendingUsers;
    const displayProducts = searchResults ? searchResults.products : products;

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto no-scrollbar pb-32">
            <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />

            {/* Header with Search */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users, spaces, products..."
                            className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 transition-all"
                        />
                        {loading && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 text-[#ff1744] animate-spin" />}
                    </div>
                    <button
                        onClick={() => setShowCreatePost(true)}
                        className="p-3.5 bg-[#ff1744] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {(['all', 'people', 'posts', 'products', 'spaces'] as const).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeFilter === filter
                                    ? 'bg-[#ff1744] text-white shadow-lg shadow-red-500/20'
                                    : 'bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Trending People */}
                {(activeFilter === 'all' || activeFilter === 'people') && displayPeople.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Trending People</h3>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {displayPeople.map(user => (
                                <div key={user.id} className="flex-shrink-0 w-32">
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 text-center">
                                        <div className="relative inline-block mb-3">
                                            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                                            {user.isVerified && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#ff1744] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate mb-1">{user.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold mb-3">{user.followersCount} followers</p>
                                        <button
                                            onClick={() => handleFollowToggle(user.id, user.isFollowing || false)}
                                            className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${user.isFollowing
                                                    ? 'bg-gray-100 dark:bg-slate-800 text-slate-500'
                                                    : 'bg-[#ff1744] text-white shadow-md'
                                                }`}
                                        >
                                            {user.isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Public Posts */}
                {(activeFilter === 'all' || activeFilter === 'posts') && displayPosts.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Public Posts</h3>
                        <div className="space-y-4">
                            {displayPosts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onLike={() => handlePostLike(post.id, post.isLiked || false)}
                                    onShare={() => handleShare(post.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Popular Products */}
                {(activeFilter === 'all' || activeFilter === 'products') && displayProducts.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Popular Products</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {displayProducts.slice(0, 6).map(product => (
                                <div key={product.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 group">
                                    <div className="aspect-square bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                        <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate mb-1">{product.title}</h4>
                                        <p className="text-[#ff1744] font-black text-lg mb-2">${product.price}</p>
                                        <button
                                            onClick={() => dispatch({ type: 'ADD_TO_CART', payload: product })}
                                            className="w-full py-2 bg-[#ff1744] text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Quick Buy
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && displayPosts.length === 0 && displayPeople.length === 0 && displayProducts.length === 0 && (
                    <div className="py-20 text-center opacity-30">
                        <Compass className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {searchQuery ? 'No results found' : 'No content available'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Post Card Component
const PostCard: React.FC<{ post: any; onLike: () => void; onShare: () => void }> = ({ post, onLike, onShare }) => {
    const [showComments, setShowComments] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            {/* Post Header */}
            <div className="p-4 flex items-center gap-3">
                <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">{post.userName}</h4>
                    <p className="text-[9px] text-slate-400 font-bold">{post.timestamp}</p>
                </div>
                <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-3">
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{post.content}</p>
            </div>

            {/* Post Media */}
            {post.mediaUrl && post.mediaType === 'image' && (
                <div className="w-full bg-gray-100 dark:bg-slate-800">
                    <img src={post.mediaUrl} alt="" className="w-full object-cover max-h-96" />
                </div>
            )}

            {/* Post Actions */}
            <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onLike}
                        className="flex items-center gap-2 group"
                    >
                        <Heart className={`w-5 h-5 transition-all ${post.isLiked ? 'fill-[#ff1744] text-[#ff1744]' : 'text-slate-400 group-hover:text-[#ff1744]'}`} />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.likesCount}</span>
                    </button>
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 group"
                    >
                        <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-[#ff1744] transition-colors" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.commentsCount}</span>
                    </button>
                    <button
                        onClick={onShare}
                        className="flex items-center gap-2 group"
                    >
                        <Share2 className="w-5 h-5 text-slate-400 group-hover:text-[#ff1744] transition-colors" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{post.sharesCount}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Create Post Modal
const CreatePostModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const dispatch = useGlobalDispatch();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePost = async () => {
        if (!content.trim()) return;

        setLoading(true);
        try {
            const post = await api.discovery.createPost({ content, visibility: 'public' });
            dispatch({ type: 'ADD_POST', payload: post });
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Post created!' } });
            onClose();
            setContent('');
        } catch (e: any) {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: e.message } });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Create Post</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#ff1744]/20 min-h-[150px]"
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePost}
                        disabled={!content.trim() || loading}
                        className="px-6 py-3 bg-[#ff1744] text-white rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};
