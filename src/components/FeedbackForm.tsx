import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClassificationResult {
  dialect: string;
  confidence: number;
  description: string;
}

interface FeedbackFormProps {
  text: string;
  language: string;
  results: ClassificationResult[];
  onFeedbackSubmitted: () => void;
}

const FeedbackForm = ({ text, language, results, onFeedbackSubmitted }: FeedbackFormProps) => {
  const [rating, setRating] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmitFeedback = async () => {
    if (rating === 0 && isCorrect === null) {
      toast({
        title: "Please provide feedback",
        description: "Rate the accuracy or mark if the result is correct/incorrect.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const topResult = results[0];
      
      const { error } = await supabase
        .from('dialect_feedback')
        .insert({
          text_analyzed: text,
          language: language,
          predicted_dialect: topResult.dialect,
          confidence: topResult.confidence,
          user_rating: rating > 0 ? rating : null,
          user_comment: comment.trim() || null,
          is_correct: isCorrect
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }

      toast({
        title: "Thank you for your feedback!",
        description: "Your input helps improve the dialect classifier.",
      });

      // Reset form
      setRating(0);
      setIsCorrect(null);
      setComment("");
      onFeedbackSubmitted();
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className="transition-colors hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300 hover:text-yellow-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (results.length === 0) return null;

  return (
    <Card className="backdrop-blur-lg bg-white/10 border border-white/20 shadow-glass border-l-4 border-l-neon-purple">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          💫 Rate This Classification
        </CardTitle>
        <p className="text-sm text-gray-300">
          Your feedback helps improve the dialect classifier for everyone ✨
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Correct/Incorrect buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">
            Was the classification correct?
          </label>
          <div className="flex gap-3">
            <Button
              variant={isCorrect === true ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCorrect(true)}
              className={`flex items-center gap-2 transition-all duration-200 ${
                isCorrect === true 
                  ? "bg-gradient-primary text-white shadow-neon" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              ✅ Correct
            </Button>
            <Button
              variant={isCorrect === false ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCorrect(false)}
              className={`flex items-center gap-2 transition-all duration-200 ${
                isCorrect === false 
                  ? "bg-gradient-secondary text-white shadow-neon" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              ❌ Incorrect
            </Button>
          </div>
        </div>

        {/* Star rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">
            Rate the overall quality (optional)
          </label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-all duration-200 hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= rating 
                        ? "fill-neon-cyan text-neon-cyan drop-shadow-lg" 
                        : "text-gray-400 hover:text-neon-cyan/50"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span className="text-sm text-gray-300 font-medium">
                {rating === 1 ? "😞 Poor" : 
                 rating === 2 ? "😐 Fair" : 
                 rating === 3 ? "😊 Good" : 
                 rating === 4 ? "😄 Very Good" : "🤩 Excellent"}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">
            Additional comments (optional)
          </label>
          <Textarea
            placeholder="Any additional feedback about the classification..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-20 bg-white/5 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm"
          />
        </div>

        <Button 
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || (rating === 0 && isCorrect === null)}
          className="w-full bg-gradient-accent hover:bg-gradient-primary text-white font-bold py-3 rounded-xl transition-all duration-200 hover:scale-105 shadow-neon disabled:opacity-50"
        >
          {isSubmitting ? "⏳ Submitting..." : "🚀 Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackForm;