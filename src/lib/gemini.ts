import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// API Key validation with masked logging
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
if (apiKey) {
  const maskedKey = apiKey.slice(0, 6) + "..." + apiKey.slice(-4);
  console.log("[v0] Gemini API Key loaded:", maskedKey);
} else {
  console.warn("[v0] VITE_GEMINI_API_KEY is NOT set - AI features will be disabled");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Export function to check API key status for UI
export function isGeminiConfigured(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

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
  description: string,
  collectionName: string = "emergency_alerts"
): Promise<TriageResult> {
  const triageResult = await triageAlert(emergencyType, description);
  
  try {
    const alertRef = doc(db, collectionName, alertId);
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
 * @param imageUrl - The Firebase Storage URL of the uploaded image OR a base64 data URI
 */
export async function analyzeDisasterPhoto(imageUrl: string): Promise<VisionAnalysis> {
  // Check if API key exists
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("[v0] VITE_GEMINI_API_KEY not set - skipping AI analysis");
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "AI analysis unavailable - API key not configured. Please add VITE_GEMINI_API_KEY.",
      urgentDetails: "Manual assessment required",
      isFalseAlarm: false,
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let base64: string;
    let mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    // Check if this is already a base64 data URI
    if (imageUrl.startsWith('data:image')) {
      mimeType = detectMimeType(imageUrl);
      base64 = extractBase64Data(imageUrl);
      console.log("[v0] Using provided base64 data, mimeType:", mimeType);
    } else {
      // Fetch the image from URL as base64
      console.log("[v0] Fetching image from URL for analysis");
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });
      mimeType = detectMimeType(dataUrl);
      base64 = extractBase64Data(dataUrl);
    }

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
          mimeType: mimeType,
          data: base64,
        },
      },
    ]);

    const responseText = result.response.text();
    console.log("[v0] Gemini Vision analysis complete");
    
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
    console.error("[v0] Gemini Vision analysis error:", error);
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "Unable to analyze photo - check API key and try again",
      urgentDetails: "Manual assessment required",
      isFalseAlarm: false,
    };
  }
}

/**
 * Detect MIME type from base64 data or data URI
 */
function detectMimeType(base64Data: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  // Check for data URI prefix
  if (base64Data.startsWith("data:image/png")) return "image/png";
  if (base64Data.startsWith("data:image/webp")) return "image/webp";
  if (base64Data.startsWith("data:image/gif")) return "image/gif";
  if (base64Data.startsWith("data:image/jpeg") || base64Data.startsWith("data:image/jpg")) return "image/jpeg";
  
  // Check magic bytes in base64 (first few characters indicate file type)
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  
  // PNG magic bytes: iVBORw0KGgo
  if (cleanBase64.startsWith("iVBORw0KGgo")) return "image/png";
  // GIF magic bytes: R0lGOD
  if (cleanBase64.startsWith("R0lGOD")) return "image/gif";
  // WebP magic bytes: UklGR
  if (cleanBase64.startsWith("UklGR")) return "image/webp";
  
  // Default to JPEG (most common for photos)
  return "image/jpeg";
}

/**
 * Extract clean base64 data (without data URI prefix)
 */
function extractBase64Data(input: string): string {
  if (input.includes(",")) {
    return input.split(",")[1];
  }
  return input;
}

/**
 * Analyze a base64 image directly (for instant client-side analysis)
 * This is faster than waiting for Firebase upload
 * Properly handles Base64 strings with correct mimeType detection for Gemini Vision
 */
