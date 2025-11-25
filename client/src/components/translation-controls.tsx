import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Languages, Globe } from "lucide-react";

interface TranslationControlsProps {
  onTranslate?: (targetLang: string) => void;
}

// Language code mapping for browser translation
const browserLangMap: Record<string, string> = {
  'en': 'en',
  'es': 'es',
  'fr': 'fr',
  'it': 'it',
  'de': 'de',
  'pt': 'pt',
  'ja': 'ja',
  'ko': 'ko',
  'zh': 'zh-CN',
  'ar': 'ar',
  'hi': 'hi',
  'ru': 'ru',
  'sw': 'sw',
  'am': 'am',
  'yo': 'yo',
  'zu': 'zu',
  'ha': 'ha',
  'af': 'af',
  'th': 'th',
  'vi': 'vi',
  'tl': 'tl',
  'id': 'id',
  'ms': 'ms',
  'bn': 'bn',
  'ta': 'ta',
  'ur': 'ur',
  'fa': 'fa',
};

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  
  // African Languages
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  
  // Additional Asian Languages
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
];

export default function TranslationControls({ onTranslate }: TranslationControlsProps) {
  const [currentLang, setCurrentLang] = useState(() => {
    // Get saved language from localStorage or default to 'en'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('recipe-translation-lang') || 'en';
    }
    return 'en';
  });

  // Update document language when currentLang changes
  useEffect(() => {
    const browserLang = browserLangMap[currentLang] || currentLang;
    document.documentElement.lang = browserLang;
    localStorage.setItem('recipe-translation-lang', currentLang);
  }, [currentLang]);

  const handleLanguageSelect = (langCode: string) => {
    setCurrentLang(langCode);
    
    // Update HTML lang attribute for browser translation
    const browserLang = browserLangMap[langCode] || langCode;
    document.documentElement.lang = browserLang;
    
    // Trigger browser translation if available (Chrome/Edge)
    if ('translate' in document.documentElement) {
      // Browser will automatically detect language change
      // User may need to use browser's translate button
    }
    
    if (onTranslate) {
      onTranslate(langCode);
    }
  };

  const handleOpenGoogleTranslate = () => {
    // For localhost, provide instructions instead
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      alert('For local development, use your browser\'s built-in translation feature:\n\n' +
            'Chrome/Edge: Right-click → Translate to [Language]\n' +
            'Firefox: Install a translation extension\n' +
            'Safari: Use a translation extension\n\n' +
            'Or deploy the app to see Google Translate integration.');
    } else {
      // For production, open Google Translate
      const googleTranslateUrl = `https://translate.google.com/translate?sl=auto&tl=${currentLang}&u=${encodeURIComponent(window.location.href)}`;
      window.open(googleTranslateUrl, '_blank');
    }
  };

  const selectedLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm">{selectedLanguage.flag}</span>
            <span className="hidden sm:inline text-sm">{selectedLanguage.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 max-h-[400px] overflow-y-auto">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <span className="text-lg">{language.flag}</span>
              <span className="flex-1">{language.name}</span>
              {currentLang === language.code && (
                <span className="text-blue-600 text-xs">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenGoogleTranslate}
        className="flex items-center space-x-1 text-slate-600 hover:text-slate-900"
        title="Translation Help"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Help</span>
      </Button>
    </div>
  );
}