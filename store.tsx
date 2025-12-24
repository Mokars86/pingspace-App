
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GlobalState, Action, User, Message, ChatSession, Product, Space, Transaction, Tab, Story, CallLog } from './types';

// --- INITIAL STATE ---
const savedTheme = localStorage.getItem('pingspace_theme') as 'light' | 'dark' || 'light';

const initialState: GlobalState = {
  isLoading: false,
  theme: savedTheme,
  screen: 'splash',
  currentUser: null,
  activeTab: Tab.CHATS,
  chats: [],
  contacts: [],
  selectedChatId: null,
  selectedProductId: null,
  cart: [],
  notifications: [],
  transactions: [],
  callHistory: [],
  spaces: [],
  products: [],
  stories: [],
  workspaceWidgets: [], // Removed mock data, will be populated by user actions in future
  activeCall: null,
  isOnline: navigator.onLine,
  settings: {
    language: 'UK English',
    notifications: {
      push: true,
      email: true,
      transactions: true,
      marketing: false
    },
    privacy: {
      readReceipts: true,
      lastSeen: 'Everyone',
      profilePhoto: 'Everyone',
      about: 'Everyone'
    },
    security: {
      twoFactor: false,
      biometric: true
    }
  },
  // Discovery
  posts: [],
  trendingUsers: [],
  // Spaces Detail
  selectedSpaceId: null,
  spaceDetails: {},
  spacePosts: {},
  spaceEvents: {},
  spaceFiles: {},
  spaceMembers: {}
};

