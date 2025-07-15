import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, Globe, Sparkles } from "lucide-react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const { toast } = useToast();

  // Real classification function using Supabase Edge Function
  const classifyDialect = async (inputText: string): Promise<ClassificationResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('classify-dialect', {
        body: { text: inputText, language: "arabic" }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data.results || [];
    } catch (error) {
      console.error("Classification error:", error);
      // Fallback to keyword-based classification for Arabic
      return classifyArabicByKeywords(inputText);
    }
  };

  // Fallback keyword-based classification for Arabic
  const classifyArabicByKeywords = (text: string): ClassificationResult[] => {
    const keywords = {
      egyptian: ["إيه", "إزيك", "إزايك", "يلا", "كدة", "أصل", "علشان", "عامل", "ايه", "معلش", "خلاص", "عشان"],
      levantine: ["شو", "كيفك", "بدي", "هيك", "مشان", "عم", "شلون", "وين", "هالقد", "يا رب", "منيح"],
      
      // Expanded Maghrebi with regional variants
      moroccan: ["واخا", "غير", "ديال", "حنا", "بلا", "شي", "حاجة", "كيفاش", "شحال", "بغيت", "درت", "مزيان", "واش", "بصح", "فين", "لا"],
      algerian: ["راني", "كيما", "تاع", "ولاّ", "برك", "حتى", "نشوف", "شرايك", "وين", "كاين", "مكانش", "بصح"],
      tunisian: ["آش", "حكاية", "فمّة", "برشا", "بالله", "توّا", "شنيّة", "كيفاش", "وقتاش", "فمّة", "موش"],
      
      // Specific Gulf dialects
      saudi_najdi: ["وش", "ليش", "عاد", "زين", "أبي", "شنو", "وين", "يا ذيب", "علي", "مره", "خوي"],
      saudi_hijazi: ["إيش", "وش", "كدا", "زي كدا", "يا عمي", "حبيبي", "خوي", "دحين", "ايوه"],
      emirati: ["شلونك", "شلون", "ثاني", "بعدين", "واجد", "ماشي", "زين", "خلاص", "دبي", "يالله"],
      kuwaiti: ["شلونك", "شنو", "شكو", "ماكو", "جان", "عادي", "زين", "خلاص", "شدعوى", "لول"],
      bahraini: ["شلونك", "شنو", "كيف", "زين", "واجد", "خلاص", "شداعي", "جان", "ماشي"],
      omani: ["شلونك", "شنو", "كيف", "زين", "واجد", "خلاص", "بعدين", "ماشي", "عسى"]
    };

    const dialectMappings = {
      egyptian: { name: "Egyptian Arabic", description: "Common in Egypt and widely understood across the Arab world" },
      levantine: { name: "Levantine Arabic", description: "Used in Syria, Lebanon, Jordan, and Palestine" },
      moroccan: { name: "Moroccan Arabic", description: "Darija dialect spoken in Morocco" },
      algerian: { name: "Algerian Arabic", description: "Dialect spoken in Algeria with Berber influences" },
      tunisian: { name: "Tunisian Arabic", description: "Unique dialect spoken in Tunisia" },
      saudi_najdi: { name: "Saudi Najdi Arabic", description: "Dialect of central Saudi Arabia (Riyadh region)" },
      saudi_hijazi: { name: "Saudi Hijazi Arabic", description: "Dialect of western Saudi Arabia (Mecca, Medina)" },
      emirati: { name: "Emirati Arabic", description: "Dialect spoken in the United Arab Emirates" },
      kuwaiti: { name: "Kuwaiti Arabic", description: "Dialect spoken in Kuwait" },
      bahraini: { name: "Bahraini Arabic", description: "Dialect spoken in Bahrain" },
      omani: { name: "Omani Arabic", description: "Dialect spoken in Oman" }
    };

    const scores = {
      egyptian: 0,
      levantine: 0,
      moroccan: 0,
      algerian: 0,
      tunisian: 0,
      saudi_najdi: 0,
      saudi_hijazi: 0,
      emirati: 0,
      kuwaiti: 0,
      bahraini: 0,
      omani: 0
    };

    // Enhanced scoring with weighted keywords
    Object.entries(keywords).forEach(([dialect, words]) => {
      words.forEach((word, index) => {
        if (text.includes(word)) {
          // Weight rare/distinctive words higher (first few words are usually more distinctive)
          const weight = index < 3 ? 0.6 : index < 6 ? 0.4 : 0.3;
          scores[dialect as keyof typeof scores] += weight;
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
      const classificationResults = await classifyDialect(text);
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
    if (confidence >= 0.7) return "bg-success text-white";
    if (confidence >= 0.5) return "bg-warning text-background";
    return "bg-destructive text-white";
  };

  const getConfidenceLabel = (confidence: number, isTopResult: boolean, results: ClassificationResult[]) => {
    if (isTopResult && results.length > 1) {
      const secondHighest = results[1]?.confidence || 0;
      const isHighConfidence = confidence >= (secondHighest + 0.1);
      if (isHighConfidence && confidence >= 0.6) return "High";
    }
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.4) return "Medium";
    return "Low";
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
        {/* Professional animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-secondary/5 rounded-full blur-3xl animate-float delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto p-8 space-y-10">
          {/* Professional Header */}
          <div className="text-center space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <div className="relative p-4 rounded-2xl bg-gradient-primary shadow-glow backdrop-blur-lg border border-white/10">
                <Languages className="h-8 w-8 text-white animate-float" />
                <div className="absolute inset-0 bg-gradient-secondary rounded-2xl blur opacity-20 -z-10"></div>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-gradient-primary bg-clip-text leading-tight">
              AI-powered Arabic dialect classification
            </h1>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Machine Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent" />
                <span>Real-time Analysis</span>
              </div>
            </div>
          </div>

          {/* Professional Input Section */}
          <Card className="card-professional animate-scale-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-foreground text-lg">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                Text Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  Arabic Text Input
                </label>
                <Textarea
                  placeholder="أدخل النص هنا"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-40 resize-none bg-muted/50 border-border text-foreground placeholder:text-muted-foreground transition-all duration-300 hover:border-primary/50 focus:border-primary backdrop-blur-sm text-lg leading-relaxed shadow-sm"
                  dir="rtl"
                />
              </div>

              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !text.trim()}
                size="lg"
                className="btn-professional w-full py-4 text-lg font-semibold rounded-xl shadow-elegant"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                    Analyzing Dialect...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-3" />
                    Analyze Dialect
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Professional Results Section */}
          {results.length > 0 && (
            <Card className="card-professional animate-scale-in">
              <CardHeader className="pb-6">
                <CardTitle className="text-foreground text-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                  </div>
                  Classification Results
                  <Badge variant="secondary" className="ml-auto">
                    {results.length} Match{results.length > 1 ? 'es' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className="relative overflow-hidden p-6 bg-muted/30 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-[1.01] animate-fade-in group"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <h3 className="font-bold text-2xl text-foreground">{result.dialect}</h3>
                          <Badge 
                            className={`${getConfidenceColor(result.confidence)} font-bold px-4 py-2 rounded-full text-sm shadow-lg`}
                          >
                            {getConfidenceLabel(result.confidence, index === 0, results)} Confidence
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{result.description}</p>
                      </div>
                      <div className="text-right ml-8 space-y-3">
                        <div className="text-4xl font-black text-transparent bg-gradient-primary bg-clip-text">
                          {(result.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="w-32 bg-muted rounded-full h-4 overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-primary h-4 rounded-full transition-all duration-1000 ease-out shadow-glow"
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

          {/* Professional Feedback Section */}
          {showFeedback && results.length > 0 && (
            <div className="animate-scale-in" style={{ animationDelay: '0.6s' }}>
              <FeedbackForm
                text={text}
                language="arabic"
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