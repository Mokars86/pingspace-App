
export enum Tab {
  CHATS = 'Chats',
  STATUS = 'Status',
  DISCOVERY = 'Discovery',
  SPACES = 'Spaces',
  MARKET = 'Market',
  PROFILE = 'Profile',
  WALLET = 'Wallet'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status?: string;
  bio?: string;
  isOnline?: boolean;
  walletBalance?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  createdAt: number;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'payment' | 'product' | 'system';
  metadata?: any;
  isStarred?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    text: string;
    sender: string;
  };
  reactions?: {
    emoji: string;
    count: number;
    userIds: string[];
  }[];
  expiresAt?: number;
}

export interface ChatSession {
  id: string;
  participant: User;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
  isGroup?: boolean;
  isPinned?: boolean;
  members?: string[];
  disappearingMode?: boolean;
  wallpaper?: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  rating: number;
  description?: string;
  category?: string;
  condition?: string;
  location?: string;
  tags?: string[];
  isAvailable?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

// Marketplace Enhancement Types
export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  reviewText: string;
  createdAt: number;
  timestamp: string;
}

export interface SellerRating {
  id: string;
  sellerId: string;
  buyerId: string;
  transactionId?: string;
  rating: number;
  review: string;
  createdAt: number;
  timestamp: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ProductDetail extends Product {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerRating: number;
  sellerReviewsCount: number;
  categoryId?: string;
  categoryName?: string;
  condition: 'new' | 'like-new' | 'used' | 'refurbished';
  stockQuantity: number;
  viewsCount: number;
  ratingAvg: number;
  reviewsCount: number;
  isFeatured: boolean;
  shippingCost: number;
  reviews?: ProductReview[];
}

export interface MarketFilters {
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'price-low' | 'price-high' | 'rating' | 'popular';
}

// Profile Enhancement Types
export interface UserDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'web' | 'desktop';
  deviceToken: string;
  lastActive: number;
  createdAt: number;
}

export interface NotificationPreferences {
  messages: boolean;
  transactions: boolean;
  marketplace: boolean;
  spaces: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowMessagesFrom: 'everyone' | 'friends' | 'none';
  showPhone: boolean;
  showEmail: boolean;
}

export interface UserProfile extends User {
  bio?: string;
  phone?: string;
  email?: string;
  coverImage?: string;
  location?: string;
  website?: string;
  lastSeen?: number;
}

export interface Space {
  id: string;
  name: string;
  members: number;
  image: string;
  description: string;
  joined?: boolean;
}

// Discovery & Social Types
export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  visibility: 'public' | 'friends' | 'private';
  createdAt: number;
  timestamp: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: number;
  timestamp: string;
}

export interface TrendingUser extends User {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isVerified?: boolean;
}

// Enhanced Space Types
export interface SpacePost {
  id: string;
  spaceId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: number;
  timestamp: string;
}

export interface SpaceEvent {
  id: string;
  spaceId: string;
  createdBy: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  description: string;
  eventDate: number;
  location: string;
  attendeesCount: number;
  isAttending?: boolean;
  createdAt: number;
  timestamp: string;
}

export interface SpaceFile {
  id: string;
  spaceId: string;
  uploadedBy: string;
  uploaderName: string;
  uploaderAvatar: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: number;
  timestamp: string;
}

export interface SpaceMember extends User {
  joinedAt: number;
  role?: 'admin' | 'moderator' | 'member';
}

export interface SpaceDetail extends Space {
  bannerImage?: string;
  descriptionLong?: string;
  category?: string;
  isPublic: boolean;
  postsCount: number;
  eventsCount: number;
  filesCount: number;
  latestPost?: SpacePost;
}

export interface Transaction {
  id: string;
  type: 'received' | 'sent' | 'withdraw' | 'deposit';
  amount: number;
  date: string;
  entity: string;
}

