
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

export interface Space {
  id: string;
  name: string;
  members: number;
  image: string;
  description: string;
  joined?: boolean;
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
  | { type: 'TOGGLE_PIN_CHAT'; payload: { chatId: string; isPinned: boolean } };