export async function analyzeBase64Photo(base64Data: string): Promise<VisionAnalysis> {
  // Check if API key exists
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("[v0] VITE_GEMINI_API_KEY not set - skipping AI analysis");
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "AI analysis unavailable - API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.",
      isFalseAlarm: false,
    };
  }

  try {
    // Detect mime type and extract clean base64 data
    const mimeType = detectMimeType(base64Data);
    const cleanBase64 = extractBase64Data(base64Data);
    
    console.log("[v0] Analyzing image with Gemini Vision, mimeType:", mimeType);

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
          mimeType: mimeType,
          data: cleanBase64,
        },
      },
    ]);

    const responseText = result.response.text();
    console.log("[v0] Gemini Vision response received");
    
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
    console.error("[v0] Gemini base64 analysis error:", error);
    return {
      severity: 5,
      primaryNeed: "Other",
      description: "Unable to analyze photo - check API key and try again",
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

// ============ EMERGENCY DISPATCHER & RISK ASSESSMENT AI ============

export interface EmergencyDispatchResult {
  hazard_type: 'Fire' | 'Flood' | 'Medical' | 'Crime' | 'Collapse' | 'Gas Leak' | 'Electrical' | 'No Hazard Detected' | 'Manual Override' | 'Other';
  severity_score: number; // 1-10
  recommended_action: 'call_101' | 'call_102' | 'call_100' | 'none';
  status_level: 'critical' | 'stable' | 'monitoring' | 'manual_override';
  visual_evidence_summary: string;
  equipment_needed: string[];
  secondary_risks?: string[];
  authority_assigned?: string;
}

/**
 * Senior Emergency Dispatcher & Risk Assessment AI
 * Analyzes disaster images with high precision for autonomous routing to emergency services
 * 
 * Authority Codes:
 * - 101: Fire Department
 * - 102: Ambulance/Medical
 * - 100: Police
 * 
 * @param base64Image - Base64 encoded image of the emergency scene
 * @param contextMessage - Optional text context from user's help message (e.g., "fire", "flood")
 * @returns Emergency dispatch result with routing and equipment recommendations
 */
export async function analyzeEmergencyDispatch(base64Image: string, contextMessage?: string): Promise<EmergencyDispatchResult> {
  // Check if API key exists
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return {
      hazard_type: 'Other',
      severity_score: 5,
      recommended_action: 'none',
      status_level: 'monitoring',
      visual_evidence_summary: 'AI analysis unavailable - API key not configured',
      equipment_needed: ['First aid kit', 'Flashlight', 'Protective gloves'],
    };
  }

  try {
    // Detect mime type and extract clean base64
    const mimeType = detectMimeType(base64Image);
    const cleanBase64 = extractBase64Data(base64Image);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.1, // Low temperature for precise, consistent assessments
      }
    });

    // Build context-aware prompt
    const userContext = contextMessage?.trim() 
      ? `\n\nUSER CONTEXT MESSAGE: "${contextMessage}"\nIMPORTANT: The user has described their emergency as above. PRIORITIZE this context in your analysis. If they mention "fire", "flood", "injured", "trapped", etc., treat this as HIGH PRIORITY even if the image is unclear.\n`
      : '';

    const prompt = `You are a Senior Emergency Dispatcher & Risk Assessment AI. Analyze this image with high precision.

CRITICAL INSTRUCTION - IMAGE ANALYSIS:
You MUST analyze the CONTENT of the image, even if:
- It appears to be a photo of a screen or monitor
- It looks like a digital image, screenshot, or video frame
- The image quality is poor or grainy
- The scene is partially obscured
Look for ANY signs of emergency: flames, smoke, water damage, injured persons, structural damage, etc.
DO NOT dismiss an image just because it looks digital - analyze what is SHOWN in the content.
${userContext}
HAZARD IDENTIFICATION:
1. Identify the PRIMARY emergency: Fire, Flood, Medical, Crime, Collapse, Gas Leak, Electrical
2. ONLY set "No Hazard Detected" if you are CERTAIN there is no emergency visible AND the user has not indicated an emergency in their message
3. Look for SECONDARY RISKS (e.g., live wires in a flood, gas leaks in a fire, structural collapse risk)
4. If the image shows flames, smoke, fire trucks, or burning materials - this IS a Fire hazard
5. If you see water where it shouldn't be, flooding, or water damage - this IS a Flood hazard

CONTEXTUAL SEVERITY (1-10):
- Rate 1-2 (NO HAZARD): Absolutely certain no emergency, safe scene confirmed
- Rate 3-4 (STABLE): Minor incidents, small controlled situations, minor property damage
- Rate 5-6 (ELEVATED/MONITORING): Potential danger, needs monitoring, moderate risk
- Rate 7-10 (CRITICAL): Active fire, spreading flames, visible injuries, trapped persons, life-threat

AUTONOMOUS ROUTING - Assign the correct emergency authority:
- "call_101" = Fire Department (ANY fire, smoke, gas leaks, hazmat, rescue)
- "call_102" = Ambulance/Medical (injuries, medical emergencies, unconscious persons)
- "call_100" = Police (crimes, civil disturbance, traffic accidents, security threats)
- "none" = Only when absolutely certain no emergency exists

LOGIC GATE (MANDATORY):
- If severity_score <= 4 AND no hazard visible AND no user context indicating emergency: recommended_action = "none"
- If severity_score >= 5 and <= 7: recommended_action based on hazard type
- If severity_score > 7: recommended_action MUST be the appropriate call command (triggers emergency dialer)
- If user mentions emergency keywords (fire, flood, help, trapped, injured) but image unclear: DEFAULT to severity 6+ and appropriate hazard type

RESOURCE PRESCRIPTION:
Generate a specific equipment checklist for the first responder based on the hazard type.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "hazard_type": "Fire" | "Flood" | "Medical" | "Crime" | "Collapse" | "Gas Leak" | "Electrical" | "No Hazard Detected",
  "severity_score": 1-10,
  "recommended_action": "call_101" | "call_102" | "call_100" | "none",
  "status_level": "critical" | "stable" | "monitoring",
  "visual_evidence_summary": "1-sentence description of what you see in the image",
  "equipment_needed": ["item1", "item2", "item3"],
  "secondary_risks": ["risk1", "risk2"],
  "authority_assigned": "Fire Department" | "Ambulance" | "Police" | "None"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini Vision");
    }

    const dispatch = JSON.parse(jsonMatch[0]) as EmergencyDispatchResult;
    
    // Validate and enforce logic gate
    if (dispatch.severity_score < 0) dispatch.severity_score = 0;
    if (dispatch.severity_score > 10) dispatch.severity_score = 10;
    
    // Handle "No Hazard Detected" case explicitly
    if (dispatch.hazard_type === 'No Hazard Detected' || dispatch.severity_score <= 2) {
      dispatch.recommended_action = 'none';
      dispatch.status_level = 'stable';
      if (dispatch.severity_score <= 2) {
        dispatch.hazard_type = 'No Hazard Detected';
        dispatch.visual_evidence_summary = dispatch.visual_evidence_summary || 'No emergency detected in this image';
      }
    }
    // Enforce logic gate rules - Call button ONLY appears when severity > 7
    else if (dispatch.severity_score <= 4) {
      dispatch.recommended_action = 'none';
      dispatch.status_level = 'stable';
    } else if (dispatch.severity_score > 7) {
      // CRITICAL: Severity > 7 triggers emergency dialer
      dispatch.status_level = 'critical';
      // Ensure a call action is assigned for critical situations
      if (dispatch.recommended_action === 'none') {
        // Auto-assign based on hazard type
        if (dispatch.hazard_type === 'Fire' || dispatch.hazard_type === 'Gas Leak') {
          dispatch.recommended_action = 'call_101';
        } else if (dispatch.hazard_type === 'Medical') {
          dispatch.recommended_action = 'call_102';
        } else if (dispatch.hazard_type === 'Crime') {
          dispatch.recommended_action = 'call_100';
        } else if (dispatch.hazard_type === 'Flood' || dispatch.hazard_type === 'Collapse') {
          dispatch.recommended_action = 'call_101'; // Fire dept handles rescue
        } else {
          dispatch.recommended_action = 'call_102'; // Default to ambulance for critical unknowns
        }
      }
    } else {
      // Severity 5-7: monitoring, no automatic call
      dispatch.status_level = 'monitoring';
      dispatch.recommended_action = 'none'; // No call button for monitoring level
    }

    // Set authority_assigned based on recommended_action
    const authorityMap: Record<string, string> = {
      'call_101': 'Fire Department',
      'call_102': 'Ambulance',
      'call_100': 'Police',
      'none': 'None'
    };
    dispatch.authority_assigned = authorityMap[dispatch.recommended_action] || 'None';

    return dispatch;
  } catch (error) {
    console.error("[v0] Emergency dispatch analysis error:", error);
    // Return "Manual Override" status on error - allows user to manually assess
    return {
      hazard_type: 'Manual Override',
      severity_score: 5, // Default to monitoring level, not 0
      recommended_action: 'none',
      status_level: 'manual_override',
      visual_evidence_summary: 'AI analysis failed - MANUAL ASSESSMENT REQUIRED. Please describe your emergency in the help message or call emergency services directly if urgent.',
      equipment_needed: ['First aid kit', 'Flashlight', 'Communication device'],
      authority_assigned: 'Manual Assessment Required',
    };
  }
}

// ============ MISSION AI TRIAGE ============

export interface MissionTriageResult {
  severity: number; // 1-10
  primaryNeed: string;
  description: string;
  requiredEquipment: string[];
  safetyWarnings: string[];
  estimatedTimeToResolve: string;
}

/**
 * Analyze a disaster photo for mission triage - provides equipment recommendations
 * This is the "AI Prescription" - generates a Required Equipment Checklist based on visual triage
 */
export async function analyzeMissionPhoto(base64Data: string): Promise<MissionTriageResult> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("[v0] VITE_GEMINI_API_KEY not set - using default mission triage");
    return {
      severity: 5,
      primaryNeed: "General Assistance",
      description: "AI analysis unavailable - API key not configured. Please add VITE_GEMINI_API_KEY.",
      requiredEquipment: ["First aid kit", "Flashlight", "Water bottles"],
      safetyWarnings: ["Assess the situation before entering"],
      estimatedTimeToResolve: "30-60 minutes",
    };
  }

  try {
    // Detect mime type and extract clean base64
    const mimeType = detectMimeType(base64Data);
    const cleanBase64 = extractBase64Data(base64Data);
    
    console.log("[v0] Running Mission AI Triage with mimeType:", mimeType);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.2,
      }
    });

    // Enhanced prompt with "Required Equipment Checklist" prescription
    const prompt = `You are an AI Disaster Relief Triage Specialist helping volunteers prepare for rescue missions.