export interface CallLog {
  id: string;
  participant: User;
  type: 'incoming' | 'outgoing' | 'missed';
  mediaType: 'audio' | 'video';
  duration: number; // seconds
  timestamp: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface WorkspaceWidget {
  id: string;
  type: 'tasks' | 'notes' | 'calendar' | 'links';
  title: string;
  content: any;
  w: string;
}

export interface SummaryResult {
  summary: string;
  decisions: string[];
  actionItems: string[];
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'image' | 'text';
  content: string; // image url or text content
  timestamp: string;
  viewed: boolean;
  caption?: string;
  background?: string; // For text stories
}

export interface ActiveCall {
  id: string;
  participant: User;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  startTime?: number;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface AppSettings {
  language: string;
  notifications: {
    push: boolean;
    email: boolean;
    transactions: boolean;
    marketing: boolean;
  };
  privacy: {
    readReceipts: boolean;
    lastSeen: string;
    profilePhoto: string;
    about: string;
  };
  security: {
    twoFactor: boolean;
    biometric: boolean;
  };
}

export type Screen = 'splash' | 'login' | 'signup' | 'forgot-password' | 'main';

export interface GlobalState {
  isLoading: boolean;
  theme: 'light' | 'dark';
  screen: Screen;
  currentUser: User | null;
  activeTab: Tab;
  chats: ChatSession[];
  contacts: User[];
  selectedChatId: string | null;
  selectedProductId: string | null;
  cart: CartItem[];
  notifications: Notification[];
  transactions: Transaction[];
  callHistory: CallLog[];
  spaces: Space[];
  products: Product[];
  workspaceWidgets: WorkspaceWidget[];
  stories: Story[];
  activeCall: ActiveCall | null;
  isOnline: boolean;
  settings: AppSettings;
  // Discovery
  posts: Post[];
  trendingUsers: TrendingUser[];
  // Spaces Detail
  selectedSpaceId: string | null;
  spaceDetails: Record<string, SpaceDetail>;
  spacePosts: Record<string, SpacePost[]>;
  spaceEvents: Record<string, SpaceEvent[]>;
  spaceFiles: Record<string, SpaceFile[]>;
  spaceMembers: Record<string, SpaceMember[]>;
  // Marketplace Enhancement
  productDetails: Record<string, ProductDetail>;
  productReviews: Record<string, ProductReview[]>;
  productCategories: ProductCategory[];
  marketViewMode: 'grid' | 'list';
  marketSearchQuery: string;
  marketFilters: MarketFilters;
  // Profile Enhancement
  userDevices: UserDevice[];
  notificationPreferences: NotificationPreferences | null;
  privacySettings: PrivacySettings | null;
}

export type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'LOGOUT' }
  | { type: 'SET_TAB'; payload: Tab }
  | { type: 'SELECT_CHAT'; payload: string | null }
  | { type: 'SELECT_PRODUCT'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: { type: 'success' | 'error' | 'info'; message: string } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SEND_MESSAGE'; payload: { sessionId: string; text: string; type?: Message['type']; metadata?: any; replyTo?: Message['replyTo']; expiresAt?: number } }
  | { type: 'RECEIVE_MESSAGE'; payload: { sessionId: string; message: Message } }
  | { type: 'MARK_CHAT_READ'; payload: string }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_CALL_LOG'; payload: CallLog }
  | { type: 'SET_CALL_HISTORY'; payload: CallLog[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'ADD_STORY'; payload: Story }
  | { type: 'DELETE_STORY'; payload: string }
  | { type: 'ADD_SPACE'; payload: Space }
  | { type: 'JOIN_SPACE'; payload: string }
  | { type: 'CREATE_GROUP'; payload: ChatSession }
  | { type: 'ADD_CHAT'; payload: ChatSession }
  | { type: 'DELETE_CHAT'; payload: string }
  | { type: 'SET_DATA'; payload: { chats: ChatSession[], contacts: User[], products: Product[], spaces: Space[], transactions: Transaction[], stories: Story[], callHistory?: CallLog[] } }
  | { type: 'TOGGLE_TASK'; payload: { widgetId: string; taskId: string } }
  | { type: 'TOGGLE_DISAPPEARING_MODE'; payload: { sessionId: string; enabled: boolean } }
  | { type: 'TOGGLE_STAR_MESSAGE'; payload: { sessionId: string; messageId: string } }
  | { type: 'SET_CHAT_WALLPAPER'; payload: { sessionId: string; url: string } }
  | { type: 'ADD_REACTION'; payload: { sessionId: string; messageId: string; emoji: string } }
  | { type: 'DELETE_EXPIRED_MESSAGES'; payload: { sessionId: string; } }
  | { type: 'START_CALL'; payload: { participant: User; type: 'audio' | 'video' } }
  | { type: 'END_CALL' }
  | { type: 'SET_CALL_STATUS'; payload: ActiveCall['status'] }
  | { type: 'TOGGLE_CALL_MUTE' }
  | { type: 'TOGGLE_CALL_VIDEO' }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'UPDATE_SETTING'; payload: { section: keyof AppSettings; key: string; value: any } }
  | { type: 'TOGGLE_PIN_CHAT'; payload: { chatId: string; isPinned: boolean } }
  // Discovery Actions
  | { type: 'SET_POSTS'; payload: Post[] }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'TOGGLE_POST_LIKE'; payload: { postId: string; isLiked: boolean } }
  | { type: 'UPDATE_POST_COUNTS'; payload: { postId: string; likesCount?: number; commentsCount?: number; sharesCount?: number } }
  | { type: 'SET_TRENDING_USERS'; payload: TrendingUser[] }
  | { type: 'TOGGLE_FOLLOW_USER'; payload: { userId: string; isFollowing: boolean } }
  // Spaces Actions
  | { type: 'SELECT_SPACE'; payload: string | null }
  | { type: 'SET_SPACE_DETAIL'; payload: { spaceId: string; detail: SpaceDetail } }
  | { type: 'SET_SPACE_POSTS'; payload: { spaceId: string; posts: SpacePost[] } }
  | { type: 'ADD_SPACE_POST'; payload: { spaceId: string; post: SpacePost } }
  | { type: 'TOGGLE_SPACE_POST_LIKE'; payload: { spaceId: string; postId: string; isLiked: boolean } }
  | { type: 'SET_SPACE_EVENTS'; payload: { spaceId: string; events: SpaceEvent[] } }
  | { type: 'ADD_SPACE_EVENT'; payload: { spaceId: string; event: SpaceEvent } }
  | { type: 'TOGGLE_EVENT_ATTENDANCE'; payload: { spaceId: string; eventId: string; isAttending: boolean } }
  | { type: 'SET_SPACE_FILES'; payload: { spaceId: string; files: SpaceFile[] } }
  | { type: 'ADD_SPACE_FILE'; payload: { spaceId: string; file: SpaceFile } }
  | { type: 'SET_SPACE_MEMBERS'; payload: { spaceId: string; members: SpaceMember[] } }
  // Marketplace Actions
  | { type: 'SET_PRODUCT_DETAIL'; payload: { productId: string; detail: ProductDetail } }
  | { type: 'SET_PRODUCT_REVIEWS'; payload: { productId: string; reviews: ProductReview[] } }
  | { type: 'ADD_PRODUCT_REVIEW'; payload: { productId: string; review: ProductReview } }
  | { type: 'SET_PRODUCT_CATEGORIES'; payload: ProductCategory[] }
  | { type: 'SET_MARKET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_MARKET_SEARCH'; payload: string }
  | { type: 'SET_MARKET_FILTERS'; payload: MarketFilters }
  | { type: 'UPDATE_PRODUCT'; payload: { productId: string; updates: Partial<Product> } }
  // Profile Actions
  | { type: 'SET_USER_DEVICES'; payload: UserDevice[] }
  | { type: 'ADD_USER_DEVICE'; payload: UserDevice }
  | { type: 'REMOVE_USER_DEVICE'; payload: string }
  | { type: 'SET_NOTIFICATION_PREFERENCES'; payload: NotificationPreferences }
  | { type: 'UPDATE_NOTIFICATION_PREFERENCES'; payload: Partial<NotificationPreferences> }
  | { type: 'SET_PRIVACY_SETTINGS'; payload: PrivacySettings }
  | { type: 'UPDATE_PRIVACY_SETTINGS'; payload: Partial<PrivacySettings> }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> };

