import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY || ""
);

export interface TriageResult {
  category: "Medical" | "Food" | "Water" | "Shelter" | "Rescue" | "Other";
  priority: 1 | 2 | 3 | 4 | 5;
  reasoning?: string;
}

/**
 * Triage an alert using Gemini 1.5 Flash
 * Analyzes the victim's message and returns category and priority
 */
export async function triageAlert(
  emergencyType: string,
  description: string
): Promise<TriageResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a disaster relief triage AI. Analyze the following emergency request and categorize it.

Emergency Type: ${emergencyType}
Description: ${description}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "category": "Medical" | "Food" | "Water" | "Shelter" | "Rescue" | "Other",
  "priority": 1-5 (1 = most urgent, 5 = least urgent),
  "reasoning": "brief explanation"
}

Priority Guidelines:
- 1: Life-threatening, immediate danger (severe injuries, trapped, drowning)
- 2: Urgent medical needs, vulnerable populations (elderly, children, disabled)
- 3: Basic needs critically low (no water for 24h+, no food for 48h+)
- 4: Important but stable (shelter damage, low supplies)
- 5: Non-urgent assistance (information requests, minor needs)`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini");
    }

    const triageData = JSON.parse(jsonMatch[0]) as TriageResult;
    
    // Validate the response
    const validCategories = ["Medical", "Food", "Water", "Shelter", "Rescue", "Other"];
    if (!validCategories.includes(triageData.category)) {
      triageData.category = "Other";
    }
    
    if (triageData.priority < 1 || triageData.priority > 5) {
      triageData.priority = 3;
    }

    return triageData;
  } catch (error) {
    console.error("Gemini triage error:", error);
    // Return default triage if AI fails
    return {
      category: "Other",
      priority: 3,
      reasoning: "Auto-assigned due to triage system unavailability",
    };
  }
}

/**
 * Triage and update an alert document in Firestore
 */
export async function triageAndUpdateAlert(
  alertId: string,
  emergencyType: string,
  description: string
): Promise<TriageResult> {
  const triageResult = await triageAlert(emergencyType, description);
  
  try {
    const alertRef = doc(db, "alerts", alertId);
    await updateDoc(alertRef, {
      aiTriage: triageResult,
      triageCategory: triageResult.category,
      triagePriority: triageResult.priority,
    });
    console.log("ALERT TRIAGED SUCCESSFULLY");
  } catch (error) {
    console.error("Failed to update alert with triage:", error);
  }
  
  return triageResult;
}

export interface VisionAnalysis {
  severity: number; // 1-10
  primaryNeed: "Medical" | "Rescue" | "Food" | "Shelter" | "Water" | "Other";
  description: string;
  urgentDetails?: string;
  isFalseAlarm: boolean;
  falseAlarmReason?: string;
}

/**
 * Analyze a disaster photo using Gemini 1.5 Flash Vision
 * @param imageUrl - The Firebase Storage URL of the uploaded image
 */
export async function analyzeDisasterPhoto(imageUrl: string): Promise<VisionAnalysis> {
  // Check if API key exists
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY not set - skipping AI analysis");
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "AI analysis unavailable - API key not configured",
      urgentDetails: "Manual assessment required",
      isFalseAlarm: false,
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Fetch the image as base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.readAsDataURL(blob);
    });

    const prompt = `You are a disaster relief AI analyst. FIRST determine if this is a REAL disaster photo or a FALSE ALARM.

FALSE ALARM examples: restaurant menus, food photos, random screenshots, memes, selfies, irrelevant images.
REAL DISASTER examples: floods, fires, collapsed buildings, injured people, damage, emergencies.

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "isFalseAlarm": true/false,
  "falseAlarmReason": "Explain why this is NOT a disaster (only if isFalseAlarm is true)",
  "severity": 0-10 (0 = false alarm, 10 = most severe),
  "primaryNeed": "Medical" | "Rescue" | "Food" | "Shelter" | "Water" | "Other",
  "description": "Brief description of what you see (max 100 words)",
  "urgentDetails": "Any critical details rescuers should know (or 'N/A - False Alarm')"
}