Analyze this disaster photo and provide a DETAILED visual triage with a REQUIRED EQUIPMENT CHECKLIST.

Your job is to:
1. IDENTIFY the type of disaster (flood, fire, collapse, medical emergency, etc.)
2. ASSESS the severity based on visual cues
3. PRESCRIBE the exact equipment the volunteer needs to bring

Respond ONLY with a valid JSON object (no markdown):
{
  "severity": 1-10 (10 = most severe, be specific based on what you see),
  "primaryNeed": "Medical" | "Rescue" | "Food" | "Shelter" | "Water" | "Evacuation" | "Fire Response" | "Search & Rescue" | "Other",
  "description": "Detailed visual triage - describe EXACTLY what you see in the disaster scene (max 60 words)",
  "requiredEquipment": ["REQUIRED EQUIPMENT CHECKLIST - list 5-10 specific items the volunteer MUST bring based on what you see"],
  "safetyWarnings": ["3-5 CRITICAL safety precautions based on the specific hazards visible"],
  "estimatedTimeToResolve": "realistic time estimate based on disaster severity"
}

EQUIPMENT CHECKLIST GUIDELINES (choose based on disaster type):
- FLOOD: Wading boots, life jacket, rope (30m), waterproof flashlight, emergency whistle, dry bags, thermal blankets
- FIRE: Fire extinguisher, N95 masks, fire-resistant gloves, wet towels, first aid burn kit, flashlight, fire blanket
- COLLAPSE/EARTHQUAKE: Hard hat, crowbar, hydraulic jack, dust masks, work gloves, stretcher, trauma kit, flashlight
- MEDICAL: First aid kit, AED if severe, stretcher, cervical collar, bandages, antiseptic, splints, oxygen if available
- GENERAL: First aid kit, flashlight, water bottles, blankets, communication radio, rope, multi-tool, protective gloves

