import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Mock classification function - in a real app, this would call a ML model
  const classifyDialect = async (inputText: string, selectedLanguage: string): Promise<ClassificationResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (selectedLanguage === "arabic") {
      // Mock Arabic dialect classification
      const arabicDialects = [
        { dialect: "Egyptian Arabic", confidence: 0.89, description: "Common in Egypt and widely understood across the Arab world" },
        { dialect: "Gulf Arabic", confidence: 0.67, description: "Spoken in the Arabian Peninsula and Gulf states" },
        { dialect: "Levantine Arabic", confidence: 0.45, description: "Used in Syria, Lebanon, Jordan, and Palestine" },
        { dialect: "Maghrebi Arabic", confidence: 0.23, description: "Spoken in North African countries" }
      ];
      
      // Randomize for demo purposes
      return arabicDialects
        .map(d => ({ ...d, confidence: Math.random() * 0.9 + 0.1 }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    } else {
      // Mock English dialect classification
      const englishDialects = [
        { dialect: "American English", confidence: 0.82, description: "Standard American pronunciation and vocabulary" },
        { dialect: "British English", confidence: 0.71, description: "Received Pronunciation and British vocabulary" },
        { dialect: "Australian English", confidence: 0.34, description: "Distinctive Australian accent and expressions" },
        { dialect: "Canadian English", confidence: 0.28, description: "Canadian pronunciation with some British influences" }
      ];
      
      return englishDialects
        .map(d => ({ ...d, confidence: Math.random() * 0.9 + 0.1 }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    }
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
      toast({
        title: "Analysis complete",
        description: `Found ${classificationResults.length} potential dialect matches.`,
      });
    } catch (error) {
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

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.5) return "Medium";
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
                      {getConfidenceLabel(result.confidence)} Confidence
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