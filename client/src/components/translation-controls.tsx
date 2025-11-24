import { useState } from "react";
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
  const [currentLang, setCurrentLang] = useState('en');
  
  const handleBrowserTranslate = () => {
    // Trigger browser's built-in translation
    const googleTranslateUrl = `https://translate.google.com/translate?sl=auto&tl=${currentLang}&u=${encodeURIComponent(window.location.href)}`;
    window.open(googleTranslateUrl, '_blank');
  };

  const handleLanguageSelect = (langCode: string) => {
    setCurrentLang(langCode);
    
    // Use Google Translate element if available (requires Google Translate script)
    if (typeof (window as any).google !== 'undefined' && (window as any).google.translate) {
      const translateElement = (window as any).google.translate.TranslateElement;
      if (translateElement) {
        // Trigger Google Translate
        const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectElement) {
          selectElement.value = langCode;
          selectElement.dispatchEvent(new Event('change'));
        }
      }
    } else {
      // Fallback to opening Google Translate in new tab
      handleBrowserTranslate();
    }
    
    if (onTranslate) {
      onTranslate(langCode);
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
        <DropdownMenuContent align="end" className="w-48">
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
        onClick={handleBrowserTranslate}
        className="flex items-center space-x-1 text-slate-600 hover:text-slate-900"
        title="Open in Google Translate"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Translate</span>
      </Button>
    </div>
  );
}