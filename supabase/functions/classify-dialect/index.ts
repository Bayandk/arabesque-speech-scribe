import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, language } = await req.json()

    if (!text || !language) {
      return new Response(
        JSON.stringify({ error: 'Text and language are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))

    let results = []

    if (language === 'arabic') {
      try {
        // Try HuggingFace Arabic dialect classification
        const classification = await hf.textClassification({
          model: 'CAMeL-Lab/bert-base-arabic-camelbert-da',
          inputs: text
        })

        const dialectMappings = {
          "EGY": { name: "Egyptian Arabic", description: "Common in Egypt and widely understood across the Arab world" },
          "LEV": { name: "Levantine Arabic", description: "Used in Syria, Lebanon, Jordan, and Palestine" },
          "GLF": { name: "Gulf Arabic", description: "Spoken in the Arabian Peninsula and Gulf states" },
          "NOR": { name: "Modern Standard Arabic", description: "Formal Arabic used in media and literature" },
          "MAG": { name: "Maghrebi Arabic", description: "Spoken in North African countries" }
        }

        results = classification
          .filter((pred: any) => pred.score > 0.05)
          .map((pred: any) => {
            const dialectInfo = dialectMappings[pred.label as keyof typeof dialectMappings]
            return {
              dialect: dialectInfo?.name || pred.label,
              confidence: pred.score,
              description: dialectInfo?.description || "Dialect classification result"
            }
          })
          .sort((a: any, b: any) => b.confidence - a.confidence)
          .slice(0, 3)

        if (results.length === 0) {
          results = [{
            dialect: "Modern Standard Arabic",
            confidence: 0.6,
            description: "Formal Arabic used in media and literature"
          }]
        }
      } catch (error) {
        console.error('HuggingFace classification failed:', error)
        // Fallback to keyword-based classification
        results = classifyArabicByKeywords(text)
      }
    } else {
      // English classification using keyword-based approach
      results = classifyEnglishByKeywords(text)
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function classifyArabicByKeywords(text: string) {
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
  }

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
  }

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
  }

  // Enhanced scoring with weighted keywords
  Object.entries(keywords).forEach(([dialect, words]) => {
    words.forEach((word, index) => {
      if (text.includes(word)) {
        // Weight rare/distinctive words higher (first few words are usually more distinctive)
        const weight = index < 3 ? 0.6 : index < 6 ? 0.4 : 0.3
        scores[dialect as keyof typeof scores] += weight
      }
    })
  })

  // Convert to results format
  const results = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .map(([dialect, score]) => ({
      dialect: dialectMappings[dialect as keyof typeof dialectMappings]?.name || dialect,
      confidence: Math.min(score, 0.9),
      description: dialectMappings[dialect as keyof typeof dialectMappings]?.description || "Detected based on keyword analysis"
    }))
    .sort((a, b) => b.confidence - a.confidence)

  return results.length > 0 ? results : [{
    dialect: "Modern Standard Arabic",
    confidence: 0.5,
    description: "Default classification - formal Arabic"
  }]
}

function classifyEnglishByKeywords(text: string) {
  const keywords = {
    american: ["color", "theater", "center", "aluminum", "mom", "gas", "truck", "elevator", "apartment", "cookie"],
    british: ["colour", "theatre", "centre", "aluminium", "mum", "petrol", "lorry", "lift", "flat", "biscuit"],
    australian: ["mate", "bloke", "arvo", "brekkie", "mozzie", "barbie", "ute", "fair dinkum", "bloody"],
    canadian: ["eh", "toque", "loonie", "double-double", "chesterfield", "hoser", "about", "house"]
  }

  const scores = {
    american: 0.3, // Default baseline for American
    british: 0,
    australian: 0,
    canadian: 0
  }

  const lowerText = text.toLowerCase()
  
  Object.entries(keywords).forEach(([dialect, words]) => {
    words.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        scores[dialect as keyof typeof scores] += 0.4
      }
    })
  })

  const results = [
    { dialect: "American English", confidence: scores.american, description: "Standard American pronunciation and vocabulary" },
    { dialect: "British English", confidence: scores.british || 0.2, description: "Received Pronunciation and British vocabulary" },
    { dialect: "Australian English", confidence: scores.australian || 0.1, description: "Distinctive Australian accent and expressions" },
    { dialect: "Canadian English", confidence: scores.canadian || 0.1, description: "Canadian pronunciation with some British influences" }
  ]
    .filter(result => result.confidence > 0.05)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)

  return results
}