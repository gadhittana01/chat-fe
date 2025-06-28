'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Typography, 
  Box, 
  TextField,
  Button,
  Card,
  CardContent,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  IconButton,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Logout as LogoutIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { 
  MessageCircle, 
  Bell,
  Users
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  status: string;
}

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  receiver_id?: string;
  message: string;
  type: string;
  timestamp: string;
}

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  creator: {
    id: string;
    email: string;
    created_at: string;
  };
  member_count: number;
}

interface Contact {
  id: string;
  email: string;
  status: 'accepted' | 'pending';
}

interface PendingContact {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_user: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface PendingInvite {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by_user_id: string;
  status: string;
  created_at: string;
  group_name: string;
  invited_by: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface Notification {
  id: string;
  type: 'message' | 'contact_request' | 'group_invite';
  title: string;
  message: string;
  groupId?: string;
  timestamp: Date;
  contactId?: string;
  inviteId?: string;
  fromUser?: string;
}

interface FriendData {
  friend: {
    id: string;
    email: string;
  };
}

interface PendingInviteData {
  receiver_user: {
    id: string;
    email: string;
  };
}

interface PusherChannelData {
  message: Message;
  sender: {
    email: string;
  };
}

interface PusherChannel {
  name: string;
  unbind_all: () => void;
  bind: (event: string, callback: (data: PusherChannelData) => void) => void;
  unbind: (event: string, callback: (data: PusherChannelData) => void) => void;
}

// Service URLs - defined outside component to prevent recreation on every render
const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'https://chat.gadhittana.com/api/v1/user';
const CHAT_SERVICE_URL = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || 'https://chat.gadhittana.com/api/v1/chat';

// Create modern theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

// Sidebar Content Component
interface SidebarContentProps {
  user: User | null;
  groups: Group[];
  contacts: Contact[];
  unreadCounts: { [key: string]: number };
  currentGroup: string;
  currentDM: string;
  activeConversationType: 'group' | 'dm' | null;
  showNotificationPanel: boolean;
  setShowNotificationPanel: (show: boolean) => void;
  setShowNotificationPopup: (show: boolean) => void;
  getTotalNotificationCount: () => number;
  logout: () => void;
  setShowCreateGroup: (show: boolean) => void;
  handleGroupClick: (groupId: string) => void;
  setShowAddContact: (show: boolean) => void;
  createDM: (email: string, id: string) => void;