// --- REDUCER ---
const globalReducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, currentUser: action.payload, screen: 'main' };
    case 'UPDATE_USER':
      return { ...state, currentUser: state.currentUser ? { ...state.currentUser, ...action.payload } : null };
    case 'LOGOUT':
      return { ...initialState, screen: 'login', theme: state.theme };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SELECT_CHAT':
      return { ...state, selectedChatId: action.payload };
    case 'SELECT_PRODUCT':
      return { ...state, selectedProductId: action.payload };

    case 'SET_DATA':
      return {
        ...state,
        chats: action.payload.chats,
        contacts: action.payload.contacts,
        products: action.payload.products,
        spaces: action.payload.spaces,
        transactions: action.payload.transactions,
        stories: action.payload.stories,
        callHistory: action.payload.callHistory || state.callHistory
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, { ...action.payload, id: Date.now().toString() }]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'ADD_TO_CART': {
      const existing = state.cart.find(item => item.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(item => item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item)
        };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(item => item.id !== action.payload) };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'SEND_MESSAGE': {
      const { sessionId, text, type, metadata, replyTo, expiresAt } = action.payload;
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: state.currentUser?.id || 'u1',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        type: type || 'text',
        metadata: metadata,
        replyTo: replyTo,
        expiresAt: expiresAt,
        status: 'sent',
        isStarred: false
      };

      return {
        ...state,
        chats: state.chats.map(c =>
          c.id === sessionId
            ? { ...c, messages: [...c.messages, newMessage], lastMessage: text, lastTime: 'Now' }
            : c
        )
      };
    }

    case 'RECEIVE_MESSAGE': {
      const { sessionId, message } = action.payload;
      return {
        ...state,
        chats: state.chats.map(c =>
          c.id === sessionId
            ? {
              ...c,
              messages: [...c.messages, message],
              lastMessage: message.text,
              lastTime: 'Now',
              unread: state.selectedChatId === sessionId ? c.unread : c.unread + 1
            }
            : c
        )
      };
    }

    case 'MARK_CHAT_READ': {
      return {
        ...state,
        chats: state.chats.map(c =>
          c.id === action.payload ? { ...c, unread: 0 } : c
        )
      };
    }

    case 'CREATE_GROUP':
    case 'ADD_CHAT': {
      const exists = state.chats.some(c => c.id === action.payload.id);
      if (exists) {
        return { ...state, selectedChatId: action.payload.id };
      }
      return {
        ...state,
        chats: [action.payload, ...state.chats],
        selectedChatId: action.payload.id
      };
    }

    case 'DELETE_CHAT':
      return {
        ...state,
        chats: state.chats.filter(c => c.id !== action.payload),
        selectedChatId: state.selectedChatId === action.payload ? null : state.selectedChatId
      };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions]
      };

    case 'ADD_CALL_LOG':
      return {
        ...state,
        callHistory: [action.payload, ...state.callHistory]
      };

    case 'SET_CALL_HISTORY':
      return {
        ...state,
        callHistory: action.payload
      };

    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [action.payload, ...state.products]
      };

    case 'ADD_STORY':
      return {
        ...state,
        stories: [action.payload, ...state.stories]
      };

    case 'DELETE_STORY':
      return {
        ...state,
        stories: state.stories.filter(s => s.id !== action.payload)
      };

    case 'ADD_SPACE':
      return {
        ...state,
        spaces: [...state.spaces, action.payload]
      };

    case 'JOIN_SPACE':
      return {
        ...state,
        spaces: state.spaces.map(s => {
          if (s.id === action.payload) {
            const joined = !s.joined;
            return { ...s, joined, members: s.members + (joined ? 1 : -1) };
          }
          return s;
        })
      };

    case 'TOGGLE_STAR_MESSAGE': {
      const { sessionId, messageId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id !== sessionId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(msg => msg.id === messageId ? { ...msg, isStarred: !msg.isStarred } : msg)
          };
        })
      };
    }

    case 'SET_CHAT_WALLPAPER': {
      const { sessionId, url } = action.payload;
      return {
        ...state,
        chats: state.chats.map(c => c.id === sessionId ? { ...c, wallpaper: url } : c)
      };
    }

    case 'TOGGLE_TASK': {
      const { widgetId, taskId } = action.payload;
      return {
        ...state,
        workspaceWidgets: state.workspaceWidgets.map(w => {
          if (w.id !== widgetId || w.type !== 'tasks') return w;
          return {
            ...w,
            content: w.content.map((t: any) => t.id === taskId ? { ...t, done: !t.done } : t)
          };
        })
      };
    }

    case 'TOGGLE_DISAPPEARING_MODE': {
      return {
        ...state,
        chats: state.chats.map(c =>
          c.id === action.payload.sessionId
            ? { ...c, disappearingMode: action.payload.enabled }
            : c
        )
      };
    }

    case 'ADD_REACTION': {
      const { sessionId, messageId, emoji } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id !== sessionId) return chat;
          return {
            ...chat,
            messages: chat.messages.map(msg => {
              if (msg.id !== messageId) return msg;

              const reactions = msg.reactions || [];
              const existingReaction = reactions.find(r => r.emoji === emoji);

              let newReactions;
              if (existingReaction) {
                newReactions = reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
              } else {
                newReactions = [...reactions, { emoji, count: 1, userIds: ['me'] }];
              }

              return { ...msg, reactions: newReactions };
            })
          };
        })
      };
    }

    case 'DELETE_EXPIRED_MESSAGES': {
      const now = Date.now();
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id !== action.payload.sessionId) return chat;

          const validMessages = chat.messages.filter(msg => {
            if (!msg.expiresAt) return true;
            return msg.expiresAt > now;
          });

          if (validMessages.length === chat.messages.length) return chat;

          return {
            ...chat,
            messages: validMessages,
            lastMessage: validMessages.length > 0 ? validMessages[validMessages.length - 1].text : 'Messages expired'
          };
        })
      };
    }

    case 'START_CALL':
      return {
        ...state,
        activeCall: {
          id: Date.now().toString(),
          participant: action.payload.participant,
          type: action.payload.type,
          status: 'ringing',
          isMuted: false,
          isVideoOff: false
        }
      };

    case 'END_CALL':
      return {
        ...state,
        activeCall: null
      };

    case 'SET_CALL_STATUS':
      return state.activeCall ? {
        ...state,
        activeCall: {
          ...state.activeCall,
          status: action.payload,
          startTime: action.payload === 'connected' ? Date.now() : state.activeCall.startTime
        }
      } : state;

    case 'TOGGLE_CALL_MUTE':
      return state.activeCall ? {
        ...state,
        activeCall: { ...state.activeCall, isMuted: !state.activeCall.isMuted }
      } : state;

    case 'TOGGLE_CALL_VIDEO':
      return state.activeCall ? {
        ...state,
        activeCall: { ...state.activeCall, isVideoOff: !state.activeCall.isVideoOff }
      } : state;

    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };

    case 'UPDATE_SETTING': {
      const { section, key, value } = action.payload;
      if (section === 'language' as any) {
        // Special case for top-level setting update if desired, 
        // but our current state structure has language directly inside settings
        return {
          ...state,
          settings: {
            ...state.settings,
            language: value
          }
        };
      }
      return {
        ...state,
        settings: {
          ...state.settings,
          [section]: {
            ...((state.settings as any)[section]),
            [key]: value
          }
        }
      };
    }

    case 'TOGGLE_PIN_CHAT':
      return {
        ...state,
        chats: state.chats.map(c =>
          c.id === action.payload.chatId
            ? { ...c, isPinned: action.payload.isPinned }
            : c
        )
      };

    // Discovery Reducers
    case 'SET_POSTS':
      return { ...state, posts: action.payload };

    case 'ADD_POST':
      return { ...state, posts: [action.payload, ...state.posts] };

    case 'TOGGLE_POST_LIKE': {
      const { postId, isLiked } = action.payload;
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id === postId
            ? { ...p, isLiked, likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1 }
            : p
        )
      };
    }

    case 'UPDATE_POST_COUNTS': {
      const { postId, likesCount, commentsCount, sharesCount } = action.payload;
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id === postId
            ? {
              ...p,
              ...(likesCount !== undefined && { likesCount }),
              ...(commentsCount !== undefined && { commentsCount }),
              ...(sharesCount !== undefined && { sharesCount })
            }
            : p
        )
      };
    }

    case 'SET_TRENDING_USERS':
      return { ...state, trendingUsers: action.payload };

    case 'TOGGLE_FOLLOW_USER': {
      const { userId, isFollowing } = action.payload;
      return {
        ...state,
        trendingUsers: state.trendingUsers.map(u =>
          u.id === userId
            ? { ...u, isFollowing, followersCount: isFollowing ? u.followersCount + 1 : u.followersCount - 1 }
            : u
        )
      };
    }

    // Spaces Reducers
    case 'SELECT_SPACE':
      return { ...state, selectedSpaceId: action.payload };

    case 'SET_SPACE_DETAIL': {
      const { spaceId, detail } = action.payload;
      return {
        ...state,
        spaceDetails: { ...state.spaceDetails, [spaceId]: detail }
      };
    }

    case 'SET_SPACE_POSTS': {
      const { spaceId, posts } = action.payload;
      return {
        ...state,
        spacePosts: { ...state.spacePosts, [spaceId]: posts }
      };
    }

    case 'ADD_SPACE_POST': {
      const { spaceId, post } = action.payload;
      const currentPosts = state.spacePosts[spaceId] || [];
      return {
        ...state,
        spacePosts: { ...state.spacePosts, [spaceId]: [post, ...currentPosts] }
      };
    }

    case 'TOGGLE_SPACE_POST_LIKE': {
      const { spaceId, postId, isLiked } = action.payload;
      const posts = state.spacePosts[spaceId] || [];
      return {
        ...state,
        spacePosts: {
          ...state.spacePosts,
          [spaceId]: posts.map(p =>
            p.id === postId
              ? { ...p, isLiked, likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1 }
              : p
          )
        }
      };
    }

    case 'SET_SPACE_EVENTS': {
      const { spaceId, events } = action.payload;
      return {
        ...state,
        spaceEvents: { ...state.spaceEvents, [spaceId]: events }
      };
    }

    case 'ADD_SPACE_EVENT': {
      const { spaceId, event } = action.payload;
      const currentEvents = state.spaceEvents[spaceId] || [];
      return {
        ...state,
        spaceEvents: { ...state.spaceEvents, [spaceId]: [event, ...currentEvents] }
      };
    }

    case 'TOGGLE_EVENT_ATTENDANCE': {
      const { spaceId, eventId, isAttending } = action.payload;
      const events = state.spaceEvents[spaceId] || [];
      return {
        ...state,
        spaceEvents: {
          ...state.spaceEvents,
          [spaceId]: events.map(e =>
            e.id === eventId
              ? { ...e, isAttending, attendeesCount: isAttending ? e.attendeesCount + 1 : e.attendeesCount - 1 }
              : e
          )
        }
      };
    }

    case 'SET_SPACE_FILES': {
      const { spaceId, files } = action.payload;
      return {
        ...state,
        spaceFiles: { ...state.spaceFiles, [spaceId]: files }
      };
    }

    case 'ADD_SPACE_FILE': {
      const { spaceId, file } = action.payload;
      const currentFiles = state.spaceFiles[spaceId] || [];
      return {
        ...state,
        spaceFiles: { ...state.spaceFiles, [spaceId]: [file, ...currentFiles] }
      };
    }

    case 'SET_SPACE_MEMBERS': {
      const { spaceId, members } = action.payload;
      return {
        ...state,
        spaceMembers: { ...state.spaceMembers, [spaceId]: members }
      };
    }

    default:
      return state;
  }
};

// --- CONTEXT ---
const GlobalContext = createContext<{
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  return (
    <GlobalContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobalState must be used within GlobalProvider');
  return context.state;
};

export const useGlobalDispatch = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobalDispatch must be used within GlobalProvider');
  return context.dispatch;
};
