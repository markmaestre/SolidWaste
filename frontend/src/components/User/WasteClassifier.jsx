import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, Image, ActivityIndicator, Alert, Dimensions,
  ScrollView, Modal, TextInput, RefreshControl, Pressable,
  TouchableOpacity, StyleSheet, SafeAreaView, Platform,
  StatusBar, Linking,
} from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import * as Location   from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSelector, useDispatch } from "react-redux";
import {
  createWasteReport, checkBarangayRouting,
  clearError, clearSuccess, clearRouting,
} from "../../redux/slices/wasteReportSlice";
import {
  Ionicons, MaterialIcons, FontAwesome5,
  MaterialCommunityIcons, Entypo,
} from "@expo/vector-icons";


const { width: SW, height: SH } = Dimensions.get("window");

const API_BASE = "http://192.168.1.44:8000";
export const API_URL = `${API_BASE}/detect`;
export const WS_URL  = `${API_BASE.replace(/^http/, "ws")}/detect/live`;

// ── Google Gemini AI API (WORKING) ─────────────────────────────────────────────
const GEMINI_API_KEY = "AIzaSyBk0ku1O-xDhyx8ztpNalSsraQtK0J0QG0";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const MIN_FRAME_GAP_MS = 400;
const CAPTURE_SIZE     = { width: 640, height: 480 };
const BOX_DECAY        = 5;

const GOOGLE_PLACES_KEY = "YOUR_GOOGLE_PLACES_API_KEY";

// ── Barangay config with location mapping ─────────────────────────────────────
const BARANGAY_OPTIONS = [
  { key: "south_signal",   label: "South Signal, Taguig",   color: "#C62828", icon: "location", allowedTypes: ["Special Waste"], locationKeywords: ["south signal", "south", "signal"] },
  { key: "central_bicutan", label: "Central Bicutan, Taguig", color: "#1A6B9A", icon: "location", allowedTypes: null, locationKeywords: ["central bicutan", "central", "bicutan"] },
  { key: "tup_taguig",     label: "TUP Taguig",             color: "#558B2F", icon: "school",   allowedTypes: null, locationKeywords: ["tup", "western bicutan", "tup taguig"] },
];

const BARANGAY_MAP = Object.fromEntries(BARANGAY_OPTIONS.map((b) => [b.key, b]));

// ── Places config ─────────────────────────────────────────────────────────────
const PLACE_SEARCH_CONFIG = {
  "Recyclable":               { keyword: "recycling center",                         label: "Recycling Centers Nearby",      icon: "recycling", accentColor: "#2D7A4F", bgColor: "#E8F5EE", description: "Drop off recyclables at these nearby facilities" },
  "Special Waste":            { keyword: "e-waste drop off hazardous waste disposal", label: "Special Waste Drop-off Points", icon: "dangerous", accentColor: "#C62828", bgColor: "#FFEBEE", description: "Bring special/hazardous waste to certified drop-off points" },
  "Biodegradable":            { keyword: "composting facility organic waste",         label: "Composting Facilities Nearby",  icon: "eco",       accentColor: "#558B2F", bgColor: "#F1F8E9", description: "Compost your organic waste at these nearby facilities" },
  "Residual / Non-Recyclable":{ keyword: "waste disposal facility landfill",          label: "Waste Disposal Facilities",     icon: "delete",    accentColor: "#E65100", bgColor: "#FFF3E0", description: "Properly dispose of residual waste at these facilities" },
};

// ── LOCAL RECYCLING CENTERS DATABASE (Taguig) ─────────────────────────────────
const LOCAL_RECYCLING_CENTERS = {
  "Recyclable": [
    { name: "Alico Junk Shop", vicinity: "Upper Bicutan / Tagak, Taguig", rating: 4.5, open_now: true, types: ["recycling_center"], lat: 14.5272, lng: 121.0585 },
    { name: "Trivali Trading", vicinity: "Palar, Taguig", rating: 4.5, open_now: true, types: ["recycling_center"], lat: 14.5240, lng: 121.0590 },
    { name: "R-V Junk Shop", vicinity: "ML Quezon, Taguig", rating: 4.5, open_now: true, types: ["recycling_center"], lat: 14.5250, lng: 121.0600 },
    { name: "Fulo Junk Shop", vicinity: "C.P. Garcia, Taguig", rating: 4.0, open_now: true, types: ["recycling_center"], lat: 14.5260, lng: 121.0610 },
    { name: "C.F. Famini Junkshop", vicinity: "C.P. Garcia, Taguig", rating: 5.0, open_now: true, types: ["recycling_center"], lat: 14.5270, lng: 121.0620 },
    { name: "Olaso Junk Shop", vicinity: "Chino Roces Ext, Taguig", rating: 4.0, open_now: true, types: ["recycling_center"], lat: 14.5280, lng: 121.0630 },
    { name: "Otich Junk Shop", vicinity: "Challenger, Taguig", rating: 5.0, open_now: true, types: ["recycling_center"], lat: 14.5290, lng: 121.0640 },
    { name: "Junky Yard Junkshop", vicinity: "Earth Rd, Bicutan, Taguig", rating: 5.0, open_now: true, types: ["recycling_center"], lat: 14.5300, lng: 121.0650 },
    { name: "Paldo Junk Shop", vicinity: "Fort Bonifacio, Taguig", rating: 4.6, open_now: true, types: ["recycling_center"], lat: 14.5310, lng: 121.0660 },
    { name: "Fajie Junkshop", vicinity: "Vulcan St., Taguig", rating: 5.0, open_now: true, types: ["recycling_center"], lat: 14.5320, lng: 121.0670 },
    { name: "JOVE Junkshop", vicinity: "9th Ave, Taguig", rating: 5.0, open_now: true, types: ["recycling_center", "waste_management"], lat: 14.5330, lng: 121.0680 },
    { name: "Elsa's Junkshop", vicinity: "Central Signal, Taguig", rating: 5.0, open_now: true, types: ["scrap_metal_dealer"], lat: 14.5340, lng: 121.0690 },
    { name: "ABUYOG Junkshop", vicinity: "Earth Rd / San Juan, Taguig", rating: 5.0, open_now: true, types: ["recycling_center"], lat: 14.5350, lng: 121.0700 },
    { name: "Venus Junk Shop", vicinity: "Central Bicutan, Taguig", rating: 4.5, open_now: true, types: ["scrap_metal_dealer"], lat: 14.5360, lng: 121.0710 },
    { name: "Juarine Junkshop", vicinity: "C.P. Garcia, Taguig", rating: 4.5, open_now: true, types: ["recycling_center"], lat: 14.5370, lng: 121.0720 },
    { name: "Dodong Junk Shop", vicinity: "Lawin St., Taguig", rating: 5.0, open_now: true, types: ["recycling_center"], lat: 14.5380, lng: 121.0730 },
  ],
  "Special Waste": [
    { name: "E-Waste Dropoff Center", vicinity: "Taguig City Hall Complex", rating: 4.2, open_now: true, types: ["ewaste"], lat: 14.5400, lng: 121.0550 },
    { name: "Hazardous Waste Facility", vicinity: "Brgy. South Signal, Taguig", rating: 4.0, open_now: true, types: ["hazardous"], lat: 14.5450, lng: 121.0600 },
  ],
  "Biodegradable": [
    { name: "Taguig Composting Facility", vicinity: "Brgy. Central Bicutan", rating: 4.3, open_now: true, types: ["composting"], lat: 14.5500, lng: 121.0650 },
    { name: "Organic Waste Processing", vicinity: "Brgy. Tup Taguig", rating: 4.1, open_now: true, types: ["composting"], lat: 14.5550, lng: 121.0700 },
  ],
  "Residual / Non-Recyclable": [
    { name: "Taguig MRF", vicinity: "Brgy. Central Signal", rating: 4.0, open_now: true, types: ["mrf"], lat: 14.5600, lng: 121.0750 },
  ],
};

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  primary: "#1A4731", secondary: "#2D7A4F", accent: "#5BB87F", highlight: "#F5C842",
  cream: "#F9F5EE", cardBg: "#FFFFFF", textDark: "#0F2017", textMid: "#3D5A47",
  textLight: "#7A9988", border: "#E2EDE7",
  special: "#E05252", recyclable: "#2D7A4F", residual: "#D4820A", bio: "#7BB83A",
  southSignal: "#C62828", centralSignal: "#1A6B9A", tupTaguig: "#558B2F",
};

// ── Helper functions ─────────────────────────────────────────────────────────
const catColor = (cat) => ({
  "Special Waste": C.special,
  Recyclable: C.recyclable,
  "Residual / Non-Recyclable": C.residual,
  Biodegradable: C.bio,
}[cat] ?? C.accent);

const catIcon = (cat, size = 18) => {
  const p = { size, color: "white" };
  return {
    "Special Waste": <MaterialIcons name="dangerous" {...p} />,
    Recyclable: <MaterialIcons name="recycling" {...p} />,
    "Residual / Non-Recyclable": <MaterialIcons name="delete" {...p} />,
    Biodegradable: <MaterialIcons name="eco" {...p} />,
  }[cat] ?? <MaterialIcons name="help" {...p} />;
};

const matIcon = (label = "") => {
  const l = label.toLowerCase();
  if (l.includes("plastic") || l.includes("bottle")) return <MaterialCommunityIcons name="bottle-soda" size={15} color={C.textLight} />;
  if (l.includes("can"))                              return <FontAwesome5 name="cubes" size={15} color={C.textLight} />;
  if (l.includes("glass"))                            return <MaterialCommunityIcons name="glass-mug" size={15} color={C.textLight} />;
  if (l.includes("paper") || l.includes("carton"))   return <Entypo name="news" size={15} color={C.textLight} />;
  if (l.includes("cup"))                              return <MaterialCommunityIcons name="cup" size={15} color={C.textLight} />;
  return <MaterialIcons name="category" size={15} color={C.textLight} />;
};

