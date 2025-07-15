import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FeedbackForm from "./FeedbackForm";
interface ClassificationResult {
  dialect: string;
  confidence: number;
  description: string;
}

const DialectClassifier = () => {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("arabic");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const { toast } = useToast();

  // Real classification function using Supabase Edge Function
  const classifyDialect = async (inputText: string, selectedLanguage: string): Promise<ClassificationResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('classify-dialect', {
        body: { text: inputText, language: selectedLanguage }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data.results || [];
    } catch (error) {
      console.error("Classification error:", error);
      // Fallback to keyword-based classification
      if (selectedLanguage === "arabic") {
        return classifyArabicByKeywords(inputText);
      } else {
        return classifyEnglishByKeywords(inputText);
      }
    }
  };

  // Fallback keyword-based classification for Arabic
  const classifyArabicByKeywords = (text: string): ClassificationResult[] => {
    const keywords = {
      egyptian: ["إيه", "إزيك", "إزايك", "يلا", "كدة", "أصل", "علشان"],
      levantine: ["شو", "كيفك", "بدي", "هيك", "مشان", "عم"],
      gulf: ["شلونك", "وش", "ليش", "عاد", "زين", "أبي"],
      maghrebi: ["كيفاش", "شحال", "بغيت", "درت", "مزيان"]
    };

    const dialectMappings = {
      egyptian: { name: "Egyptian Arabic", description: "Common in Egypt and widely understood across the Arab world" },
      levantine: { name: "Levantine Arabic", description: "Used in Syria, Lebanon, Jordan, and Palestine" },
      gulf: { name: "Gulf Arabic", description: "Spoken in the Arabian Peninsula and Gulf states" },
      maghrebi: { name: "Maghrebi Arabic", description: "Spoken in North African countries" }
    };

    const scores = {
      egyptian: 0,
      levantine: 0,
      gulf: 0,
      maghrebi: 0
    };

    // Check for keyword matches
    Object.entries(keywords).forEach(([dialect, words]) => {
      words.forEach(word => {
        if (text.includes(word)) {
          scores[dialect as keyof typeof scores] += 0.3;
        }
      });
    });

    // Convert to results format
    const results = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .map(([dialect, score]) => ({
        dialect: dialectMappings[dialect as keyof typeof dialectMappings]?.name || dialect,
        confidence: Math.min(score, 0.9),
        description: dialectMappings[dialect as keyof typeof dialectMappings]?.description || "Detected based on keyword analysis"
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return results.length > 0 ? results : [{
      dialect: "Modern Standard Arabic",
      confidence: 0.5,
      description: "Default classification - formal Arabic"
    }];
  };

  // Keyword-based classification for English
  const classifyEnglishByKeywords = (text: string): ClassificationResult[] => {
    const keywords = {
      american: ["color", "theater", "center", "aluminum", "mom", "gas", "truck", "elevator"],
      british: ["colour", "theatre", "centre", "aluminium", "mum", "petrol", "lorry", "lift"],
      australian: ["mate", "bloke", "arvo", "brekkie", "mozzie", "barbie", "ute"],
      canadian: ["eh", "toque", "loonie", "double-double", "chesterfield"]
    };

    const scores = {
      american: 0.3, // Default baseline for American
      british: 0,
      australian: 0,
      canadian: 0
    };

    const lowerText = text.toLowerCase();
    
    Object.entries(keywords).forEach(([dialect, words]) => {
      words.forEach(word => {
        if (lowerText.includes(word.toLowerCase())) {
          scores[dialect as keyof typeof scores] += 0.4;
        }
      });
    });

    const results = [
      { dialect: "American English", confidence: scores.american, description: "Standard American pronunciation and vocabulary" },
      { dialect: "British English", confidence: scores.british || 0.2, description: "Received Pronunciation and British vocabulary" },
      { dialect: "Australian English", confidence: scores.australian || 0.1, description: "Distinctive Australian accent and expressions" },
      { dialect: "Canadian English", confidence: scores.canadian || 0.1, description: "Canadian pronunciation with some British influences" }
    ]
      .filter(result => result.confidence > 0.05)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return results;
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast({
        title: "Please enter some text",
        description: "Enter a sentence to analyze its dialect.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setShowFeedback(false); // Hide feedback form when analyzing
    try {
      const classificationResults = await classifyDialect(text, language);
      setResults(classificationResults);
      setShowFeedback(true); // Show feedback form after results
      
      // Implement improved confidence logic
      const topScore = classificationResults[0]?.confidence || 0;
      const secondScore = classificationResults[1]?.confidence || 0;
      const isHighConfidence = topScore >= (secondScore + 0.1); // 10% threshold
      
      toast({
        title: "Analysis complete",
        description: `Found ${classificationResults.length} potential dialect matches. ${isHighConfidence ? 'High confidence result.' : 'Multiple possible dialects detected.'}`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing the text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFeedbackSubmitted = () => {
    setShowFeedback(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "bg-green-500";
    if (confidence >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceLabel = (confidence: number, isTopResult: boolean, results: ClassificationResult[]) => {
    if (isTopResult && results.length > 1) {
      const secondHighest = results[1]?.confidence || 0;
      const isHighConfidence = confidence >= (secondHighest + 0.1); // 10% threshold
      if (isHighConfidence && confidence >= 0.6) return "High";
    }
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.4) return "Medium";
    return "Low";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-900 to-purple-900/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-neon-cyan/20 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-neon-pink/10 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-6 animate-fade-in">
          <div className="flex justify-center">
            <div className="relative p-4 rounded-2xl bg-gradient-primary shadow-glow animate-glow-pulse backdrop-blur-sm">
              <Languages className="h-10 w-10 text-white animate-float" />
              <div className="absolute inset-0 bg-gradient-accent rounded-2xl blur opacity-50 -z-10 animate-gradient-shift bg-300%"></div>
            </div>
          </div>
          <h1 className="text-5xl font-black text-transparent bg-gradient-primary bg-clip-text animate-gradient-shift bg-300%">
            Dialect Identifier
          </h1>
          <p className="text-gray-300 text-xl max-w-2xl mx-auto font-medium">
            AI-powered dialect classification with 🔥 accuracy
          </p>
        </div>

        {/* Input Section */}
        <Card className="backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass animate-scale-in hover:shadow-neon transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-neon-cyan animate-pulse-soft" />
              Text Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full bg-white/5 border-white/20 text-white transition-all duration-200 hover:border-neon-cyan focus:border-neon-cyan backdrop-blur-sm">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 border-white/20 backdrop-blur-lg">
                  <SelectItem value="arabic" className="text-white hover:bg-white/10">Arabic</SelectItem>
                  <SelectItem value="english" className="text-white hover:bg-white/10">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Text to Analyze</label>
              <Textarea
                placeholder={language === "arabic" 
                  ? "أدخل النص العربي هنا..." 
                  : "Enter your English text here..."
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-32 resize-none bg-white/5 border-white/20 text-white placeholder:text-gray-400 transition-all duration-200 hover:border-neon-cyan focus:border-neon-cyan backdrop-blur-sm"
                dir={language === "arabic" ? "rtl" : "ltr"}
              />
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !text.trim()}
              size="lg"
              className="w-full bg-gradient-primary hover:bg-gradient-secondary border-0 text-white font-bold py-3 rounded-xl transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-neon disabled:opacity-50 disabled:hover:scale-100"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                "🚀 Analyze Dialect"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {results.length > 0 && (
          <Card className="backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass animate-scale-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-primary animate-pulse-soft"></div>
                ✨ Classification Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="relative overflow-hidden p-6 backdrop-blur-sm bg-gradient-glass rounded-xl border border-white/20 hover:shadow-neon transition-all duration-300 hover:scale-[1.02] animate-fade-in group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-xl text-white">{result.dialect}</h3>
                        <Badge 
                          className={`${getConfidenceColor(result.confidence)} text-white font-bold px-3 py-1 rounded-full animate-scale-in shadow-lg`}
                          style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
                        >
                          {getConfidenceLabel(result.confidence, index === 0, results)} Confidence
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{result.description}</p>
                    </div>
                    <div className="text-right ml-6">
                      <div className="text-3xl font-black text-transparent bg-gradient-primary bg-clip-text animate-scale-in" 
                           style={{ animationDelay: `${index * 0.1 + 0.3}s` }}>
                        {(result.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="w-28 bg-white/20 rounded-full h-3 mt-2 overflow-hidden backdrop-blur-sm">
                        <div 
                          className="bg-gradient-primary h-3 rounded-full transition-all duration-1000 ease-out animate-slide-up shadow-glow"
                          style={{ 
                            width: `${result.confidence * 100}%`,
                            animationDelay: `${index * 0.1 + 0.5}s`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feedback Section */}
        {showFeedback && results.length > 0 && (
          <div className="animate-scale-in" style={{ animationDelay: '0.5s' }}>
            <FeedbackForm
              text={text}
              language={language}
              results={results}
              onFeedbackSubmitted={handleFeedbackSubmitted}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DialectClassifier;