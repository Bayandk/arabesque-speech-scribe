-- Create feedback table for dialect classifications
CREATE TABLE public.dialect_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text_analyzed TEXT NOT NULL,
  language TEXT NOT NULL,
  predicted_dialect TEXT NOT NULL,
  confidence DECIMAL NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_comment TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dialect_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read feedback (for analytics)
CREATE POLICY "Anyone can view feedback" 
ON public.dialect_feedback 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to insert feedback
CREATE POLICY "Anyone can submit feedback" 
ON public.dialect_feedback 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_dialect_feedback_created_at ON public.dialect_feedback(created_at);
CREATE INDEX idx_dialect_feedback_language ON public.dialect_feedback(language);
CREATE INDEX idx_dialect_feedback_rating ON public.dialect_feedback(user_rating);