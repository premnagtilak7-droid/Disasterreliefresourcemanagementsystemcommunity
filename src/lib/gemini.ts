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
}

/**
 * Analyze a disaster photo using Gemini 1.5 Flash Vision
 * @param imageUrl - The Firebase Storage URL of the uploaded image
 */
export async function analyzeDisasterPhoto(imageUrl: string): Promise<VisionAnalysis> {
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

    const prompt = `You are a disaster relief AI analyst. Analyze this disaster photo carefully.

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "severity": 1-10 (10 = most severe, 1 = least severe),
  "primaryNeed": "Medical" | "Rescue" | "Food" | "Shelter" | "Water" | "Other",
  "description": "Brief description of what you see (max 100 words)",
  "urgentDetails": "Any critical details rescuers should know"
}

Severity Guidelines:
- 9-10: Life-threatening (collapsed structures, fire, flood, trapped people)
- 7-8: Severe damage (major structural damage, injured visible)
- 5-6: Moderate damage (partial damage, supplies needed)
- 3-4: Minor damage (cosmetic damage, basic assistance)
- 1-2: Minimal (precautionary assessment)`;

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
    if (analysis.severity < 1 || analysis.severity > 10) {
      analysis.severity = 5;
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
