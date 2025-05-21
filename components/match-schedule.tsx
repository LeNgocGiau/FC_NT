"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar, Clock, MapPin, Trophy, Plus, Edit, Trash2, Send, Bot, X, Upload, Image, Sparkles, Volume2, VolumeX, Smile, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Match, Team } from "@/lib/types"
import ConfirmDeleteDialog from "@/components/confirm-delete-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import PlayerRating from "@/components/player-rating"

// Define the PlayerRatingsData interface here to match the one from player-rating.tsx
interface PlayerRating {
  playerId: string
  score: number
  isMVP?: boolean
  comment?: string
}

interface PlayerRatingsData {
  matchId: string
  homeTeamRatings: PlayerRating[]
  awayTeamRatings: PlayerRating[]
  homeMVP?: string
  awayMVP?: string
}

interface MatchScheduleProps {
  matches: Match[]
  onAddMatch: (match: Match) => void
  onUpdateMatch: (match: Match) => void
  onDeleteMatch: (id: string) => void
  homeTeam: Team
  awayTeam: Team
}

// Types for AI Agent
type AgentAction = 
  | { type: 'ADD_MATCH', match: Partial<Match> }
  | { type: 'FILTER_MATCHES', filter: string }
  | { type: 'FIND_MATCH', criteria: string }
  | { type: 'NONE' };

// Types for reactions
type Reaction = {
  emoji: string;
  count: number;
  users: string[];
  timestamp: number;
}

// Types for messages with reactions
type ChatMessage = {
  role: 'user' | 'ai' | 'agent';
  content: string;
  id: string;
  reactions?: Record<string, Reaction>;
}

