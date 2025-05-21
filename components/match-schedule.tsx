"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar, Clock, MapPin, Trophy, Plus, Edit, Trash2, Send, Bot, X, Upload, Image, Sparkles, Volume2, VolumeX, Smile, Star, Goal, Flag, List, Mic, MicOff, XCircle, Settings, Languages, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Match, Team, Player } from "@/lib/types"
import ConfirmDeleteDialog from "@/components/confirm-delete-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import PlayerRating from "@/components/player-rating"
import MatchEvents, { MatchEvents as MatchEventsType } from "@/components/match-events"
import { Slider } from "@/components/ui/slider"

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
  onUpdateHomeTeam?: (team: Team) => void
  onUpdateAwayTeam?: (team: Team) => void
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

// Match events interfaces
interface MatchGoal {
  id: string
  playerId: string
  teamId: string
  minute: number
  assistPlayerId?: string
  isOwnGoal?: boolean
  isPenalty?: boolean
  note?: string
}

interface MatchCard {
  id: string
  playerId: string
  teamId: string
  minute: number
  type: 'yellow' | 'red'
  reason?: string
}

interface MatchEvents {
  goals: MatchGoal[]
  cards: MatchCard[]
}

// Add TypeScript declarations for the SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

export default function MatchSchedule({ 
  matches, 
  onAddMatch, 
  onUpdateMatch, 
  onDeleteMatch, 
  homeTeam, 
  awayTeam,
  onUpdateHomeTeam,
  onUpdateAwayTeam
}: MatchScheduleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [matchIdToDelete, setMatchIdToDelete] = useState<string | null>(null)
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false)
  const [ratingMatch, setRatingMatch] = useState<Match | null>(null)
  const [isEventsDialogOpen, setIsEventsDialogOpen] = useState(false)
  const [eventsMatch, setEventsMatch] = useState<Match | null>(null)
  
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
  
  // Bổ sung state để lưu trữ danh sách giọng nói có sẵn
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  // Cập nhật useEffect hiện có hoặc thêm mới để lấy danh sách giọng nói
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Lấy danh sách giọng nói khi component được tạo
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices()
        setAvailableVoices(voices)
      }
      
      // SpeechSynthesis.getVoices có thể trả về mảng rỗng khi API chưa sẵn sàng
      loadVoices()
      
      // Đăng ký sự kiện voiceschanged để lấy danh sách khi có sẵn
      speechSynthesis.onvoiceschanged = loadVoices
      
      return () => {
        // Xóa event listener khi component unmount
        if (speechSynthesis) {
          speechSynthesis.onvoiceschanged = null
        }
      }
    }
  }, [])

  // Fix the detectTextLanguage function to properly handle type comparison
  const detectTextLanguage = (text: string): 'en' | 'vi' => {
    // Một số từ phổ biến trong tiếng Anh
    const englishWords = ['the', 'this', 'that', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must', 'hello']
    
    // Một số từ phổ biến trong tiếng Việt hoặc ký tự đặc trưng
    const vietnameseWords = ['của', 'và', 'các', 'những', 'trong', 'thì', 'là', 'có', 'không', 'được', 'đã', 'sẽ', 'với', 'cho', 'bạn', 'tôi']
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

    // Đếm từ phổ biến tiếng Anh và tiếng Việt
    let englishCount = 0
    let vietnameseCount = 0
    
    // Chuyển văn bản về chữ thường và tách từ
    const lowercasedText = text.toLowerCase()
    const words = lowercasedText.split(/\s+/)
    
    // Kiểm tra từng từ
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?;:'"()]/g, '')
      if (englishWords.includes(cleanWord)) {
        englishCount++
      }
      if (vietnameseWords.includes(cleanWord) || vietnameseChars.test(cleanWord)) {
        vietnameseCount++
      }
    }
    
    // Nếu có dấu tiếng Việt, ưu tiên tiếng Việt
    if (vietnameseChars.test(lowercasedText)) {
      return 'vi'
    }
    
    // Quyết định ngôn ngữ dựa trên số lượng từ phổ biến
    return englishCount > vietnameseCount ? 'en' : 'vi'
  }

  // Thêm các state mới cho cài đặt giọng nói
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false)
  const [preferredEnglishVoice, setPreferredEnglishVoice] = useState<string | null>(null)
  const [preferredVietnameseVoice, setPreferredVietnameseVoice] = useState<string | null>(null)
  const [speechRate, setSpeechRate] = useState(0.9)  // Speech rate - 0.1 to 2.0
  const [speechPitch, setSpeechPitch] = useState(1.0) // Speech pitch - 0.1 to 2.0
  const [speechVolume, setSpeechVolume] = useState(1.0) // Volume - 0 to 1.0
  const [highQualityVoice, setHighQualityVoice] = useState(true) // Prefer high-quality voices

  // Cập nhật phương thức findBestVoice để có nhiều tùy chọn hơn và ưu tiên những giọng chất lượng cao
  const findBestVoice = (language: 'en' | 'vi'): SpeechSynthesisVoice | null => {
    if (!availableVoices || availableVoices.length === 0) {
      return null
    }
    
    // Kiểm tra nếu người dùng đã chọn giọng ưa thích
    const preferredVoiceId = language === 'en' ? preferredEnglishVoice : preferredVietnameseVoice
    
    if (preferredVoiceId) {
      const selectedVoice = availableVoices.find(voice => voice.voiceURI === preferredVoiceId)
      if (selectedVoice) {
        return selectedVoice
      }
    }
    
    // Danh sách các ngôn ngữ ưu tiên
    const preferredLanguageCodes = {
      en: ['en-GB', 'en-UK', 'en-US', 'en'], // Ưu tiên giọng Anh-Anh (British)
      vi: ['vi-VN', 'vi']
    }
    
    // Danh sách tên giọng chất lượng cao đã biết
    const knownGoodVoices = {
      en: ['Daniel', 'Oliver', 'James', 'Thomas', 'George', 'Arthur', 'Alex', 'Samantha', 'Karen'],
      vi: ['Chi', 'Lan', 'Đức', 'Minh']
    }

    // Luôn sử dụng giọng nữ cho tiếng Việt
    if (language === 'vi') {
      // Mở rộng danh sách từ khóa tên phụ nữ tiếng Việt
      const femaleNameKeywords = ['chi', 'lan', 'hương', 'mai', 'thu', 'nữ', 'female', 'woman', 'girl', 'cô', 'chị', 'bà', 'thị', 'loan', 'hằng', 'hồng', 'ngọc'];
      
      // Thử tìm giọng nữ tiếng Việt dựa trên tên
      for (const langCode of preferredLanguageCodes.vi) {
        const femaleVoice = availableVoices.find(voice => 
          voice.lang.startsWith(langCode) && 
          femaleNameKeywords.some(keyword => 
            voice.name.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        
        if (femaleVoice) {
          console.log("Sử dụng giọng nữ tiếng Việt:", femaleVoice.name);
          return femaleVoice;
        }
      }
      
      // Thử tìm giọng không phải giọng nam
      const maleNameKeywords = ['nam', 'male', 'đức', 'minh', 'anh', 'ông', 'chú', 'bác', 'quang', 'tuấn', 'hùng'];
      
      for (const langCode of preferredLanguageCodes.vi) {
        const potentialFemaleVoice = availableVoices.find(voice => 
          voice.lang.startsWith(langCode) && 
          !maleNameKeywords.some(keyword => 
            voice.name.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        
        if (potentialFemaleVoice) {
          console.log("Sử dụng giọng có khả năng là nữ tiếng Việt:", potentialFemaleVoice.name);
          return potentialFemaleVoice;
        }
      }
      
      // Dùng bất kỳ giọng tiếng Việt nào
      const anyVietnameseVoice = availableVoices.find(voice => 
        voice.lang.startsWith('vi')
      );
      
      if (anyVietnameseVoice) {
        console.log("Sử dụng giọng tiếng Việt dự phòng:", anyVietnameseVoice.name);
        return anyVietnameseVoice;
      }
    }
    
    // Tìm giọng chất lượng cao đã biết
    if (highQualityVoice) {
      for (const voiceName of knownGoodVoices[language]) {
        for (const langCode of preferredLanguageCodes[language]) {
          const goodVoice = availableVoices.find(voice => 
            voice.lang.startsWith(langCode) && 
            voice.name.includes(voiceName)
          )
          if (goodVoice) return goodVoice
        }
      }
    }
    
    // Ưu tiên giọng có chất lượng cao (thường là giọng không phải mặc định)
    for (const langCode of preferredLanguageCodes[language]) {
      const premiumVoice = availableVoices.find(voice => 
        voice.lang.startsWith(langCode) && 
        (voice.localService === true || voice.name.includes('Premium') || voice.name.includes('Natural'))
      )
      
      if (premiumVoice) return premiumVoice
    }
    
    // Nếu không tìm thấy giọng cao cấp, ưu tiên giọng không phải Google/Microsoft
    for (const langCode of preferredLanguageCodes[language]) {
      const naturalVoice = availableVoices.find(voice => 
        voice.lang.startsWith(langCode) && 
        !voice.name.includes('Google') &&
        !voice.name.includes('Microsoft')
      )
      
      if (naturalVoice) return naturalVoice
    }
    
    // Nếu vẫn không tìm thấy, dùng bất kỳ giọng nào phù hợp
    for (const langCode of preferredLanguageCodes[language]) {
      const anyVoice = availableVoices.find(voice => voice.lang.startsWith(langCode))
      if (anyVoice) return anyVoice
    }
    
    // Nếu không tìm thấy giọng phù hợp với ngôn ngữ, trả về null
    return null
  }

  // Cập nhật hàm speakText với nhiều cải tiến chất lượng giọng nói
  const speakText = (text: string) => {
    if (!synth || !isSpeechEnabled || !text) return
    
    // Clean text from HTML tags and markdown
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/gm, '$1')
    
    // Phát hiện ngôn ngữ của văn bản
    const detectedLanguage = detectTextLanguage(cleanText)
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText)
    
    // Cài đặt ngôn ngữ và giọng nói phù hợp
    if (detectedLanguage === 'en') {
      // Tìm giọng tiếng Anh tốt nhất
      const englishVoice = findBestVoice('en')
      if (englishVoice) {
        utterance.voice = englishVoice
        console.log(`Using English voice: ${englishVoice.name}`)
      }
      utterance.lang = 'en-GB' // British English
    } else {
      // Tìm giọng tiếng Việt tốt nhất (sẽ là giọng nữ vì chúng ta đã ưu tiên trong hàm findBestVoice)
      const vietnameseVoice = findBestVoice('vi')
      if (vietnameseVoice) {
        utterance.voice = vietnameseVoice
        console.log(`Using Vietnamese voice: ${vietnameseVoice.name}`)
      }
      utterance.lang = 'vi-VN' // Vietnamese
    }
    
    // Áp dụng các tham số chất lượng giọng nói từ cài đặt người dùng
    utterance.rate = speechRate       // Tốc độ nói
    utterance.pitch = speechPitch     // Cao độ giọng
    utterance.volume = speechVolume   // Âm lượng
    
    // Áp dụng thêm các cài đặt đặc biệt cho trường hợp tiếng Anh
    if (detectedLanguage === 'en') {
      // Xử lý đặc biệt cho tiếng Anh để giúp giọng nói mượt mà hơn
      cleanText.split('.').forEach((sentence, index, array) => {
        if (sentence.trim() === '') return;
        
        // Tạo bản sao của cài đặt giọng nói
        const sentenceUtterance = new SpeechSynthesisUtterance(sentence.trim() + '.')
        sentenceUtterance.voice = utterance.voice
        sentenceUtterance.lang = utterance.lang
        sentenceUtterance.rate = utterance.rate
        sentenceUtterance.pitch = utterance.pitch
        sentenceUtterance.volume = utterance.volume
        
        // Thêm dừng nhẹ giữa các câu
        if (index < array.length - 1) {
          sentenceUtterance.onend = () => {
            setTimeout(() => {
              // Không làm gì, chỉ tạo khoảng dừng nhỏ
            }, 100);
          };
        }
        
        synth.speak(sentenceUtterance)
      })
      
      return // Đã xử lý từng câu riêng biệt, không cần tiếp tục
    }
    
    // Hiển thị thông tin về văn bản đọc
    console.log(`Speaking text: ${cleanText.substring(0, 50)}...`)
    
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

  // Add new states for network error tracking after the isListening state
  const [isListening, setIsListening] = useState(false)
  const [recognitionSupported, setRecognitionSupported] = useState(false)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [networkRetryCount, setNetworkRetryCount] = useState(0)
  const [speechConfidence, setSpeechConfidence] = useState<number>(0)
  const [advancedRecognition, setAdvancedRecognition] = useState(true)
  const [isRecognitionSettingsOpen, setIsRecognitionSettingsOpen] = useState(false)
  const [noiseReduction, setNoiseReduction] = useState(true)
  const [autoLanguageDetection, setAutoLanguageDetection] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState("vi-VN")
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const recognitionTimeoutRef = useRef<any>(null)
  const transcriptsRef = useRef<string[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Check for browser support of speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setRecognitionSupported(true)
    }
  }, [])

  // Add function to detect language from text
  const detectLanguage = (text: string): 'vi' | 'en' | null => {
    if (!text || text.trim().length < 3) return null;
    
    // Check for common Vietnamese diacritical marks and characters
    const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (vietnamesePattern.test(text)) {
      return 'vi';
    }
    
    // Check for common Vietnamese words
    const vietnameseWords = ['của', 'và', 'các', 'những', 'trong', 'thêm', 'trận', 'đấu', 'bóng', 'đội'];
    for (const word of vietnameseWords) {
      if (text.toLowerCase().includes(word)) {
        return 'vi';
      }
    }
    
    // Check for common English words
    const englishWords = ['the', 'and', 'for', 'with', 'match', 'team', 'add', 'football', 'game', 'score'];
    let englishWordCount = 0;
    for (const word of englishWords) {
      if (text.toLowerCase().includes(` ${word} `)) {
        englishWordCount++;
      }
    }
    
    if (englishWordCount >= 2) {
      return 'en';
    }
    
    // Default to null if we can't be sure
    return null;
  };

  // Setup audio processing for noise reduction
  const setupNoiseReduction = () => {
    if (!noiseReduction) return null;
    
    try {
      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Get user media with specific constraints for noise reduction
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Advanced constraints for even better noise reduction
          ...(typeof window !== 'undefined' && {
            channelCount: 1,
            sampleRate: 48000,
          }),
        },
        video: false
      }).then(stream => {
        if (!audioContextRef.current) return;
        
        // Create source node from microphone stream
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        // Create analyser node
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        
        // Connect source to analyser
        source.connect(analyser);
        
        // Create dynamic compressor for noise reduction
        const compressor = audioContextRef.current.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        
        // Connect analyser to compressor
        analyser.connect(compressor);
        
        // Connect compressor to destination (output)
        // Only for monitoring, speech recognition still uses raw input
        // compressor.connect(audioContextRef.current.destination);
        
        console.log("Noise reduction setup completed");
      }).catch(err => {
        console.error("Error accessing microphone for noise reduction:", err);
      });
      
      return () => {
        // Cleanup when component unmounts or settings change
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
      };
    } catch (error) {
      console.error("Error setting up noise reduction:", error);
      return null;
    }
  };

  // Setup audio context when noise reduction setting changes
  useEffect(() => {
    if (noiseReduction) {
      const cleanup = setupNoiseReduction();
      return () => {
        if (cleanup) cleanup();
      };
    } else if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, [noiseReduction]);

  // Enhance the processTranscribedText function to handle language-specific processing
  const processTranscribedText = (text: string, languageHint?: 'vi' | 'en'): string => {
    if (!text) return text;
    
    // Try to detect language if not provided
    const lang = languageHint || (autoLanguageDetection ? detectLanguage(text) : null) || (selectedLanguage === 'vi-VN' ? 'vi' : 'en');
    
    // Update detected language state for UI feedback
    if (lang !== (detectedLanguage || (selectedLanguage === 'vi-VN' ? 'vi' : 'en'))) {
      setDetectedLanguage(lang);
    }
    
    // Different processing for different languages
    if (lang === 'vi') {
      // Vietnamese processing

      // Capitalize first letter of sentences
      const withCapitalizedSentences = text.replace(/(^\s*\w|[.!?]\s*\w)/g, match => match.toUpperCase());
      
      // Fix common Vietnamese speech recognition errors
      let processedText = withCapitalizedSentences;
      
      // Fix spacing around punctuation
      processedText = processedText
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/([.,;:!?])\s+/g, '$1 ')
        .replace(/\s+/g, ' ');
      
      // Fix Vietnamese diacritics issues commonly misinterpreted
      const diacriticsMap: Record<string, string> = {
        'voi': 'với',
        'the': 'thế',
        'da': 'đá',
        'cau': 'câu',
        'tran': 'trận',
        'dau': 'đấu',
        'hoi': 'hỏi',
        'thang': 'thắng',
        'toi': 'tôi',
        'muon': 'muốn',
        'them': 'thêm',
        'xoa': 'xóa',
      };
      
      // Replace common misrecognized words with proper Vietnamese diacritics
      Object.keys(diacriticsMap).forEach(key => {
        // Check if the word appears as a whole word (with word boundaries)
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        processedText = processedText.replace(regex, diacriticsMap[key]);
      });
      
      // Special handling for common sports-related phrases
      if (processedText.toLowerCase().includes('them tran') || processedText.toLowerCase().includes('thêm trân')) {
        processedText = processedText.replace(/them tran|thêm trân/gi, 'thêm trận');
      }
      
      if (processedText.toLowerCase().includes('thi dau')) {
        processedText = processedText.replace(/thi dau/gi, 'thi đấu');
      }
      
      // More contextual fixes for football terms
      if (processedText.toLowerCase().includes('ban thang')) {
        processedText = processedText.replace(/ban thang/gi, 'bàn thắng');
      }
      
      if (processedText.toLowerCase().includes('tap am')) {
        processedText = processedText.replace(/tap am/gi, 'tạp âm');
      }
      
      return processedText.trim();
    } else {
      // English processing
      const processedText = text
        .replace(/(^\s*\w|[.!?]\s*\w)/g, match => match.toUpperCase()) // Capitalize first letter of sentences
        .replace(/\s+([.,;:!?])/g, '$1') // Fix spacing before punctuation
        .replace(/([.,;:!?])\s+/g, '$1 ') // Fix spacing after punctuation
        .replace(/\s+/g, ' '); // Remove extra spaces
      
      return processedText.trim();
    }
  };

  // Update toggleListening function to include language detection and noise reduction
  const toggleListening = (inputType: 'sidebar' | 'dialog') => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      
      // Clear any pending timeouts
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      
      setIsListening(false);
      transcriptsRef.current = [];
      setDetectedLanguage(null);
      return;
    }

    // Reset error state when starting new recognition
    setRecognitionError(null);
    setSpeechConfidence(0);
    transcriptsRef.current = [];
    setDetectedLanguage(null);
    
    // Start listening
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setRecognitionError("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói");
        return;
      }
      
      const recognition = new SpeechRecognition();
      
      // Enhanced recognition settings for better accuracy
      recognition.lang = selectedLanguage; // Use selected language
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = advancedRecognition ? 5 : 1; // Increased from 3 to 5 for better alternates
      
      // Set a listening timeout for session management
      if (advancedRecognition) {
        recognitionTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            // Restart recognition for continuous listening with longer context
            recognitionRef.current.stop();
            // Small delay before restarting
            setTimeout(() => {
              if (isListening) toggleListening(inputType);
            }, 300);
          }
        }, 15000);
      }
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let highestConfidence = 0;
        let bestAlternativeText = '';
        
        // Process results, looking for both interim and final
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          // Check if we have detected a language different from current setting
          if (result.length > 0 && autoLanguageDetection && result[0].transcript) {
            const detectedLang = detectLanguage(result[0].transcript);
            
            // Switch language if detected different from current
            if (detectedLang && 
               ((detectedLang === 'en' && selectedLanguage !== 'en-US') || 
                (detectedLang === 'vi' && selectedLanguage !== 'vi-VN'))) {
              
              // Set new language
              const newLang = detectedLang === 'en' ? 'en-US' : 'vi-VN';
              setSelectedLanguage(newLang);
              
              // Restart recognition with new language after this batch completes
              setTimeout(() => {
                if (isListening) {
                  if (recognitionRef.current) {
                    recognitionRef.current.stop();
                  }
                  setTimeout(() => toggleListening(inputType), 300);
                }
              }, 1000);
            }
          }
          
          // Check if this is a final result
          if (result.isFinal) {
            if (advancedRecognition && result.length > 1) {
              // If we have alternatives, find the one with highest confidence
              for (let j = 0; j < result.length; j++) {
                if (result[j].confidence > highestConfidence) {
                  highestConfidence = result[j].confidence;
                  bestAlternativeText = result[j].transcript;
                }
              }
              // Use the best alternative if confidence is high enough
              if (highestConfidence > 0.7) {
                finalTranscript += bestAlternativeText + ' ';
              } else {
                finalTranscript += result[0].transcript + ' ';
              }
            } else {
              finalTranscript += result[0].transcript + ' ';
            }
            
            // Store confidence for feedback
            if (result[0].confidence) {
              setSpeechConfidence(Math.round(result[0].confidence * 100));
            }
            
            // Add to transcript history for context
            transcriptsRef.current.push(finalTranscript);
            
            // Keep a maximum of 3 last sentences for context (avoiding too long context)
            if (transcriptsRef.current.length > 3) {
              transcriptsRef.current = transcriptsRef.current.slice(-3);
            }
          } else {
            // For interim results, just display them as-is
            interimTranscript += result[0].transcript + ' ';
          }
        }
        
        // Create final output by combining all transcripts (for context)
        let outputText = transcriptsRef.current.join(' ');
        
        // Add current interim transcript if available
        if (interimTranscript) {
          outputText += ' ' + interimTranscript;
        }
        
        // Check for language to apply appropriate processing
        const langHint = selectedLanguage.startsWith('vi') ? 'vi' : 'en';
        
        // Apply intelligent text processing if we have text
        if (outputText.trim()) {
          outputText = processTranscribedText(outputText, langHint);
        }
        
        // Giới hạn độ dài văn bản
        if (outputText.length > 500) {
          outputText = outputText.substring(0, 500);
        }
        
        // Update the appropriate input field
        if (inputType === 'sidebar') {
          setAiQuestion(outputText);
        } else {
          setChatDialogQuestion(outputText);
        }
      };
      
      // Other event handlers... (keep existing ones)
      
      // Start the recognition
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (error) {
      console.error('Speech recognition failed:', error);
      setRecognitionError("Không thể khởi tạo nhận dạng giọng nói. Vui lòng kiểm tra trình duyệt của bạn.");
      setIsListening(false);
    }
  };

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
  
  const handleViewEvents = (match: Match) => {
    setEventsMatch(match)
    setIsEventsDialogOpen(true)
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
  
  const handleSaveEvents = (events: MatchEventsType, updatedPlayers?: {player: Player, teamId: string}[]) => {
    if (eventsMatch) {
      const updatedMatch = {
        ...eventsMatch,
        events: events
      }
      onUpdateMatch(updatedMatch)
      
      // Cập nhật thông tin cầu thủ nếu có
      if (updatedPlayers && updatedPlayers.length > 0) {
        // Tạo bản sao đội nhà và đội khách để cập nhật
        const updatedHomeTeam = {...homeTeam};
        const updatedAwayTeam = {...awayTeam};
        let homeTeamUpdated = false;
        let awayTeamUpdated = false;
        
        // Cập nhật thông tin cho từng cầu thủ
        updatedPlayers.forEach(({ player, teamId }) => {
          if (teamId === homeTeam.id) {
            // Cập nhật cầu thủ trong đội nhà
            const playerIndex = updatedHomeTeam.players.findIndex(p => p.id === player.id);
            if (playerIndex !== -1) {
              updatedHomeTeam.players[playerIndex] = {
                ...updatedHomeTeam.players[playerIndex],
                yellowCards: player.yellowCards,
                redCards: player.redCards
              };
              homeTeamUpdated = true;
            }
          } else if (teamId === awayTeam.id) {
            // Cập nhật cầu thủ trong đội khách
            const playerIndex = updatedAwayTeam.players.findIndex(p => p.id === player.id);
            if (playerIndex !== -1) {
              updatedAwayTeam.players[playerIndex] = {
                ...updatedAwayTeam.players[playerIndex],
                yellowCards: player.yellowCards,
                redCards: player.redCards
              };
              awayTeamUpdated = true;
            }
          }
        });
        
        // Cập nhật đội nếu có thay đổi
        if (homeTeamUpdated && onUpdateHomeTeam) {
          onUpdateHomeTeam(updatedHomeTeam);
        }
        if (awayTeamUpdated && onUpdateAwayTeam) {
          onUpdateAwayTeam(updatedAwayTeam);
        }
      }
      
      setIsEventsDialogOpen(false)
    }
  }

  // Add recognition settings dialog
  const RecognitionSettingsDialog = () => {
    return (
      <Dialog open={isRecognitionSettingsOpen} onOpenChange={setIsRecognitionSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cài đặt nhận dạng giọng nói</DialogTitle>
            <DialogDescription>
              Điều chỉnh các tùy chọn để cải thiện độ chính xác của nhận dạng giọng nói
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="advanced-recognition">Nhận dạng nâng cao</Label>
                <p className="text-sm text-muted-foreground">
                  Sử dụng thuật toán nâng cao để cải thiện độ chính xác
                </p>
              </div>
              <Switch
                id="advanced-recognition"
                checked={advancedRecognition}
                onCheckedChange={setAdvancedRecognition}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="noise-reduction">Lọc tạp âm</Label>
                <p className="text-sm text-muted-foreground">
                  Giảm tiếng ồn và tạp âm môi trường
                </p>
              </div>
              <Switch
                id="noise-reduction"
                checked={noiseReduction}
                onCheckedChange={setNoiseReduction}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-language">Tự động nhận dạng ngôn ngữ</Label>
                <p className="text-sm text-muted-foreground">
                  Tự động chuyển đổi giữa tiếng Việt và tiếng Anh
                </p>
              </div>
              <Switch
                id="auto-language"
                checked={autoLanguageDetection}
                onCheckedChange={setAutoLanguageDetection}
              />
            </div>
            
            <div className="pt-2">
              <Label className="mb-2 block">Ngôn ngữ mặc định</Label>
              <Select 
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi-VN">Tiếng Việt (Việt Nam)</SelectItem>
                  <SelectItem value="en-US">English (United States)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {speechConfidence > 0 && (
              <div className="pt-2">
                <Label className="mb-2 block">Độ tin cậy nhận dạng gần nhất</Label>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      speechConfidence > 80 ? 'bg-green-500' : 
                      speechConfidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} 
                    style={{width: `${speechConfidence}%`}}
                  ></div>
                </div>
                <p className="text-sm text-right mt-1">{speechConfidence}%</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setIsRecognitionSettingsOpen(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Thêm state để theo dõi số ký tự
  const [aiQuestionLength, setAiQuestionLength] = useState(0)
  const [chatDialogQuestionLength, setChatDialogQuestionLength] = useState(0)
  const MAX_PROMPT_LENGTH = 500

  // Component cài đặt giọng nói
  const VoiceSettingsDialog = () => {
    // Nhóm các giọng nói theo ngôn ngữ
    const englishVoices = availableVoices.filter(voice => voice.lang.startsWith('en'))
    const vietnameseVoices = availableVoices.filter(voice => voice.lang.startsWith('vi'))
    
    // Xử lý thay đổi tốc độ nói
    const handleRateChange = (value: number) => {
      setSpeechRate(value)
    }
    
    // Xử lý thay đổi cao độ giọng
    const handlePitchChange = (value: number) => {
      setSpeechPitch(value)
    }
    
    // Xử lý thay đổi âm lượng
    const handleVolumeChange = (value: number) => {
      setSpeechVolume(value)
    }
    
    // Phát mẫu để kiểm tra giọng nói
    const speakSample = (language: 'en' | 'vi') => {
      const sampleText = language === 'en' 
        ? "This is a sample of the English voice. How does it sound to you?" 
        : "Đây là mẫu giọng nói tiếng Việt. Bạn nghe thấy như thế nào?";
      
      speakText(sampleText)
    }
    
    return (
      <Dialog open={isVoiceSettingsOpen} onOpenChange={setIsVoiceSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Cài đặt giọng nói</DialogTitle>
            <DialogDescription>
              Điều chỉnh các tham số để có giọng nói dễ nghe nhất
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Cài đặt chất lượng giọng nói */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high-quality">Sử dụng giọng chất lượng cao</Label>
                <p className="text-sm text-muted-foreground">
                  Ưu tiên giọng tự nhiên và chất lượng cao hơn
                </p>
              </div>
              <Switch
                id="high-quality"
                checked={highQualityVoice}
                onCheckedChange={setHighQualityVoice}
              />
            </div>
            
            {/* Tốc độ nói */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rate-slider">Tốc độ nói</Label>
                <span className="text-sm font-medium">{speechRate.toFixed(1)}x</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Chậm</span>
                <Slider 
                  id="rate-slider"
                  min={0.5} 
                  max={1.5} 
                  step={0.1} 
                  value={[speechRate]} 
                  onValueChange={(values) => handleRateChange(values[0])} 
                />
                <span className="text-xs text-muted-foreground">Nhanh</span>
              </div>
            </div>
            
            {/* Cao độ giọng */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pitch-slider">Cao độ giọng</Label>
                <span className="text-sm font-medium">{speechPitch.toFixed(1)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Thấp</span>
                <Slider 
                  id="pitch-slider"
                  min={0.8} 
                  max={1.2} 
                  step={0.1} 
                  value={[speechPitch]} 
                  onValueChange={(values) => handlePitchChange(values[0])} 
                />
                <span className="text-xs text-muted-foreground">Cao</span>
              </div>
            </div>
            
            {/* Âm lượng */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="volume-slider">Âm lượng</Label>
                <span className="text-sm font-medium">{Math.round(speechVolume * 100)}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Nhỏ</span>
                <Slider 
                  id="volume-slider"
                  min={0.1} 
                  max={1.0} 
                  step={0.1} 
                  value={[speechVolume]} 
                  onValueChange={(values) => handleVolumeChange(values[0])} 
                />
                <span className="text-xs text-muted-foreground">Lớn</span>
              </div>
            </div>
            
            {/* Chọn giọng tiếng Anh */}
            <div className="space-y-2">
              <Label>Chọn giọng tiếng Anh</Label>
              {englishVoices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {englishVoices.map(voice => (
                    <Button
                      key={voice.voiceURI}
                      variant={preferredEnglishVoice === voice.voiceURI ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setPreferredEnglishVoice(voice.voiceURI)}
                    >
                      <div className="flex flex-col items-start">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">{voice.lang}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không tìm thấy giọng tiếng Anh</p>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => speakSample('en')}
                className="mt-2"
              >
                <Volume2 className="h-4 w-4 mr-2" /> Kiểm tra giọng tiếng Anh
              </Button>
            </div>
            
            {/* Chọn giọng tiếng Việt */}
            <div className="space-y-2">
              <Label>Chọn giọng tiếng Việt</Label>
              {vietnameseVoices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {vietnameseVoices.map(voice => (
                    <Button
                      key={voice.voiceURI}
                      variant={preferredVietnameseVoice === voice.voiceURI ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setPreferredVietnameseVoice(voice.voiceURI)}
                    >
                      <div className="flex flex-col items-start">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">{voice.lang}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không tìm thấy giọng tiếng Việt</p>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => speakSample('vi')}
                className="mt-2"
              >
                <Volume2 className="h-4 w-4 mr-2" /> Kiểm tra giọng tiếng Việt
              </Button>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsVoiceSettingsOpen(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

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
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 flex items-center text-xs"
                            onClick={() => handleRateMatch(match)}
                          >
                            <Star className="h-3 w-3 mr-1" /> 
                            {match.playerRatings ? "Xem đánh giá" : "Đánh giá cầu thủ"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 flex items-center text-xs"
                            onClick={() => handleViewEvents(match)}
                          >
                            <Goal className="h-3 w-3 mr-1" /> 
                            {match.events ? "Xem sự kiện" : "Thêm sự kiện"}
                          </Button>
                        </>
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
                  
                  {/* Match Events Summary */}
                  {match.events && match.completed && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <p className="font-medium mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1" /> Diễn biến trận đấu:
                      </p>
                      
                      <div className="space-y-2">
                        {/* Goals */}
                        {match.events.goals.length > 0 && (
                          <div className="flex items-start">
                            <div className="w-6 flex-shrink-0">
                              <Goal className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium text-gray-700">Bàn thắng:</p>
                              <div className="space-y-1">
                                {match.events.goals
                                  .sort((a, b) => a.minute - b.minute)
                                  .map((goal, index) => {
                                    const isHomeTeam = goal.teamId === homeTeam.id;
                                    const player = isHomeTeam 
                                      ? homeTeam.players.find(p => p.id === goal.playerId)
                                      : awayTeam.players.find(p => p.id === goal.playerId);
                                    
                                    const assistPlayer = goal.assistPlayerId 
                                      ? (goal.teamId === homeTeam.id
                                          ? homeTeam.players.find(p => p.id === goal.assistPlayerId)
                                          : awayTeam.players.find(p => p.id === goal.assistPlayerId))
                                      : undefined;
                                    
                                    if (!player) return null;
                                    
                                    return (
                                      <div key={goal.id} className="flex items-center text-gray-600">
                                        <Badge className="mr-2 bg-gray-200 text-gray-800 font-normal">{goal.minute}'</Badge>
                                        <span className={`${isHomeTeam ? 'text-blue-600' : 'text-red-600'} font-medium`}>
                                          {player.name} 
                                          {goal.isOwnGoal && <span className="text-gray-500">(phản lưới)</span>}
                                          {goal.isPenalty && <span className="text-gray-500">(phạt đền)</span>}
                                        </span>
                                        {assistPlayer && (
                                          <span className="text-gray-500 ml-1 text-xs">
                                            (kiến tạo: {assistPlayer.name})
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Cards */}
                        {match.events.cards.length > 0 && (
                          <div className="flex items-start">
                            <div className="w-6 flex-shrink-0">
                              <Flag className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium text-gray-700">Thẻ phạt:</p>
                              <div className="space-y-1">
                                {match.events.cards
                                  .sort((a, b) => a.minute - b.minute)
                                  .map((card, index) => {
                                    const isHomeTeam = card.teamId === homeTeam.id;
                                    const player = isHomeTeam 
                                      ? homeTeam.players.find(p => p.id === card.playerId)
                                      : awayTeam.players.find(p => p.id === card.playerId);
                                    
                                    if (!player) return null;
                                    
                                    return (
                                      <div key={card.id} className="flex items-center text-gray-600">
                                        <Badge className="mr-2 bg-gray-200 text-gray-800 font-normal">{card.minute}'</Badge>
                                        <div className={`w-3 h-4 mr-1 ${card.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                                        <span className="font-medium">
                                          {player.name}
                                        </span>
                                        {card.reason && (
                                          <span className="text-gray-500 ml-1 text-xs">
                                            ({card.reason})
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {match.events.goals.length === 0 && match.events.cards.length === 0 && (
                          <p className="text-gray-500">Chưa có dữ liệu sự kiện</p>
                        )}
                      </div>
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
              {recognitionSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                  onClick={() => setIsRecognitionSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Tùy chỉnh voice
                </Button>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
            {recognitionError && (
              <div className="mb-2 text-sm text-red-500 flex items-center">
                <XCircle className="h-4 w-4 mr-1" /> {recognitionError}
              </div>
            )}
            {isListening && speechConfidence > 0 && (
              <div className="mb-2 flex items-center">
                <div className="w-full mr-2">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        speechConfidence > 80 ? 'bg-green-500' : 
                        speechConfidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      style={{width: `${speechConfidence}%`}}
                    ></div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{speechConfidence}%</span>
              </div>
            )}
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Textarea
                  placeholder="Hỏi AI về lịch thi đấu, đội bóng, hoặc thông tin bóng đá..."
                  value={aiQuestion}
                  onChange={(e) => {
                    // Giới hạn độ dài văn bản nhập vào
                    const text = e.target.value;
                    if (text.length <= MAX_PROMPT_LENGTH) {
                      setAiQuestion(text);
                      setAiQuestionLength(text.length);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      askAI();
                    }
                  }}
                  disabled={isAiLoading}
                  className="pr-10 min-h-[80px] resize-none"
                  rows={3}
                  maxLength={MAX_PROMPT_LENGTH}
                />
                {recognitionSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute right-2 top-4 h-8 w-8 p-0 
                      ${isListening ? 'text-red-500 animate-pulse' : ''} 
                      ${recognitionError && !isListening ? 'text-red-400' : ''}`}
                    onClick={() => toggleListening('sidebar')}
                    title={
                      isListening 
                        ? `Dừng ghi âm (${detectedLanguage === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'})` 
                        : "Ghi âm giọng nói"
                    }
                    disabled={networkRetryCount >= 3}
                  >
                    <div className="relative">
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      {isListening && detectedLanguage && (
                        <div className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      {isListening && noiseReduction && (
                        <div className="absolute bottom-0 right-0 -mb-1 -mr-1 w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </Button>
                )}
                <div className="absolute right-10 bottom-2 text-xs text-gray-400">
                  {aiQuestionLength}/{MAX_PROMPT_LENGTH}
                </div>
              </div>
              <Button onClick={askAI} disabled={isAiLoading} className="self-start">
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
            <DialogTitle>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  Chat với AI
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setIsVoiceSettingsOpen(true)}
                    title="Cài đặt giọng nói"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                    title={isSpeechEnabled ? "Tắt phát âm" : "Bật phát âm"}
                  >
                    {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
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
          <div className="mt-4 flex flex-col space-y-2">
            {recognitionError && (
              <div className="text-sm text-red-500 flex items-center">
                <XCircle className="h-4 w-4 mr-1" /> {recognitionError}
              </div>
            )}
            {isListening && speechConfidence > 0 && (
              <div className="flex items-center mb-1">
                <div className="w-full mr-2">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        speechConfidence > 80 ? 'bg-green-500' : 
                        speechConfidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      style={{width: `${speechConfidence}%`}}
                    ></div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{speechConfidence}%</span>
              </div>
            )}
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Textarea
                  placeholder="Nhập câu hỏi của bạn"
                  value={chatDialogQuestion}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (text.length <= MAX_PROMPT_LENGTH) {
                      setChatDialogQuestion(text);
                      setChatDialogQuestionLength(text.length);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChatDialogQuestion();
                    }
                  }}
                  disabled={isAiLoading}
                  className="pr-10 min-h-[80px] resize-none"
                  rows={3}
                  maxLength={MAX_PROMPT_LENGTH}
                />
                {recognitionSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute right-2 top-4 h-8 w-8 p-0 
                      ${isListening ? 'text-red-500 animate-pulse' : ''} 
                      ${recognitionError && !isListening ? 'text-red-400' : ''}`}
                    onClick={() => toggleListening('dialog')}
                    title={
                      isListening 
                        ? `Dừng ghi âm (${detectedLanguage === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'})` 
                        : "Ghi âm giọng nói"
                    }
                    disabled={networkRetryCount >= 3}
                  >
                    <div className="relative">
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      {isListening && detectedLanguage && (
                        <div className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      {isListening && noiseReduction && (
                        <div className="absolute bottom-0 right-0 -mb-1 -mr-1 w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </Button>
                )}
                <div className="absolute right-10 bottom-2 text-xs text-gray-400">
                  {chatDialogQuestionLength}/{MAX_PROMPT_LENGTH}
                </div>
              </div>
              <Button 
                onClick={handleChatDialogQuestion} 
                disabled={isAiLoading || !chatDialogQuestion.trim()}
                className="self-start"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
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

      {/* Match Events Dialog */}
      {eventsMatch && (
        <MatchEvents 
          match={eventsMatch}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          open={isEventsDialogOpen}
          onOpenChange={setIsEventsDialogOpen}
          onSaveEvents={handleSaveEvents}
        />
      )}

      {/* Recognition settings dialog */}
      <RecognitionSettingsDialog />
      
      {/* Voice settings dialog */}
      <VoiceSettingsDialog />
    </div>
  )
}