Be SPECIFIC about equipment - don't just say "first aid kit", specify what's needed inside it based on injuries visible.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      },
    ]);

    const responseText = result.response.text();
    console.log("[v0] Mission AI Triage complete");
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    return JSON.parse(jsonMatch[0]) as MissionTriageResult;
  } catch (error) {
    console.error("[v0] Mission triage error:", error);
    return {
      severity: 5,
      primaryNeed: "General Assistance",
      description: "Unable to analyze photo - bring standard emergency kit",
      requiredEquipment: ["First aid kit", "Flashlight", "Water bottles", "Protective gloves", "Emergency blanket"],
      safetyWarnings: ["Proceed with caution", "Assess situation before entering", "Wear protective equipment"],
      estimatedTimeToResolve: "30-60 minutes",
    };
  }
}

// ============ DIGITAL IDENTITY NOTARY - VOLUNTEER VERIFICATION ============

export interface VolunteerVerificationResult {
  isVerified: boolean;
  name: string;
  documentType: string;
  expiryStatus: 'valid' | 'expired' | 'not_found';
  isVolunteerAuthorized: boolean;
  confidence_score: number;
  rejectionReason?: string;
}

/**
 * Digital Identity Notary - Volunteer Document Verification
 * Analyzes Government IDs or NGO/First Responder Certificates using Gemini Vision
 * 
 * @param base64Image - Base64 encoded image of the document
 * @returns Verification result with extracted data and authenticity assessment
 */