If isFalseAlarm is true, set severity to 0.

Severity Guidelines (for REAL disasters only):
- 9-10: Life-threatening (collapsed structures, fire, flood, trapped people)
- 7-8: Severe damage (major structural damage, injured visible)
- 5-6: Moderate damage (partial damage, supplies needed)
- 3-4: Minor damage (cosmetic damage, basic assistance)
- 1-2: Minimal (precautionary assessment)
- 0: FALSE ALARM - Not a disaster image`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64,
        },
      },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini Vision");
    }

    const analysis = JSON.parse(jsonMatch[0]) as VisionAnalysis;
    
    // Validate
    if (analysis.severity < 0 || analysis.severity > 10) {
      analysis.severity = 5;
    }
    
    // If false alarm, ensure severity is 0
    if (analysis.isFalseAlarm) {
      analysis.severity = 0;
    }
    
    const validNeeds = ["Medical", "Rescue", "Food", "Shelter", "Water", "Other"];
    if (!validNeeds.includes(analysis.primaryNeed)) {
      analysis.primaryNeed = "Other";
    }

    return analysis;
  } catch (error) {
    console.error("Gemini Vision analysis error:", error);
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "Unable to analyze photo automatically",
      urgentDetails: "Manual assessment required",
      isFalseAlarm: false,
    };
  }
}

/**
 * Analyze a base64 image directly (for instant client-side analysis)
 * This is faster than waiting for Firebase upload
 */
export async function analyzeBase64Photo(base64Data: string): Promise<VisionAnalysis> {
  // Check if API key exists
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY not set - skipping AI analysis");
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "AI analysis unavailable - API key not configured",
      isFalseAlarm: false,
    };
  }

  try {
    // Use gemini-1.5-flash for fastest response
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 200, // Limit output for speed
        temperature: 0.1, // Low temperature for consistent results
      }
    });

    // Optimized short prompt for speed
    const prompt = `Quickly categorize this image. Reply ONLY with JSON:
{"isFalseAlarm":bool,"category":"Flood|Fire|Medical|Collapse|Irrelevant","severity":0-10,"description":"max 20 words"}

Rules:
- Food photos, menus, selfies = Irrelevant, severity 0, isFalseAlarm true
- Real disasters = appropriate category, severity 1-10 based on urgency`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini Vision");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Map category to primaryNeed
    const categoryToNeed: Record<string, string> = {
      'Flood': 'Rescue',
      'Fire': 'Rescue', 
      'Medical': 'Medical',
      'Collapse': 'Rescue',
      'Irrelevant': 'Other'
    };
    
    const analysis: VisionAnalysis = {
      isFalseAlarm: parsed.isFalseAlarm || parsed.category === 'Irrelevant',
      falseAlarmReason: parsed.isFalseAlarm ? parsed.description : undefined,
      severity: parsed.isFalseAlarm ? 0 : (parsed.severity || 5),
      primaryNeed: (categoryToNeed[parsed.category] || 'Other') as VisionAnalysis['primaryNeed'],
      description: parsed.description || 'Analysis complete',
    };
    
    return analysis;
  } catch (error) {
    console.error("Gemini base64 analysis error:", error);
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "Unable to analyze photo",
      isFalseAlarm: false,
    };
  }
}

/**
 * Analyze photo and update alert document
 */
export async function analyzeAndUpdateAlert(
  alertId: string,
  imageUrl: string
): Promise<VisionAnalysis> {
  const analysis = await analyzeDisasterPhoto(imageUrl);
  
  try {
    const alertRef = doc(db, "alerts", alertId);
    await updateDoc(alertRef, {
      visionAnalysis: analysis,
      aiSeverity: analysis.severity,
      aiPrimaryNeed: analysis.primaryNeed,
    });
    console.log("PHOTO ANALYZED SUCCESSFULLY");
  } catch (error) {
    console.error("Failed to update alert with vision analysis:", error);
  }
  
  return analysis;
}