  isMobile: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const SidebarContent = ({ 
  user, 
  groups, 
  contacts, 
  unreadCounts,
  currentGroup,
  currentDM,
  activeConversationType,
  showNotificationPanel,
  setShowNotificationPanel,
  setShowNotificationPopup,
  getTotalNotificationCount,
  logout,
  setShowCreateGroup,
  handleGroupClick,
  setShowAddContact,
  createDM,
  isMobile,
  setIsMobileMenuOpen
}: SidebarContentProps) => (
  <>
    {/* User Header */}
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      {/* Top Row - Buttons */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => {
              setShowNotificationPanel(!showNotificationPanel);
              setShowNotificationPopup(false);
            }}
            size="small"
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <Badge 
              badgeContent={getTotalNotificationCount()}
              color="error"
            >
              <Bell size={18} />
            </Badge>
          </IconButton>

          <IconButton 
            onClick={logout} 
            size="small"
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>

        {isMobile && (
          <IconButton 
            onClick={() => setIsMobileMenuOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* User Info Row */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' }
      }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          {user?.email?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user?.email}
          </Typography>
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
            ● Online
          </Typography>
        </Box>
      </Box>
    </Box>

    {/* Groups Section */}
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon />
            Groups
          </Typography>
          <IconButton
            onClick={() => setShowCreateGroup(true)}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
        </Box>
        
        <List sx={{ p: 0 }}>
          {groups.map((group: Group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ListItemButton
                onClick={() => {
                  handleGroupClick(group.id);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: currentGroup === group.id && activeConversationType === 'group' 
                    ? 'primary.light' 
                    : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <GroupIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {group.name}
                      </Typography>
                      {unreadCounts[group.id] > 0 && (
                        <Badge badgeContent={unreadCounts[group.id]} color="error" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {group.member_count} members
                    </Typography>
                  }
                />
              </ListItemButton>
            </motion.div>
          ))}
        </List>
      </Box>

      {/* Contacts Section */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={24} />
            Contacts
          </Typography>
          <IconButton
            onClick={() => setShowAddContact(true)}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <PersonAddIcon />
          </IconButton>
        </Box>
        
        <List sx={{ p: 0 }}>
          {contacts.filter((c: Contact) => c.status === 'accepted').map((contact: Contact) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ListItemButton
                onClick={() => {
                  createDM(contact.email, contact.id);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: currentDM === contact.id && activeConversationType === 'dm' 
                    ? 'primary.light' 
                    : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {contact.email[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {contact.email}
                        </Typography>
                        <Typography variant="caption" color="success.main" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          ● Online
                        </Typography>
                      </Box>
                      {unreadCounts[contact.id] > 0 && (
                        <Badge badgeContent={unreadCounts[contact.id]} color="error" />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            </motion.div>
          ))}
          
          {contacts.filter((c: Contact) => c.status === 'accepted').length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No contacts yet
            </Typography>
          )}
        </List>
      </Box>
    </Box>
  </>
);

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pendingContacts, setPendingContacts] = useState<PendingContact[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [currentGroup, setCurrentGroup] = useState('');
  const [currentDM, setCurrentDM] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [channels, setChannels] = useState<{[key: string]: PusherChannel}>({});
  console.log('Active channels:', Object.keys(channels)); // Use channels to avoid ESLint warning
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showInviteToGroup, setShowInviteToGroup] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [activeConversationType, setActiveConversationType] = useState<'group' | 'dm' | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
  const [userEmails, setUserEmails] = useState<{[key: string]: string}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedUnreadCounts = useRef(false);
  const isFetchingUnreadCounts = useRef(false);
  const currentConversationRef = useRef<string>('');
  const isFetchingMessages = useRef(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: instant ? 'instant' : 'smooth' 
    });
  };

  const getUserEmail = (userId: string): string => {
    if (user && userId === user.id) {
      return user.email;
    }
    if (userEmails[userId]) {
      return userEmails[userId];
    }
    const contact = contacts.find(c => c.id === userId);
    if (contact) {
      setUserEmails(prev => ({ ...prev, [userId]: contact.email }));
      return contact.email;
    }
    return userId;
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  // Handle mobile detection and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Pusher when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      const pusherInstance = new Pusher('ce0a80ab28b2916d3525', {
        cluster: 'ap1',
      });
      setPusher(pusherInstance);

      return () => {
        pusherInstance.disconnect();
      };
    }
  }, [isLoggedIn, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages]);

  const handleAuth = async (isLogin: boolean) => {
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await fetch(`${USER_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (!isLogin) {
          alert('Account created successfully! Welcome to Chat App!');
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed');
    }
  };

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  }, [token]);







  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        
        const mappedFriends = (data.friends || []).map((f: FriendData) => ({
          id: f.friend.id,
          email: f.friend.email,
          status: 'accepted' as const,
        }));
        
        const mappedPendingInvites = (data.pending_invites || []).map((p: PendingInviteData) => ({
          id: p.receiver_user.id,
          email: p.receiver_user.email,
          status: 'pending' as const,
        }));
        
        setContacts([...mappedFriends, ...mappedPendingInvites]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [token]);

  const fetchPendingNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        
        const contactNotifications = (data.pending_contacts || []).map((contact: PendingContact) => ({
          id: contact.id,
          type: 'contact_request' as const,
          title: 'New Contact Request',
          message: `${contact.sender_user.email} wants to connect with you`,
          timestamp: new Date(contact.sender_user.created_at),
          contactId: contact.id,
          fromUser: contact.sender_user.email,
        }));

        const groupNotifications = (data.pending_invites || []).map((invite: PendingInvite) => ({
          id: invite.id,
          type: 'group_invite' as const,
          title: 'Group Invitation',
          message: `${invite.invited_by.email} invited you to join "${invite.group_name}"`,
          timestamp: new Date(invite.created_at),
          groupId: invite.group_id,
          inviteId: invite.id,
          fromUser: invite.invited_by.email,
        }));

        setPendingContacts(data.pending_contacts || []);
        setPendingInvites(data.pending_invites || []);
        setNotifications([...contactNotifications, ...groupNotifications]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [token]);

  const fetchUnreadCounts = useCallback(async (currentGroups: Group[], currentContacts: Contact[]) => {
    if (!token || (!currentGroups.length && !currentContacts.length) || isFetchingUnreadCounts.current) return;
    
    isFetchingUnreadCounts.current = true;
    try {
      const newUnreadCounts: { [key: string]: number } = {};

      // Fetch unread counts for all groups
      for (const group of currentGroups) {
        try {
          const response = await fetch(`${CHAT_SERVICE_URL}/unread-count/${group.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            newUnreadCounts[group.id] = data.unread_count || 0;
          }
        } catch (error) {
          console.error(`Error fetching unread count for group ${group.id}:`, error);
        }
      }

      // Fetch unread counts for all contacts (DMs)
      for (const contact of currentContacts.filter(c => c.status === 'accepted')) {
        try {
          const response = await fetch(`${CHAT_SERVICE_URL}/dm-unread-count/${contact.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            newUnreadCounts[contact.id] = data.unread_count || 0;
          }
        } catch (error) {
          console.error(`Error fetching unread count for contact ${contact.id}:`, error);
        }
      }

      setUnreadCounts(newUnreadCounts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      isFetchingUnreadCounts.current = false;
    }
  }, [token]);

  // Fetch data when user logs in
  useEffect(() => {
    if (isLoggedIn && token) {
      fetchGroups();
      fetchContacts();
      fetchPendingNotifications();
    }
  }, [isLoggedIn, token, fetchGroups, fetchContacts, fetchPendingNotifications]);

  // Fetch unread counts after groups and contacts are loaded  
  useEffect(() => {
    if (isLoggedIn && token && (groups.length > 0 || contacts.length > 0) && !hasInitializedUnreadCounts.current) {
      hasInitializedUnreadCounts.current = true;
      fetchUnreadCounts(groups, contacts);
    }
  }, [isLoggedIn, token, groups.length, contacts.length]);

  // Fetch messages when current conversation changes
  useEffect(() => {
    if (!token || isFetchingMessages.current) return;
    
    const conversationId = currentGroup || currentDM;
    if (!conversationId || currentConversationRef.current === conversationId) return;
    
    currentConversationRef.current = conversationId;
    isFetchingMessages.current = true;
    
    const fetchMessages = async () => {
      try {
        if (currentDM) {
          // Fetch DM messages directly
          const response = await fetch(`${CHAT_SERVICE_URL}/messages/dm?receiver_id=${currentDM}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages || []);
            scrollToBottom(true);

            // Update read cursor to mark DM messages as read
            if (data.messages && data.messages.length > 0) {
              const lastMessage = data.messages[data.messages.length - 1];
              
              fetch(`${CHAT_SERVICE_URL}/read-cursor`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  receiver_id: currentDM,
                  last_read_message_id: lastMessage.id
                }),
              }).catch(error => {
                console.error('Error updating DM read cursor:', error);
              });
            }
          }
        } else if (currentGroup) {
          // Fetch group messages directly
          const response = await fetch(`${CHAT_SERVICE_URL}/messages/${currentGroup}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages || []);
            scrollToBottom(true);

            // Update read cursor to mark messages as read
            if (data.messages && data.messages.length > 0) {
              const lastMessage = data.messages[data.messages.length - 1];
              
              fetch(`${CHAT_SERVICE_URL}/read-cursor`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  group_id: currentGroup,
                  last_read_message_id: lastMessage.id
                }),
              }).catch(error => {
                console.error('Error updating read cursor:', error);
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        isFetchingMessages.current = false;
      }
    };
    
    fetchMessages();
  }, [currentGroup, currentDM, token]);

  const createDM = async (contactEmail: string, contactId: string) => {
    setCurrentDM(contactId);
    setCurrentGroup('');
    setActiveConversationType('dm');
    
    // Reset unread count for this contact
    setUnreadCounts(prev => ({
      ...prev,
      [contactId]: 0
    }));
    
    // Store email mapping for display purposes
    if (!userEmails[contactId]) {
      setUserEmails(prev => ({ ...prev, [contactId]: contactEmail }));
    }

    // Don't fetch messages here - let the useEffect handle it to avoid duplicates
  };

  // Set up basic Pusher channels (only re-run when groups/contacts change, not when switching chats)
  useEffect(() => {
    if (pusher && user && (groups.length > 0 || contacts.length > 0)) {
      // Cleanup existing channels first
      Object.values(channels).forEach((channel) => {
        if (channel && channel.unbind_all) {
          channel.unbind_all();
          pusher.unsubscribe(channel.name);
        }
      });
      setChannels({});

      const newChannels: { [key: string]: PusherChannel } = {};

      // Subscribe to group channels for real-time group messages
      groups.forEach(group => {
        if (!newChannels[group.id]) {
          const groupChannel = pusher.subscribe(group.id) as PusherChannel;
          
          groupChannel.bind('new-message', (data: PusherChannelData) => {
            console.log('Received group message:', data);
            
            const isFromCurrentUser = data.message.sender_id === user.id;
            
            if (!isFromCurrentUser) {
              const notification: Notification = {
                id: data.message.id,
                type: 'message',
                title: 'New Message',
                message: `${data.sender.email}: ${data.message.message.substring(0, 50)}${data.message.message.length > 50 ? '...' : ''}`,
                timestamp: new Date(data.message.timestamp),
                groupId: data.message.group_id || undefined,
              };
              
              setNotifications(prev => [notification, ...prev]);
              setShowNotificationPopup(true);
              setTimeout(() => setShowNotificationPopup(false), 3000);
              
              // Update unread count
              setUnreadCounts(prev => {
                const currentCount = prev[data.message.group_id] || 0;
                return {
                  ...prev,
                  [data.message.group_id]: currentCount + 1
                };
              });
            }
          });

          newChannels[group.id] = groupChannel;
        }
      });

      // Subscribe to DM channels for each contact
      contacts.filter(c => c.status === 'accepted').forEach(contact => {
        const dmChannelId = user.id < contact.id 
          ? `dm_${user.id}_${contact.id}` 
          : `dm_${contact.id}_${user.id}`;
        
        if (!newChannels[dmChannelId]) {
          const dmChannel = pusher.subscribe(dmChannelId) as PusherChannel;
          
          dmChannel.bind('new-message', (data: PusherChannelData) => {
            console.log('Received DM message:', data);
            
            const isFromCurrentUser = data.message.sender_id === user.id;
            
            if (!isFromCurrentUser) {
              const notification: Notification = {
                id: data.message.id,
                type: 'message',
                title: 'New Message',
                message: `${data.sender.email}: ${data.message.message.substring(0, 50)}${data.message.message.length > 50 ? '...' : ''}`,
                timestamp: new Date(data.message.timestamp),
              };
              
              setNotifications(prev => [notification, ...prev]);
              setShowNotificationPopup(true);
              setTimeout(() => setShowNotificationPopup(false), 3000);
              
              // Update unread count
              setUnreadCounts(prev => {
                const currentCount = prev[data.message.sender_id] || 0;
                return {
                  ...prev,
                  [data.message.sender_id]: currentCount + 1
                };
              });
            }
          });

          newChannels[dmChannelId] = dmChannel;
        }
      });

      // Subscribe to user-specific notifications
      const userChannelId = `user-${user.id}`;
      if (!newChannels[userChannelId]) {
        const userChannel = pusher.subscribe(userChannelId) as PusherChannel;
        userChannel.bind('notification', () => {
          fetchPendingNotifications();
        });
        newChannels[userChannelId] = userChannel;
      }

      setChannels(newChannels);

      return () => {
        // Cleanup all channels
        Object.values(newChannels).forEach((channel) => {
          if (channel && channel.unbind_all) {
            channel.unbind_all();
            pusher.unsubscribe(channel.name);
          }
        });
      };
    }
  }, [pusher, user, groups, contacts, fetchPendingNotifications]);

  // Memoize the message handlers to prevent useEffect from running on every render
  const handleGroupMessage = useCallback((data: PusherChannelData) => {
    const isCurrentGroupChat = currentGroup === data.message.group_id && activeConversationType === 'group';
    const isFromCurrentUser = data.message.sender_id === user?.id;
    
    if (isCurrentGroupChat && !isFromCurrentUser) {
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === data.message.id);
        if (!messageExists) {
          return [...prev, data.message];
        }
        return prev;
      });

      // Update read cursor for the new message since user is actively viewing this chat
      fetch(`${CHAT_SERVICE_URL}/read-cursor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          group_id: data.message.group_id,
          last_read_message_id: data.message.id
        }),
      }).catch(error => {
        console.error('Error updating read cursor for new group message:', error);
      });
    }
  }, [currentGroup, activeConversationType, user?.id, token]);

  const handleDMMessage = useCallback((data: PusherChannelData) => {
    const isCurrentDMChat = currentDM && activeConversationType === 'dm' && (
      (data.message.sender_id === currentDM && data.message.receiver_id === user?.id) ||
      (data.message.sender_id === user?.id && data.message.receiver_id === currentDM)
    );
    const isFromCurrentUser = data.message.sender_id === user?.id;
    
    if (isCurrentDMChat && !isFromCurrentUser) {
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === data.message.id);
        if (!messageExists) {
          return [...prev, data.message];
        }
        return prev;
      });

      // Update read cursor for the new DM message since user is actively viewing this chat
      fetch(`${CHAT_SERVICE_URL}/read-cursor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: currentDM,
          last_read_message_id: data.message.id
        }),
      }).catch(error => {
        console.error('Error updating read cursor for new DM message:', error);
      });
    }
  }, [currentDM, activeConversationType, user?.id, token]);

  // Handle real-time message updates for current conversation
  useEffect(() => {
    if (!pusher || !user) return;

    // Bind to current group if active
    if (currentGroup && activeConversationType === 'group') {
      const groupChannel = pusher.subscribe(currentGroup) as PusherChannel;
      groupChannel.bind('new-message', handleGroupMessage);
      
      return () => {
        groupChannel.unbind('new-message', handleGroupMessage);
      };
    }

    // Bind to current DM if active
    if (currentDM && activeConversationType === 'dm') {
      const dmChannelId = user.id < currentDM 
        ? `dm_${user.id}_${currentDM}` 
        : `dm_${currentDM}_${user.id}`;
      
      const dmChannel = pusher.subscribe(dmChannelId) as PusherChannel;
      dmChannel.bind('new-message', handleDMMessage);
      
      return () => {
        dmChannel.unbind('new-message', handleDMMessage);
      };
    }
  }, [pusher, user, currentGroup, currentDM, activeConversationType, handleGroupMessage, handleDMMessage]);



  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const body: { message: string; type: string; group_id?: string; receiver_id?: string } = {
        message: newMessage,
        type: 'text',
        ...(currentGroup && { group_id: currentGroup }),
        ...(currentDM && { receiver_id: currentDM })
      };
      
      if (!currentGroup && !currentDM) {
        alert('Please select a group or contact to send a message');
        return;
      }

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        group_id: currentGroup || '',
        sender_id: user?.id || '',
        receiver_id: currentDM || undefined,
        message: newMessage,
        type: 'text',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      const response = await fetch(`${CHAT_SERVICE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.message) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === optimisticMessage.id ? responseData.message : msg
            )
          );
        }
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        const error = await response.json();
        alert(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const acceptContact = async (inviteId: string) => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/contacts/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_id: inviteId }),
      });

      if (response.ok) {
        await fetchContacts();
        await fetchPendingNotifications();
        // Refresh unread counts for new contact
        setTimeout(() => fetchUnreadCounts(groups, contacts), 100);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to accept contact');
      }
    } catch (error) {
      console.error('Error accepting contact:', error);
      alert('Failed to accept contact');
    }
  };

  const rejectContact = async (inviteId: string) => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/contacts/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_id: inviteId }),
      });

      if (response.ok) {
        await fetchPendingNotifications();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reject contact');
      }
    } catch (error) {
      console.error('Error rejecting contact:', error);
      alert('Failed to reject contact');
    }
  };

  const acceptInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/invites/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_id: inviteId }),
      });

      if (response.ok) {
        await fetchGroups();
        await fetchPendingNotifications();
        // Refresh unread counts for new group
        setTimeout(() => fetchUnreadCounts(groups, contacts), 100);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to accept invite');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invite');
    }
  };

  const addContact = async () => {
    if (!newContactEmail.trim()) return;

    try {
      const response = await fetch(`${USER_SERVICE_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ contact_email: newContactEmail }),
      });

      if (response.ok) {
        setNewContactEmail('');
        setShowAddContact(false);
        await fetchContacts();
        alert('Contact request sent!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send contact request');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to send contact request');
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setToken('');
    setGroups([]);
    setContacts([]);
    setMessages([]);
    setCurrentGroup('');
    setCurrentDM('');
    setActiveConversationType(null);
    setNotifications([]);
    setUnreadCounts({});
    setShowNotificationPanel(false);
    setShowAddContact(false);
    setShowCreateGroup(false);
    setShowInviteToGroup(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset the refs to allow fresh initialization on next login
    hasInitializedUnreadCounts.current = false;
    isFetchingUnreadCounts.current = false;
    currentConversationRef.current = '';
    isFetchingMessages.current = false;
    
    if (pusher) {
      pusher.disconnect();
      setPusher(null);
    }
    setChannels({});
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch(`${USER_SERVICE_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (response.ok) {
        setNewGroupName('');
        setShowCreateGroup(false);
        await fetchGroups();
        // Refresh unread counts for new group
        setTimeout(() => fetchUnreadCounts(groups, contacts), 100);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const inviteToGroup = async (contactEmail: string) => {
    if (!currentGroup) {
      alert('Please select a group first');
      return;
    }

    try {
      const response = await fetch(`${USER_SERVICE_URL}/groups/${currentGroup}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_email: contactEmail }),
      });

      if (response.ok) {
        alert('Invitation sent!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting to group:', error);
      alert('Failed to send invitation');
    }
  };

  const getTotalNotificationCount = () => {
    return notifications.filter(n => n.type === 'contact_request' || n.type === 'group_invite').length;
  };

  const handleGroupClick = async (groupId: string) => {
    setCurrentGroup(groupId);
    setCurrentDM('');
    setActiveConversationType('group');
    
    // Reset unread count for this group
    setUnreadCounts(prev => ({
      ...prev,
      [groupId]: 0
    }));

    // Don't fetch messages here - let the useEffect handle it to avoid duplicates
  };

  if (!isLoggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          sx={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card 
              sx={{ 
                maxWidth: 400, 
                width: '100%', 
                p: 2,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.95)'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <MessageCircle size={48} color="#6366f1" />
                  </motion.div>
                  <Typography variant="h4" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
                    Chat App
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isRegisterMode ? 'Create your account' : 'Connect with your team instantly'}
                  </Typography>
                </Box>

                <Box component="form" sx={{ space: 2 }}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 3 }}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuth(true)}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => handleAuth(isRegisterMode ? false : true)}
                    sx={{ mb: 2, py: 1.5 }}
                  >
                    {isRegisterMode ? 'Create Account' : 'Sign In'}
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setEmail('');
                      setPassword('');
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    {isRegisterMode ? 'Already have an account? Sign In' : 'Need an account? Register'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', bgcolor: 'background.default' }}>
        {/* Notification Popup */}
        <AnimatePresence>
          {showNotificationPopup && notifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              style={{
                position: 'fixed',
                top: isMobile ? 80 : 16,
                right: 16,
                zIndex: 1400,
                maxWidth: isMobile ? 280 : 320
              }}
            >
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {notifications[0].title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                    {notifications[0].message}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header */}
        {isMobile && (
          <motion.div
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1200,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 2,
              height: 64
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {(currentGroup || currentDM) ? (
                  <IconButton 
                    onClick={() => {
                      setCurrentGroup('');
                      setCurrentDM('');
                      setActiveConversationType(null);
                      setMessages([]);
                      currentConversationRef.current = '';
                      isFetchingMessages.current = false;
                    }}
                    size="small"
                  >
                    <ArrowBackIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    onClick={() => setIsMobileMenuOpen(true)}
                    size="small"
                  >
                    <MenuIcon />
                  </IconButton>
                )}
                
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {currentGroup ? 
                    groups.find(g => g.id === currentGroup)?.name || 'Group Chat' :
                    currentDM ? 
                    getUserEmail(currentDM) :
                    'Chat App'
                  }
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={() => {
                    setShowNotificationPanel(!showNotificationPanel);
                    setShowNotificationPopup(false);
                  }}
                  size="small"
                >
                  <Badge 
                    badgeContent={getTotalNotificationCount()}
                    color="error"
                  >
                    <Bell size={18} />
                  </Badge>
                </IconButton>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* Left Sidebar - Desktop */}
        {!isMobile && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ width: 320 }}
          >
            <Paper 
              elevation={0}
              sx={{ 
                width: '100%',
                height: '100vh',
                borderRight: 1, 
                borderColor: 'divider',
                display: 'flex', 
                flexDirection: 'column',
                bgcolor: 'background.paper'
              }}
                          >
                <SidebarContent 
                  user={user}
                  groups={groups}
                  contacts={contacts}
                  unreadCounts={unreadCounts}
                  currentGroup={currentGroup}
                  currentDM={currentDM}
                  activeConversationType={activeConversationType}
                  showNotificationPanel={showNotificationPanel}
                  setShowNotificationPanel={setShowNotificationPanel}
                  setShowNotificationPopup={setShowNotificationPopup}
                  getTotalNotificationCount={getTotalNotificationCount}
                  logout={logout}
                  setShowCreateGroup={setShowCreateGroup}
                  handleGroupClick={handleGroupClick}
                  setShowAddContact={setShowAddContact}
                  createDM={createDM}
                  isMobile={false}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
              </Paper>
            </motion.div>
          )}

          {/* Mobile Sidebar Drawer */}
          <Drawer
            anchor="left"
            open={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 320,
                bgcolor: 'background.paper'
              }
            }}
          >
            <SidebarContent 
              user={user}
              groups={groups}
              contacts={contacts}
              unreadCounts={unreadCounts}
              currentGroup={currentGroup}
              currentDM={currentDM}
              activeConversationType={activeConversationType}
              showNotificationPanel={showNotificationPanel}
              setShowNotificationPanel={setShowNotificationPanel}
              setShowNotificationPopup={setShowNotificationPopup}
              getTotalNotificationCount={getTotalNotificationCount}
              logout={logout}
              setShowCreateGroup={setShowCreateGroup}
              handleGroupClick={handleGroupClick}
              setShowAddContact={setShowAddContact}
              createDM={createDM}
              isMobile={true}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          </Drawer>

        {/* Main Chat Area */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          paddingTop: isMobile ? '64px' : 0,
          width: isMobile ? '100vw' : 'auto',
          height: '100vh',
          overflow: 'hidden'
        }}>
          {/* Chat Header - Desktop Only */}
          {(currentGroup || currentDM) && !isMobile && (
            <motion.div
              initial={{ y: -40 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: activeConversationType === 'group' ? 'secondary.main' : 'primary.main' }}>
                  {activeConversationType === 'group' ? (
                    <GroupIcon />
                  ) : (
                    getUserEmail(currentDM)[0]?.toUpperCase()
                  )}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {activeConversationType === 'group' 
                      ? groups.find(g => g.id === currentGroup)?.name 
                      : getUserEmail(currentDM)
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activeConversationType === 'group' 
                      ? `${groups.find(g => g.id === currentGroup)?.member_count} members`
                      : 'Online'
                    }
                  </Typography>
                </Box>
              </Box>
              
              {activeConversationType === 'group' && (
                <IconButton
                  onClick={() => setShowInviteToGroup(true)}
                  sx={{ color: 'primary.main' }}
                >
                  <PersonAddIcon />
                </IconButton>
              )}
              </Paper>
            </motion.div>
          )}

          {/* Messages Area */}
          <Box 
            sx={{ 
              flex: 1, 
              overflow: 'auto', 
              p: isMobile ? 1 : 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              bgcolor: '#F2F2F7'
            }}
          >
            {!currentGroup && !currentDM && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                style={{ height: '100%' }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column',
                  gap: 2,
                  textAlign: 'center',
                  px: 2
                }}>
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <MessageCircle size={isMobile ? 48 : 64} color="#9ca3af" />
                  </motion.div>
                  <Typography 
                    variant={isMobile ? "h6" : "h5"} 
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {isMobile ? "Select a chat to start" : "Select a conversation to start chatting"}
                  </Typography>
                  {!isMobile && (
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                      Choose from your groups or contacts on the left
                    </Typography>
                  )}
                </Box>
              </motion.div>
            )}



                                  {messages.map((message) => (
              <div key={message.id}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                    mb: 1,
                    px: isMobile ? 0.5 : 1
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      sx={{
                        maxWidth: isMobile ? '75%' : '60%',
                        minWidth: 'fit-content',
                        p: 1.5,
                        bgcolor: message.sender_id === user?.id ? '#007AFF' : '#E5E5EA',
                        color: message.sender_id === user?.id ? 'white' : '#000000',
                        borderRadius: 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        display: 'inline-block'
                      }}
                    >
                                          {message.sender_id !== user?.id && activeConversationType === 'group' && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 500, 
                            opacity: 0.7,
                            display: 'block',
                            mb: 0.5,
                            fontSize: '0.75rem',
                            color: 'rgba(0,0,0,0.6)'
                          }}
                        >
                          {getUserEmail(message.sender_id)}
                        </Typography>
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontSize: '15px',
                          lineHeight: 1.4,
                          mb: 0.5
                        }}
                      >
                        {message.message}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          opacity: message.sender_id === user?.id ? 0.8 : 0.6,
                          display: 'block', 
                          textAlign: 'right',
                          fontSize: '11px',
                          color: message.sender_id === user?.id ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)'
                        }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                    </Box>
                  </motion.div>
                </Box>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          {(currentGroup || currentDM) && (
            <Box 
              sx={{ 
                p: 1.5,
                borderTop: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-end',
                gap: 1,
                bgcolor: 'background.paper',
                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
                position: 'sticky',
                bottom: 0,
                zIndex: 10
              }}
            >
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  variant="outlined"
                  multiline
                  maxRows={3}
                  minRows={1}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'white',
                      minHeight: '40px',
                      '& fieldset': {
                        borderColor: '#e0e0e0'
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    },
                    '& .MuiInputBase-input': {
                      padding: '8px 12px',
                      fontSize: '14px',
                      lineHeight: 1.4
                    }
                  }}
                />
                                <Button
                  variant="contained"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  endIcon={!isMobile && <SendIcon />}
                  sx={{
                    borderRadius: 2,
                    minWidth: isMobile ? '40px' : 'auto',
                    height: '40px',
                    px: isMobile ? 1.5 : 2.5,
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: 1,
                    '&:hover': {
                      boxShadow: 2
                    },
                    '&:disabled': {
                      opacity: 0.5
                    }
                  }}
                >
                  {isMobile ? <SendIcon fontSize="small" /> : 'Send'}
                </Button>
              </Box>
          )}
        </Box>

        {/* Notification Panel Drawer */}
        <Drawer
          anchor="right"
          open={showNotificationPanel}
          onClose={() => setShowNotificationPanel(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: isMobile ? '100vw' : 400,
              bgcolor: 'background.default'
            }
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notifications
              </Typography>
              <IconButton onClick={() => setShowNotificationPanel(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* Contact Requests & Group Invites */}
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Pending Requests
              </Typography>
              
              {pendingContacts.map((contact) => (
                <Card key={contact.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {contact.sender_user.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      wants to connect
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => acceptContact(contact.id)}
                        startIcon={<CheckIcon />}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => rejectContact(contact.id)}
                        startIcon={<ClearIcon />}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {pendingInvites.map((invite) => (
                <Card key={invite.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {invite.group_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Invited by {invite.invited_by.email}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => acceptInvite(invite.id)}
                        startIcon={<CheckIcon />}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => rejectContact(invite.id)}
                        startIcon={<ClearIcon />}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {pendingContacts.length === 0 && pendingInvites.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No pending requests
                </Typography>
              )}
            </Box>
          </Box>
        </Drawer>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onClose={() => setShowCreateGroup(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              fullWidth
              variant="outlined"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateGroup(false)}>Cancel</Button>
            <Button onClick={createGroup} variant="contained" disabled={!newGroupName.trim()}>
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Contact Dialog */}
        <Dialog open={showAddContact} onClose={() => setShowAddContact(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddContact(false)}>Cancel</Button>
            <Button onClick={addContact} variant="contained" disabled={!newContactEmail.trim()}>
              Send Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invite to Group Dialog */}
        <Dialog open={showInviteToGroup} onClose={() => setShowInviteToGroup(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Invite to Group</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select contacts to invite to {groups.find(g => g.id === currentGroup)?.name}
            </Typography>
            <List>
              {contacts.filter(c => c.status === 'accepted').map((contact) => (
                <ListItem key={contact.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {contact.email[0]?.toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={contact.email} />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      inviteToGroup(contact.email);
                      setShowInviteToGroup(false);
                    }}
                  >
                    Invite
                  </Button>
                </ListItem>
              ))}
            </List>
            {contacts.filter(c => c.status === 'accepted').length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No contacts available to invite
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInviteToGroup(false)}>Close</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
}
