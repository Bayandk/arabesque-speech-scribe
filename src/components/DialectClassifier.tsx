import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    try {
      const classificationResults = await classifyDialect(text, language);
      setResults(classificationResults);
      
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-gradient-primary shadow-glow">
            <Languages className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground">Dialect Identifier</h1>
        <p className="text-academic-gray text-lg max-w-2xl mx-auto">
          Analyze and classify the dialect of Arabic or English text using advanced natural language processing
        </p>
      </div>

      {/* Input Section */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-academic-blue" />
            Text Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arabic">Arabic</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Text to Analyze</label>
            <Textarea
              placeholder={language === "arabic" 
                ? "أدخل النص العربي هنا..." 
                : "Enter your English text here..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-32 resize-none"
              dir={language === "arabic" ? "rtl" : "ltr"}
            />
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !text.trim()}
            variant="analyze"
            size="lg"
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Dialect"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <Card className="shadow-elegant animate-fade-in">
          <CardHeader>
            <CardTitle className="text-academic-blue">Classification Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-start justify-between p-4 bg-gradient-subtle rounded-lg border border-border hover:shadow-md transition-smooth"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg text-foreground">{result.dialect}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`${getConfidenceColor(result.confidence)} text-white`}
                    >
                      {getConfidenceLabel(result.confidence, index === 0, results)} Confidence
                    </Badge>
                  </div>
                  <p className="text-academic-gray text-sm">{result.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-academic-blue">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="w-24 bg-academic-gray-light rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-primary h-2 rounded-full transition-smooth"
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DialectClassifier;