const buildComposition = (dets) => {
  if (!dets.length) return { special_waste: 0, recyclable: 0, residual: 0, biodegradable: 0 };
  const c = { "Special Waste": 0, Recyclable: 0, "Residual / Non-Recyclable": 0, Biodegradable: 0 };
  dets.forEach((d) => { if (c[d.type] !== undefined) c[d.type]++; });
  const t = dets.length;
  return {
    special_waste: Math.round(c["Special Waste"] / t * 100),
    recyclable:    Math.round(c.Recyclable / t * 100),
    residual:      Math.round(c["Residual / Non-Recyclable"] / t * 100),
    biodegradable: Math.round(c.Biodegradable / t * 100),
  };
};

const buildOverallCat  = (d) => {
  if (!d.length) return "Unknown";
  const c = {};
  d.forEach((x) => { c[x.type] = (c[x.type] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
};

const buildOverallConf = (d) =>
  d.length ? Math.round(d.reduce((s, x) => s + x.confidence, 0) / d.length * 100) : 0;

const buildTips = (dets) => {
  const tips = [];
  const labels = [...new Set(dets.map((d) => d.label.toLowerCase()))];
  if (labels.some((l) => ["bottle", "plastic bottle", "plastic"].includes(l))) tips.push("Rinse plastic bottles and remove caps before recycling");
  if (labels.includes("can"))                                                   tips.push("Rinse cans and crush them to save space");
  if (labels.some((l) => ["glass bottle", "glass"].includes(l)))               tips.push("Glass bottles can be recycled endlessly — rinse before placing in the bin");
  if (labels.some((l) => ["paper", "carton"].includes(l)))                     tips.push("Flatten paper and cartons to save bin space");
  if (labels.some((l) => ["battery", "bulb"].includes(l)))                     tips.push("Special waste — bring to a certified e-waste drop-off point");
  if (labels.includes("cup"))                                                   tips.push("Styrofoam cups are typically non-recyclable — dispose in general waste");
  if (labels.includes("organic"))                                               tips.push("Organic waste can be composted instead of landfilled");
  return tips.length ? tips : ["Follow your local waste-sorting guidelines."];
};

// Calculate distance between two coordinates (in km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Detect barangay from address with better matching
function detectBarangayClient(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  
  for (const barangay of BARANGAY_OPTIONS) {
    for (const keyword of barangay.locationKeywords) {
      if (lower.includes(keyword)) {
        return barangay.key;
      }
    }
  }
  return null;
}

// Get allowed barangays based on user's location
function getAllowedBarangays(userAddress, detectedBarangay = null) {
  const detected = detectBarangayClient(userAddress) || detectedBarangay;
  
  if (detected) {
    const barangayInfo = BARANGAY_MAP[detected];
    if (barangayInfo) {
      return {
        allowed: [detected],
        detected: detected,
        multipleAllowed: false,
        message: `Based on your address (${barangayInfo.label}), you can only report to this barangay.`
      };
    }
  }
  
  return {
    allowed: BARANGAY_OPTIONS.map(b => b.key),
    detected: null,
    multipleAllowed: true,
    message: null
  };
}

// ── Gemini AI Helper Function with improved prompt for complete tips ─────────
async function callGeminiAPI(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.warn("TMFK API key not configured");
    return "T.M.F.K Waste Assistant is currently unavailable. Please check your API configuration.";
  }
  
  try {
    console.log("Calling TMFK API with prompt length:", prompt.length);
    
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.95,
          topK: 40,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("TMFK API Error Details:", response.status, errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("TMKF Response received");
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error("No text in response:", data);
      throw new Error("No response text from TMFK");
    }
    
    return text;
  } catch (error) {
    console.error("TMFK call failed:", error);
    return "Unable to connect to T.M.F.K Waste Assistant. Please check your internet connection and try again.";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  useStableDetections — ghost / decay system
// ─────────────────────────────────────────────────────────────────────────────
function useStableDetections() {
  const ghosts = useRef({});
  const [stable, setStable] = useState([]);

  const update = useCallback((incoming) => {
    const next = {};
    incoming.forEach((det, i) => { next[`${det.label}-${i}`] = { det, ttl: BOX_DECAY }; });
    Object.entries(ghosts.current).forEach(([key, entry]) => {
      if (!next[key]) {
        const ttl = entry.ttl - 1;
        if (ttl > 0) next[key] = { det: entry.det, ttl };
      }
    });
    ghosts.current = next;
    const list = Object.values(next).map((e) => e.det);
    setStable((prev) => {
      if (prev.length !== list.length) return list;
      const same = prev.every((p, i) => {
        const n = list[i];
        return n && p.label === n.label && p.type === n.type &&
          Math.abs((p.box.x1 + p.box.x2) - (n.box.x1 + n.box.x2)) < 8 &&
          Math.abs((p.box.y1 + p.box.y2) - (n.box.y1 + n.box.y2)) < 8;
      });
      return same ? prev : list;
    });
  }, []);

  return [stable, update];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const LiveOverlay = React.memo(({ detections, scaleX, scaleY }) => (
  <Svg style={StyleSheet.absoluteFill} width={SW} height={SH} pointerEvents="none">
    {detections.map((det, i) => {
      const { x1, y1, x2, y2 } = det.box;
      const sx = x1 * scaleX, sy = y1 * scaleY;
      const sw = (x2 - x1) * scaleX, sh = (y2 - y1) * scaleY;
      const col  = catColor(det.type);
      const conf = Math.round(det.confidence * 100);
      const lbl  = `${det.label} ${conf}%`;
      const lw   = lbl.length * 7.4 + 12;
      return (
        <React.Fragment key={`${det.label}-${i}`}>
          <Rect x={sx} y={sy} width={sw} height={sh} stroke={col} strokeWidth={2.5} fill={col + "22"} rx={6} />
          <Rect x={sx} y={sy - 24} width={lw} height={24} fill={col} rx={5} />
          <SvgText x={sx + 6} y={sy - 7} fontSize={11} fontWeight="bold" fill="white">{lbl}</SvgText>
        </React.Fragment>
      );
    })}
  </Svg>
), (prev, next) => {
  if (prev.detections.length !== next.detections.length) return false;
  if (prev.scaleX !== next.scaleX || prev.scaleY !== next.scaleY) return false;
  return prev.detections.every((p, i) => {
    const n = next.detections[i];
    return n && p.label === n.label &&
      Math.abs(p.box.x1 - n.box.x1) < 3 && Math.abs(p.box.y1 - n.box.y1) < 3 &&
      Math.abs(p.box.x2 - n.box.x2) < 3 && Math.abs(p.box.y2 - n.box.y2) < 3;
  });
});

const LiveChips = React.memo(({ detections }) => {
  if (!detections.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.liveChipScroll}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexDirection: "row" }}>
      {detections.map((d, i) => (
        <View key={i} style={[S.liveChip, { backgroundColor: catColor(d.type) }]}>
          {catIcon(d.type)}
          <Text style={S.liveChipText}>{d.label}  {Math.round(d.confidence * 100)}%</Text>
        </View>
      ))}
    </ScrollView>
  );
});

const LiveStatus = React.memo(({ connected, count, ms }) => (
  <View style={S.liveTitleWrap}>
    <View style={[S.livePulse, { backgroundColor: connected ? C.accent : C.special }]} />
    <Text style={S.liveTitleText}>
      {connected ? (count > 0 ? `${count} object${count > 1 ? "s" : ""} detected` : "Scanning…") : "Connecting…"}
    </Text>
    {ms != null && <Text style={S.liveMsText}>{ms}ms</Text>}
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
//  IMPROVED TMFKWasteAssistant Panel with complete, non-truncated tips
// ─────────────────────────────────────────────────────────────────────────────
const TMFKWasteAssistant = ({ detections, overallCat, manualLoc }) => {
  const unique = [...new Map(detections.map((d) => [d.label, d])).values()];

  const [activeIdx, setActiveIdx] = useState(0);
  const [tips, setTips] = useState({});
  const [tipsLoad, setTipsLoad] = useState({});
  const [userQ, setUserQ] = useState("");
  const [askLoad, setAskLoad] = useState(false);
  const [askAnswer, setAskAnswer] = useState("");
  const [panelMode, setPanelMode] = useState("tips");

  const fetchTipsForItem = useCallback(async (det) => {
    if (!det || tips[det.label] || tipsLoad[det.label]) return;
    setTipsLoad((p) => ({ ...p, [det.label]: true }));
    try {
      // Improved prompt to ensure complete, non-truncated responses
      const prompt = `You are T.M.F.K Waste Assistant, a waste management expert for the Philippines.
A user scanned their trash and detected: "${det.label}" (waste category: ${det.type}).
Overall scan category: ${overallCat}.
${manualLoc ? `User location: ${manualLoc}.` : ""}

IMPORTANT INSTRUCTIONS:
1. Give 5 complete, detailed cleanup and safe disposal steps for "${det.label}" in the Philippine context.
2. Each step MUST be a complete sentence (15-25 words each).
3. DO NOT cut off or truncate any sentence - write each step fully.
4. Use proper punctuation and capitalization.
5. Mention local programs, junk shops, SM/Robinsons drop-off, or barangay MRF where relevant.
6. Format each step on a new line starting with the number and a period.
7. Example format:
1. This is a complete sentence about the first step.
2. This is another complete sentence about the second step.
3. This is a complete sentence about the third step.
4. This is a complete sentence about the fourth step.
5. This is a complete sentence about the fifth step.

Write the 5 steps now:`;

      const text = await callGeminiAPI(prompt);
      
      // Clean and validate the response
      let cleanedText = text || "No tips available.";
      
      // Ensure we have at least 5 steps or add fallback
      const stepCount = (cleanedText.match(/\d+\./g) || []).length;
      if (stepCount < 3) {
        cleanedText = `1. Rinse the ${det.label} thoroughly with water to remove any residue.
2. Separate ${det.label} from other waste materials for proper disposal.
3. Check with your local barangay for specific ${det.type} collection schedules.
4. Consider reusing ${det.label} if possible before disposal.
5. Bring ${det.label} to the nearest designated drop-off point in ${manualLoc || "your area"}.`;
      }
      
      setTips((p) => ({ ...p, [det.label]: cleanedText }));
    } catch (error) {
      console.warn("TMFK error:", error);
      // Provide comprehensive fallback tips
      setTips((p) => ({ 
        ...p, 
        [det.label]: `1. Clean the ${det.label} thoroughly to remove any dirt or residue before disposal.
2. Separate ${det.label} from other waste types to ensure proper recycling or disposal.
3. Check if your local barangay has special collection schedules for ${det.type} waste.
4. Consider reducing waste by reusing ${det.label} if it's still in good condition.
5. Bring ${det.label} to the nearest proper disposal facility or recycling center.` 
      }));
    } finally {
      setTipsLoad((p) => ({ ...p, [det.label]: false }));
    }
  }, [tips, tipsLoad, overallCat, manualLoc]);

  useEffect(() => {
    if (unique[activeIdx]) fetchTipsForItem(unique[activeIdx]);
  }, [activeIdx, detections]);

  const handleAsk = async () => {
    const q = userQ.trim();
    if (!q) return;
    setAskLoad(true);
    setAskAnswer("");
    const itemList = unique.map((d) => `${d.label} (${d.type})`).join(", ");
    try {
      const prompt = `You are T.M.F.K Waste Assistant, a waste management expert for the Philippines.
Detected waste items in the user's scan: ${itemList}.
${manualLoc ? `User location: ${manualLoc}.` : ""}
User question: "${q}"
Answer in 3-5 complete, detailed sentences. Use Philippine context. Do not truncate or cut off.`;

      const answer = await callGeminiAPI(prompt);
      setAskAnswer(answer || "Sorry, no answer available.");
    } catch (error) {
      console.warn("TMFK error:", error);
      setAskAnswer("Error reaching T.M.F.K Waste Assistant. Please check your internet connection and try again.");
    } finally {
      setAskLoad(false);
    }
  };

  if (!unique.length) return null;

  const current = unique[activeIdx] ?? unique[0];
  const currentTips = tips[current.label] || "";
  const isLoading = !!tipsLoad[current.label];

  // Parse tips - ensure we capture complete lines
  const tipLines = currentTips
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => {
      // Match lines that start with a number and period
      return /^\d+\./.test(line) && line.length > 5;
    })
    .map(line => {
      // Remove the number and period, clean up
      let cleaned = line.replace(/^\d+\.\s*/, "");
      // Ensure the line ends with proper punctuation
      if (!cleaned.match(/[.!?]$/)) {
        cleaned = cleaned + ".";
      }
      return cleaned;
    })
    .filter(line => line.length > 0);

  return (
    <View style={S.aiPanel}>
      <View style={S.aiHeader}>
        <View style={S.aiAvatarWrap}>
          <MaterialIcons name="psychology" size={20} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={S.aiTitle}>T.M.F.K Waste Assistant</Text>
          </View>
          <Text style={S.aiSubtitle}>Personalized cleanup & disposal guide</Text>
        </View>
      </View>

      <View style={S.aiModeRow}>
        <Pressable
          style={[S.aiModeBtn, panelMode === "tips" && S.aiModeBtnActive]}
          onPress={() => setPanelMode("tips")}
        >
          <MaterialIcons name="lightbulb" size={14} color={panelMode === "tips" ? "white" : "rgba(255,255,255,0.55)"} />
          <Text style={[S.aiModeBtnTxt, panelMode === "tips" && { color: "white" }]}>Tips per item</Text>
        </Pressable>
        <Pressable
          style={[S.aiModeBtn, panelMode === "ask" && S.aiModeBtnActive]}
          onPress={() => setPanelMode("ask")}
        >
          <MaterialIcons name="chat" size={14} color={panelMode === "ask" ? "white" : "rgba(255,255,255,0.55)"} />
          <Text style={[S.aiModeBtnTxt, panelMode === "ask" && { color: "white" }]}>Ask AI</Text>
        </Pressable>
      </View>

      {panelMode === "tips" && (
        <>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{ flexDirection: "row", gap: 8, paddingHorizontal: 0 }}
          >
            {unique.map((det, i) => (
              <Pressable
                key={det.label}
                style={[
                  S.aiTab,
                  i === activeIdx
                    ? { backgroundColor: catColor(det.type), borderColor: catColor(det.type) }
                    : { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" },
                ]}
                onPress={() => setActiveIdx(i)}
              >
                <Text style={[S.aiTabTxt, i === activeIdx ? { color: "white" } : { color: "rgba(255,255,255,0.65)" }]}>
                  {det.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[S.aiCatBadge, { backgroundColor: catColor(current.type) + "33", borderColor: catColor(current.type) + "66" }]}>
            {catIcon(current.type, 13)}
            <Text style={[S.aiCatBadgeTxt, { color: catColor(current.type) }]}>{current.type}</Text>
            <Text style={S.aiCatBadgeSep}>•</Text>
            <Text style={[S.aiCatBadgeTxt, { color: "rgba(255,255,255,0.75)" }]}>
              {Math.round(current.confidence * 100)}% confidence
            </Text>
          </View>

          <View style={S.aiTipsContainer}>
            {isLoading ? (
              <View style={S.aiLoadingRow}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                <Text style={S.aiLoadingTxt}>Getting AI tips for {current.label}…</Text>
              </View>
            ) : tipLines.length > 0 ? (
              <ScrollView 
                style={S.aiTipsScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={S.aiTipsContent}
              >
                {tipLines.map((tip, i) => (
                  <View key={i} style={S.aiTipRow}>
                    <View style={S.aiTipNum}>
                      <Text style={S.aiTipNumTxt}>{i + 1}</Text>
                    </View>
                    <Text style={S.aiTipTxt}>{tip}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : currentTips && currentTips.length > 0 ? (
              <ScrollView 
                style={S.aiTipsScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={S.aiTipsContent}
              >
                <Text style={S.aiTipTxt}>{currentTips}</Text>
              </ScrollView>
            ) : (
              <View style={S.aiLoadingRow}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                <Text style={S.aiLoadingTxt}>Preparing tips...</Text>
              </View>
            )}
          </View>
        </>
      )}

      {panelMode === "ask" && (
        <View>
          <Text style={S.aiAskHint}>
            Ask anything about your scanned items — disposal, recycling, safety, or nearby drop-offs.
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10 }}
            contentContainerStyle={{ flexDirection: "row", gap: 8 }}
          >
            {[
              `How do I safely dispose ${unique[0]?.label ?? "this item"}?`,
              "Where's the nearest junk shop?",
              "Is any of this worth selling?",
              "Can I compost the organic waste?",
            ].map((q) => (
              <Pressable key={q} style={S.aiSuggestChip} onPress={() => setUserQ(q)}>
                <Text style={S.aiSuggestChipTxt} numberOfLines={1}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={S.aiAskRow}>
            <TextInput
              style={S.aiAskInput}
              placeholder="Type your question…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={userQ}
              onChangeText={setUserQ}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleAsk}
            />
            <Pressable style={S.aiAskSendBtn} onPress={handleAsk} disabled={askLoad}>
              {askLoad
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="send" size={18} color="white" />
              }
            </Pressable>
          </View>

          {askLoad && (
            <View style={S.aiLoadingRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              <Text style={S.aiLoadingTxt}>T.M.F.K is thinking…</Text>
            </View>
          )}

          {!!askAnswer && !askLoad && (
            <View style={S.aiAnswerBox}>
              <View style={S.aiAnswerHeader}>
                <MaterialIcons name="psychology" size={14} color={C.highlight} />
                <Text style={S.aiAnswerHeaderTxt}>T.M.F.K Answer</Text>
              </View>
              <ScrollView style={{ maxHeight: 200 }}>
                <Text style={S.aiAnswerTxt}>{askAnswer}</Text>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  BarangaySelector with location-based filtering
// ─────────────────────────────────────────────────────────────────────────────
const BarangaySelector = ({ selected, onSelect, classification, disabled, allowedBarangays, locationMessage }) => {
  return (
    <View style={S.barangaySelector}>
      <View style={S.secHeader}>
        <View style={[S.secIconBg, { backgroundColor: "#E8F0FE" }]}>
          <Ionicons name="navigate" size={16} color="#1A6B9A" />
        </View>
        <Text style={S.secTitle}>Assigned Drop-off Barangay</Text>
      </View>
      
      {locationMessage && (
        <View style={S.locationInfoBanner}>
          <Ionicons name="location-outline" size={14} color="#1A6B9A" />
          <Text style={S.locationInfoText}>{locationMessage}</Text>
        </View>
      )}
      
      {allowedBarangays.length === 1 && (
        <View style={S.singleOptionBanner}>
          <Ionicons name="information-circle" size={14} color="#2D7A4F" />
          <Text style={S.singleOptionText}>
            Based on your location, you can only report to this barangay.
          </Text>
        </View>
      )}
      
      <Text style={S.barangayHint}>
        Select where to send your waste report
      </Text>
      
      {BARANGAY_OPTIONS.map((opt) => {
        const isAllowed = allowedBarangays.includes(opt.key);
        const isSouthSignal = opt.key === "south_signal";
        const restricted = isSouthSignal && classification && classification !== "Special Waste";
        const isSelected = selected === opt.key;
        const isDisabled = disabled || !isAllowed || restricted;
        
        let disabledReason = "";
        if (!isAllowed) disabledReason = "Not available for your location";
        else if (restricted) disabledReason = `Only accepts Special Waste (detected: ${classification})`;
        
        return (
          <Pressable
            key={opt.key}
            style={[
              S.barangayOption,
              isSelected && { borderColor: opt.color, backgroundColor: opt.color + "12" },
              isDisabled && S.barangayOptionDisabled,
            ]}
            onPress={() => !isDisabled && onSelect(opt.key)}
            disabled={isDisabled}
          >
            <View style={[S.barangayOptionDot, { backgroundColor: isSelected ? opt.color : C.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={[S.barangayOptionLabel, isSelected && { color: opt.color, fontWeight: "700" }]}>
                {opt.label}
              </Text>
              {disabledReason ? (
                <Text style={S.barangayOptionDisabledText}>
                  ⚠ {disabledReason}
                </Text>
              ) : isSouthSignal && (
                <Text style={[S.barangayOptionSub, { color: opt.color }]}>
                  Accepts Special Waste only
                </Text>
              )}
            </View>
            {isSelected && <Ionicons name="checkmark-circle" size={20} color={opt.color} />}
            {!isAllowed && !isSelected && (
              <Ionicons name="lock-closed" size={16} color={C.textLight} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
const WasteDetection = ({ navigation }) => {
  const [imageUri,       setImageUri]       = useState(null);
  const [imageFile,      setImageFile]      = useState(null);
  const [imageBase64,    setImageBase64]    = useState(null);
  const [imageNatSize,   setImageNatSize]   = useState({ width: 1, height: 1 });
  const [displaySize,    setDisplaySize]    = useState({ width: 0, height: 0 });
  const [detections,     setDetections]     = useState([]);
  const [overallCat,     setOverallCat]     = useState(null);
  const [overallConf,    setOverallConf]    = useState(0);
  const [wasteComp,      setWasteComp]      = useState({ special_waste: 0, recyclable: 0, residual: 0, biodegradable: 0 });
  const [tips,           setTips]           = useState([]);
  const [deviceUsed,     setDeviceUsed]     = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [detDone,        setDetDone]        = useState(false);
  const [showBoxes,      setShowBoxes]      = useState(true);
  const [fullImgVis,     setFullImgVis]     = useState(false);
  const [reportVis,      setReportVis]      = useState(false);
  const [userMsg,        setUserMsg]        = useState("");
  const [refreshing,     setRefreshing]     = useState(false);
  const [usingDemo,      setUsingDemo]      = useState(false);
  const [activeCropMode, setActiveCropMode] = useState(null);
  const [lastSource,     setLastSource]     = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [barangayError,    setBarangayError]    = useState(null);
  const [location,     setLocation]     = useState(null);
  const [manualLoc,    setManualLoc]    = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [placesLoad,   setPlacesLoad]   = useState(false);
  const [placesErr,    setPlacesErr]    = useState(null);
  const [useLocalPlaces, setUseLocalPlaces] = useState(true);
  const [liveMode,    setLiveMode]    = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveFrameMs, setLiveFrameMs] = useState(null);
  const [liveFacing,  setLiveFacing]  = useState("back");
  const [captPerm,    reqCaptPerm]    = useCameraPermissions();
  
  const [allowedBarangays, setAllowedBarangays] = useState(BARANGAY_OPTIONS.map(b => b.key));
  const [locationMessage, setLocationMessage] = useState(null);

  const [liveDetections, updateLiveDetections] = useStableDetections();
  const rawDetRef = useRef([]);
  const wsRef       = useRef(null);
  const cameraRef   = useRef(null);
  const liveImgW    = useRef(CAPTURE_SIZE.width);
  const liveImgH    = useRef(CAPTURE_SIZE.height);
  const liveRunning = useRef(false);
  const capturing   = useRef(false);

  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { loading: repLoading, success, error, currentReport, operation, routing } = useSelector((s) => s.wasteReport);

  useEffect(() => {
    dispatch(clearError());
    dispatch(clearSuccess());
    dispatch(clearRouting());
    getLocation();
    return () => stopLive();
  }, []);

  useEffect(() => {
    if (error) {
      const msg = error.reason || error.error || error.details || "Unexpected error";
      Alert.alert("Error", msg, [{ text: "OK", onPress: () => dispatch(clearError()) }]);
    }
  }, [error]);

  useEffect(() => {
    if (success && operation === "create" && currentReport) {
      const brLabel = currentReport.assignedBarangayLabel || routing?.barangayLabel || "the assigned area";
      Alert.alert(
        "Report Saved!",
        `Your waste analysis has been sent to ${brLabel}.`,
        [
          { text: "View History", onPress: () => { navigation.navigate("ReportHistory"); resetForm(); } },
          { text: "New Scan", onPress: resetForm },
        ]
      );
    }
  }, [success, operation, currentReport]);

  useEffect(() => {
    if (routing?.barangay && !selectedBarangay) setSelectedBarangay(routing.barangay);
    if (routing && !routing.valid) setBarangayError(routing.reason);
    else setBarangayError(null);
  }, [routing]);

  useEffect(() => {
    if (manualLoc) {
      const { allowed, detected, multipleAllowed, message } = getAllowedBarangays(manualLoc);
      setAllowedBarangays(allowed);
      setLocationMessage(message);
      
      if (detected && !selectedBarangay) {
        setSelectedBarangay(detected);
      } else if (!detected && multipleAllowed && !selectedBarangay) {
        setSelectedBarangay(allowed[0]);
      }
    }
  }, [manualLoc]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(coords);
      const addr = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
      if (addr[0]) {
        const addrStr = [addr[0].street, addr[0].city, addr[0].region, addr[0].country].filter(Boolean).join(", ");
        setManualLoc(addrStr);
      }
    } catch (e) { console.warn("Location:", e); }
  };

  const fetchNearbyPlaces = async (cat, coords) => {
    const cfg = PLACE_SEARCH_CONFIG[cat];
    if (!cfg) return;
    try {
      setPlacesLoad(true); setPlacesErr(null); setNearbyPlaces([]);
      if (useLocalPlaces && cat === "Recyclable" && LOCAL_RECYCLING_CENTERS[cat]) {
        let places = [...LOCAL_RECYCLING_CENTERS[cat]];
        if (coords && coords.lat && coords.lng) {
          places = places.map(place => ({
            ...place,
            distance: getDistance(coords.lat, coords.lng, place.lat, place.lng)
          })).sort((a, b) => a.distance - b.distance);
        }
        const formattedPlaces = places.slice(0, 8).map(place => ({
          place_id: place.name.replace(/\s/g, '_'),
          name: place.name,
          vicinity: place.vicinity,
          rating: place.rating,
          opening_hours: { open_now: place.open_now },
          geometry: { location: { lat: place.lat, lng: place.lng } },
          distance: place.distance,
          is_local: true
        }));
        setNearbyPlaces(formattedPlaces);
        setPlacesLoad(false);
        return;
      }
      if (!GOOGLE_PLACES_KEY || GOOGLE_PLACES_KEY === "YOUR_GOOGLE_PLACES_API_KEY") {
        setPlacesErr("Please configure Google Places API key or use local database");
        setPlacesLoad(false);
        return;
      }
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=5000&keyword=${encodeURIComponent(cfg.keyword)}&key=${GOOGLE_PLACES_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" || data.status === "ZERO_RESULTS") setNearbyPlaces(data.results?.slice(0, 5) ?? []);
      else setPlacesErr("Could not load nearby places.");
    } catch (err) {
      console.warn("Places fetch error:", err);
      setPlacesErr("Network error fetching places.");
    } finally { setPlacesLoad(false); }
  };

  useEffect(() => {
    if (detDone && overallCat && location) fetchNearbyPlaces(overallCat, location);
  }, [detDone, overallCat, location]);

  const validateBarangay = useCallback((barangay, classification) => {
    if (!allowedBarangays.includes(barangay)) {
      return `This barangay is not available for your location. Please select from the available options.`;
    }
    
    if (barangay === "south_signal" && classification !== "Special Waste") {
      return `South Signal only accepts Special Waste. Your waste is classified as "${classification}". Please choose a different drop-off location.`;
    }
    return null;
  }, [allowedBarangays]);

  const handleBarangaySelect = (key) => {
    const err = validateBarangay(key, overallCat);
    setSelectedBarangay(key);
    setBarangayError(err);
  };

  const resetForm = () => {
    stopLive();
    setImageUri(null); setImageFile(null); setImageBase64(null);
    setDetections([]); setOverallCat(null); setOverallConf(0);
    setWasteComp({ special_waste: 0, recyclable: 0, residual: 0, biodegradable: 0 });
    setTips([]); setDeviceUsed(null); setDetDone(false); setShowBoxes(true);
    setFullImgVis(false); setReportVis(false); setUserMsg(""); setUsingDemo(false);
    setImageNatSize({ width: 1, height: 1 }); setDisplaySize({ width: 0, height: 0 });
    setLiveFrameMs(null); setNearbyPlaces([]); setPlacesLoad(false); setPlacesErr(null);
    setSelectedBarangay(null); setBarangayError(null);
    setActiveCropMode(null); setLastSource(null);
    const { allowed, detected } = getAllowedBarangays(manualLoc);
    setAllowedBarangays(allowed);
    if (detected) setSelectedBarangay(detected);
    dispatch(clearSuccess()); dispatch(clearError()); dispatch(clearRouting());
  };

  const pickImage = async (fromCamera) => {
    setLastSource(fromCamera ? "camera" : "gallery");
    try {
      const { status } = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert((fromCamera ? "Camera" : "Storage") + " Permission Denied", "Enable access in Settings.");
        return;
      }
    } catch (e) { Alert.alert("Permission Error", e?.message ?? String(e)); return; }

    try {
      const opts = { mediaTypes: "images", quality: 0.85, base64: true, allowsEditing: true };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res || res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      let mime = asset.mimeType || "image/jpeg";
      if (["image/jpg", "image/heic", "image/heif"].includes(mime)) mime = "image/jpeg";
      if (!mime.startsWith("image/")) mime = "image/jpeg";
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime] ?? "jpg";
      setImageUri(asset.uri);
      setImageFile({ uri: asset.uri, name: `waste_${Date.now()}.${ext}`, type: mime });
      setImageBase64(asset.base64 ? `data:${mime};base64,${asset.base64}` : null);
      setActiveCropMode("free");
      setDetections([]); setDetDone(false); setUsingDemo(false);
      dispatch(clearError());
    } catch (e) { Alert.alert("Picker Error", e?.message ?? String(e)); }
  };

  const reCrop = () => pickImage(lastSource === "camera");

  const handleDetect = async () => {
    if (!imageFile) { Alert.alert("No Image", "Please select or capture an image first."); return; }
    try {
      setLoading(true); setDetDone(false); dispatch(clearError());
      const form = new FormData();
      form.append("file", imageFile);
      const res  = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const dets = data.detections || [];
      const cat  = buildOverallCat(dets);
      setDetections(dets); setDeviceUsed(data.device_used || null);
      setOverallCat(cat); setOverallConf(buildOverallConf(dets));
      setWasteComp(buildComposition(dets)); setTips(buildTips(dets)); setDetDone(true);
      
      const { allowed, detected } = getAllowedBarangays(manualLoc);
      setAllowedBarangays(allowed);
      const brKey = detected || allowed[0] || "central_bicutan";
      setSelectedBarangay(brKey);
      setBarangayError(validateBarangay(brKey, cat));
      
      Alert.alert("Analysis Complete!", `Detected ${data.total_detected} object(s).\nOverall: ${cat}`, [
        { text: "Save Report", onPress: () => setReportVis(true) },
        { text: "Skip", style: "cancel" },
      ]);
    } catch (err) {
      Alert.alert("Analysis Failed", err.message || "Unknown error", [
        { text: "Use Demo Mode", onPress: loadDemo },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally { setLoading(false); }
  };

  const loadDemo = () => {
    const demo = [
      { type: "Special Waste", label: "Battery", confidence: 0.912, box: { x1: 40, y1: 40, x2: 160, y2: 140 } },
      { type: "Recyclable", label: "Plastic Bottle", confidence: 0.855, box: { x1: 180, y1: 40, x2: 300, y2: 200 } },
      { type: "Recyclable", label: "Can", confidence: 0.923, box: { x1: 60, y1: 160, x2: 180, y2: 280 } },
      { type: "Biodegradable", label: "Organic", confidence: 0.787, box: { x1: 200, y1: 200, x2: 340, y2: 320 } },
      { type: "Residual / Non-Recyclable", label: "Cup", confidence: 0.821, box: { x1: 240, y1: 60, x2: 360, y2: 180 } },
    ];
    const cat = buildOverallCat(demo);
    setDetections(demo); setOverallCat(cat); setOverallConf(buildOverallConf(demo));
    setWasteComp(buildComposition(demo)); setTips(buildTips(demo)); setDetDone(true); setUsingDemo(true);
    if (!imageUri) setImageUri("https://via.placeholder.com/400x300/2D7A4F/FFFFFF?text=Demo");
    
    const { allowed, detected } = getAllowedBarangays(manualLoc);
    setAllowedBarangays(allowed);
    const brKey = detected || allowed[0] || "central_bicutan";
    setSelectedBarangay(brKey);
    setBarangayError(validateBarangay(brKey, cat));
    
    Alert.alert("Demo Mode", "Showing sample detection results.");
  };

  const handleSaveReport = () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to save reports.", [
        { text: "Login", onPress: () => navigation.navigate("Login") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    const brErr = validateBarangay(selectedBarangay, overallCat);
    if (brErr) {
      setBarangayError(brErr);
      Alert.alert("Cannot Submit Report", brErr);
      return;
    }
    
    const transformedDetectedObjects = detections.map((d) => ({
      label: d.label,
      confidence: Math.round(d.confidence * 100),
      category: d.type,
      box: [d.box.x1 / imageNatSize.width, d.box.y1 / imageNatSize.height, d.box.x2 / imageNatSize.width, d.box.y2 / imageNatSize.height],
    }));

    dispatch(createWasteReport({
      image: imageBase64 || imageUri || "",
      detected_objects: transformedDetectedObjects,
      classification: overallCat,
      classification_confidence: overallConf,
      waste_composition: wasteComp,
      recycling_tips: tips,
      location: {
        address: manualLoc || "Not specified",
        coordinates: location,
        timestamp: new Date().toISOString()
      },
      barangay_override: selectedBarangay,
      scan_date: new Date().toISOString(),
      user_message: userMsg,
      user_email: user.email,
      is_demo: usingDemo,
      device_used: deviceUsed,
    }));
    setReportVis(false);
  };

  const openWS = useCallback(() => {
    if (wsRef.current) return;
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => setWsConnected(true);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.ping || data.error) return;
        if (data.image_width > 0) liveImgW.current = data.image_width;
        if (data.image_height > 0) liveImgH.current = data.image_height;
        rawDetRef.current = data.detections || [];
        updateLiveDetections(rawDetRef.current);
        if (data.frame_ms != null) setLiveFrameMs((p) => p === data.frame_ms ? p : data.frame_ms);
        if (data.device_used) setDeviceUsed((p) => p === data.device_used ? p : data.device_used);
      } catch {}
    };
    ws.onerror = () => setWsConnected(false);
    ws.onclose = () => { setWsConnected(false); wsRef.current = null; };
    wsRef.current = ws;
  }, [updateLiveDetections]);

  const closeWS = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null; setWsConnected(false);
  }, []);

  const captureLoop = useCallback(async () => {
    while (liveRunning.current) {
      if (!cameraRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      if (capturing.current) { await new Promise((r) => setTimeout(r, 20)); continue; }
      const t0 = Date.now();
      capturing.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2, base64: true, skipProcessing: true });
        if (photo?.base64 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ frame: photo.base64 }));
        }
      } catch (err) {
        if (!err?.message?.includes("already")) console.warn("[Live]", err?.message);
      } finally {
        capturing.current = false;
      }
      const wait = Math.max(0, MIN_FRAME_GAP_MS - (Date.now() - t0));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  }, []);

  const startLive = useCallback(async () => {
    if (!captPerm?.granted) {
      const res = await reqCaptPerm();
      if (!res.granted) { Alert.alert("Camera Required", "Enable camera access to use Live Mode."); return; }
    }
    liveRunning.current = true;
    capturing.current = false;
    setLiveMode(true); setLiveFrameMs(null);
    updateLiveDetections([]);
    openWS();
    captureLoop();
  }, [captPerm, openWS, captureLoop, updateLiveDetections]);

  const stopLive = useCallback(() => {
    liveRunning.current = false;
    capturing.current = false;
    closeWS();
    setLiveMode(false); setLiveFrameMs(null);
  }, [closeWS]);

  const captureLiveSnapshot = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: true });
      const snap = rawDetRef.current;
      const cat = buildOverallCat(snap);
      setImageUri(photo.uri);
      setImageFile({ uri: photo.uri, name: `live_${Date.now()}.jpg`, type: "image/jpeg" });
      setImageBase64(photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : null);
      setDetections(snap); setOverallCat(cat); setOverallConf(buildOverallConf(snap));
      setWasteComp(buildComposition(snap)); setTips(buildTips(snap)); setDetDone(true);
      
      const { allowed, detected } = getAllowedBarangays(manualLoc);
      setAllowedBarangays(allowed);
      const brKey = detected || allowed[0] || "central_bicutan";
      setSelectedBarangay(brKey);
      setBarangayError(validateBarangay(brKey, cat));
      
      stopLive(); setReportVis(true);
    } catch (err) { Alert.alert("Snapshot Error", err.message); }
  }, [stopLive, manualLoc, validateBarangay]);

  const renderBoxes = () => {
    if (!detections.length || displaySize.width === 0 || !showBoxes) return null;
    const sx = displaySize.width / imageNatSize.width;
    const sy = displaySize.height / imageNatSize.height;
    return detections.map((item, i) => {
      const { x1, y1, x2, y2 } = item.box;
      const col = catColor(item.type);
      return (
        <View key={i} style={[S.boundingBox, { left: x1*sx, top: y1*sy, width: (x2-x1)*sx, height: (y2-y1)*sy, borderColor: col }]}>
          <View style={[S.labelBox, { backgroundColor: col }]}>
            <Text style={S.labelText} numberOfLines={1}>{item.label} {Math.round(item.confidence*100)}%</Text>
          </View>
        </View>
      );
    });
  };

  const renderCompBar = () => {
    const { special_waste: sp, recyclable: rc, residual: rs, biodegradable: bd } = wasteComp;
    const bars = [
      { label: "Special", v: sp, col: C.special },
      { label: "Recyclable", v: rc, col: C.recyclable },
      { label: "Residual", v: rs, col: C.residual },
      { label: "Biodegradable", v: bd, col: C.bio },
    ];
    return (
      <View style={S.card}>
        <View style={S.secHeader}>
          <View style={[S.secIconBg, { backgroundColor: "#E8F5EE" }]}><MaterialIcons name="pie-chart" size={16} color={C.secondary} /></View>
          <Text style={S.secTitle}>Waste Composition</Text>
        </View>
        <View style={S.compBar}>{bars.map(({ v, col }, i) => v > 0 ? <View key={i} style={[S.compSeg, { flex: v, backgroundColor: col }]} /> : null)}</View>
        <View style={S.compLegend}>{bars.map(({ label, v, col }) => (
          <View key={label} style={S.compLegendItem}>
            <View style={[S.compDot, { backgroundColor: col }]} />
            <Text style={S.compLegendLabel}>{label}</Text>
            <Text style={[S.compLegendVal, { color: col }]}>{v}%</Text>
          </View>
        ))}</View>
      </View>
    );
  };

  const renderNearbyPlaces = () => {
    const cfg = PLACE_SEARCH_CONFIG[overallCat];
    if (!cfg) return null;

    const openInMaps = (place) => {
      const q = encodeURIComponent(place.name + " " + (place.vicinity || ""));
      Linking.openURL(Platform.OS === "ios" ? `maps://?q=${q}` : `geo:0,0?q=${q}`)
        .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
    };

    const openSearch = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.keyword + " near " + (manualLoc || "my location"))}`);

    const distLabel = (place) => {
      if (!location || !place.geometry?.location) {
        if (place.distance) {
          return place.distance < 1 ? `${Math.round(place.distance * 1000)}m away` : `${place.distance.toFixed(1)}km away`;
        }
        return null;
      }
      const { lat: la, lng: lo } = location;
      const lb = place.geometry.location.lat;
      const lb2 = place.geometry.location.lng;
      const dLat = ((lb - la) * Math.PI) / 180;
      const dLon = ((lb2 - lo) * Math.PI) / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(la*Math.PI/180)*Math.cos(lb*Math.PI/180)*Math.sin(dLon/2)**2;
      const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return km < 1 ? `${Math.round(km*1000)}m away` : `${km.toFixed(1)}km away`;
    };

    return (
      <View style={[S.card, { borderTopWidth: 3, borderTopColor: cfg.accentColor }]}>
        <View style={S.secHeader}>
          <View style={[S.secIconBg, { backgroundColor: cfg.bgColor }]}><MaterialIcons name={cfg.icon} size={16} color={cfg.accentColor} /></View>
          <View style={{ flex: 1 }}>
            <Text style={S.secTitle}>{cfg.label}</Text>
            <Text style={S.placesSubtitle}>{cfg.description}</Text>
          </View>
          {overallCat === "Recyclable" && (
            <Pressable onPress={() => setUseLocalPlaces(!useLocalPlaces)} style={S.toggleSourceBtn}>
              <Text style={S.toggleSourceTxt}>{useLocalPlaces ? "Local" : "Google"}</Text>
            </Pressable>
          )}
        </View>

        {placesLoad && <View style={S.placesLoadWrap}><ActivityIndicator size="small" color={cfg.accentColor} /><Text style={[S.placesLoadTxt, { color: cfg.accentColor }]}>Finding nearby locations…</Text></View>}
        {placesErr && !placesLoad && <View style={S.placesErrWrap}><Ionicons name="warning-outline" size={18} color={C.residual} /><Text style={S.placesErrTxt}>{placesErr}</Text></View>}
        {!placesLoad && !placesErr && nearbyPlaces.length === 0 && (
          <View style={S.placesEmptyWrap}>
            <Ionicons name="location-outline" size={32} color={C.textLight} />
            <Text style={S.placesEmptyTitle}>No places found nearby</Text>
            <Text style={S.placesEmptySub}>Try searching on Google Maps instead</Text>
          </View>
        )}
        {!placesLoad && nearbyPlaces.map((place, i) => {
          const dist = distLabel(place);
          const isOpen = place.opening_hours?.open_now;
          const rating = place.rating;
          return (
            <Pressable key={place.place_id ?? i} style={[S.placeCard, { borderLeftColor: cfg.accentColor }]} onPress={() => openInMaps(place)} android_ripple={{ color: cfg.bgColor }}>
              <View style={[S.placeIdx, { backgroundColor: cfg.accentColor }]}><Text style={S.placeIdxTxt}>{i+1}</Text></View>
              <View style={S.placeInfo}>
                <Text style={S.placeName} numberOfLines={1}>{place.name}</Text>
                <Text style={S.placeVic} numberOfLines={1}>{place.vicinity}</Text>
                <View style={S.placeMeta}>
                  {dist && <View style={S.placeChip}><Ionicons name="navigate-outline" size={11} color={cfg.accentColor} /><Text style={[S.placeChipTxt, { color: cfg.accentColor }]}>{dist}</Text></View>}
                  {rating != null && <View style={S.placeChip}><Ionicons name="star" size={11} color="#F5C842" /><Text style={S.placeChipTxt}>{rating.toFixed(1)}</Text></View>}
                  {isOpen != null && <View style={[S.placeChip, { backgroundColor: isOpen ? "#E8F5EE" : "#FFEBEE" }]}><View style={[S.openDot, { backgroundColor: isOpen ? "#2D7A4F" : "#C62828" }]} /><Text style={[S.placeChipTxt, { color: isOpen ? "#2D7A4F" : "#C62828" }]}>{isOpen ? "Open" : "Closed"}</Text></View>}
                  {place.is_local && <View style={[S.placeChip, { backgroundColor: cfg.bgColor }]}><Text style={[S.placeChipTxt, { color: cfg.accentColor }]}>Verified</Text></View>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={cfg.accentColor} />
            </Pressable>
          );
        })}
        <Pressable style={[S.mapsBtn, { borderColor: cfg.accentColor }]} onPress={openSearch}>
          <MaterialIcons name="map" size={16} color={cfg.accentColor} />
          <Text style={[S.mapsBtnTxt, { color: cfg.accentColor }]}>Search more on Google Maps</Text>
          <Ionicons name="open-outline" size={14} color={cfg.accentColor} />
        </Pressable>
      </View>
    );
  };

  const renderBarangayBadge = () => {
    if (!selectedBarangay) return null;
    const cfg = BARANGAY_MAP[selectedBarangay];
    if (!cfg) return null;
    const isAllowed = allowedBarangays.includes(selectedBarangay);
    return (
      <View style={[S.barangayBadge, { backgroundColor: cfg.color + "15", borderColor: cfg.color, opacity: isAllowed ? 1 : 0.6 }]}>
        <Ionicons name="navigate" size={15} color={cfg.color} />
        <View style={{ flex: 1 }}>
          <Text style={[S.barangayBadgeTitle, { color: cfg.color }]}>Assigned Drop-off</Text>
          <Text style={[S.barangayBadgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {!isAllowed && <Ionicons name="warning" size={16} color={C.special} />}
        {barangayError && <Ionicons name="warning" size={16} color={C.special} />}
      </View>
    );
  };

  if (liveMode) {
    const scaleX = SW / liveImgW.current;
    const scaleY = SH / liveImgH.current;
    return (
      <View style={S.liveContainer}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={liveFacing} pictureSize="640x480" />
        <LiveOverlay detections={liveDetections} scaleX={scaleX} scaleY={scaleY} />
        <SafeAreaView style={S.liveTopBar}>
          <Pressable style={S.liveIconBtn} onPress={stopLive}><Ionicons name="close" size={24} color="white" /></Pressable>
          <LiveStatus connected={wsConnected} count={liveDetections.length} ms={liveFrameMs} />
          <Pressable style={S.liveIconBtn} onPress={() => setLiveFacing((f) => f === "back" ? "front" : "back")}><Ionicons name="camera-reverse" size={24} color="white" /></Pressable>
        </SafeAreaView>
        <View style={S.liveBottomPanel}>
          <LiveChips detections={liveDetections} />
          <Pressable style={S.liveCaptureRow} onPress={captureLiveSnapshot}>
            <View style={S.liveCaptureBtn}><Ionicons name="camera" size={30} color="white" /></View>
            <Text style={S.liveCaptureTxt}>Capture & Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={S.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <ScrollView style={S.container} contentContainerStyle={S.contentCont}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); resetForm(); setTimeout(() => setRefreshing(false), 800); }} tintColor={C.accent} colors={[C.accent]} />}
      >
        <View style={S.header}>
          <View style={S.headerTop}>
            <Pressable style={S.backBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="white" /></Pressable>
            <View style={S.headerCenter}>
              <Text style={S.headerTitle}>AI Waste Analysis</Text>
              <Text style={S.headerSub}>Detect & Classify Waste Types</Text>
            </View>
            <Pressable style={S.histBtn} onPress={() => navigation.navigate("ReportHistory")}><Ionicons name="time-outline" size={22} color="white" /></Pressable>
          </View>
          <View style={S.headerChips}>
            {user && <View style={S.headerChip}><Ionicons name="person" size={12} color="rgba(255,255,255,0.8)" /><Text style={S.headerChipTxt} numberOfLines={1}>{user.email}</Text></View>}
            {deviceUsed && <View style={[S.headerChip, { backgroundColor: "rgba(245,200,66,0.2)" }]}><Ionicons name="hardware-chip" size={12} color={C.highlight} /><Text style={[S.headerChipTxt, { color: C.highlight }]}>{deviceUsed.toUpperCase()}</Text></View>}
          </View>
        </View>

        {usingDemo && (
          <View style={S.demoBanner}><Ionicons name="flask" size={14} color={C.highlight} /><Text style={S.demoBannerTxt}>DEMO MODE — SAMPLE DATA</Text></View>
        )}

        <View style={S.card}>
          <View style={S.secHeader}><View style={[S.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="location" size={16} color={C.secondary} /></View><Text style={S.secTitle}>Location</Text></View>
          <TextInput style={S.input} placeholder="Enter or auto-detect location" placeholderTextColor={C.textLight} value={manualLoc} onChangeText={(v) => { setManualLoc(v); }} />
          <Pressable style={S.outlineBtn} onPress={getLocation}><Ionicons name="locate" size={16} color={C.secondary} /><Text style={S.outlineBtnTxt}>Use Current Location</Text></Pressable>
        </View>

        <View style={S.card}>
          <View style={S.secHeader}><View style={[S.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="camera" size={16} color={C.secondary} /></View><Text style={S.secTitle}>Select Image</Text></View>
          <View style={S.cropInfoBanner}><Ionicons name="crop-outline" size={14} color="#1A6B9A" /><Text style={S.cropInfoTxt}>After selecting a photo, drag to select any area you want to analyse.</Text></View>
          <View style={S.srcGrid}>
            {[
              { col: C.secondary, icon: "camera", label: "Camera", sub: "Drag to crop", fn: () => pickImage(true) },
              { col: "#1A6B9A", icon: "images", label: "Gallery", sub: "Drag to crop", fn: () => pickImage(false) },
              { col: "#7A5C1E", icon: "flask", label: "Demo", sub: "Sample data", fn: () => Alert.alert("Demo Mode", "Load demo data?", [{ text: "Cancel", style: "cancel" }, { text: "Load", onPress: loadDemo }]) },
            ].map(({ col, icon, label, sub, fn }) => (
              <Pressable key={label} style={[S.srcCard, { backgroundColor: col }]} onPress={fn} disabled={loading || repLoading}>
                <View style={S.srcIcon}><Ionicons name={icon} size={22} color="white" /></View>
                <Text style={S.srcCardTxt}>{label}</Text>
                <Text style={S.srcCardSub}>{sub}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={S.liveModeBtn} onPress={startLive} disabled={loading || repLoading}>
            <View style={S.liveModeBtnL}><Ionicons name="videocam" size={20} color="white" /><View><Text style={S.liveModeTitle}>Live AI Detection</Text><Text style={S.liveModeSub}>Real-time camera scanning</Text></View></View>
            <View style={S.liveModeArrow}><Ionicons name="chevron-forward" size={18} color="white" /></View>
          </Pressable>
        </View>

        {imageUri && (
          <View style={S.card}>
            <View style={S.secHeader}>
              <View style={[S.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="image" size={16} color={C.secondary} /></View>
              <Text style={S.secTitle}>{usingDemo ? "Demo Image" : "Selected Image"}</Text>
              {detections.length > 0 && (
                <Pressable style={S.toggleBoxBtn} onPress={() => setShowBoxes(!showBoxes)}>
                  <Ionicons name={showBoxes ? "eye-off-outline" : "eye-outline"} size={16} color={C.secondary} />
                  <Text style={S.toggleBoxTxt}>{showBoxes ? "Hide" : "Show"} boxes</Text>
                </Pressable>
              )}
            </View>
            {activeCropMode === "free" && (
              <View style={S.cropModeBadge}>
                <Ionicons name="crop-outline" size={13} color="#1A6B9A" />
                <Text style={S.cropModeBadgeTxt}>Free crop applied</Text>
                <Pressable onPress={reCrop} style={S.cropChangeBtn}><Text style={S.cropChangeTxt}>Re-crop</Text></Pressable>
              </View>
            )}
            <TouchableOpacity style={S.imgCont} activeOpacity={0.9} onPress={() => setFullImgVis(true)}>
              <Image source={{ uri: imageUri }} style={S.previewImg} resizeMode="cover" onLoad={(e) => {
                const { width: nw, height: nh } = e.nativeEvent.source;
                setImageNatSize({ width: nw, height: nh });
                const cw = SW - 80;
                setDisplaySize({ width: cw, height: cw * (nh / nw) });
              }} />
              {renderBoxes()}
              <View style={S.expandBadge}><Ionicons name="expand-outline" size={15} color="white" /><Text style={S.expandTxt}>View full</Text></View>
            </TouchableOpacity>
          </View>
        )}

        {imageUri && !detDone && !usingDemo && (
          <View style={S.analyseWrap}>
            {loading ? (
              <View style={S.loadingCard}><ActivityIndicator size="large" color={C.accent} /><Text style={S.loadingTitle}>Analysing…</Text><Text style={S.loadingSub}>Detecting waste composition</Text></View>
            ) : (
              <Pressable style={S.analyseBtn} onPress={handleDetect}><Ionicons name="analytics" size={22} color="white" /><Text style={S.analyseBtnTxt}>Analyse Waste Image</Text></Pressable>
            )}
          </View>
        )}

        {detDone && (
          <>
            <View style={S.summaryRow}>
              {[
                { v: detections.length, l: "Objects" },
                { v: `${overallConf}%`, l: "Confidence" },
                { v: deviceUsed?.toUpperCase() ?? "—", l: "Device" },
              ].map(({ v, l }) => (
                <View key={l} style={S.summaryPill}><Text style={S.summaryPillVal}>{v}</Text><Text style={S.summaryPillLbl}>{l}</Text></View>
              ))}
            </View>

            <View style={[S.catHero, { backgroundColor: catColor(overallCat) }]}>
              <View style={S.catHeroL}>{catIcon(overallCat)}<View><Text style={S.catHeroLbl}>Overall Category</Text><Text style={S.catHeroVal}>{overallCat}</Text></View></View>
              <Text style={S.catHeroConf}>{overallConf}%</Text>
            </View>

            {renderBarangayBadge()}

            {barangayError && (
              <View style={S.barangayErrBanner}><Ionicons name="warning" size={18} color="white" /><Text style={S.barangayErrTxt}>{barangayError}</Text></View>
            )}

            {renderCompBar()}

            <View style={S.card}>
              <View style={S.secHeader}><View style={[S.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="list" size={16} color={C.secondary} /></View><Text style={S.secTitle}>Detected Objects ({detections.length})</Text></View>
              {detections.map((item, i) => (
                <View key={i} style={[S.objRow, { borderLeftColor: catColor(item.type) }]}>
                  <View style={[S.objDot, { backgroundColor: catColor(item.type) }]}>{catIcon(item.type)}</View>
                  <View style={S.objInfo}>
                    <View style={S.objInfoTop}><Text style={S.objLabel}>{item.label}</Text><Text style={[S.objConf, { color: catColor(item.type) }]}>{Math.round(item.confidence*100)}%</Text></View>
                    <View style={S.objInfoBot}>{matIcon(item.label)}<Text style={S.objType}>{item.type}</Text></View>
                  </View>
                </View>
              ))}
            </View>

            <TMFKWasteAssistant detections={detections} overallCat={overallCat} manualLoc={manualLoc} />

            {renderNearbyPlaces()}

            <Pressable style={[S.saveBtn, barangayError && S.saveBtnDisabled]} onPress={() => { if (barangayError) { Alert.alert("Cannot Submit", barangayError); return; } setReportVis(true); }} disabled={repLoading}>
              {repLoading ? <ActivityIndicator size="small" color="white" /> : <><Ionicons name="save-outline" size={20} color="white" /><Text style={S.saveBtnTxt}>{usingDemo ? "Save Demo Report" : "Save Analysis Report"}</Text></>}
            </Pressable>
          </>
        )}

        <Modal visible={fullImgVis} animationType="fade" transparent onRequestClose={() => setFullImgVis(false)}>
          <View style={S.fullModal}>
            <View style={S.fullModalTop}><Text style={S.fullModalTitle}>Full Image</Text><Pressable onPress={() => setFullImgVis(false)} style={S.closeCircle}><Ionicons name="close" size={22} color="white" /></Pressable></View>
            <Image source={{ uri: imageUri }} style={S.fullImg} resizeMode="contain" />
            <Text style={S.fullModalInfo}>{detections.length} object(s) · {overallCat} · {overallConf}% confidence</Text>
          </View>
        </Modal>

        <Modal visible={reportVis} animationType="slide" transparent onRequestClose={() => setReportVis(false)}>
          <View style={S.modalOverlay}>
            <View style={S.modalSheet}>
              <View style={S.modalHandle} />
              <View style={S.modalHeader}><Text style={S.modalTitle}>{usingDemo ? "Save Demo Report" : "Save Waste Report"}</Text><Pressable onPress={() => setReportVis(false)} style={S.closeCircle}><Ionicons name="close" size={20} color={C.textMid} /></Pressable></View>
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {[
                  { icon: "person-outline", label: "User", value: user?.email ?? "—" },
                  { icon: "flag-outline", label: "Category", value: overallCat },
                  { icon: "cube-outline", label: "Objects", value: String(detections.length) },
                  { icon: "location-outline", label: "Location", value: manualLoc || "Not specified" },
                  { icon: "hardware-chip-outline", label: "Device", value: deviceUsed?.toUpperCase() ?? "—" },
                ].map(({ icon, label, value }) => (
                  <View key={label} style={S.detailRow}><Ionicons name={icon} size={15} color={C.textLight} style={{ width: 22 }} /><Text style={S.detailLbl}>{label}</Text><Text style={S.detailVal} numberOfLines={1}>{value}</Text></View>
                ))}
                <BarangaySelector 
                  selected={selectedBarangay} 
                  onSelect={handleBarangaySelect} 
                  classification={overallCat} 
                  disabled={repLoading}
                  allowedBarangays={allowedBarangays}
                  locationMessage={locationMessage}
                />
                {barangayError && (<View style={S.modalBarangayErr}><Ionicons name="warning" size={14} color={C.special} /><Text style={S.modalBarangayErrTxt}>{barangayError}</Text></View>)}
              </ScrollView>
              <View style={S.notesSection}>
                <Text style={S.notesLbl}>Additional Notes (optional)</Text>
                <TextInput 
                  style={S.notesInput} 
                  placeholder="Describe any additional observations…" 
                  placeholderTextColor={C.textLight} 
                  value={userMsg} 
                  onChangeText={setUserMsg} 
                  multiline 
                  numberOfLines={3} 
                  textAlignVertical="top" 
                />
              </View>
              <View style={S.modalActions}>
                <Pressable style={S.cancelBtn} onPress={() => setReportVis(false)} disabled={repLoading}><Text style={S.cancelBtnTxt}>Cancel</Text></Pressable>
                <Pressable style={[S.confirmBtn, (!!barangayError || repLoading) && { opacity: 0.6 }]} onPress={handleSaveReport} disabled={!!barangayError || repLoading}>
                  {repLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={S.confirmBtnTxt}>{usingDemo ? "Save Demo" : "Save Report"}</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.cream },
  container: { flex: 1, backgroundColor: C.cream },
  contentCont: { paddingBottom: 48 },
  header: { backgroundColor: C.primary, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 18, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  headerTop: { flexDirection: "row", alignItems: "center", paddingTop: Platform.OS === "android" ? 44 : 16 },
  backBtn: { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  histBtn: { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  headerChips: { flexDirection: "row", gap: 8, marginTop: 14, justifyContent: "center" },
  headerChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, maxWidth: 160 },
  headerChipTxt: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  demoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#3A2A00", marginHorizontal: 20, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.highlight + "44" },
  demoBannerTxt: { color: C.highlight, fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  card: { backgroundColor: C.cardBg, marginHorizontal: 20, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: C.border },
  secHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  secIconBg: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  secTitle: { fontSize: 15, fontWeight: "700", color: C.textDark, flex: 1 },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textDark, backgroundColor: C.cream, marginBottom: 10 },
  outlineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.secondary },
  outlineBtnTxt: { color: C.secondary, fontWeight: "600", fontSize: 14 },
  cropInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F4FD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: "#BEE0F5" },
  cropInfoTxt: { fontSize: 12, color: "#1A6B9A", flex: 1, lineHeight: 17 },
  cropModeBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10, borderWidth: 1, backgroundColor: "#E8F4FD18", borderColor: "#1A6B9A55" },
  cropModeBadgeTxt: { fontSize: 12, fontWeight: "700", flex: 1, color: "#1A6B9A" },
  cropChangeBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.06)" },
  cropChangeTxt: { fontSize: 11, fontWeight: "700", color: "#1A6B9A" },
  srcGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  srcCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  srcIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  srcCardTxt: { color: "white", fontSize: 13, fontWeight: "700" },
  srcCardSub: { color: "rgba(255,255,255,0.7)", fontSize: 10, textAlign: "center" },
  liveModeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.primary, borderRadius: 14, padding: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  liveModeBtnL: { flexDirection: "row", alignItems: "center", gap: 12 },
  liveModeTitle: { color: "white", fontWeight: "700", fontSize: 14 },
  liveModeSub: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
  liveModeArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  imgCont: { borderRadius: 12, overflow: "hidden", backgroundColor: "#E8EDE9", minHeight: 220, position: "relative" },
  previewImg: { width: "100%", height: 280 },
  expandBadge: { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.55)", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  expandTxt: { color: "white", fontSize: 11, fontWeight: "600" },
  toggleBoxBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#E8F5EE" },
  toggleBoxTxt: { color: C.secondary, fontSize: 12, fontWeight: "600" },
  boundingBox: { position: "absolute", borderWidth: 2, borderRadius: 4, zIndex: 1 },
  labelBox: { position: "absolute", top: -22, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  labelText: { color: "white", fontSize: 10, fontWeight: "bold" },
  analyseWrap: { marginHorizontal: 20, marginBottom: 14 },
  loadingCard: { backgroundColor: C.cardBg, borderRadius: 16, padding: 28, alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border },
  loadingTitle: { fontSize: 16, fontWeight: "700", color: C.textDark },
  loadingSub: { fontSize: 13, color: C.textLight },
  analyseBtn: { backgroundColor: C.secondary, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  analyseBtnTxt: { color: "white", fontSize: 16, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 14 },
  summaryPill: { flex: 1, backgroundColor: C.cardBg, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryPillVal: { fontSize: 22, fontWeight: "800", color: C.primary },
  summaryPillLbl: { fontSize: 11, color: C.textLight, marginTop: 2, fontWeight: "500" },
  catHero: { marginHorizontal: 20, marginBottom: 14, borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  catHeroL: { flexDirection: "row", alignItems: "center", gap: 12 },
  catHeroLbl: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "500" },
  catHeroVal: { color: "white", fontSize: 18, fontWeight: "800" },
  catHeroConf: { color: "white", fontSize: 28, fontWeight: "900", opacity: 0.9 },
  barangayBadge: { marginHorizontal: 20, marginBottom: 14, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5 },
  barangayBadgeTitle: { fontSize: 11, fontWeight: "500", opacity: 0.8 },
  barangayBadgeLabel: { fontSize: 14, fontWeight: "800" },
  barangayErrBanner: { marginHorizontal: 20, marginBottom: 14, backgroundColor: C.special, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  barangayErrTxt: { color: "white", fontSize: 13, lineHeight: 19, flex: 1, fontWeight: "600" },
  compBar: { height: 14, borderRadius: 7, flexDirection: "row", overflow: "hidden", backgroundColor: C.border, marginBottom: 14 },
  compSeg: { height: "100%" },
  compLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  compLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  compDot: { width: 8, height: 8, borderRadius: 4 },
  compLegendLabel: { fontSize: 12, color: C.textMid },
  compLegendVal: { fontSize: 12, fontWeight: "700" },
  objRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 12, borderLeftWidth: 3, borderRadius: 10, marginBottom: 8, backgroundColor: C.cream },
  objDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  objInfo: { flex: 1 },
  objInfoTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  objLabel: { fontSize: 14, fontWeight: "700", color: C.textDark },
  objConf: { fontSize: 14, fontWeight: "800" },
  objInfoBot: { flexDirection: "row", alignItems: "center", gap: 6 },
  objType: { fontSize: 12, color: C.textLight },
  saveBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6, marginBottom: 14 },
  saveBtnDisabled: { backgroundColor: "#888", shadowOpacity: 0 },
  saveBtnTxt: { color: "white", fontSize: 15, fontWeight: "700" },
  fullModal: { flex: 1, backgroundColor: "rgba(10,20,14,0.96)", padding: 20, paddingTop: Platform.OS === "android" ? 50 : 60 },
  fullModalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  fullModalTitle: { color: "white", fontSize: 18, fontWeight: "800" },
  fullImg: { flex: 1, borderRadius: 16 },
  fullModalInfo: { color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center", marginTop: 14 },
  closeCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === "android" ? 24 : 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: C.textDark },
  detailRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, gap: 8 },
  detailLbl: { fontSize: 13, color: C.textLight, width: 65 },
  detailVal: { fontSize: 13, color: C.textDark, fontWeight: "600", flex: 1 },
  notesSection: { marginVertical: 16 },
  notesLbl: { fontSize: 13, fontWeight: "600", color: C.textMid, marginBottom: 8 },
  notesInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 13, color: C.textDark, minHeight: 80, backgroundColor: C.cream },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: C.cream, borderWidth: 1.5, borderColor: C.border },
  cancelBtnTxt: { color: C.textMid, fontSize: 14, fontWeight: "600" },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  confirmBtnTxt: { color: "white", fontSize: 14, fontWeight: "700" },
  modalBarangayErr: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, padding: 12, backgroundColor: "#FFEBEE", borderRadius: 10 },
  modalBarangayErrTxt: { color: C.special, fontSize: 12, flex: 1, lineHeight: 17 },
  barangaySelector: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  barangayHint: { fontSize: 12, color: C.textLight, marginBottom: 10, lineHeight: 17 },
  barangayOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, marginBottom: 8 },
  barangayOptionDisabled: { opacity: 0.45, backgroundColor: "#F5F5F5" },
  barangayOptionDisabledText: { fontSize: 11, color: C.special, marginTop: 2, fontWeight: "500" },
  barangayOptionDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  barangayOptionLabel: { fontSize: 13, fontWeight: "600", color: C.textDark },
  barangayOptionSub: { fontSize: 11, color: C.textLight, marginTop: 2 },
  locationInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F4FD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  locationInfoText: { fontSize: 11, color: "#1A6B9A", flex: 1, lineHeight: 16 },
  singleOptionBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5EE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  singleOptionText: { fontSize: 11, color: "#2D7A4F", flex: 1, lineHeight: 16, fontWeight: "500" },
  placesSubtitle: { fontSize: 11, color: C.textLight, marginTop: 1 },
  placesLoadWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, justifyContent: "center" },
  placesLoadTxt: { fontSize: 13, fontWeight: "600" },
  placesErrWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  placesErrTxt: { fontSize: 13, color: C.residual, flex: 1 },
  placesEmptyWrap: { alignItems: "center", paddingVertical: 20, gap: 6 },
  placesEmptyTitle: { fontSize: 14, fontWeight: "700", color: C.textMid },
  placesEmptySub: { fontSize: 12, color: C.textLight },
  placeCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.cream, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, gap: 10 },
  placeIdx: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  placeIdxTxt: { color: "white", fontSize: 12, fontWeight: "800" },
  placeInfo: { flex: 1 },
  placeName: { fontSize: 14, fontWeight: "700", color: C.textDark, marginBottom: 2 },
  placeVic: { fontSize: 12, color: C.textLight, marginBottom: 5 },
  placeMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  placeChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.border, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  placeChipTxt: { fontSize: 11, fontWeight: "600", color: C.textMid },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  mapsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5 },
  mapsBtnTxt: { fontSize: 13, fontWeight: "600" },
  toggleSourceBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: C.border },
  toggleSourceTxt: { fontSize: 11, fontWeight: "600", color: C.textMid },
  liveContainer: { flex: 1, backgroundColor: "black" },
  liveTopBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 44 : 0, paddingBottom: 14, backgroundColor: "rgba(0,0,0,0.6)" },
  liveIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  liveTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
  livePulse: { width: 8, height: 8, borderRadius: 4 },
  liveTitleText: { color: "white", fontSize: 13, fontWeight: "700" },
  liveMsText: { color: "rgba(255,255,255,0.45)", fontSize: 10 },
  liveBottomPanel: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, paddingBottom: Platform.OS === "android" ? 28 : 40, paddingTop: 16, paddingHorizontal: 16, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", gap: 16 },
  liveChipScroll: { maxHeight: 50, width: "100%" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  liveChipText: { color: "white", fontSize: 12, fontWeight: "700" },
  liveCaptureRow: { alignItems: "center", gap: 8 },
  liveCaptureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#C62828", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.3)", shadowColor: "#C62828", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  liveCaptureTxt: { color: "white", fontSize: 12, fontWeight: "600" },
  aiPanel: { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, padding: 18, backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  aiAvatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiTitle: { color: "white", fontSize: 15, fontWeight: "800" },
  aiSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 },
  aiBadgeNew: { backgroundColor: C.highlight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  aiBadgeNewTxt: { color: "#3A2A00", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  aiModeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  aiModeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)" },
  aiModeBtnActive: { backgroundColor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.4)" },
  aiModeBtnTxt: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.55)" },
  aiTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  aiTabTxt: { fontSize: 12, fontWeight: "700" },
  aiCatBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, marginBottom: 12, alignSelf: "flex-start" },
  aiCatBadgeTxt: { fontSize: 11, fontWeight: "700" },
  aiCatBadgeSep: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  aiTipsContainer: { 
    backgroundColor: "rgba(255,255,255,0.08)", 
    borderRadius: 14, 
    maxHeight: 280,
    overflow: "hidden",
  },
  aiTipsScrollView: {
    maxHeight: 280,
  },
  aiTipsContent: {
    padding: 14,
  },
  aiLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, justifyContent: "center" },
  aiLoadingTxt: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  aiTipRow: { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "flex-start" },
  aiTipNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  aiTipNumTxt: { color: "white", fontSize: 11, fontWeight: "800" },
  aiTipTxt: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 19, flex: 1 },
  aiAskHint: { color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  aiSuggestChip: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200 },
  aiSuggestChipTxt: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  aiAskRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  aiAskInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: "white", fontSize: 13, maxHeight: 80 },
  aiAskSendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiAnswerBox: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  aiAnswerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  aiAnswerHeaderTxt: { color: C.highlight, fontSize: 12, fontWeight: "700" },
  aiAnswerTxt: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 20 },
});

export default WasteDetection;