export async function verifyVolunteerDocument(base64Image: string): Promise<VolunteerVerificationResult> {
  // Check if API key exists
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("[v0] VITE_GEMINI_API_KEY not set - document verification unavailable");
    return {
      isVerified: false,
      name: '',
      documentType: 'Unknown',
      expiryStatus: 'not_found',
      isVolunteerAuthorized: false,
      confidence_score: 0,
      rejectionReason: 'AI verification unavailable - API key not configured',
    };
  }

  try {
    // Detect mime type and extract clean base64
    const mimeType = detectMimeType(base64Image);
    const cleanBase64 = extractBase64Data(base64Image);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.1, // Low temperature for consistent, factual results
      }
    });

    const prompt = `You are a Digital Identity Notary specializing in Volunteer Verification for Emergency Services. Analyze this uploaded document image.

VERIFICATION TASKS:
1. VOLUNTEER VALIDATION: Confirm if this is a valid Government ID (e.g., Driver's License, Passport, National ID) OR an official NGO/First Responder Rescue Certificate (Red Cross, FEMA, Fire Department, EMT, etc.).

2. COMPULSORY CHECKS:
   - Extract the FULL LEGAL NAME exactly as it appears on the document
   - Check the EXPIRY DATE - if the document is expired, it is INVALID for active duty
   - Verify the document is properly formatted and contains official elements

3. AUTHENTICITY CHECK: 
   - Detect if this is a REAL physical document OR a fraudulent screen-capture/digital edit
   - Look for signs of tampering: pixelation around text, inconsistent fonts, missing holograms/watermarks
   - Check if the photo looks like a photograph of a real document vs a screenshot

4. MANDATORY INSTRUCTION: If the document does not clearly belong to a potential volunteer or rescuer (e.g., random photo, non-ID document, heavily obscured), set 'isVerified' to false.

VALID DOCUMENT TYPES FOR VOLUNTEERS:
- Government-issued Photo ID (Driver's License, Passport, National ID Card)
- First Responder Certifications (EMT, Paramedic, Firefighter)
- NGO Official ID (Red Cross, FEMA, UN Organizations)
- Medical Professional License
- Certified Rescue/Relief Worker ID

INVALID DOCUMENTS:
- Student IDs (unless for medical students with clinical certification)
- Membership cards without photo verification
- Expired documents of any kind
- Screenshots or digital copies (must be photo of physical document)
- Documents with visible tampering

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "isVerified": true/false,
  "name": "Full Legal Name extracted from document",
  "documentType": "Type of document (e.g., 'Driver License', 'EMT Certificate', 'Red Cross ID')",
  "expiryStatus": "valid" | "expired" | "not_found",
  "isVolunteerAuthorized": true/false,
  "confidence_score": 0.0-1.0,
  "rejectionReason": "Explain why verification failed (only if isVerified is false)"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini Vision");
    }

    const verification = JSON.parse(jsonMatch[0]) as VolunteerVerificationResult;
    
    // Validate confidence score
    if (verification.confidence_score < 0 || verification.confidence_score > 1) {
      verification.confidence_score = Math.max(0, Math.min(1, verification.confidence_score));
    }
    
    // If document is expired, it cannot be verified for active duty
    if (verification.expiryStatus === 'expired') {
      verification.isVerified = false;
      verification.isVolunteerAuthorized = false;
      verification.rejectionReason = verification.rejectionReason || 'Document has expired - not valid for active volunteer duty';
    }

    return verification;
  } catch (error) {
    console.error("[v0] Document verification error:", error);
    return {
      isVerified: false,
      name: '',
      documentType: 'Unknown',
      expiryStatus: 'not_found',
      isVolunteerAuthorized: false,
      confidence_score: 0,
      rejectionReason: 'Failed to analyze document - please try again with a clearer image',
    };
  }
}

// ============ GEMINI CHATBOT ============

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Gemini-powered Disaster Assistant chatbot
 */
export async function sendChatMessage(
  message: string,
  chatHistory: ChatMessage[],
  userContext?: {
    location?: string;
    emergencyType?: string;
    description?: string;
  }
): Promise<string> {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return "I'm sorry, the AI assistant is not available right now. Please contact emergency services at 112 for immediate help.";
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      }
    });

    const contextInfo = userContext 
      ? `\n\nUser Context:\n- Location: ${userContext.location || 'Unknown'}\n- Emergency Type: ${userContext.emergencyType || 'General'}\n- Situation: ${userContext.description || 'Not specified'}`
      : '';

    const systemPrompt = `You are a Disaster Relief AI Assistant. Your role is to:
1. Provide safety advice during emergencies
2. Help victims understand what to do while waiting for rescue
3. Offer emotional support and reassurance
4. Guide users on first aid and survival basics
5. Help coordinate with emergency services

Be concise, calm, and helpful. Keep responses under 150 words.
If someone is in immediate danger, always advise them to call emergency services (112).${contextInfo}

Chat History:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${message}`;

    const result = await model.generateContent(systemPrompt);
    return result.response.text();
  } catch (error) {
    console.error("Chatbot error:", error);
    return "I apologize, but I'm having trouble responding right now. For immediate assistance, please call emergency services at 112.";
  }
}
