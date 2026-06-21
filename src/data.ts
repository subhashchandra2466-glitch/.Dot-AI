/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Types representing current user, simulated users, chat messages, etc.

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  relationship: 'none' | 'sent' | 'received' | 'accepted';
  isBlocked: boolean; // Is this user blocked by the current logged-in user?
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'me' or the other user's id
  text: string;
  imageUrl?: string;
  timestamp: string; // ISO String
  status: 'sent' | 'delivered' | 'read';
  replyToId?: string; // For swipe/slide to reply feature
}

export interface DirectChat {
  userId: string;
  messages: ChatMessage[];
}

export interface AIChatSession {
  id: string;
  title: string;
  messages: {
    id: string;
    role: 'user' | 'model';
    text: string;
    imageUrl?: string;
    timestamp: string;
  }[];
}

export interface AppState {
  currentUser: {
    username: string;
    displayName: string;
    avatarUrl: string;
    securityQuestion: string;
    securityAnswer: string;
    createdAt: string;
  } | null;
  aiChats: AIChatSession[];
  activeAIChatId: string | null;
  socialUsers: UserProfile[];
  directChats: { [userId: string]: ChatMessage[] };
  incomingRequests: string[]; // List of userIds that sent a request to you
  outgoingRequests: string[]; // List of userIds you sent requests to
  notificationBellCount: number;
  themeMode: 'light' | 'dark' | 'system';
}

// Helper to generate initials avatar
export function getInitialsAvatar(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials || 'U')}&backgroundColor=8e24aa,ab47bc,e91e63,3f51b5,00bcd4,4caf50`;
}

// Initial high-fidelity pre-populated users
export const virtualUsersList: UserProfile[] = [
  {
    id: 'sarah_j',
    username: 'sarah_j',
    displayName: 'Sarah Jenkins',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Travel photographer and coffee enthusiast. Seeking minimalist inspirations ✨',
    relationship: 'received', // Sent request to user on startup
    isBlocked: false,
  },
  {
    id: 'alex_chen',
    username: 'alex_chen',
    displayName: 'Alex Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Software engineer and indie game designer. Always coding something fresh. 🕹️',
    relationship: 'none',
    isBlocked: false,
  },
  {
    id: 'maya_lin',
    username: 'maya_lin',
    displayName: 'Maya Lin',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    bio: 'Watercolor painter & graphic designer. Capturing small moments through light & shade.',
    relationship: 'none',
    isBlocked: false,
  },
  {
    id: 'marcus_k',
    username: 'marcus_k',
    displayName: 'Marcus Knight',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Fitness and mobility coach. Fueling active lifestyles. Stay positive, stay moving! 💪',
    relationship: 'none',
    isBlocked: false,
  },
  {
    id: 'dot_helper',
    username: 'dot_helper',
    displayName: 'Dot Companion',
    avatarUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150',
    bio: 'Your primary virtual assistant. Expert on hidden specifications and custom interactions.',
    relationship: 'accepted', // Pre-connected
    isBlocked: false,
  }
];

// Initial prompt-driven default automated messages
export const getVirtualUserReply = (username: string, messageText: string): string => {
  const norm = messageText.toLowerCase();
  
  if (username === 'dot_helper') {
    if (norm.includes('hello') || norm.includes('hi')) {
      return "Hello! I am your primary Dot Companion inside the Hidden Space. I can help you test direct messages, blocking, notifications, or anything else you'd like.";
    }
    if (norm.includes('spec') || norm.includes('hidden')) {
      return "The Hidden Space is a secure environment. You can exit anytime by triple-tapping quickly anywhere on the screen! You can block/unblock users by using the 3 dots menu on the top-right of our chat.";
    }
    return "That's fascinating! Ask me about the hidden specifications or try to send a photo to see how I process assets inside the Hidden Space!";
  }
  
  if (username === 'sarah_j') {
    if (norm.includes('camera') || norm.includes('photo') || norm.includes('travel')) {
      return "Oh, travel and photography are my absolute passions! I mainly shoot with a manual prime lens to get that deep rich watercolor feeling. Where was your favorite spot to visit?";
    }
    return "That sounds wonderful! By the way, thanks for accepting my friend request. Let me know if you are interested in reviewing some of my recent photo drafts!";
  }

  if (username === 'alex_chen') {
    if (norm.includes('game') || norm.includes('code') || norm.includes('coding')) {
      return "Nice! I use TypeScript and Unity mostly. Currently crafting an isometric puzzle crawler. Have you built any applications yourself? I suspect you are coding this beautiful interface right now!";
    }
    return "Awesome. We should connect and build a web utility together sometime. What projects are keeping you busy?";
  }

  if (username === 'maya_lin') {
    if (norm.includes('design') || norm.includes('art') || norm.includes('painting')) {
      return "Watercolor teaches you to yield to mistake and let the water flow where it wants. It is a peaceful, beautiful practice. Do you do any creative hobbies yourself?";
    }
    return "I appreciate your message. Let's design something wonderful together.";
  }

  if (username === 'marcus_k') {
    if (norm.includes('workout') || norm.includes('gym') || norm.includes('fitness') || norm.includes('food')) {
      return "Consistency beats intensity every single time! Start with 10 minutes of active mobility streams, and eat real, whole foods. Love the energy you are bringing!";
    }
    return "Spot on! Let's conquer the day. What are your core goals for this week?";
  }

  return `Thanks for the text! I'm around. Let's chat more about this.`;
};