export default function MatchSchedule({ matches, onAddMatch, onUpdateMatch, onDeleteMatch, homeTeam, awayTeam }: MatchScheduleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [matchIdToDelete, setMatchIdToDelete] = useState<string | null>(null)
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false)
  const [ratingMatch, setRatingMatch] = useState<Match | null>(null)
  
  // AI chat states
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [showAiSidebar, setShowAiSidebar] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [pendingAgentAction, setPendingAgentAction] = useState<AgentAction | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false)
  const [customApiKey, setCustomApiKey] = useState("")
  const [useCustomApiKey, setUseCustomApiKey] = useState(false)
  const [chatDialogQuestion, setChatDialogQuestion] = useState("")
  const [showingEmojiFor, setShowingEmojiFor] = useState<string | null>(null)
  
  // List of available emojis
  const availableEmojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "��", "🤔", "⭐"]

  // Gemini API key
  const GEMINI_API_KEY = "AIzaSyCb2qpQWEHsmNQSOoM3re6yweTfxdJ8VFs"

  // Mẫu trận đấu mới
  const newMatchTemplate: Match = {
    id: "",
    homeTeam: "",
    awayTeam: "",
    date: new Date().toISOString().split("T")[0],
    time: "19:00",
    venue: "",
    competition: "",
    completed: false,
  }

  // Speech synthesis state
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  
  // Function to speak text
  const speakText = (text: string) => {
    if (!synth || !isSpeechEnabled) return
    
    // Clean text from HTML tags and markdown
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/gm, '$1')
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'vi-VN' // Set to Vietnamese
    
    // Stop any current speech
    synth.cancel()
    
    // Speak
    synth.speak(utterance)
  }
  
  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (synth) synth.cancel()
    }
  }, [synth])

  const handleAddMatch = () => {
    setEditingMatch({
      ...newMatchTemplate,
      id: `match-${Date.now()}`,
    })
    setIsDialogOpen(true)
  }

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match)
    setIsDialogOpen(true)
  }

  const handleSaveMatch = () => {
    if (!editingMatch) return

    if (matches.some((match) => match.id === editingMatch.id)) {
      onUpdateMatch(editingMatch)
    } else {
      onAddMatch(editingMatch)
    }

    setIsDialogOpen(false)
    setEditingMatch(null)
  }

  const handleDeleteMatch = (id: string) => {
    setMatchIdToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteMatch = () => {
    if (matchIdToDelete) {
      onDeleteMatch(matchIdToDelete)
      setMatchIdToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const filteredMatches = matches.filter((match) => {
    if (filter === "all") return true
    if (filter === "upcoming") return !match.completed
    if (filter === "completed") return match.completed
    return true
  })

  // Sắp xếp trận đấu: trận sắp tới lên đầu, trận đã hoàn thành xuống cuối
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.completed && !b.completed) return 1
    if (!a.completed && b.completed) return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng tải lên tệp hình ảnh');
      return;
    }
    
    setImageFile(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to add a reaction to a message
  const addReaction = (messageId: string, emoji: string) => {
    setChatMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const oldReactions = msg.reactions || {};
          const reactions = { ...oldReactions };
          if (reactions[emoji]) {
            // Increment existing reaction count
            reactions[emoji] = {
              ...reactions[emoji],
              count: reactions[emoji].count + 1,
              users: [...reactions[emoji].users, 'current-user'],
              timestamp: Date.now() // Update timestamp for animation
            };
          } else {
            // Add new reaction
            reactions[emoji] = {
              emoji,
              count: 1,
              users: ['current-user'],
              timestamp: Date.now()
            };
          }
          
          return {
            ...msg,
            reactions
          };
        }
        return msg;
      })
    );
    
    // Close emoji picker
    setShowingEmojiFor(null);
  };

  // Generate a unique ID for messages
  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a function to help extract match information from natural language
  const extractMatchInfo = (text: string): Partial<Match> => {
    const matchInfo: Partial<Match> = {};
    
    // Simple pattern matching for common formats
    // Example: "Thêm trận đấu giữa Arsenal và Chelsea vào ngày 15/10/2023 lúc 19:30 tại Emirates Stadium trong giải Ngoại hạng Anh"
    
    // Extract team names
    const teamPattern = /giữa\s+([^\s]+(?:\s+[^\s]+)*)\s+(?:và|vs|gặp)\s+([^\s]+(?:\s+[^\s]+)*)/i;
    const teamMatch = text.match(teamPattern);
    if (teamMatch) {
      let homeTeam = teamMatch[1].trim();
      let awayTeam = teamMatch[2].trim();
      
      // Loại bỏ phần thông tin ngày, thời gian, địa điểm khỏi tên đội (nếu có)
      const cleanPatterns = [
        /\s+vào\s+ngày.*/i,
        /\s+ngày.*/i,
        /\s+lúc.*/i,
        /\s+tại.*/i,
        /\s+ở.*/i,
        /\s+trong.*/i,
        /\s+thuộc.*/i,
      ];
      
      for (const pattern of cleanPatterns) {
        homeTeam = homeTeam.replace(pattern, '');
        awayTeam = awayTeam.replace(pattern, '');
      }
      
      matchInfo.homeTeam = homeTeam;
      matchInfo.awayTeam = awayTeam;
    }
    
    // Extract date (support multiple formats)
    const datePatterns = [
      /ngày\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i, // ngày DD/MM/YYYY
      /ngày\s+(\d{1,2})[\/\-](\d{1,2})/i, // ngày DD/MM (current year)
    ];
    
    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch) {
        if (dateMatch.length === 4) {
          // DD/MM/YYYY format
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          matchInfo.date = `${year}-${month}-${day}`;
        } else {
          // DD/MM format (use current year)
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const year = new Date().getFullYear();
          matchInfo.date = `${year}-${month}-${day}`;
        }
        break;
      }
    }
    
    // Extract time
    const timePattern = /(?:lúc|giờ)\s+(\d{1,2})[h:](\d{1,2})?/i;
    const timeMatch = text.match(timePattern);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = (timeMatch[2] || "00").padStart(2, '0');
      matchInfo.time = `${hours}:${minutes}`;
    }
    
    // Extract venue
    const venuePatterns = [
      /(?:tại|ở)\s+([^\.,]+)(?:,|\.|trong)/i,
      /(?:tại|ở)\s+([^\.,]+)$/i,
    ];
    
    for (const pattern of venuePatterns) {
      const venueMatch = text.match(pattern);
      if (venueMatch) {
        matchInfo.venue = venueMatch[1].trim();
        break;
      }
    }
    
    // Extract competition
    const competitionPatterns = [
      /(?:trong|thuộc)\s+(?:giải|khuôn khổ)\s+([^\.,]+)(?:,|\.)/i,
      /(?:trong|thuộc)\s+(?:giải|khuôn khổ)\s+([^\.,]+)$/i,
      /(?:giải|khuôn khổ)\s+([^\.,]+)(?:,|\.)/i,
      /(?:giải|khuôn khổ)\s+([^\.,]+)$/i,
    ];
    
    for (const pattern of competitionPatterns) {
      const competitionMatch = text.match(pattern);
      if (competitionMatch) {
        matchInfo.competition = competitionMatch[1].trim();
        break;
      }
    }
    
    // Extract score for home team
    const homeScorePatterns = [
      /(?:đội nhà|đội 1)\s+(?:ghi được|đạt|ghi|thắng|được)\s+(\d+)(?:\s+bàn|\s+điểm|\s+bàn thắng)?/i,
      /(?:tỉ số|tỷ số|kết quả)\s+(\d+)(?:\s*[\-:])\s*\d+/i,
      /(\d+)(?:\s*[\-:])\s*\d+\s+(?:cho|là tỉ số của|là kết quả)/i,
    ];
    
    for (const pattern of homeScorePatterns) {
      const scoreMatch = text.match(pattern);
      if (scoreMatch) {
        matchInfo.homeScore = parseInt(scoreMatch[1], 10);
        // Nếu có điểm số, đánh dấu trận đấu đã kết thúc
        matchInfo.completed = true;
        break;
      }
    }
    
    // Extract score for away team
    const awayScorePatterns = [
      /(?:đội khách|đội 2)\s+(?:ghi được|đạt|ghi|thắng|được)\s+(\d+)(?:\s+bàn|\s+điểm|\s+bàn thắng)?/i,
      /(?:tỉ số|tỷ số|kết quả)\s+\d+(?:\s*[\-:])\s*(\d+)/i,
      /\d+(?:\s*[\-:])\s*(\d+)\s+(?:cho|là tỉ số của|là kết quả)/i,
    ];
    
    for (const pattern of awayScorePatterns) {
      const scoreMatch = text.match(pattern);
      if (scoreMatch) {
        matchInfo.awayScore = parseInt(scoreMatch[1], 10);
        // Nếu có điểm số, đánh dấu trận đấu đã kết thúc
        matchInfo.completed = true;
        break;
      }
    }
    
    // Extract notes
    const notesPatterns = [
      /ghi chú(?:\s*[:]\s*)["']([^"']+)["']/i,
      /ghi chú(?:\s*[:]\s*)([^.,]+)(?:,|\.|\n|$)/i,
      /chú thích(?:\s*[:]\s*)["']([^"']+)["']/i,
      /chú thích(?:\s*[:]\s*)([^.,]+)(?:,|\.|\n|$)/i,
    ];
    
    for (const pattern of notesPatterns) {
      const notesMatch = text.match(pattern);
      if (notesMatch) {
        matchInfo.notes = notesMatch[1].trim();
        break;
      }
    }
    
    return matchInfo;
  };

  // Parse agent action from AI response
  const parseAgentAction = (aiText: string): { text: string, action: AgentAction } => {
    const actionPattern = /\[ACTION:([^]]+)\]/;
    const match = aiText.match(actionPattern);
    
    if (!match) {
      return { text: aiText, action: { type: 'NONE' } };
    }
    
    try {
      const actionJson = match[1].trim();
      const action = JSON.parse(actionJson) as AgentAction;
      
      // Remove the action part from the text
      const cleanedText = aiText.replace(actionPattern, '').trim();
      
      return { text: cleanedText, action };
    } catch (e) {
      console.error("Error parsing agent action:", e);
      return { text: aiText, action: { type: 'NONE' } };
    }
  };

  const getActionDescription = (action: AgentAction): string => {
    switch (action.type) {
      case 'ADD_MATCH':
        let description = `Thêm trận đấu ${action.match.homeTeam} vs ${action.match.awayTeam}`;
        if (action.match.completed && action.match.homeScore !== undefined && action.match.awayScore !== undefined) {
          description += ` (${action.match.homeScore}-${action.match.awayScore})`;
        }
        return description;
      case 'FILTER_MATCHES':
        return `Lọc trận đấu ${
          action.filter === 'upcoming' ? 'sắp diễn ra' : 
          action.filter === 'completed' ? 'đã kết thúc' : 'tất cả'
        }`;
      case 'FIND_MATCH':
        return `Tìm kiếm trận đấu "${action.criteria}"`;
      case 'NONE':
        return 'Không có hành động';
    }
  };

  // Agent Action Executors
  const executeAgentAction = (action: AgentAction) => {
    if (action.type === 'NONE') return;
    
    const actionMessageId = generateMessageId();
    const actionMessage = {
      role: 'agent' as const,
      content: `⚡ Đang thực hiện hành động: ${getActionDescription(action)}`,
      id: actionMessageId
    };
    
    setChatMessages(prev => [...prev, actionMessage]);
    
    // Execute different actions based on type
    switch (action.type) {
      case 'ADD_MATCH':
        // Create a complete match object with all required fields
        const newMatch = {
          ...newMatchTemplate,
          id: `match-${Date.now()}`,
          ...action.match,
          // Set default values for any missing fields
          homeTeam: action.match.homeTeam || "",
          awayTeam: action.match.awayTeam || "",
          date: action.match.date || new Date().toISOString().split("T")[0],
          time: action.match.time || "19:00",
          venue: action.match.venue || "",
          competition: action.match.competition || "V-League",
          completed: action.match.completed || false,
        };
        
        // Automatically add the match
        onAddMatch(newMatch as Match);
        
        const resultMessageId = generateMessageId();
        setChatMessages(prev => [
          ...prev, 
          { 
            role: 'agent', 
            content: `✅ Đã thêm trận đấu mới:\n\n${newMatch.homeTeam} VS ${newMatch.awayTeam}\n\nVào ngày: ${formatDate(newMatch.date)}${newMatch.completed ? `\nKết quả: ${newMatch.homeScore || 0}-${newMatch.awayScore || 0}` : ''}${newMatch.notes ? `\nGhi chú: ${newMatch.notes}` : ''}`,
            id: resultMessageId
          }
        ]);
        break;
        
      case 'FILTER_MATCHES':
        if (action.filter === 'upcoming') {
          setFilter('upcoming');
        } else if (action.filter === 'completed') {
          setFilter('completed');
        } else {
          setFilter('all');
        }
        
        const filterMessageId = generateMessageId();
        setChatMessages(prev => [
          ...prev, 
          { 
            role: 'agent', 
            content: `✅ Đã lọc danh sách trận đấu: ${
              action.filter === 'upcoming' ? 'Sắp diễn ra' : 
              action.filter === 'completed' ? 'Đã kết thúc' : 'Tất cả'
            }`,
            id: filterMessageId
          }
        ]);
        break;
        
      case 'FIND_MATCH':
        const searchTerm = action.criteria.toLowerCase();
        const foundMatches = matches.filter(match => 
          match.homeTeam.toLowerCase().includes(searchTerm) ||
          match.awayTeam.toLowerCase().includes(searchTerm) ||
          match.competition.toLowerCase().includes(searchTerm) ||
          match.venue.toLowerCase().includes(searchTerm)
        );
        
        const findMessageId = generateMessageId();
        if (foundMatches.length > 0) {
          const matchesInfo = foundMatches.map(match => 
            `• ${match.homeTeam} VS ${match.awayTeam}\n  Ngày: ${formatDate(match.date)}  |  Địa điểm: ${match.venue}`
          ).join('\n\n');
          
          setChatMessages(prev => [
            ...prev, 
            { 
              role: 'agent', 
              content: `🔍 Tìm thấy ${foundMatches.length} trận đấu:\n\n${matchesInfo}`,
              id: findMessageId
            }
          ]);
        } else {
          setChatMessages(prev => [
            ...prev, 
            { 
              role: 'agent', 
              content: `❌ Không tìm thấy trận đấu nào phù hợp với "${action.criteria}"`, 
              id: findMessageId
            }
          ]);
        }
        break;
    }
    
    setPendingAgentAction(null);
  };

  // AI chat function
  const askAI = async () => {
    if (!aiQuestion.trim() && !uploadedImage) return;
    
    // Add user message to chat history
    const userMessage = aiQuestion.trim();
    const userMessageId = generateMessageId();
    
    setChatMessages(prev => [...prev, {
      role: 'user', 
      content: userMessage || (uploadedImage ? '[Đã gửi một hình ảnh]' : ''),
      id: userMessageId
    }]);
    
    // Check for founder question
    const founderQuestions = [
      'người sáng lập', 
      'ai sáng lập', 
      'founder', 
      'người tạo ra', 
      'ai tạo ra', 
      'ai làm ra', 
      'người phát triển', 
      'ai phát triển'
    ];
    
    if (founderQuestions.some(q => userMessage.toLowerCase().includes(q))) {
      const founderResponse = `Đây là phần mềm quản lý đội bóng do một nhóm sinh viên kĩ thuật của các trường như <b>HCMUT</b>, <b>UIT</b>, <b>SGU</b> cùng phát triển. Người đứng đầu dự án (CO-Founder) là <b>LÊ NGỌC GIÀU</b>, <b>NGUYỄN HOÀNG NAM</b>, <b>TRẦN CÔNG MINH</b>,... đây là những người thực hiện code và phát triển ý tưởng dự án.`;
      
      const aiMessageId = generateMessageId();
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: founderResponse,
        id: aiMessageId
      }]);
      
      // Speak the AI response
      speakText(founderResponse);
      
      // Clear input after sending
      setAiQuestion("");
      handleRemoveImage();
      return;
    }
    
    // First check if the message directly asks to add a match
    if (userMessage.toLowerCase().includes('thêm trận') || 
        userMessage.toLowerCase().includes('tạo trận') || 
        userMessage.includes('đặt lịch trận')) {
      
      // Try to extract match information directly from the prompt
      const matchInfo = extractMatchInfo(userMessage);
      
      // If we have at least home team and away team, suggest adding the match
      if (matchInfo.homeTeam && matchInfo.awayTeam) {
        const action: AgentAction = {
          type: 'ADD_MATCH',
          match: matchInfo
        };
        
        // Add a system message confirming the extracted info with ID
        const agentMessageId = generateMessageId();
        
        setChatMessages(prev => 
          [...prev, {
            role: 'agent',
            content: `🤖 Tôi đã hiểu yêu cầu của bạn. Bạn muốn thêm trận đấu:

${matchInfo.homeTeam} VS ${matchInfo.awayTeam}

Thông tin chi tiết:${matchInfo.date ? `
• Ngày thi đấu: ${matchInfo.date}` : ''}${matchInfo.time ? `
• Giờ thi đấu: ${matchInfo.time}` : ''}${matchInfo.venue ? `
• Địa điểm: ${matchInfo.venue}` : ''}${matchInfo.competition ? `
• Giải đấu: ${matchInfo.competition}` : ''}${matchInfo.completed ? `
• Trạng thái: Đã kết thúc${matchInfo.homeScore !== undefined && matchInfo.awayScore !== undefined ? ` (Tỉ số: ${matchInfo.homeScore}-${matchInfo.awayScore})` : ''}` : ''}${matchInfo.notes ? `
• Ghi chú: ${matchInfo.notes}` : ''}

Vui lòng xác nhận bằng nút bên dưới.`,
            id: agentMessageId
          }]
        );
        
        setPendingAgentAction(action);
        setAiQuestion("");
        handleRemoveImage();
        return;
      }
    }
    
    // Check if user message contains a direct action command
    if (userMessage.includes('[ACTION:')) {
      try {
        const { action } = parseAgentAction(userMessage);
        if (action.type !== 'NONE') {
          // Add a clear system message about detected action
          const actionMessageId = generateMessageId();
          setChatMessages(prev => [...prev, {
            role: 'agent',
            content: `🤖 Đã phát hiện lệnh thực hiện: "${getActionDescription(action)}"\n\nVui lòng xác nhận bằng nút bên dưới.`,
            id: actionMessageId
          }]);
          
          setPendingAgentAction(action);
          setAiQuestion("");
          handleRemoveImage();
          return;
        }
      } catch (error) {
        console.error("Failed to parse direct action:", error);
        // Show error message if parsing failed
        const errorMessageId = generateMessageId();
        setChatMessages(prev => [...prev, {
          role: 'agent',
          content: `❌ Không thể phân tích lệnh. Vui lòng kiểm tra định dạng JSON.`,
          id: errorMessageId
        }]);
      }
    }
    
    // Check if message starts with '@' - handle as general knowledge question
    if (userMessage.startsWith('@')) {
      const generalQuestion = userMessage.substring(1).trim(); // Remove @ prefix
      
      setIsAiLoading(true);
      
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: generalQuestion }]
              }]
            }),
          }
        );
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể lấy được phản hồi từ AI.";
        
        // Add AI response to chat history
        const aiMessageId = generateMessageId();
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: aiResponse,
          id: aiMessageId
        }]);
        
        // Speak the AI response
        speakText(aiResponse);
        
        // Clear input after sending
        setAiQuestion("");
        handleRemoveImage();
        
      } catch (error) {
        console.error("Error querying AI:", error);
        const errorMessageId = generateMessageId();
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: "Đã xảy ra lỗi khi tương tác với AI. Vui lòng thử lại sau.",
          id: errorMessageId
        }]);
      } finally {
        setIsAiLoading(false);
      }
      return;
    }
    
    setIsAiLoading(true);
    
    try {
      // Create context from matches data
      const matchesContext = matches.map(match => 
        `${match.homeTeam} vs ${match.awayTeam} - ${formatDate(match.date)} at ${match.time}, ${match.venue}, ${match.competition}${
          match.completed ? `, Score: ${match.homeScore}-${match.awayScore}` : ""
        }`
      ).join("\n");

      // Describe agent capabilities
      const agentCapabilities = `
Bạn là một AI Agent có khả năng không chỉ trả lời câu hỏi mà còn thực hiện các hành động sau:
1. Thêm trận đấu mới (ADD_MATCH): Khi người dùng yêu cầu thêm trận đấu, bạn có thể tạo một trận đấu mới
2. Lọc danh sách trận đấu (FILTER_MATCHES): Hiển thị các trận sắp tới, đã kết thúc, hoặc tất cả
3. Tìm kiếm trận đấu (FIND_MATCH): Tìm trận đấu dựa theo đội bóng, giải đấu, địa điểm...

Nếu yêu cầu của người dùng liên quan đến một trong các hành động trên, hãy trả lời và thêm cú pháp JSON đặc biệt:
[ACTION:{"type":"ACTION_TYPE",...chi tiết action}]

Ví dụ: 
- Nếu người dùng muốn thêm trận đấu giữa MU và Chelsea ngày 15/09/2023:
[ACTION:{"type":"ADD_MATCH","match":{"homeTeam":"MU","awayTeam":"Chelsea","date":"2023-09-15","venue":"Old Trafford","competition":"Ngoại hạng Anh"}}]

- Nếu người dùng muốn xem các trận sắp diễn ra:
[ACTION:{"type":"FILTER_MATCHES","filter":"upcoming"}]

- Nếu người dùng muốn tìm trận đấu với Man City:
[ACTION:{"type":"FIND_MATCH","criteria":"Man City"}]

Việc của bạn là hiểu ý định của người dùng và thực hiện đúng hành động tương ứng.
      `;
      
      let requestBody: any = {
        contents: [{
          parts: []
        }]
      };
      
      // Add text if provided
      if (userMessage) {
        const prompt = `Thông tin về các trận đấu:\n${matchesContext}\n\n${agentCapabilities}\n\nCâu hỏi: ${userMessage}`;
        requestBody.contents[0].parts.push({ text: prompt });
      }
      
      // Add image if provided
      if (imageFile) {
        const imageBase64 = uploadedImage?.split(',')[1];
        if (imageBase64) {
          requestBody.contents[0].parts.push({
            inline_data: {
              mime_type: imageFile.type,
              data: imageBase64
            }
          });
          
          // Add specific prompt for image analysis if no text was provided
          if (!userMessage) {
            requestBody.contents[0].parts.push({ 
              text: `${agentCapabilities}\n\nHãy phân tích hình ảnh này và mô tả những gì bạn thấy liên quan đến bóng đá hoặc thể thao.`
            });
          }
        }
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      const rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể lấy được phản hồi từ AI.";
      
      // Parse agent actions
      const { text: aiText, action } = parseAgentAction(rawAiText);
      
      // Add AI response to chat history
      const aiMessageId = generateMessageId();
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: aiText,
        id: aiMessageId
      }]);
      
      // Speak the AI response
      speakText(aiText);
      
      // Handle agent action if present
      if (action.type !== 'NONE') {
        setPendingAgentAction(action);
      }
      
      // Clear input and image after sending
      setAiQuestion("");
      handleRemoveImage();
      
    } catch (error) {
      console.error("Error querying AI:", error);
      const errorMessageId = generateMessageId();
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: "Đã xảy ra lỗi khi tương tác với AI. Vui lòng thử lại sau.",
        id: errorMessageId
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Toggle AI sidebar visibility
  const toggleAiSidebar = () => {
    setShowAiSidebar(!showAiSidebar);
    if (!showAiSidebar) {
      setAiQuestion("");
      setUploadedImage(null);
      setImageFile(null);
    }
  };

  // Add handleChatDialogQuestion function to handle chat requests from the dialog
  const handleChatDialogQuestion = async () => {
    if (!chatDialogQuestion.trim()) return;
    
    let apiKeyToUse = useCustomApiKey ? customApiKey : GEMINI_API_KEY;
    
    if (!apiKeyToUse) {
      alert("Vui lòng nhập API key hoặc sử dụng API key mặc định");
      return;
    }
    
    // Add user message to chat history
    const userMessage = chatDialogQuestion.trim();
    const userMessageId = generateMessageId();
    
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      id: userMessageId
    }]);
    
    // Check for founder question
    const founderQuestions = [
      'người sáng lập', 
      'ai sáng lập', 
      'founder', 
      'người tạo ra', 
      'ai tạo ra', 
      'ai làm ra', 
      'người phát triển', 
      'ai phát triển'
    ];
    
    if (founderQuestions.some(q => userMessage.toLowerCase().includes(q))) {
      const founderResponse = `Đây là phần mềm quản lý đội bóng do một nhóm sinh viên kĩ thuật của các trường như <b>HCMUT</b>, <b>UIT</b>, <b>SGU</b> cùng phát triển. Người đứng đầu dự án (CO-Founder) là <b>LÊ NGỌC GIÀU</b>, <b>NGUYỄN HOÀNG NAM</b>, <b>TRẦN CÔNG MINH</b>,... đây là những người thực hiện code và phát triển ý tưởng dự án.`;
      
      const aiMessageId = generateMessageId();
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: founderResponse,
        id: aiMessageId
      }]);
      
      // Speak the AI response
      speakText(founderResponse);
      
      // Clear input after sending
      setChatDialogQuestion("");
      return;
    }
    
    setIsAiLoading(true);
    
    try {
      // Check if message starts with '@' - handle as general knowledge question
      if (userMessage.startsWith('@')) {
        const generalQuestion = userMessage.substring(1).trim(); // Remove @ prefix
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: generalQuestion }]
              }]
            }),
          }
        );
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể lấy được phản hồi từ AI.";
        
        // Add AI response to chat history
        const aiMessageId = generateMessageId();
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: aiResponse,
          id: aiMessageId
        }]);
        
        // Speak the AI response
        speakText(aiResponse);
        
        // Clear input after sending
        setChatDialogQuestion("");
        handleRemoveImage();
        
      } else {
        // Regular app-related question - use the existing functionality
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeyToUse}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: userMessage }]
              }]
            }),
          }
        );
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể lấy được phản hồi từ AI.";
        
        // Add AI response to chat history
        const aiMessageId = generateMessageId();
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: aiResponse,
          id: aiMessageId
        }]);
        
        // Speak the AI response
        speakText(aiResponse);
      }
      
      // Clear input after sending
      setChatDialogQuestion("");
      
    } catch (error) {
      console.error("Error querying AI:", error);
      const errorMessageId = generateMessageId();
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: "Đã xảy ra lỗi khi tương tác với AI. Vui lòng kiểm tra API key hoặc thử lại sau.",
        id: errorMessageId
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRateMatch = (match: Match) => {
    setRatingMatch(match)
    setIsRatingDialogOpen(true)
  }
  
  const handleSaveRatings = (ratings: PlayerRatingsData) => {
    if (ratingMatch) {
      const updatedMatch = {
        ...ratingMatch,
        playerRatings: ratings
      }
      onUpdateMatch(updatedMatch)
    }
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${showAiSidebar ? 'pr-[350px]' : ''}`}>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Lịch thi đấu</h2>
            <div className="flex space-x-2">
              <Button onClick={toggleAiSidebar} variant="outline" className="flex items-center">
                <Bot className="h-4 w-4 mr-2" /> {showAiSidebar ? "Đóng AI" : "Hỏi AI"}
              </Button>
              <Button onClick={handleAddMatch} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="h-4 w-4 mr-2" /> Thêm trận đấu
              </Button>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
              Tất cả
            </Button>
            <Button variant={filter === "upcoming" ? "default" : "outline"} size="sm" onClick={() => setFilter("upcoming")}>
              Sắp diễn ra
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
            >
              Đã kết thúc
            </Button>
          </div>

          {sortedMatches.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              Không có trận đấu nào {filter === "upcoming" ? "sắp diễn ra" : filter === "completed" ? "đã kết thúc" : ""}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMatches.map((match) => (
                <div
                  key={match.id}
                  className={`border rounded-lg p-4 ${
                    match.completed ? "bg-gray-50" : "bg-white"
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge variant={match.completed ? "secondary" : "default"}>
                        {match.completed ? "Đã kết thúc" : "Sắp diễn ra"}
                      </Badge>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Trophy className="h-4 w-4 mr-1" />
                        {match.competition}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {match.completed && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 flex items-center text-xs"
                          onClick={() => handleRateMatch(match)}
                        >
                          <Star className="h-3 w-3 mr-1" /> 
                          {match.playerRatings ? "Xem đánh giá" : "Đánh giá cầu thủ"}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditMatch(match)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => handleDeleteMatch(match.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div className="text-right flex-1">
                      <p className="font-bold text-lg">{match.homeTeam}</p>
                      {match.completed && <p className="text-2xl font-bold">{match.homeScore}</p>}
                    </div>
                    <div className="mx-4 text-center">
                      <p className="text-sm font-medium">VS</p>
                      {match.completed && <p className="text-lg font-bold">-</p>}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-lg">{match.awayTeam}</p>
                      {match.completed && <p className="text-2xl font-bold">{match.awayScore}</p>}
                    </div>
                  </div>

                  {/* MVP Display */}
                  {match.playerRatings && match.completed && (match.playerRatings.homeMVP || match.playerRatings.awayMVP) && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Home Team MVP */}
                      <div className="bg-yellow-100 rounded-lg p-5 relative overflow-hidden shadow-md border border-yellow-200">
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-yellow-300 opacity-20 transform translate-x-10 -translate-y-10"></div>
                        
                        {match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore > match.awayScore && (
                          <div className="absolute top-3 right-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            WIN
                          </div>
                        )}
                        
                        {match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore < match.awayScore && (
                          <div className="absolute top-3 right-3 border border-gray-300 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                            LOSS
                          </div>
                        )}
                        
                        <div className="flex items-start">
                          <div className="mr-4">
                            <Trophy className="h-10 w-10 text-yellow-500" />
                          </div>
                          <div>
                            <div className="text-base font-bold mb-3">MVP Đội nhà</div>
                            {match.playerRatings?.homeMVP ? 
                              (() => {
                                const homeMvpPlayer = homeTeam.players.find(p => p.id === match.playerRatings?.homeMVP);
                                const homeMvpRating = match.playerRatings?.homeTeamRatings.find(r => r.playerId === match.playerRatings?.homeMVP);
                                
                                if (!homeMvpPlayer || !homeMvpRating) {
                                  return <span className="text-gray-500 text-sm">MVP không có sẵn</span>;
                                }
                                
                                return (
                                  <div className="flex items-center">
                                    <div className={`w-14 h-14 flex items-center justify-center rounded-full text-white bg-blue-500 mr-3 shadow-md`}>
                                      {homeMvpPlayer.image ? (
                                        <img src={homeMvpPlayer.image} alt={homeMvpPlayer.name} className="w-full h-full rounded-full object-cover" />
                                      ) : (
                                        <div className="text-lg font-bold">{homeMvpPlayer.position.charAt(0) || "?"}</div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-lg font-bold">{homeMvpPlayer.name}</p>
                                      <p className="text-sm text-gray-600">{homeMvpPlayer.position}</p>
                                      <div className="flex items-center mt-1">
                                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                        <span className="text-lg font-bold ml-1">{homeMvpRating.score.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                              : <span className="text-gray-500 text-sm">Chưa có MVP</span>
                            }
                          </div>
                        </div>
                      </div>
                      
                      {/* Away Team MVP */}
                      <div className="bg-purple-100 rounded-lg p-5 relative overflow-hidden shadow-md border border-purple-200">
                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-300 opacity-20 transform translate-x-10 -translate-y-10"></div>
                        
                        {match.homeScore !== undefined && match.awayScore !== undefined && match.awayScore > match.homeScore && (
                          <div className="absolute top-3 right-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            WIN
                          </div>
                        )}
                        
                        {match.homeScore !== undefined && match.awayScore !== undefined && match.awayScore < match.homeScore && (
                          <div className="absolute top-3 right-3 border border-gray-300 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                            LOSS
                          </div>
                        )}
                        
                        <div className="flex items-start">
                          <div className="mr-4">
                            <Trophy className="h-10 w-10 text-purple-500" />
                          </div>
                          <div>
                            <div className="text-base font-bold mb-3">MVP Đội khách</div>
                            {match.playerRatings?.awayMVP ? 
                              (() => {
                                const awayMvpPlayer = awayTeam.players.find(p => p.id === match.playerRatings?.awayMVP);
                                const awayMvpRating = match.playerRatings?.awayTeamRatings.find(r => r.playerId === match.playerRatings?.awayMVP);
                                
                                if (!awayMvpPlayer || !awayMvpRating) {
                                  return <span className="text-gray-500 text-sm">MVP không có sẵn</span>;
                                }
                                
                                return (
                                  <div className="flex items-center">
                                    <div className={`w-14 h-14 flex items-center justify-center rounded-full text-white bg-red-500 mr-3 shadow-md`}>
                                      {awayMvpPlayer.image ? (
                                        <img src={awayMvpPlayer.image} alt={awayMvpPlayer.name} className="w-full h-full rounded-full object-cover" />
                                      ) : (
                                        <div className="text-lg font-bold">{awayMvpPlayer.position.charAt(0) || "?"}</div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-lg font-bold">{awayMvpPlayer.name}</p>
                                      <p className="text-sm text-gray-600">{awayMvpPlayer.position}</p>
                                      <div className="flex items-center mt-1">
                                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                        <span className="text-lg font-bold ml-1">{awayMvpRating.score.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                              : <span className="text-gray-500 text-sm">Chưa có MVP</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(match.date)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {match.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {match.venue}
                    </div>
                  </div>

                  {match.notes && (
                    <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                      <p className="font-medium mb-1">Ghi chú:</p>
                      <p>{match.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Sidebar */}
      {showAiSidebar && (
        <div className="fixed top-0 right-0 h-full w-[350px] border-l bg-slate-50 z-10 flex flex-col shadow-lg">
          <div className="p-4 border-b bg-white flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center">
              <Bot className="h-5 w-5 mr-2 text-blue-500" /> Trợ lý AI
            </h3>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 mr-2" 
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                title={isSpeechEnabled ? "Tắt phát âm" : "Bật phát âm"}
              >
                {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleAiSidebar}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 my-8">
                <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Hãy đặt câu hỏi hoặc tải lên hình ảnh để bắt đầu.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`relative ${
                    msg.role === 'user' 
                      ? 'bg-blue-100 ml-auto' 
                      : msg.role === 'agent'
                        ? 'bg-purple-100 border border-purple-200'
                        : 'bg-white border'
                  } rounded-lg p-3 max-w-[90%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div 
                    className="whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />
                  
                  {/* Emoji reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.values(msg.reactions).map((reaction) => (
                        <span 
                          key={reaction.emoji} 
                          className={cn(
                            "inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-xs",
                            Date.now() - reaction.timestamp < 3000 && "animate-bounce"
                          )}
                          title={`${reaction.count} ${reaction.count > 1 ? 'reactions' : 'reaction'}`}
                        >
                          {reaction.emoji} {reaction.count > 1 && reaction.count}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Add reaction button */}
                  <div className="absolute bottom-1 right-1">
                    <Popover open={showingEmojiFor === msg.id} onOpenChange={(open) => {
                      if (open) setShowingEmojiFor(msg.id);
                      else setShowingEmojiFor(null);
                    }}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 rounded-full opacity-50 hover:opacity-100"
                        >
                          <Smile className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="end">
                        <div className="flex space-x-1">
                          {availableEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              className="hover:bg-muted p-2 rounded-full transition-colors"
                              onClick={() => addReaction(msg.id, emoji)}
                            >
                              <span className="text-lg">{emoji}</span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ))
            )}
            {isAiLoading && (
              <div className="bg-white border rounded-lg p-3 max-w-[90%]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Pending action */}
          {pendingAgentAction && (
            <div className="p-4 border-t bg-purple-50 animate-pulse">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                  Hành động được đề xuất
                </h4>
              </div>
              
              {pendingAgentAction.type === 'ADD_MATCH' ? (
                <div>
                  <div className="text-sm mb-2 font-medium">
                    Thêm trận đấu:
                  </div>
                  <div className="bg-white rounded p-2 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{pendingAgentAction.match.homeTeam}</span>
                      <span className="text-xs mx-2">VS</span>
                      <span className="font-bold">{pendingAgentAction.match.awayTeam}</span>
                    </div>
                    {pendingAgentAction.match.completed && pendingAgentAction.match.homeScore !== undefined && pendingAgentAction.match.awayScore !== undefined && (
                      <div className="flex justify-center mb-2 text-sm">
                        <span className="font-bold">{pendingAgentAction.match.homeScore}</span>
                        <span className="mx-2">-</span>
                        <span className="font-bold">{pendingAgentAction.match.awayScore}</span>
                      </div>
                    )}
                    <div className="text-xs space-y-1 text-gray-600">
                      {pendingAgentAction.match.date && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {pendingAgentAction.match.date}
                        </div>
                      )}
                      {pendingAgentAction.match.time && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {pendingAgentAction.match.time}
                        </div>
                      )}
                      {pendingAgentAction.match.venue && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {pendingAgentAction.match.venue}
                        </div>
                      )}
                      {pendingAgentAction.match.competition && (
                        <div className="flex items-center">
                          <Trophy className="h-3 w-3 mr-1" />
                          {pendingAgentAction.match.competition}
                        </div>
                      )}
                      {pendingAgentAction.match.notes && (
                        <div className="flex items-start mt-1 pt-1 border-t border-gray-100">
                          <span className="text-xs text-gray-500">Ghi chú:</span>
                          <span className="text-xs ml-1">{pendingAgentAction.match.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm mb-3 font-medium">{getActionDescription(pendingAgentAction)}</p>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setPendingAgentAction(null)}
                >
                  Hủy
                </Button>
                <Button 
                  size="sm" 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium" 
                  onClick={() => executeAgentAction(pendingAgentAction)}
                >
                  Xác nhận thực hiện
                </Button>
              </div>
            </div>
          )}

          {/* Image preview */}
          {uploadedImage && (
            <div className="p-4 border-t bg-white">
              <div className="relative">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded image" 
                  className="w-full h-auto max-h-[150px] object-contain rounded-lg border"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-white/80 rounded-full"
                  onClick={handleRemoveImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-4 w-4 mr-1" />
                Gửi ảnh
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => setIsChatDialogOpen(true)}
              >
                <Bot className="h-4 w-4 mr-1" />
                Chat AI
              </Button>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Hỏi AI về lịch thi đấu, đội bóng, hoặc thông tin bóng đá..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askAI()}
                disabled={isAiLoading}
              />
              <Button onClick={askAI} disabled={isAiLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog xác nhận xóa */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xác nhận xóa trận đấu"
        description="Bạn có chắc chắn muốn xóa trận đấu này? Hành động này không thể hoàn tác."
        onConfirm={confirmDeleteMatch}
      />
      
      {/* ChatAI Dialog */}
      <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
        <DialogContent className="max-w-lg h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                Chat với AI
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                title={isSpeechEnabled ? "Tắt phát âm" : "Bật phát âm"}
              >
                {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </DialogTitle>
            <DialogDescription>
              Sử dụng API key mặc định hoặc nhập API key của bạn để trò chuyện với AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="useCustomKey"
              checked={useCustomApiKey}
              onCheckedChange={setUseCustomApiKey}
            />
            <Label htmlFor="useCustomKey">Sử dụng API key của riêng tôi</Label>
          </div>
          
          {useCustomApiKey && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="apiKey">API Key (Gemini API)</Label>
              <Input
                id="apiKey"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="Nhập API key của bạn"
                type="password"
              />
            </div>
          )}
          
          {/* Chat history */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4 border rounded-md p-4">
              <div className="space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Hãy đặt câu hỏi để bắt đầu trò chuyện với AI.</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`relative ${
                        msg.role === 'user' 
                          ? 'bg-blue-100 ml-auto' 
                          : msg.role === 'agent'
                            ? 'bg-purple-100 border border-purple-200'
                            : 'bg-gray-100'
                      } rounded-lg p-3 max-w-[90%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      <div 
                        className="whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                      
                      {/* Emoji reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.values(msg.reactions).map((reaction) => (
                            <span 
                              key={reaction.emoji} 
                              className={cn(
                                "inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-xs",
                                Date.now() - reaction.timestamp < 3000 && "animate-bounce"
                              )}
                              title={`${reaction.count} ${reaction.count > 1 ? 'reactions' : 'reaction'}`}
                            >
                              {reaction.emoji} {reaction.count > 1 && reaction.count}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Add reaction button */}
                      <div className="absolute bottom-1 right-1">
                        <Popover open={showingEmojiFor === msg.id} onOpenChange={(open) => {
                          if (open) setShowingEmojiFor(msg.id);
                          else setShowingEmojiFor(null);
                        }}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 rounded-full opacity-50 hover:opacity-100"
                            >
                              <Smile className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-1" align="end">
                            <div className="flex space-x-1">
                              {availableEmojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  className="hover:bg-muted p-2 rounded-full transition-colors"
                                  onClick={() => addReaction(msg.id, emoji)}
                                >
                                  <span className="text-lg">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))
                )}
                {isAiLoading && (
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[90%]">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Input area */}
          <div className="mt-4 flex space-x-2">
            <Input
              placeholder="Nhập câu hỏi của bạn"
              value={chatDialogQuestion}
              onChange={(e) => setChatDialogQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatDialogQuestion()}
              disabled={isAiLoading}
            />
            <Button 
              onClick={handleChatDialogQuestion} 
              disabled={isAiLoading || !chatDialogQuestion.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMatch?.id.includes("match-") ? "Thêm trận đấu mới" : "Chỉnh sửa trận đấu"}
            </DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeTeam">Đội nhà</Label>
                  <Input
                    id="homeTeam"
                    value={editingMatch.homeTeam}
                    onChange={(e) => setEditingMatch({ ...editingMatch, homeTeam: e.target.value })}
                    placeholder="Tên đội nhà"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayTeam">Đội khách</Label>
                  <Input
                    id="awayTeam"
                    value={editingMatch.awayTeam}
                    onChange={(e) => setEditingMatch({ ...editingMatch, awayTeam: e.target.value })}
                    placeholder="Tên đội khách"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Ngày thi đấu</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editingMatch.date}
                    onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Giờ thi đấu</Label>
                  <Input
                    id="time"
                    type="time"
                    value={editingMatch.time}
                    onChange={(e) => setEditingMatch({ ...editingMatch, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Địa điểm</Label>
                <Input
                  id="venue"
                  value={editingMatch.venue}
                  onChange={(e) => setEditingMatch({ ...editingMatch, venue: e.target.value })}
                  placeholder="Sân vận động"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competition">Giải đấu</Label>
                <Select
                  value={editingMatch.competition}
                  onValueChange={(value) => setEditingMatch({ ...editingMatch, competition: value })}
                >
                  <SelectTrigger id="competition">
                    <SelectValue placeholder="Chọn giải đấu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V-League">V-League</SelectItem>
                    <SelectItem value="Cúp Quốc Gia">Cúp Quốc Gia</SelectItem>
                    <SelectItem value="AFC Champions League">AFC Champions League</SelectItem>
                    <SelectItem value="Giao hữu">Giao hữu</SelectItem>
                    <SelectItem value="Ngoại hạng Anh">Ngoại hạng Anh</SelectItem>
                    <SelectItem value="Champions League">Champions League</SelectItem>
                    <SelectItem value="World Cup">World Cup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="completed"
                  checked={editingMatch.completed}
                  onCheckedChange={(checked) => setEditingMatch({ ...editingMatch, completed: checked })}
                />
                <Label htmlFor="completed">Đã kết thúc</Label>
              </div>

              {editingMatch.completed && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeScore">Bàn thắng đội nhà</Label>
                    <Input
                      id="homeScore"
                      type="number"
                      min={0}
                      value={editingMatch.homeScore || 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, homeScore: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awayScore">Bàn thắng đội khách</Label>
                    <Input
                      id="awayScore"
                      type="number"
                      min={0}
                      value={editingMatch.awayScore || 0}
                      onChange={(e) =>
                        setEditingMatch({ ...editingMatch, awayScore: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={editingMatch.notes || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, notes: e.target.value })}
                  placeholder="Thông tin thêm về trận đấu"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSaveMatch}>Lưu</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Player Rating Dialog */}
      {ratingMatch && (
        <PlayerRating 
          match={ratingMatch}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          onSaveRatings={handleSaveRatings}
        />
      )}
    </div>
  )
}
