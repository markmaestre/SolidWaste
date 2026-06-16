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
import Constants from 'expo-constants';
import { GestureHandlerRootView, PinchGestureHandler, PinchGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';

// Get Cohere API key from environment variables
const COHERE_API_KEY = Constants.expoConfig?.extra?.COHERE_API_KEY || process.env.COHERE_API_KEY;

const { width: SW, height: SH } = Dimensions.get("window");

const API_BASE = "http://10.136.44.73:8000";
export const API_URL = `${API_BASE}/detect`;
export const WS_URL  = `${API_BASE.replace(/^http/, "ws")}/detect/live`;

// const API_BASE = "https://yolo-backend-d3rc.onrender.com";
// export const API_URL = `${API_BASE}/detect`;
// export const WS_URL = `${API_BASE.replace(/^https/, "wss").replace(/^http/, "ws")}/detect/live`;


const GEMINI_API_KEY = "AIzaSyAlWb77h51IFFJHVGpPffYC9KfehZPDRvk";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const MIN_FRAME_GAP_MS = 400;
const CAPTURE_SIZE     = { width: 640, height: 480 };
const BOX_DECAY        = 5;

const GOOGLE_PLACES_KEY = "YOUR_GOOGLE_PLACES_API_KEY";

const BACKEND_CLASSIFICATION_MAP = {
  "Recyclable":                "Recyclable",
  "Special / Hazardous Waste": "Special Waste",           
  "Biodegradable":             "Biodegradable",
  "Residual / Non-Recyclable": "Residual / Non-Recyclable",
};

function toBackendClassification(frontendLabel) {
  return BACKEND_CLASSIFICATION_MAP[frontendLabel] ?? frontendLabel;
}

const WACS_CATEGORIES = {
  BIODEGRADABLE: {
    key: "Biodegradable",
    label: "Biodegradable / Compostable",
    shortLabel: "Biodegradable",
    color: "#558B2F",
    lightBg: "#F1F8E9",
    description: "Food waste, yard trimmings, and organic materials that decompose naturally",
    wacsCode: "BIO",
    disposalMethod: "Composting, vermicomposting, or biogas facility",
    examples: ["Food scraps", "Vegetable peelings", "Leaves", "Garden waste", "Wood chips", "Paper", "Cardboard"],
  },
  RECYCLABLE: {
    key: "Recyclable",
    label: "Recyclable",
    shortLabel: "Recyclable",
    color: "#1565C0",
    lightBg: "#E3F2FD",
    description: "Clean materials with established recycling markets — metal, glass, paper",
    wacsCode: "REC",
    disposalMethod: "MRF, junk shop, or barangay collection program",
    examples: ["PET bottles", "HDPE containers", "Aluminum cans", "Glass bottles", "Clean paper", "Cardboard"],
  },
  RESIDUAL: {
    key: "Residual / Non-Recyclable",
    label: "Residual / Non-Recyclable",
    shortLabel: "Residual",
    color: "#E65100",
    lightBg: "#FFF3E0",
    description: "Waste remaining after diversion — soiled materials, mixed waste, non-recyclable plastics",
    wacsCode: "RES",
    disposalMethod: "Sanitary landfill or waste-to-energy facility",
    examples: ["Soiled plastics", "Styrofoam", "Diapers", "Composite packaging", "Contaminated paper"],
  },
  SPECIAL: {
    key: "Special / Hazardous Waste",
    label: "Special / Hazardous Waste",
    shortLabel: "Special Waste",
    color: "#C62828",
    lightBg: "#FFEBEE",
    description: "Waste requiring special handling due to hazardous properties — chemicals, e-waste, medical",
    wacsCode: "HAZ",
    disposalMethod: "Certified TSD facility or authorized e-waste drop-off",
    examples: ["Batteries", "Fluorescent bulbs", "Electronics", "Paint", "Motor oil", "Medical waste"],
  },
};

const WACS_SUB_CATEGORIES = {
  "Food Waste":          { parent: "Biodegradable", wacsField: "B1" },
  "Garden / Yard Waste": { parent: "Biodegradable", wacsField: "B2" },
  "Wood / Lumber":       { parent: "Biodegradable", wacsField: "B3" },
  "Plastic - Recyclable":{ parent: "Recyclable",    wacsField: "R1" },
  "Paper / Cardboard":   { parent: "Recyclable",    wacsField: "R2" },
  "Metal / Ferrous":     { parent: "Recyclable",    wacsField: "R3" },
  "Metal / Non-Ferrous": { parent: "Recyclable",    wacsField: "R4" },
  "Glass":               { parent: "Recyclable",    wacsField: "R5" },
  "Rubber / Leather":    { parent: "Recyclable",    wacsField: "R6" },
  "Textile / Fabric":    { parent: "Recyclable",    wacsField: "R7" },
  "Plastic - Non-Recyclable": { parent: "Residual / Non-Recyclable", wacsField: "N1" },
  "Soiled / Contaminated":    { parent: "Residual / Non-Recyclable", wacsField: "N2" },
  "Composite / Multi-Layer":  { parent: "Residual / Non-Recyclable", wacsField: "N3" },
  "Sanitary Waste":           { parent: "Residual / Non-Recyclable", wacsField: "N4" },
  "Electronic Waste (E-Waste)":{ parent: "Special / Hazardous Waste", wacsField: "H1" },
  "Battery / Accumulator":     { parent: "Special / Hazardous Waste", wacsField: "H2" },
  "Chemical / Solvent":        { parent: "Special / Hazardous Waste", wacsField: "H3" },
  "Medical / Clinical Waste":  { parent: "Special / Hazardous Waste", wacsField: "H4" },
  "Bulky Waste":               { parent: "Special / Hazardous Waste", wacsField: "H5" },
};

// Updated PLASTIC_TYPES with comprehensive descriptions
const PLASTIC_TYPES = {
  1: {
    code: "PET",   
    fullName: "Polyethylene Terephthalate",
    examples: "Water bottles, soda bottles, salad containers, cooking oil bottles",
    description: "Commonly used for single-use beverage bottles. Highly recyclable!",
    color: "#1565C0", 
    recyclable: true,
    wacsCategory: "Recyclable", 
    wacsSubCat: "Plastic - Recyclable",
    recyclingTip: "Rinse thoroughly, remove caps (caps are usually #5 PP), crush to save space. Take to any junk shop or MRF.",
    value: "₱2-₅ per kilo at junk shops",
    environmentalNote: "PET can be recycled into new bottles, polyester fiber for clothing, or carpet material."
  },
  2: {
    code: "HDPE",  
    fullName: "High-Density Polyethylene",
    examples: "Detergent bottles, shampoo bottles, milk jugs, bleach containers, lotion bottles",
    description: "Sturdy plastic used for household and industrial containers. Highly recyclable!",
    color: "#2E7D32", 
    recyclable: true,
    wacsCategory: "Recyclable", 
    wacsSubCat: "Plastic - Recyclable",
    recyclingTip: "Rinse well, remove labels if possible, crush to save space. Take to junk shops or recycling centers.",
    value: "₱5-₱10 per kilo at junk shops",
    environmentalNote: "HDPE is one of the most valuable recyclable plastics and can be turned into new bottles, pipes, or plastic lumber."
  },
  3: {
    code: "PVC",   
    fullName: "Polyvinyl Chloride",
    examples: "Pipes, blister packs, cling wrap, window frames",
    description: "Tough plastic, not easily recyclable. Avoid when possible.",
    color: "#F57F17", 
    recyclable: false,
    wacsCategory: "Residual / Non-Recyclable", 
    wacsSubCat: "Plastic - Non-Recyclable",
    recyclingTip: "PVC is difficult to recycle. Dispose as residual waste. Try to avoid buying PVC products.",
    value: "No recycling value",
    environmentalNote: "PVC releases toxic chemicals when burned. Proper disposal is critical."
  },
  4: {
    code: "LDPE",  
    fullName: "Low-Density Polyethylene",
    examples: "Plastic bags, grocery bags, wrappers, shrink wrap, bread bags, bubble wrap",
    description: "Flexible plastic film. Recyclable but requires special processing.",
    color: "#6A1E9A", 
    recyclable: true,
    wacsCategory: "Recyclable", 
    wacsSubCat: "Plastic - Recyclable",
    recyclingTip: "Clean and dry plastic bags. Many SM and Robinsons malls have plastic bag drop-off bins. NOT accepted in regular recycling bins.",
    value: "Limited market value - usually recycled into new bags or composite lumber",
    environmentalNote: "LDPE takes hundreds of years to decompose. Reuse bags whenever possible or drop off at designated collection points."
  },
  5: {
    code: "PP",    
    fullName: "Polypropylene",
    examples: "Food containers (takeout boxes), bottle caps, straws, yogurt cups, medicine bottles",
    description: "Heat-resistant plastic used for food containers. Recyclable!",
    color: "#00838F", 
    recyclable: true,
    wacsCategory: "Recyclable", 
    wacsSubCat: "Plastic - Recyclable",
    recyclingTip: "Rinse food containers well. Remove any labels. Crush or flatten. Acceptable at most recycling centers.",
    value: "₱3-₱7 per kilo at junk shops",
    environmentalNote: "PP is durable and heat-resistant. Recycled into battery cases, brooms, brushes, and auto parts."
  },
  6: {
    code: "PS",    
    fullName: "Polystyrene",
    examples: "Styrofoam cups, foam trays, disposable cutlery, packing peanuts",
    description: "Lightweight foam plastic. NOT recyclable in most areas.",
    color: "#C62828", 
    recyclable: false,
    wacsCategory: "Residual / Non-Recyclable", 
    wacsSubCat: "Plastic - Non-Recyclable",
    recyclingTip: "Styrofoam is NOT recyclable in the Philippines. Dispose as residual waste. Avoid using foam products.",
    value: "No recycling value",
    environmentalNote: "PS takes 500+ years to decompose and breaks into microplastics. Never burn as it releases toxic fumes."
  },
  7: {
    code: "OTHER", 
    fullName: "Other / Mixed Plastics",
    examples: "Sachets (coffee, shampoo, detergent sachets), CD/DVD cases (polycarbonate), nylon, acrylic",
    description: "A catch-all category for other plastic types including multi-layer plastics.",
    color: "#5D4037", 
    recyclable: false,
    wacsCategory: "Residual / Non-Recyclable", 
    wacsSubCat: "Composite / Multi-Layer",
    recyclingTip: "Most #7 plastics cannot be recycled. Sachets are multi-layer and non-recyclable. Dispose as residual waste.",
    value: "No recycling value",
    environmentalNote: "Sachets are a major environmental problem in the Philippines. Try to buy in bulk or choose products with recyclable packaging."
  },
};

// Updated LABEL_TO_WACS with correct plastic type mappings
const LABEL_TO_WACS = {
  // PET #1 - Plastic beverage bottles
  "plastic bottle":     { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 1 },
  "bottle":             { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 1 },
  "water bottle":       { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 1 },
  "soda bottle":        { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 1 },
  "pet bottle":         { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 1 },
  
  // HDPE #2 - Detergent bottles, shampoo bottles (sturdy containers)
  "detergent bottle":   { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 2 },
  "shampoo bottle":     { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 2 },
  "milk jug":           { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 2 },
  "hdpe bottle":        { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 2 },
  
  // LDPE #4 - Plastic bags, wrappers, "plastic" (flexible plastics)
  "plastic":            { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  "plastic bag":        { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  "wrapper":            { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  "shopping bag":       { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  "bread bag":          { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  "ldpe bag":           { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  "plastic wrapper":    { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 4 },
  
  // PP #5 - Food containers, bottle caps, straws
  "food container":     { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  "bottle cap":         { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  "straw":              { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  "yogurt container":   { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  "takeout container":  { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  "pp container":       { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  "cap":                { type: "Recyclable", subType: "Plastic - Recyclable", plasticRIC: 5 },
  
  // #7 Other - Sachet, CD (Polycarbonate)
  "sachet":             { type: "Residual / Non-Recyclable", subType: "Composite / Multi-Layer", plasticRIC: 7 },
  "cd":                 { type: "Residual / Non-Recyclable", subType: "Composite / Multi-Layer", plasticRIC: 7 },
  "polycarbonate":      { type: "Residual / Non-Recyclable", subType: "Composite / Multi-Layer", plasticRIC: 7 },
  "mixed plastic":      { type: "Residual / Non-Recyclable", subType: "Composite / Multi-Layer", plasticRIC: 7 },
  "other plastic":      { type: "Residual / Non-Recyclable", subType: "Composite / Multi-Layer", plasticRIC: 7 },
  
  // Other waste types
  "organic":            { type: "Biodegradable", subType: "Food Waste" },
  "food waste":         { type: "Biodegradable", subType: "Food Waste" },
  "food":               { type: "Biodegradable", subType: "Food Waste" },
  "vegetable":          { type: "Biodegradable", subType: "Food Waste" },
  "fruit":              { type: "Biodegradable", subType: "Food Waste" },
  "paper":              { type: "Recyclable", subType: "Paper / Cardboard" },
  "cardboard":          { type: "Recyclable", subType: "Paper / Cardboard" },
  "can":                { type: "Recyclable", subType: "Metal / Non-Ferrous" },
  "aluminum can":       { type: "Recyclable", subType: "Metal / Non-Ferrous" },
  "glass bottle":       { type: "Recyclable", subType: "Glass" },
  "glass":              { type: "Recyclable", subType: "Glass" },
  "battery":            { type: "Special / Hazardous Waste", subType: "Battery / Accumulator" },
  "electronics":        { type: "Special / Hazardous Waste", subType: "Electronic Waste (E-Waste)" },
};

const LEGACY_TYPE_MAP = {
  "Special Waste":              "Special / Hazardous Waste",
  "Recyclable":                 "Recyclable",
  "Residual / Non-Recyclable":  "Residual / Non-Recyclable",
  "Biodegradable":              "Biodegradable",
  "Non-Recyclable":             "Residual / Non-Recyclable",
  "Hazardous":                  "Special / Hazardous Waste",
  "Compostable":                "Biodegradable",
};

function normaliseType(raw = "") {
  if (LEGACY_TYPE_MAP[raw]) return LEGACY_TYPE_MAP[raw];
  for (const key of Object.keys(WACS_CATEGORIES)) {
    const cat = WACS_CATEGORIES[key];
    if (raw === cat.key || raw === cat.label || raw === cat.shortLabel) return cat.key;
  }
  return "Residual / Non-Recyclable";
}

function detectPlasticType(label = "") {
  const lower = label.toLowerCase().trim();
  const wacsEntry = LABEL_TO_WACS[lower];
  if (wacsEntry?.plasticRIC) return { typeNum: wacsEntry.plasticRIC, ...PLASTIC_TYPES[wacsEntry.plasticRIC] };
  for (const [key, entry] of Object.entries(LABEL_TO_WACS)) {
    if (entry.plasticRIC && (lower.includes(key) || key.includes(lower))) {
      return { typeNum: entry.plasticRIC, ...PLASTIC_TYPES[entry.plasticRIC] };
    }
  }
  return null;
}

function detectWacsType(label = "") {
  const lower = label.toLowerCase().trim();
  if (LABEL_TO_WACS[lower]) return LABEL_TO_WACS[lower];
  for (const [key, entry] of Object.entries(LABEL_TO_WACS)) {
    if (lower.includes(key) || key.includes(lower)) return entry;
  }
  return null;
}

// Helper function to get plastic type explanation
const getPlasticTypeExplanation = (plasticType) => {
  if (!plasticType) return null;
  return {
    title: `${plasticType.code} (#${plasticType.typeNum}) - ${plasticType.fullName}`,
    description: plasticType.description,
    examples: plasticType.examples,
    recyclingTip: plasticType.recyclingTip,
    value: plasticType.value,
    environmentalNote: plasticType.environmentalNote,
    recyclable: plasticType.recyclable
  };
};

const BARANGAY_OPTIONS = [
  {
    key: "south_signal",
    label: "South Signal, Taguig",
    color: "#C62828",
    icon: "location",
    allowedTypes: null,
    locationKeywords: ["south signal", "south", "signal"],
  },
  {
    key: "central_bicutan",
    label: "Central Bicutan, Taguig",
    color: "#1A6B9A",
    icon: "location",
    allowedTypes: null,
    locationKeywords: ["central bicutan", "central", "bicutan"],
  },
 
];

const BARANGAY_MAP = Object.fromEntries(BARANGAY_OPTIONS.map((b) => [b.key, b]));

const PLACE_SEARCH_CONFIG = {
  "Recyclable":                { keyword: "recycling center",                         label: "Recycling Centers Nearby",      icon: "recycling", accentColor: "#1565C0", bgColor: "#E3F2FD", description: "Drop off recyclables at these nearby facilities" },
  "Special / Hazardous Waste": { keyword: "e-waste drop off hazardous waste disposal", label: "Special Waste Drop-off Points", icon: "dangerous", accentColor: "#C62828", bgColor: "#FFEBEE", description: "Bring special/hazardous waste to certified drop-off points" },
  "Biodegradable":             { keyword: "composting facility organic waste",         label: "Composting Facilities Nearby",  icon: "eco",       accentColor: "#558B2F", bgColor: "#F1F8E9", description: "Compost your organic waste at these nearby facilities" },
  "Residual / Non-Recyclable": { keyword: "waste disposal facility landfill",          label: "Waste Disposal Facilities",     icon: "delete",    accentColor: "#E65100", bgColor: "#FFF3E0", description: "Properly dispose of residual waste at these facilities" },
};

const LOCAL_RECYCLING_CENTERS = {
  "Recyclable": [
    { name: "Alico Junk Shop",      vicinity: "Upper Bicutan / Tagak, Taguig",  rating: 4.5, open_now: true, types: ["recycling_center"],              lat: 14.5272, lng: 121.0585 },
    { name: "Trivali Trading",      vicinity: "Palar, Taguig",                  rating: 4.5, open_now: true, types: ["recycling_center"],              lat: 14.5240, lng: 121.0590 },
    { name: "R-V Junk Shop",        vicinity: "ML Quezon, Taguig",              rating: 4.5, open_now: true, types: ["recycling_center"],              lat: 14.5250, lng: 121.0600 },
  ],
  "Special / Hazardous Waste": [
    { name: "E-Waste Dropoff Center",  vicinity: "Taguig City Hall Complex",        rating: 4.2, open_now: true, types: ["ewaste"],     lat: 14.5400, lng: 121.0550 },
  ],
  "Biodegradable": [
    { name: "Taguig Composting Facility", vicinity: "Brgy. Central Bicutan",        rating: 4.3, open_now: true, types: ["composting"], lat: 14.5500, lng: 121.0650 },
  ],
  "Residual / Non-Recyclable": [
    { name: "Taguig MRF", vicinity: "Brgy. Central Signal",                         rating: 4.0, open_now: true, types: ["mrf"],        lat: 14.5600, lng: 121.0750 },
  ],
};

const C = {
  primary: "#1A4731", secondary: "#2D7A4F", accent: "#5BB87F", highlight: "#F5C842",
  cream: "#F9F5EE", cardBg: "#FFFFFF", textDark: "#0F2017", textMid: "#3D5A47",
  textLight: "#7A9988", border: "#E2EDE7",
  special: "#C62828", recyclable: "#1565C0", residual: "#E65100", bio: "#558B2F",
  southSignal: "#C62828", centralSignal: "#1A6B9A", tupTaguig: "#558B2F",
};

const catColor = (cat) => {
  const norm = normaliseType(cat);
  return {
    "Special / Hazardous Waste":  C.special,
    "Recyclable":                 C.recyclable,
    "Residual / Non-Recyclable":  C.residual,
    "Biodegradable":              C.bio,
  }[norm] ?? C.accent;
};

const catIcon = (cat, size = 18) => {
  const p = { size, color: "white" };
  const norm = normaliseType(cat);
  return {
    "Special / Hazardous Waste":  <MaterialIcons name="dangerous" {...p} />,
    "Recyclable":                 <MaterialIcons name="recycling" {...p} />,
    "Residual / Non-Recyclable":  <MaterialIcons name="delete" {...p} />,
    "Biodegradable":              <MaterialIcons name="eco" {...p} />,
  }[norm] ?? <MaterialIcons name="help" {...p} />;
};

const matIcon = (label = "") => {
  const l = label.toLowerCase();
  if (l.includes("plastic") || l.includes("bottle")) return <MaterialCommunityIcons name="bottle-soda" size={15} color={C.textLight} />;
  if (l.includes("can"))                              return <FontAwesome5 name="cubes" size={15} color={C.textLight} />;
  if (l.includes("glass"))                            return <MaterialCommunityIcons name="glass-mug" size={15} color={C.textLight} />;
  if (l.includes("paper") || l.includes("carton"))   return <Entypo name="news" size={15} color={C.textLight} />;
  if (l.includes("cup"))                              return <MaterialCommunityIcons name="cup" size={15} color={C.textLight} />;
  if (l.includes("battery"))                         return <MaterialCommunityIcons name="battery-alert" size={15} color={C.textLight} />;
  if (l.includes("food") || l.includes("organic"))   return <MaterialCommunityIcons name="food-apple" size={15} color={C.textLight} />;
  return <MaterialIcons name="category" size={15} color={C.textLight} />;
};

const buildComposition = (dets) => {
  if (!dets.length) return { special: 0, recyclable: 0, residual: 0, biodegradable: 0 };
  const c = {
    "Special / Hazardous Waste":  0,
    "Recyclable":                 0,
    "Residual / Non-Recyclable":  0,
    "Biodegradable":              0,
  };
  dets.forEach((d) => {
    const norm = normaliseType(d.type);
    if (c[norm] !== undefined) c[norm]++;
  });
  const t = dets.length;
  return {
    special:        Math.round(c["Special / Hazardous Waste"]  / t * 100),
    recyclable:     Math.round(c["Recyclable"]                 / t * 100),
    residual:       Math.round(c["Residual / Non-Recyclable"]  / t * 100),
    biodegradable:  Math.round(c["Biodegradable"]              / t * 100),
  };
};

const buildOverallCat = (d) => {
  if (!d.length) return null;
  const c = {};
  d.forEach((x) => {
    const norm = normaliseType(x.type);
    c[norm] = (c[norm] || 0) + 1;
  });
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
};

const buildOverallConf = (d) =>
  d.length ? Math.round(d.reduce((s, x) => s + x.confidence, 0) / d.length * 100) : 0;

const buildTips = (dets) => {
  const tips = [];
  const labels = [...new Set(dets.map((d) => d.label.toLowerCase()))];
  const types  = [...new Set(dets.map((d) => normaliseType(d.type)))];

  if (types.includes("Recyclable")) {
    tips.push("Separate recyclables (paper, plastic, metal, glass) in a separate bag before barangay collection day.");
    if (labels.some((l) => ["bottle", "plastic bottle", "pet bottle", "water bottle"].includes(l)))
      tips.push("Rinse plastic bottles and crush them to save space — bring to junk shop or MRF.");
    if (labels.some((l) => l.includes("can") || l.includes("aluminum")))
      tips.push("Rinse metal cans and crush them to save space. Aluminum has high value at junk shops.");
    if (labels.some((l) => l.includes("glass")))
      tips.push("Glass bottles can be recycled — rinse and separate by color.");
    if (labels.some((l) => l.includes("paper") || l.includes("carton") || l.includes("cardboard")))
      tips.push("Flatten and dry paper/cardboard. Wet paper should go to residual bin.");
    if (labels.some((l) => l.includes("plastic bag") || l.includes("ldpe") || l.includes("wrapper") || l.includes("plastic")))
      tips.push("Plastic bags and wrappers (LDPE #4) — drop off at SM or Robinsons plastic-bag collection bins.");
  }

  if (types.includes("Biodegradable")) {
    tips.push("Place food scraps and garden waste in a compost bin. DENR encourages backyard composting.");
    if (labels.some((l) => l.includes("food") || l.includes("organic") || l.includes("vegetable") || l.includes("fruit")))
      tips.push("Kitchen food waste can be vermicomposted — ask your barangay if they have this program.");
  }

  if (types.includes("Residual / Non-Recyclable")) {
    tips.push("Residual waste must go to sanitary landfill. DO NOT mix with recyclables — it contaminates the whole batch.");
    if (labels.some((l) => l.includes("styrofoam") || l.includes("foam") || l.includes("cup")))
      tips.push("Styrofoam is NOT recyclable. Dispose as residual/non-recyclable waste.");
    if (labels.some((l) => l.includes("sachet") || l.includes("cd") || l.includes("polycarbonate")))
      tips.push("#7 Other plastics like sachets and CDs are NOT recyclable. Dispose as residual waste.");
    if (labels.some((l) => l.includes("diaper") || l.includes("sanitary") || l.includes("tissue")))
      tips.push("Sanitary waste (diaper, napkin, tissue) — double bag and seal before placing in residual bin.");
  }

  if (types.includes("Special / Hazardous Waste")) {
    tips.push("NEVER mix hazardous waste with regular trash. Bring to proper facility.");
    if (labels.some((l) => l.includes("battery")))
      tips.push("Batteries contain heavy metals. Drop off at SM, hardware stores, or Taguig City Hall.");
    if (labels.some((l) => l.includes("electronics")))
      tips.push("E-waste (cellphone, electronics) — drop off at Robinsons e-waste bins, SM EcoHubs, or Taguig CENRO.");
  }

  return tips.length
    ? tips.map(tip => "• " + tip)
    : ["• Follow your barangay's waste segregation guidelines according to the law."];
};

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function detectBarangayClient(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const barangay of BARANGAY_OPTIONS) {
    for (const keyword of barangay.locationKeywords) {
      if (lower.includes(keyword)) return barangay.key;
    }
  }
  return null;
}

function getAllowedBarangays(userAddress, detectedBarangay = null) {
  const detected = detectBarangayClient(userAddress) || detectedBarangay;
  if (detected) {
    const barangayInfo = BARANGAY_MAP[detected];
    if (barangayInfo) {
      return {
        allowed: [detected],
        detected,
        multipleAllowed: false,
        message: `Based on your address (${barangayInfo.label}), you can only report to this barangay.`,
      };
    }
  }
  return {
    allowed: BARANGAY_OPTIONS.map(b => b.key),
    detected: null,
    multipleAllowed: true,
    message: null,
  };
}

// COHERE AI FUNCTIONS - ENGLISH VERSION
async function callCohereWasteAPI(question, detections, location) {
  if (!COHERE_API_KEY) {
    console.warn('Cohere API key not found. Using fallback response.');
    return getFallbackWasteResponse(question, detections);
  }

  try {
    const itemList = detections.map(d => d.label).join(", ");
    const itemTypes = [...new Set(detections.map(d => normaliseType(d.type)))].join(", ");

    const response = await fetch('https://api.cohere.ai/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-a-plus-05-2026',
        messages: [
          {
            role: 'system',
            content: `You are T.M.F.K (Trash Management Friendly Kasambahay), a helpful waste management assistant in the Philippines.
            
            RULES:
            - Answer ONLY in English language
            - Be practical and specific to Philippine context
            - Provide actionable advice (3-5 sentences only)
            - Use friendly, encouraging tone
            - Include local terms like "barangay", "junk shop", "MRF", "CENRO" when relevant
            
            WASTE CONTEXT:
            - Scanned items: ${itemList}
            - Waste categories: ${itemTypes}
            - User location: ${location || "Philippines"}
            
            Respond concisely and helpfully.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cohere API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content?.[0]?.text || getFallbackWasteResponse(question, detections);
  } catch (error) {
    console.error('Cohere API error:', error);
    return getFallbackWasteResponse(question, detections);
  }
}

function getFallbackWasteResponse(question, detections) {
  const q = question.toLowerCase();
  const hasPlastic = detections.some(d => d.label.toLowerCase().includes("plastic"));
  const hasBottle = detections.some(d => d.label.toLowerCase().includes("bottle"));
  const hasCan = detections.some(d => d.label.toLowerCase().includes("can"));
  const hasFood = detections.some(d => d.label.toLowerCase().includes("food") || d.label.toLowerCase().includes("organic"));
  const hasBattery = detections.some(d => d.label.toLowerCase().includes("battery"));
  const hasElectronics = detections.some(d => d.label.toLowerCase().includes("phone") || d.label.toLowerCase().includes("electronic"));

  if (q.includes("how") || q.includes("dispose") || q.includes("throw")) {
    if (hasPlastic || hasBottle) {
      return "For plastic bottles: Rinse them thoroughly, remove the cap, and crush to save space. Take them to a junk shop or your barangay MRF for proper recycling. Do not throw in regular trash!";
    }
    if (hasCan) {
      return "For cans: Rinse the can, crush it to save space. Aluminum cans have high value at junk shops - sell them to earn while helping the environment. Take to any junk shop in your area.";
    }
    if (hasFood) {
      return "For food waste: Place in a compost bin with dry leaves. Mix occasionally for air circulation. Avoid meat and oil. After a few months, you'll have nutritious fertilizer for your plants!";
    }
    if (hasBattery) {
      return "For batteries: Do not throw in the trash! They contain heavy metals that harm the environment. Take to SM Store, Ace Hardware, or Taguig City Hall with designated battery drop-off points. It's free!";
    }
    if (hasElectronics) {
      return "For electronics (e-waste): Bring to Robinsons e-waste bins, SM EcoHubs, or Taguig CENRO. These contain valuable metals that can be recycled. Don't break or burn - bring intact to proper facilities.";
    }
    return "Separate your waste by category: Recyclable (plastic, paper, metal, glass), Biodegradable (food, leaves), Residual (styrofoam, diapers), and Special/Hazardous (batteries, electronics). Ask your barangay about collection schedule.";
  }

  if (q.includes("where")) {
    if (hasPlastic || hasBottle || hasCan) {
      return "There are many junk shops in Taguig that accept recyclables like Alico Junk Shop in Upper Bicutan, Trivali Trading in Palar, and R-V Junk Shop on ML Quezon. Also ask your barangay if they have an MRF or recycling program.";
    }
    if (hasBattery || hasElectronics) {
      return "There's an e-waste drop-off at Taguig City Hall Complex. Also available at SM Aura or Market! Market! They have e-waste bins. You can also bring to Robinsons Galleria. Dropping off small electronics and batteries is free.";
    }
    return "Your barangay has a waste collection schedule. For recyclables, bring to junk shop or MRF. For hazardous waste, go to Taguig City Hall. For composting, there's facilities in Central Bicutan and TUP Taguig.";
  }

  if (q.includes("price") || q.includes("cost") || q.includes("sell")) {
    if (hasPlastic || hasBottle) {
      return "Plastic bottles (PET) are accepted at junk shops for about ₱2-₱5 per kilo depending on type. Thicker plastic (HDPE) can be ₱5-₱10 per kilo. You earn more if bottles are clean and compressed.";
    }
    if (hasCan) {
      return "Aluminum cans have high value at junk shops - ₱30-₱60 per kilo! Steel/tin cans are ₱3-₱8 per kilo. Rinse and crush to fit more and earn more.";
    }
    return "Junk shop prices depend on material type and cleanliness. Aluminum cans have highest value (₱30-₱60/kilo), followed by copper wire (₱200-₱400/kilo), steel (₱3-₱8/kilo), and plastic (₱2-₱10/kilo).";
  }

  return "Good day! I'm T.M.F.K, your waste assistant. For proper waste disposal, follow the 4 categories: Recyclable (plastic, paper, metal, glass), Biodegradable (food, leaves), Residual (styrofoam, diapers), and Special/Hazardous (batteries, electronics). Ask your barangay about collection schedule. Do you have any other questions?";
}

async function callGeminiAPI(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    return null;
  }
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000, topP: 0.95, topK: 40 },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.liveChipScroll}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexDirection: "row" }}>
      {detections.map((d, i) => (
        <View key={i} style={[styles.liveChip, { backgroundColor: catColor(d.type) }]}>
          {catIcon(d.type)}
          <Text style={styles.liveChipText}>{d.label}  {Math.round(d.confidence * 100)}%</Text>
        </View>
      ))}
    </ScrollView>
  );
});

const LiveStatus = React.memo(({ connected, count, ms }) => (
  <View style={styles.liveTitleWrap}>
    <View style={[styles.livePulse, { backgroundColor: connected ? C.accent : C.special }]} />
    <Text style={styles.liveTitleText}>
      {connected ? (count > 0 ? `${count} object${count > 1 ? "s" : ""} detected` : "Scanning…") : "Connecting…"}
    </Text>
    {ms != null && <Text style={styles.liveMsText}>{ms}ms</Text>}
  </View>
));

// Updated PlasticTypeBadge component with comprehensive details and clickable tabs
const PlasticTypeBadge = ({ plasticItems, selectedIndex, onSelectPlastic }) => {
  if (!plasticItems || plasticItems.length === 0) return null;
  
  const selected = plasticItems[selectedIndex];
  if (!selected) return null;
  
  const explanation = getPlasticTypeExplanation(selected);
  if (!explanation) return null;
  
  return (
    <View style={styles.plasticDetailsCard}>
      {/* Plastic type selector tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plasticTypeTabs}>
        {plasticItems.map((pt, idx) => (
          <Pressable
            key={`${pt.typeNum}-${idx}`}
            style={[
              styles.plasticTypeTab,
              selectedIndex === idx && { backgroundColor: pt.color, borderColor: pt.color }
            ]}
            onPress={() => onSelectPlastic(idx)}
          >
            <View style={[styles.plasticTypeTabDot, { backgroundColor: pt.color }]} />
            <Text style={[
              styles.plasticTypeTabText,
              selectedIndex === idx && { color: "white" }
            ]}>
              {pt.code} (#{pt.typeNum})
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      
      <View style={[styles.plasticDetailsHeader, { backgroundColor: selected.color + "15", borderLeftColor: selected.color }]}>
        <View style={[styles.plasticDetailsNum, { backgroundColor: selected.color }]}>
          <Text style={styles.plasticDetailsNumTxt}>{selected.typeNum}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.plasticDetailsCode, { color: selected.color }]}>{selected.code}</Text>
          <Text style={styles.plasticDetailsName}>{selected.fullName}</Text>
        </View>
        <View style={[styles.plasticDetailsTag, { backgroundColor: selected.recyclable ? "#E8F5EE" : "#FFEBEE" }]}>
          <Text style={[styles.plasticDetailsTagTxt, { color: selected.recyclable ? "#2D7A4F" : "#C62828" }]}>
            {selected.recyclable ? "♻️ Recyclable" : "❌ Not Recyclable"}
          </Text>
        </View>
      </View>
      
      <View style={styles.plasticDetailsBody}>
        <Text style={styles.plasticDetailsDesc}>{explanation.description}</Text>
        
        <View style={styles.plasticDetailsSection}>
          <MaterialIcons name="info-outline" size={14} color={C.textMid} />
          <Text style={styles.plasticDetailsSectionTitle}>Examples:</Text>
        </View>
        <Text style={styles.plasticDetailsText}>{explanation.examples}</Text>
        
        <View style={styles.plasticDetailsSection}>
          <MaterialIcons name="recycling" size={14} color={C.secondary} />
          <Text style={styles.plasticDetailsSectionTitle}>Recycling Tip:</Text>
        </View>
        <Text style={styles.plasticDetailsText}>{explanation.recyclingTip}</Text>
        
        {explanation.value && (
          <>
            <View style={styles.plasticDetailsSection}>
              <MaterialIcons name="attach-money" size={14} color="#F5C842" />
              <Text style={styles.plasticDetailsSectionTitle}>Value at Junk Shops:</Text>
            </View>
            <Text style={styles.plasticDetailsText}>{explanation.value}</Text>
          </>
        )}
        
        <View style={styles.plasticDetailsSection}>
          <MaterialIcons name="eco" size={14} color={C.bio} />
          <Text style={styles.plasticDetailsSectionTitle}>Environmental Note:</Text>
        </View>
        <Text style={styles.plasticDetailsText}>{explanation.environmentalNote}</Text>
      </View>
    </View>
  );
};

// TMFKWasteAssistant with Cohere AI - ENGLISH VERSION
const TMFKWasteAssistant = ({ detections, overallCat, manualLoc }) => {
  const unique = [...new Map(detections.map((d) => [d.label, d])).values()];
  const [activeIdx, setActiveIdx] = useState(0);
  const [tips, setTips] = useState({});
  const [tipsLoad, setTipsLoad] = useState({});
  const [userQ, setUserQ] = useState("");
  const [askLoad, setAskLoad] = useState(false);
  const [askAnswer, setAskAnswer] = useState("");
  const [panelMode, setPanelMode] = useState("tips");

  const buildFallbackTips = useCallback((det) => {
    const normT = normaliseType(det.type);
    const pt = detectPlasticType(det.label);
    if (pt) {
      return [
        `• ${pt.code} (#${pt.typeNum}) - ${pt.fullName}: ${pt.recyclingTip}`,
        `• ${pt.description}`,
        `• ${pt.environmentalNote}`,
        `• Check your barangay's waste collection schedule for ${normT} waste.`,
        `• Bring ${det.label} to the proper facility in ${manualLoc || "your area"}.`,
      ].join("\n");
    }
    return [
      `• Rinse ${det.label} thoroughly before disposing.`,
      `• Separate ${det.label} as ${normT} according to barangay guidelines.`,
      `• Check your barangay's waste collection schedule.`,
      `• Before throwing, consider if ${det.label} can be reused.`,
      `• Bring ${det.label} to the proper facility in ${manualLoc || "your area"}.`,
    ].join("\n");
  }, [manualLoc]);

  const fetchTipsForItem = useCallback(async (det) => {
    if (!det || tips[det.label] || tipsLoad[det.label]) return;
    setTipsLoad((p) => ({ ...p, [det.label]: true }));
    try {
      const pt = detectPlasticType(det.label);
      let context = "";
      if (pt) {
        context = `This is a ${pt.code} (#${pt.typeNum}) - ${pt.fullName} plastic item. ${pt.description}`;
      }
      const prompt = `You are a waste management assistant in the Philippines. Give 5 disposal and cleanup tips for "${det.label}" in ENGLISH language only.
      
${context}

Format each tip as a bullet point starting with "• ".
Each tip should be a complete sentence (15-25 words in English).
Be practical and specific to Philippine context.

Write the 5 English tips now:`;

      const text = await callGeminiAPI(prompt);
      if (!text) throw new Error("no_response");
      setTips((p) => ({ ...p, [det.label]: text }));
    } catch {
      setTips((p) => ({ ...p, [det.label]: buildFallbackTips(det) }));
    } finally {
      setTipsLoad((p) => ({ ...p, [det.label]: false }));
    }
  }, [tips, tipsLoad, buildFallbackTips]);

  useEffect(() => {
    if (unique[activeIdx]) fetchTipsForItem(unique[activeIdx]);
  }, [activeIdx, detections]);

  const handleAsk = async () => {
    const q = userQ.trim();
    if (!q) return;
    setAskLoad(true);
    setAskAnswer("");
    
    const answer = await callCohereWasteAPI(q, detections, manualLoc);
    setAskAnswer(answer);
    setAskLoad(false);
  };

  if (!unique.length) return null;
  const current = unique[activeIdx] ?? unique[0];
  const currentTips = tips[current.label] || "";
  const isLoading = !!tipsLoad[current.label];

  const tipLines = currentTips
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith("•") && line.length > 5)
    .map(line => {
      if (!line.match(/[.!?]$/)) return line + ".";
      return line;
    });

  return (
    <View style={styles.aiPanel}>
      <View style={styles.aiHeader}>
        <View style={styles.aiAvatarWrap}>
          <MaterialIcons name="psychology" size={20} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>T.M.F.K Waste Assistant</Text>
          <Text style={styles.aiSubtitle}>Powered by Cohere AI • Disposal tips & guidance (English)</Text>
        </View>
      </View>

      <View style={styles.aiModeRow}>
        <Pressable style={[styles.aiModeBtn, panelMode === "tips" && styles.aiModeBtnActive]} onPress={() => setPanelMode("tips")}>
          <MaterialIcons name="lightbulb" size={14} color={panelMode === "tips" ? "white" : "rgba(255,255,255,0.55)"} />
          <Text style={[styles.aiModeBtnTxt, panelMode === "tips" && { color: "white" }]}>Tips</Text>
        </Pressable>
        <Pressable style={[styles.aiModeBtn, panelMode === "ask" && styles.aiModeBtnActive]} onPress={() => setPanelMode("ask")}>
          <MaterialIcons name="chat" size={14} color={panelMode === "ask" ? "white" : "rgba(255,255,255,0.55)"} />
          <Text style={[styles.aiModeBtnTxt, panelMode === "ask" && { color: "white" }]}>Ask T.M.F.K</Text>
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
            {unique.map((det, i) => {
              const pt = detectPlasticType(det.label);
              return (
                <Pressable
                  key={det.label}
                  style={[styles.aiTab, i === activeIdx
                    ? { backgroundColor: catColor(det.type), borderColor: catColor(det.type) }
                    : { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }]}
                  onPress={() => setActiveIdx(i)}
                >
                  <Text style={[styles.aiTabTxt, i === activeIdx ? { color: "white" } : { color: "rgba(255,255,255,0.65)" }]}>
                    {det.label}{pt ? ` (${pt.code})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.aiTipsOuter}>
            {isLoading ? (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                <Text style={styles.aiLoadingTxt}>Getting English tips for {current.label}…</Text>
              </View>
            ) : tipLines.length > 0 ? (
              <ScrollView
                style={styles.aiTipsScrollView}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                nestedScrollEnabled={true}
                contentContainerStyle={styles.aiTipsContent}
              >
                {tipLines.map((tip, i) => (
                  <View key={i} style={styles.aiTipRow}>
                    <View style={styles.aiTipNum}>
                      <Text style={styles.aiTipNumTxt}>{i + 1}</Text>
                    </View>
                    <Text style={styles.aiTipTxt}>{tip}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : currentTips && currentTips.length > 0 ? (
              <ScrollView
                style={styles.aiTipsScrollView}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                nestedScrollEnabled={true}
                contentContainerStyle={styles.aiTipsContent}
              >
                <Text style={styles.aiTipTxt}>{currentTips}</Text>
              </ScrollView>
            ) : (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                <Text style={styles.aiLoadingTxt}>Preparing English tips…</Text>
              </View>
            )}
          </View>
        </>
      )}

      {panelMode === "ask" && (
        <View>
          <Text style={styles.aiAskHint}>
            Powered by Cohere AI — Ask about your scanned waste: proper disposal, recycling, or what to do. (Answers in English)
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10 }}
            contentContainerStyle={{ flexDirection: "row", gap: 8 }}
          >
            {[
              `How to dispose of ${unique[0]?.label ?? "waste"}?`,
              "Where is the nearest junk shop?",
              "How much do plastic and cans sell for?",
              "Can I compost food waste?",
            ].map((q) => (
              <Pressable key={q} style={styles.aiSuggestChip} onPress={() => setUserQ(q)}>
                <Text style={styles.aiSuggestChipTxt} numberOfLines={1}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.aiAskRow}>
            <TextInput
              style={styles.aiAskInput}
              placeholder="Ask questions about waste disposal... (Answers in English)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={userQ}
              onChangeText={setUserQ}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleAsk}
            />
            <Pressable style={styles.aiAskSendBtn} onPress={handleAsk} disabled={askLoad}>
              {askLoad
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="send" size={18} color="white" />}
            </Pressable>
          </View>

          {askLoad && (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              <Text style={styles.aiLoadingTxt}>T.M.F.K is thinking (Cohere AI)…</Text>
            </View>
          )}

          {!!askAnswer && !askLoad && (
            <View style={styles.aiAnswerBox}>
              <View style={styles.aiAnswerHeader}>
                <MaterialIcons name="psychology" size={14} color={C.highlight} />
                <Text style={styles.aiAnswerHeaderTxt}>T.M.F.K Answer (English • Cohere AI)</Text>
              </View>
              <ScrollView
                style={styles.aiAnswerScroll}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 4 }}
              >
                <Text style={styles.aiAnswerTxt}>{askAnswer}</Text>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const BarangaySelector = ({ selected, onSelect, classification, disabled, allowedBarangays, locationMessage }) => {
  return (
    <View style={styles.barangaySelector}>
      <View style={styles.secHeader}>
        <View style={[styles.secIconBg, { backgroundColor: "#E8F0FE" }]}>
          <Ionicons name="navigate" size={16} color="#1A6B9A" />
        </View>
        <Text style={styles.secTitle}>Barangay</Text>
      </View>

      {locationMessage && (
        <View style={styles.locationInfoBanner}>
          <Ionicons name="location-outline" size={14} color="#1A6B9A" />
          <Text style={styles.locationInfoText}>{locationMessage}</Text>
        </View>
      )}

      {allowedBarangays.length === 1 && (
        <View style={styles.singleOptionBanner}>
          <Ionicons name="information-circle" size={14} color="#2D7A4F" />
          <Text style={styles.singleOptionText}>Based on your location, you can only report to this barangay.</Text>
        </View>
      )}

      <Text style={styles.barangayHint}>Select where to send your waste report</Text>

      {BARANGAY_OPTIONS.map((opt) => {
        const isAllowed = allowedBarangays.includes(opt.key);
        const isSelected = selected === opt.key;
        const isDisabled = disabled || !isAllowed;
        return (
          <Pressable
            key={opt.key}
            style={[styles.barangayOption,
              isSelected && { borderColor: opt.color, backgroundColor: opt.color + "12" },
              isDisabled && styles.barangayOptionDisabled]}
            onPress={() => !isDisabled && onSelect(opt.key)}
            disabled={isDisabled}
          >
            <View style={[styles.barangayOptionDot, { backgroundColor: isSelected ? opt.color : C.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.barangayOptionLabel, isSelected && { color: opt.color, fontWeight: "700" }]}>
                {opt.label}
              </Text>
            </View>
            {isSelected && <Ionicons name="checkmark-circle" size={20} color={opt.color} />}
            {!isAllowed && !isSelected && <Ionicons name="lock-closed" size={16} color={C.textLight} />}
          </Pressable>
        );
      })}
    </View>
  );
};

// Main WasteDetection Component
const WasteDetection = ({ navigation }) => {
  const [imageUri,       setImageUri]       = useState(null);
  const [imageFile,      setImageFile]      = useState(null);
  const [imageBase64,    setImageBase64]    = useState(null);
  const [imageNatSize,   setImageNatSize]   = useState({ width: 1, height: 1 });
  const [fullImgSize,    setFullImgSize]    = useState({ width: 0, height: 0 });
  const [displaySize,    setDisplaySize]    = useState({ width: 0, height: 0 });
  const [detections,     setDetections]     = useState([]);
  const [overallCat,     setOverallCat]     = useState(null);
  const [overallConf,    setOverallConf]    = useState(0);
  const [wasteComp,      setWasteComp]      = useState({ special: 0, recyclable: 0, residual: 0, biodegradable: 0 });
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
  
  // For pinch zoom in full image modal
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  const [allowedBarangays, setAllowedBarangays] = useState(BARANGAY_OPTIONS.map(b => b.key));
  const [locationMessage,  setLocationMessage]  = useState(null);
  
  // For plastic type selector
  const [selectedPlasticIndex, setSelectedPlasticIndex] = useState(0);
  const [plasticItems, setPlasticItems] = useState([]);

  const [liveDetections, updateLiveDetections] = useStableDetections();
  const rawDetRef   = useRef([]);
  const wsRef       = useRef(null);
  const cameraRef   = useRef(null);
  const liveImgW    = useRef(CAPTURE_SIZE.width);
  const liveImgH    = useRef(CAPTURE_SIZE.height);
  const liveRunning = useRef(false);
  const capturing   = useRef(false);

  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { loading: repLoading, success, error, currentReport, operation, routing } = useSelector((s) => s.wasteReport);

  // Update plastic items when detections change
  useEffect(() => {
    const plastics = detections
      .map(d => detectPlasticType(d.label))
      .filter(pt => pt !== null)
      .filter((pt, index, self) => 
        index === self.findIndex(p => p.typeNum === pt.typeNum)
      );
    setPlasticItems(plastics);
    if (plastics.length > 0 && selectedPlasticIndex >= plastics.length) {
      setSelectedPlasticIndex(0);
    }
  }, [detections]);

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
      Alert.alert("Report Saved!", `Your waste analysis has been sent to ${brLabel}.`, [
        { text: "View History", onPress: () => { navigation.navigate("ReportHistory"); resetForm(); } },
        { text: "New Scan", onPress: resetForm },
      ]);
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
      if (detected && !selectedBarangay) setSelectedBarangay(detected);
      else if (!detected && multipleAllowed && !selectedBarangay) setSelectedBarangay(allowed[0]);
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
    const normCat = normaliseType(cat);
    const cfg = PLACE_SEARCH_CONFIG[normCat];
    if (!cfg) return;
    try {
      setPlacesLoad(true); setPlacesErr(null); setNearbyPlaces([]);
      if (useLocalPlaces && LOCAL_RECYCLING_CENTERS[normCat]) {
        let places = [...LOCAL_RECYCLING_CENTERS[normCat]];
        if (coords?.lat && coords?.lng) {
          places = places.map(p => ({ ...p, distance: getDistance(coords.lat, coords.lng, p.lat, p.lng) }))
            .sort((a, b) => a.distance - b.distance);
        }
        setNearbyPlaces(places.slice(0, 8).map(p => ({
          place_id: p.name.replace(/\s/g, "_"),
          name: p.name, vicinity: p.vicinity, rating: p.rating,
          opening_hours: { open_now: p.open_now },
          geometry: { location: { lat: p.lat, lng: p.lng } },
          distance: p.distance, is_local: true,
        })));
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
    setWasteComp({ special: 0, recyclable: 0, residual: 0, biodegradable: 0 });
    setTips([]); setDeviceUsed(null); setDetDone(false); setShowBoxes(true);
    setFullImgVis(false); setReportVis(false); setUserMsg(""); setUsingDemo(false);
    setImageNatSize({ width: 1, height: 1 }); setDisplaySize({ width: 0, height: 0 });
    setLiveFrameMs(null); setNearbyPlaces([]); setPlacesLoad(false); setPlacesErr(null);
    setSelectedBarangay(null); setBarangayError(null);
    setActiveCropMode(null); setLastSource(null);
    setScale(1); setBaseScale(1); setImageOffset({ x: 0, y: 0 });
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
    if (!imageFile) { 
      Alert.alert("No Image", "Please select or capture an image first."); 
      return; 
    }
    try {
      setLoading(true); 
      setDetDone(false); 
      dispatch(clearError());
      const form = new FormData();
      form.append("file", imageFile);
      const res  = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const rawDets = data.detections || [];
      
      // Debug logging
      console.log('Raw detections received:', rawDets.length);
      if (rawDets.length > 0) {
        console.log('First detection box:', rawDets[0].box);
        console.log('All detection boxes:', rawDets.map(d => d.box));
      }
      
      if (rawDets.length === 0) {
        setLoading(false);
        Alert.alert(
          "No Waste Detected", 
          "The AI couldn't detect any waste in the image.\n\nSuggestions:\n• Make sure the image is clear\n• Ensure proper lighting\n• Focus the camera on the waste\n• Try taking another photo\n\nYou can also use Demo mode to see a sample.",
          [
            { text: "Try Again", onPress: () => {
              setImageUri(null);
              setImageFile(null);
              setImageBase64(null);
              setDetDone(false);
            }},
            { text: "Use Demo", onPress: loadDemo },
            { text: "Cancel", style: "cancel" }
          ]
        );
        return;
      }
      
      const dets = rawDets.map(d => ({ 
        ...d, 
        type: normaliseType(d.type),
        box: d.box || { x1: 0.1, y1: 0.1, x2: 0.9, y2: 0.9 }
      }));
      const cat  = buildOverallCat(dets);
      setDetections(dets); 
      setDeviceUsed(data.device_used || null);
      setOverallCat(cat); 
      setOverallConf(buildOverallConf(dets));
      setWasteComp(buildComposition(dets)); 
      setTips(buildTips(dets)); 
      setDetDone(true);
      const { allowed, detected } = getAllowedBarangays(manualLoc);
      setAllowedBarangays(allowed);
      const brKey = detected || allowed[0] || "central_bicutan";
      setSelectedBarangay(brKey);
      setBarangayError(validateBarangay(brKey, cat));
      Alert.alert("Analysis Complete!", `Detected ${data.total_detected} object(s).\nCategory: ${cat}`, [
        { text: "Save Report", onPress: () => setReportVis(true) },
        { text: "Skip", style: "cancel" },
      ]);
    } catch (err) {
      setLoading(false);
      Alert.alert("Analysis Failed", err.message || "Unknown error", [
        { text: "Use Demo", onPress: loadDemo },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally { setLoading(false); }
  };

  const loadDemo = () => {
    const demo = [
      { type: "Recyclable", label: "Plastic Bottle (PET #1)", confidence: 0.92, box: { x1: 0.1, y1: 0.1, x2: 0.35, y2: 0.45 } },
      { type: "Recyclable", label: "Detergent Bottle (HDPE #2)", confidence: 0.88, box: { x1: 0.4, y1: 0.05, x2: 0.65, y2: 0.4 } },
      { type: "Recyclable", label: "Plastic Bag (LDPE #4)", confidence: 0.85, box: { x1: 0.7, y1: 0.1, x2: 0.95, y2: 0.35 } },
      { type: "Recyclable", label: "Food Container (PP #5)", confidence: 0.91, box: { x1: 0.05, y1: 0.5, x2: 0.3, y2: 0.85 } },
      { type: "Residual / Non-Recyclable", label: "Sachet (#7 Other)", confidence: 0.87, box: { x1: 0.35, y1: 0.5, x2: 0.6, y2: 0.8 } },
      { type: "Residual / Non-Recyclable", label: "CD (#7 Polycarbonate)", confidence: 0.83, box: { x1: 0.65, y1: 0.55, x2: 0.9, y2: 0.85 } },
      { type: "Biodegradable", label: "Food Waste", confidence: 0.89, box: { x1: 0.15, y1: 0.6, x2: 0.45, y2: 0.95 } },
      { type: "Recyclable", label: "Aluminum Can", confidence: 0.94, box: { x1: 0.5, y1: 0.7, x2: 0.75, y2: 0.92 } },
      { type: "Special / Hazardous Waste", label: "Battery", confidence: 0.86, box: { x1: 0.8, y1: 0.15, x2: 0.95, y2: 0.45 } },
      { type: "Biodegradable", label: "Banana Peel", confidence: 0.84, box: { x1: 0.55, y1: 0.45, x2: 0.85, y2: 0.7 } },
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
    Alert.alert("Demo Mode", "Showing sample detection results with 10 objects.");
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
    if (brErr) { setBarangayError(brErr); Alert.alert("Cannot Submit Report", brErr); return; }

    const transformedDetectedObjects = detections.map((d) => {
      const pt = detectPlasticType(d.label);
      const wacsEntry = detectWacsType(d.label);
      return {
        label: d.label,
        confidence: Math.round(d.confidence * 100),
        category: normaliseType(d.type),
        wacs_sub_category: wacsEntry?.subType ?? null,
        wacs_field: wacsEntry ? WACS_SUB_CATEGORIES[wacsEntry.subType]?.wacsField ?? null : null,
        box: [
          d.box.x1 / imageNatSize.width,
          d.box.y1 / imageNatSize.height,
          d.box.x2 / imageNatSize.width,
          d.box.y2 / imageNatSize.height,
        ],
        ...(pt ? {
          plastic_ric: pt.typeNum,
          plastic_code: pt.code,
          plastic_name: pt.fullName,
          plastic_recyclable: pt.recyclable,
        } : {}),
      };
    });

    const backendClassification = toBackendClassification(overallCat);

    dispatch(createWasteReport({
      image: imageBase64 || imageUri || "",
      detected_objects: transformedDetectedObjects,
      classification: backendClassification,
      classification_confidence: overallConf,
      waste_composition: wasteComp,
      wacs_methodology: true,
      recycling_tips: tips,
      location: {
        address: manualLoc || "Not specified",
        coordinates: location,
        timestamp: new Date().toISOString(),
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
        rawDetRef.current = (data.detections || []).map(d => ({ ...d, type: normaliseType(d.type) }));
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
        await new Promise((r) => setTimeout(r, 100)); continue;
      }
      if (capturing.current) { await new Promise((r) => setTimeout(r, 20)); continue; }
      const t0 = Date.now();
      capturing.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2, base64: true, skipProcessing: true });
        if (photo?.base64 && wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ frame: photo.base64 }));
      } catch (err) {
        if (!err?.message?.includes("already")) console.warn("[Live]", err?.message);
      } finally { capturing.current = false; }
      const wait = Math.max(0, MIN_FRAME_GAP_MS - (Date.now() - t0));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  }, []);

  const startLive = useCallback(async () => {
    if (!captPerm?.granted) {
      const res = await reqCaptPerm();
      if (!res.granted) { Alert.alert("Camera Required", "Please enable camera access to use Live Mode."); return; }
    }
    liveRunning.current = true; capturing.current = false;
    setLiveMode(true); setLiveFrameMs(null);
    updateLiveDetections([]); openWS(); captureLoop();
  }, [captPerm, openWS, captureLoop, updateLiveDetections]);

  const stopLive = useCallback(() => {
    liveRunning.current = false; capturing.current = false;
    closeWS(); setLiveMode(false); setLiveFrameMs(null);
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

  // IMPROVED renderBoxes function with better alignment
  const renderBoxes = (isFullScreen = false, fullImageWidth = null, fullImageHeight = null) => {
    if (!detections.length || !showBoxes) return null;
    
    if (isFullScreen && fullImageWidth && fullImageHeight) {
      // For full screen modal - scale to actual image display size with pinch zoom
      const scaleX = fullImageWidth / imageNatSize.width;
      const scaleY = fullImageHeight / imageNatSize.height;
      
      return detections.map((item, idx) => {
        if (!item.box) return null;
        const { x1, y1, x2, y2 } = item.box;
        const col = catColor(item.type);
        
        // Apply scaling and zoom transform
        let left = x1 * scaleX;
        let top = y1 * scaleY;
        let width = (x2 - x1) * scaleX;
        let height = (y2 - y1) * scaleY;
        
        // Apply pinch zoom scaling
        if (scale !== 1) {
          const centerX = fullImageWidth / 2;
          const centerY = fullImageHeight / 2;
          left = centerX + (left - centerX) * scale + imageOffset.x;
          top = centerY + (top - centerY) * scale + imageOffset.y;
          width = width * scale;
          height = height * scale;
        }
        
        if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
          return null;
        }
        
        return (
          <View 
            key={`full-box-${idx}`}
            style={[
              styles.boundingBox,
              {
                left: left,
                top: top,
                width: width,
                height: height,
                borderWidth: 2.5,
                borderColor: col,
                borderRadius: 6,
                backgroundColor: col + '22',
                zIndex: 10,
              }
            ]}
          >
            <View style={[
              styles.labelBox,
              {
                top: -24,
                left: 0,
                backgroundColor: col,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 5,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }
            ]}>
              <Text style={[styles.labelText, { color: 'white', fontSize: 11, fontWeight: 'bold' }]}>
                {item.label} {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          </View>
        );
      });
    }
    
    // For preview image
    if (displaySize.width === 0 || displaySize.height === 0) {
      return null;
    }
    
    const scaleX = displaySize.width / imageNatSize.width;
    const scaleY = displaySize.height / imageNatSize.height;
    
    return detections.map((item, idx) => {
      if (!item.box) return null;
      const { x1, y1, x2, y2 } = item.box;
      const col = catColor(item.type);
      const left = x1 * scaleX;
      const top = y1 * scaleY;
      const width = (x2 - x1) * scaleX;
      const height = (y2 - y1) * scaleY;
      
      if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
        return null;
      }
      
      return (
        <View 
          key={`preview-box-${idx}`}
          style={[
            styles.boundingBox,
            {
              left: left,
              top: top,
              width: width,
              height: height,
              borderWidth: 2.5,
              borderColor: col,
              borderRadius: 6,
              backgroundColor: col + '22',
              zIndex: 10,
            }
          ]}
        >
          <View style={[
            styles.labelBox,
            {
              top: -24,
              left: 0,
              backgroundColor: col,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 5,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }
          ]}>
            <Text style={[styles.labelText, { color: 'white', fontSize: 11, fontWeight: 'bold' }]}>
              {item.label} {Math.round(item.confidence * 100)}%
            </Text>
          </View>
        </View>
      );
    });
  };

  // Pinch zoom handler for full image modal
  const onPinchEvent = (event) => {
    const newScale = baseScale * event.nativeEvent.scale;
    if (newScale >= 1 && newScale <= 3) {
      setScale(newScale);
    }
  };

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === 2) {
      setBaseScale(scale);
    }
  };

  const renderCompBar = () => {
    const { special, recyclable, residual, biodegradable } = wasteComp;
    const bars = [
      { label: "Special/Haz",   v: special,      col: C.special    },
      { label: "Recyclable",    v: recyclable,    col: C.recyclable },
      { label: "Residual",      v: residual,      col: C.residual   },
      { label: "Biodegradable", v: biodegradable, col: C.bio        },
    ];
    return (
      <View style={styles.card}>
        <View style={styles.secHeader}>
          <View style={[styles.secIconBg, { backgroundColor: "#E8F5EE" }]}>
            <MaterialIcons name="pie-chart" size={16} color={C.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.secTitle}>Waste Composition</Text>
          </View>
        </View>
        <View style={styles.compBar}>
          {bars.map(({ v, col }, i) => v > 0 ? <View key={i} style={[styles.compSeg, { flex: v, backgroundColor: col }]} /> : null)}
        </View>
        <View style={styles.compLegend}>
          {bars.map(({ label, v, col }) => (
            <View key={label} style={styles.compLegendItem}>
              <View style={[styles.compDot, { backgroundColor: col }]} />
              <Text style={styles.compLegendLabel}>{label}</Text>
              <Text style={[styles.compLegendVal, { color: col }]}>{v}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderNearbyPlaces = () => {
    const normCat = overallCat ? normaliseType(overallCat) : null;
    const cfg = normCat ? PLACE_SEARCH_CONFIG[normCat] : null;
    if (!cfg) return null;
    const openInMaps = (place) => {
      const q = encodeURIComponent(place.name + " " + (place.vicinity || ""));
      Linking.openURL(Platform.OS === "ios" ? `maps://?q=${q}` : `geo:0,0?q=${q}`)
        .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
    };
    const openSearch = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.keyword + " near " + (manualLoc || "my location"))}`);
    const distLabel = (place) => {
      if (!location || !place.geometry?.location) {
        if (place.distance) return place.distance < 1 ? `${Math.round(place.distance * 1000)}m away` : `${place.distance.toFixed(1)}km away`;
        return null;
      }
      const { lat: la, lng: lo } = location;
      const lb = place.geometry.location.lat, lb2 = place.geometry.location.lng;
      const dLat = ((lb - la) * Math.PI) / 180, dLon = ((lb2 - lo) * Math.PI) / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(la*Math.PI/180)*Math.cos(lb*Math.PI/180)*Math.sin(dLon/2)**2;
      const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return km < 1 ? `${Math.round(km*1000)}m away` : `${km.toFixed(1)}km away`;
    };
    return (
      <View style={[styles.card, { borderTopWidth: 3, borderTopColor: cfg.accentColor }]}>
        <View style={styles.secHeader}>
          <View style={[styles.secIconBg, { backgroundColor: cfg.bgColor }]}>
            <MaterialIcons name={cfg.icon} size={16} color={cfg.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.secTitle}>{cfg.label}</Text>
          </View>
        </View>
        {placesLoad && <View style={styles.placesLoadWrap}><ActivityIndicator size="small" color={cfg.accentColor} /><Text style={[styles.placesLoadTxt, { color: cfg.accentColor }]}>Finding nearby locations…</Text></View>}
        {placesErr && !placesLoad && <View style={styles.placesErrWrap}><Ionicons name="warning-outline" size={18} color={C.residual} /><Text style={styles.placesErrTxt}>{placesErr}</Text></View>}
        {!placesLoad && !placesErr && nearbyPlaces.length === 0 && (
          <View style={styles.placesEmptyWrap}>
            <Ionicons name="location-outline" size={32} color={C.textLight} />
            <Text style={styles.placesEmptyTitle}>No places found nearby</Text>
          </View>
        )}
        {!placesLoad && nearbyPlaces.map((place, i) => {
          const dist = distLabel(place);
          const isOpen = place.opening_hours?.open_now;
          const rating = place.rating;
          return (
            <Pressable key={place.place_id ?? i} style={[styles.placeCard, { borderLeftColor: cfg.accentColor }]} onPress={() => openInMaps(place)} android_ripple={{ color: cfg.bgColor }}>
              <View style={[styles.placeIdx, { backgroundColor: cfg.accentColor }]}><Text style={styles.placeIdxTxt}>{i+1}</Text></View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.placeVic} numberOfLines={1}>{place.vicinity}</Text>
                <View style={styles.placeMeta}>
                  {dist && <View style={styles.placeChip}><Ionicons name="navigate-outline" size={11} color={cfg.accentColor} /><Text style={[styles.placeChipTxt, { color: cfg.accentColor }]}>{dist}</Text></View>}
                  {rating != null && <View style={styles.placeChip}><Ionicons name="star" size={11} color="#F5C842" /><Text style={styles.placeChipTxt}>{rating.toFixed(1)}</Text></View>}
                  {isOpen != null && <View style={[styles.placeChip, { backgroundColor: isOpen ? "#E8F5EE" : "#FFEBEE" }]}><View style={[styles.openDot, { backgroundColor: isOpen ? "#2D7A4F" : "#C62828" }]} /><Text style={[styles.placeChipTxt, { color: isOpen ? "#2D7A4F" : "#C62828" }]}>{isOpen ? "Open" : "Closed"}</Text></View>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={cfg.accentColor} />
            </Pressable>
          );
        })}
        <Pressable style={[styles.mapsBtn, { borderColor: cfg.accentColor }]} onPress={openSearch}>
          <MaterialIcons name="map" size={16} color={cfg.accentColor} />
          <Text style={[styles.mapsBtnTxt, { color: cfg.accentColor }]}>Search more on Google Maps</Text>
          <Ionicons name="open-outline" size={14} color={cfg.accentColor} />
        </Pressable>
      </View>
    );
  };

  if (liveMode) {
    const scaleX = SW / liveImgW.current;
    const scaleY = SH / liveImgH.current;
    return (
      <View style={styles.liveContainer}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={liveFacing} pictureSize="640x480" />
        <LiveOverlay detections={liveDetections} scaleX={scaleX} scaleY={scaleY} />
        <SafeAreaView style={styles.liveTopBar}>
          <Pressable style={styles.liveIconBtn} onPress={stopLive}><Ionicons name="close" size={24} color="white" /></Pressable>
          <LiveStatus connected={wsConnected} count={liveDetections.length} ms={liveFrameMs} />
          <Pressable style={styles.liveIconBtn} onPress={() => setLiveFacing((f) => f === "back" ? "front" : "back")}><Ionicons name="camera-reverse" size={24} color="white" /></Pressable>
        </SafeAreaView>
        <View style={styles.liveBottomPanel}>
          <LiveChips detections={liveDetections} />
          <Pressable style={styles.liveCaptureRow} onPress={captureLiveSnapshot}>
            <View style={styles.liveCaptureBtn}><Ionicons name="camera" size={30} color="white" /></View>
            <Text style={styles.liveCaptureTxt}>Capture & Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <ScrollView style={styles.container} contentContainerStyle={styles.contentCont}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); resetForm(); setTimeout(() => setRefreshing(false), 800); }} tintColor={C.accent} colors={[C.accent]} />}>

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color="white" /></Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Waste Analysis</Text>
                <Text style={styles.headerSub}>AI-Powered Waste Detection</Text>
              </View>
              <Pressable style={styles.histBtn} onPress={() => navigation.navigate("ReportHistory")}><Ionicons name="time-outline" size={22} color="white" /></Pressable>
            </View>
            <View style={styles.headerChips}>
              {user && <View style={styles.headerChip}><Ionicons name="person" size={12} color="rgba(255,255,255,0.8)" /><Text style={styles.headerChipTxt} numberOfLines={1}>{user.email}</Text></View>}
              {deviceUsed && <View style={[styles.headerChip, { backgroundColor: "rgba(245,200,66,0.2)" }]}><Ionicons name="hardware-chip" size={12} color={C.highlight} /><Text style={[styles.headerChipTxt, { color: C.highlight }]}>{deviceUsed.toUpperCase()}</Text></View>}
            </View>
          </View>

          {usingDemo && (
            <View style={styles.demoBanner}><Ionicons name="flask" size={14} color={C.highlight} /><Text style={styles.demoBannerTxt}>DEMO MODE — SAMPLE DATA</Text></View>
          )}

          <View style={styles.card}>
            <View style={styles.secHeader}><View style={[styles.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="location" size={16} color={C.secondary} /></View><Text style={styles.secTitle}>Location</Text></View>
            <TextInput style={styles.input} placeholder="Enter or auto-detect location" placeholderTextColor={C.textLight} value={manualLoc} onChangeText={setManualLoc} />
            <Pressable style={styles.outlineBtn} onPress={getLocation}><Ionicons name="locate" size={16} color={C.secondary} /><Text style={styles.outlineBtnTxt}>Use Current Location</Text></Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.secHeader}><View style={[styles.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="camera" size={16} color={C.secondary} /></View><Text style={styles.secTitle}>Select Image</Text></View>
            <View style={styles.cropInfoBanner}><Ionicons name="crop-outline" size={14} color="#1A6B9A" /><Text style={styles.cropInfoTxt}>After selecting a photo, drag to select any area you want to analyse.</Text></View>
            <View style={styles.srcGrid}>
              {[
                { col: C.secondary, icon: "camera",  label: "Camera",  sub: "Drag to crop",  fn: () => pickImage(true) },
                { col: "#1A6B9A",   icon: "images",  label: "Gallery", sub: "Drag to crop",  fn: () => pickImage(false) },
                { col: "#7A5C1E",   icon: "flask",   label: "Demo",    sub: "Sample data",   fn: () => Alert.alert("Demo Mode", "Load sample data?", [{ text: "Cancel", style: "cancel" }, { text: "Load", onPress: loadDemo }]) },
              ].map(({ col, icon, label, sub, fn }) => (
                <Pressable key={label} style={[styles.srcCard, { backgroundColor: col }]} onPress={fn} disabled={loading || repLoading}>
                  <View style={styles.srcIcon}><Ionicons name={icon} size={22} color="white" /></View>
                  <Text style={styles.srcCardTxt}>{label}</Text>
                  <Text style={styles.srcCardSub}>{sub}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.liveModeBtn} onPress={startLive} disabled={loading || repLoading}>
              <View style={styles.liveModeBtnL}><Ionicons name="videocam" size={20} color="white" /><View><Text style={styles.liveModeTitle}>Live AI Detection</Text><Text style={styles.liveModeSub}>Real-time scanning</Text></View></View>
              <View style={styles.liveModeArrow}><Ionicons name="chevron-forward" size={18} color="white" /></View>
            </Pressable>
          </View>

          {imageUri && (
            <View style={styles.card}>
              <View style={styles.secHeader}>
                <View style={[styles.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="image" size={16} color={C.secondary} /></View>
                <Text style={styles.secTitle}>{usingDemo ? "Demo Image" : "Selected Image"}</Text>
                {detections.length > 0 && (
                  <Pressable style={styles.toggleBoxBtn} onPress={() => setShowBoxes(!showBoxes)}>
                    <Ionicons name={showBoxes ? "eye-off-outline" : "eye-outline"} size={16} color={C.secondary} />
                    <Text style={styles.toggleBoxTxt}>{showBoxes ? "Hide" : "Show"} boxes</Text>
                  </Pressable>
                )}
              </View>
              {activeCropMode === "free" && (
                <View style={styles.cropModeBadge}>
                  <Ionicons name="crop-outline" size={13} color="#1A6B9A" />
                  <Text style={styles.cropModeBadgeTxt}>Free crop applied</Text>
                  <Pressable onPress={reCrop} style={styles.cropChangeBtn}><Text style={styles.cropChangeTxt}>Re-crop</Text></Pressable>
                </View>
              )}
              <TouchableOpacity 
                style={styles.imgCont} 
                activeOpacity={0.9} 
                onPress={() => setFullImgVis(true)}
              >
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.previewImg} 
                  resizeMode="cover" 
                  onLoad={(e) => {
                    const { width: nw, height: nh } = e.nativeEvent.source;
                    console.log('Image loaded - natural size:', nw, nh);
                    setImageNatSize({ width: nw, height: nh });
                    const containerWidth = SW - 40;
                    const scaledHeight = containerWidth * (nh / nw);
                    setDisplaySize({ width: containerWidth, height: scaledHeight });
                    console.log('Display size set to:', containerWidth, scaledHeight);
                  }} 
                />
                {renderBoxes(false)}
                <View style={styles.expandBadge}><Ionicons name="expand-outline" size={15} color="white" /><Text style={styles.expandTxt}>View full</Text></View>
              </TouchableOpacity>
            </View>
          )}

          {imageUri && !detDone && !usingDemo && (
            <View style={styles.analyseWrap}>
              {loading ? (
                <View style={styles.loadingCard}><ActivityIndicator size="large" color={C.accent} /><Text style={styles.loadingTitle}>Analysing…</Text><Text style={styles.loadingSub}>Processing image</Text></View>
              ) : (
                <Pressable style={styles.analyseBtn} onPress={handleDetect}><Ionicons name="analytics" size={22} color="white" /><Text style={styles.analyseBtnTxt}>Analyse Waste</Text></Pressable>
              )}
            </View>
          )}

          {detDone && detections.length > 0 && (
            <>
              <View style={styles.summaryRow}>
                {[
                  { v: detections.length, l: "Objects" },
                  { v: `${overallConf}%`, l: "Confidence" },
                  { v: deviceUsed?.toUpperCase() ?? "—", l: "Device" },
                ].map(({ v, l }) => (
                  <View key={l} style={styles.summaryPill}><Text style={styles.summaryPillVal}>{v}</Text><Text style={styles.summaryPillLbl}>{l}</Text></View>
                ))}
              </View>

              <View style={[styles.catHero, { backgroundColor: catColor(overallCat) }]}>
                <View style={styles.catHeroL}>
                  {catIcon(overallCat)}
                  <View>
                    <Text style={styles.catHeroLbl}>Primary Category</Text>
                    <Text style={styles.catHeroVal}>{overallCat}</Text>
                  </View>
                </View>
                <Text style={styles.catHeroConf}>{overallConf}%</Text>
              </View>

              {renderCompBar()}

              <View style={styles.card}>
                <View style={styles.secHeader}>
                  <View style={[styles.secIconBg, { backgroundColor: "#E8F5EE" }]}><Ionicons name="list" size={16} color={C.secondary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.secTitle}>Detected Objects ({detections.length})</Text>
                  </View>
                </View>
                {detections.map((item, i) => {
                  const pt = detectPlasticType(item.label);
                  const normType = normaliseType(item.type);
                  return (
                    <View key={i} style={[styles.objRow, { borderLeftColor: catColor(item.type) }]}>
                      <View style={[styles.objDot, { backgroundColor: catColor(item.type) }]}>{catIcon(item.type)}</View>
                      <View style={styles.objInfo}>
                        <View style={styles.objInfoTop}>
                          <Text style={styles.objLabel}>{item.label}</Text>
                          <Text style={[styles.objConf, { color: catColor(item.type) }]}>{Math.round(item.confidence*100)}%</Text>
                        </View>
                        <View style={styles.objInfoBot}>
                          {matIcon(item.label)}
                          <Text style={styles.objType}>{normType}</Text>
                          {pt && (
                            <View style={[styles.objPlasticTag, { backgroundColor: pt.color }]}>
                              <Text style={styles.objPlasticTagTxt}>RIC {pt.typeNum} {pt.code}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Plastic Type Information with clickable tabs */}
              {plasticItems.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.secHeader}>
                    <View style={[styles.secIconBg, { backgroundColor: "#E8F5EE" }]}>
                      <MaterialCommunityIcons name="bottle-soda-classic" size={16} color={C.secondary} />
                    </View>
                    <Text style={styles.secTitle}>Plastic Type Information</Text>
                  </View>
                  <PlasticTypeBadge 
                    plasticItems={plasticItems}
                    selectedIndex={selectedPlasticIndex}
                    onSelectPlastic={setSelectedPlasticIndex}
                  />
                </View>
              )}

              <TMFKWasteAssistant detections={detections} overallCat={overallCat} manualLoc={manualLoc} />

              {renderNearbyPlaces()}

              <Pressable style={[styles.saveBtn, barangayError && styles.saveBtnDisabled]}
                onPress={() => { if (barangayError) { Alert.alert("Cannot Submit", barangayError); return; } setReportVis(true); }}
                disabled={repLoading}>
                {repLoading
                  ? <ActivityIndicator size="small" color="white" />
                  : <><Ionicons name="save-outline" size={20} color="white" /><Text style={styles.saveBtnTxt}>{usingDemo ? "Save Demo Report" : "Save Analysis Report"}</Text></>}
              </Pressable>
            </>
          )}

          {/* Full Image Modal with pinch zoom */}
          <Modal visible={fullImgVis} animationType="fade" transparent onRequestClose={() => {
            setFullImgVis(false);
            setScale(1);
            setBaseScale(1);
            setImageOffset({ x: 0, y: 0 });
          }}>
            <View style={styles.fullModal}>
              <View style={styles.fullModalTop}>
                <Text style={styles.fullModalTitle}>Full Image</Text>
                <Pressable onPress={() => {
                  setFullImgVis(false);
                  setScale(1);
                  setBaseScale(1);
                  setImageOffset({ x: 0, y: 0 });
                }} style={styles.closeCircle}>
                  <Ionicons name="close" size={22} color="white" />
                </Pressable>
              </View>
              <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <PinchGestureHandler
                  onGestureEvent={onPinchEvent}
                  onHandlerStateChange={onPinchStateChange}
                >
                  <View style={{ flex: 1 }}>
                    <Image 
                      source={{ uri: imageUri }} 
                      style={[
                        styles.fullImg,
                        {
                          transform: [{ scale: scale }],
                        }
                      ]} 
                      resizeMode="contain"
                      onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        console.log('Full image container size:', width, height);
                        setFullImgSize({ width, height });
                      }}
                    />
                    {fullImgSize.width > 0 && fullImgSize.height > 0 && renderBoxes(true, fullImgSize.width, fullImgSize.height)}
                  </View>
                </PinchGestureHandler>
              </View>
              <Text style={styles.fullModalInfo}>
                {detections.length} object(s) · {overallCat} · {overallConf}% confidence
                {"\n"}Pinch to zoom
              </Text>
            </View>
          </Modal>

          {/* Report Modal */}
          <Modal visible={reportVis} animationType="slide" transparent onRequestClose={() => setReportVis(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{usingDemo ? "Save Demo Report" : "Save Waste Report"}</Text>
                  <Pressable onPress={() => setReportVis(false)} style={styles.closeCircle}><Ionicons name="close" size={20} color={C.textMid} /></Pressable>
                </View>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {[
                    { icon: "person-outline",       label: "User",     value: user?.email ?? "—" },
                    { icon: "flag-outline",          label: "Category", value: overallCat },
                    { icon: "cube-outline",          label: "Objects",  value: String(detections.length) },
                    { icon: "location-outline",      label: "Location", value: manualLoc || "Not specified" },
                    { icon: "hardware-chip-outline", label: "Device",   value: deviceUsed?.toUpperCase() ?? "—" },
                  ].map(({ icon, label, value }) => (
                    <View key={label} style={styles.detailRow}><Ionicons name={icon} size={15} color={C.textLight} style={{ width: 22 }} /><Text style={styles.detailLbl}>{label}</Text><Text style={styles.detailVal} numberOfLines={1}>{value}</Text></View>
                  ))}
                  <BarangaySelector
                    selected={selectedBarangay}
                    onSelect={handleBarangaySelect}
                    classification={overallCat}
                    disabled={repLoading}
                    allowedBarangays={allowedBarangays}
                    locationMessage={locationMessage}
                  />
                  {barangayError && (
                    <View style={styles.modalBarangayErr}><Ionicons name="warning" size={14} color={C.special} /><Text style={styles.modalBarangayErrTxt}>{barangayError}</Text></View>
                  )}
                </ScrollView>
                <View style={styles.notesSection}>
                  <Text style={styles.notesLbl}>Additional Notes (optional)</Text>
                  <TextInput style={styles.notesInput} placeholder="Describe any additional observations…" placeholderTextColor={C.textLight}
                    value={userMsg} onChangeText={setUserMsg} multiline numberOfLines={3} textAlignVertical="top" />
                </View>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setReportVis(false)} disabled={repLoading}><Text style={styles.cancelBtnTxt}>Cancel</Text></Pressable>
                  <Pressable style={[styles.confirmBtn, (!!barangayError || repLoading) && { opacity: 0.6 }]} onPress={handleSaveReport} disabled={!!barangayError || repLoading}>
                    {repLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.confirmBtnTxt}>{usingDemo ? "Save Demo" : "Save Report"}</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Styles
const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: C.cream },
  container:       { flex: 1, backgroundColor: C.cream },
  contentCont:     { paddingBottom: 48 },
  header:          { backgroundColor: C.primary, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 18, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  headerTop:       { flexDirection: "row", alignItems: "center", paddingTop: Platform.OS === "android" ? 44 : 16 },
  backBtn:         { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  histBtn:         { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  headerCenter:    { flex: 1, alignItems: "center" },
  headerTitle:     { color: "white", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerSub:       { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },
  headerChips:     { flexDirection: "row", gap: 8, marginTop: 14, justifyContent: "center" },
  headerChip:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, maxWidth: 160 },
  headerChipTxt:   { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  demoBanner:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#3A2A00", marginHorizontal: 20, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.highlight + "44" },
  demoBannerTxt:   { color: C.highlight, fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  card:            { backgroundColor: C.cardBg, marginHorizontal: 20, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: C.border },
  secHeader:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  secIconBg:       { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  secTitle:        { fontSize: 15, fontWeight: "700", color: C.textDark, flex: 1 },
  input:           { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textDark, backgroundColor: C.cream, marginBottom: 10 },
  outlineBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.secondary },
  outlineBtnTxt:   { color: C.secondary, fontWeight: "600", fontSize: 14 },
  cropInfoBanner:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F4FD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: "#BEE0F5" },
  cropInfoTxt:     { fontSize: 12, color: "#1A6B9A", flex: 1, lineHeight: 17 },
  cropModeBadge:   { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10, borderWidth: 1, backgroundColor: "#E8F4FD18", borderColor: "#1A6B9A55" },
  cropModeBadgeTxt:{ fontSize: 12, fontWeight: "700", flex: 1, color: "#1A6B9A" },
  cropChangeBtn:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.06)" },
  cropChangeTxt:   { fontSize: 11, fontWeight: "700", color: "#1A6B9A" },
  srcGrid:         { flexDirection: "row", gap: 10, marginBottom: 12 },
  srcCard:         { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  srcIcon:         { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  srcCardTxt:      { color: "white", fontSize: 13, fontWeight: "700" },
  srcCardSub:      { color: "rgba(255,255,255,0.7)", fontSize: 10, textAlign: "center" },
  liveModeBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.primary, borderRadius: 14, padding: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  liveModeBtnL:    { flexDirection: "row", alignItems: "center", gap: 12 },
  liveModeTitle:   { color: "white", fontWeight: "700", fontSize: 14 },
  liveModeSub:     { color: "rgba(255,255,255,0.65)", fontSize: 11 },
  liveModeArrow:   { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  imgCont:         { borderRadius: 12, overflow: "hidden", backgroundColor: "#E8EDE9", minHeight: 220, position: "relative" },
  previewImg:      { width: "100%", height: 280 },
  expandBadge:     { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.55)", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  expandTxt:       { color: "white", fontSize: 11, fontWeight: "600" },
  toggleBoxBtn:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#E8F5EE" },
  toggleBoxTxt:    { color: C.secondary, fontSize: 12, fontWeight: "600" },
  boundingBox:     { position: "absolute", borderWidth: 2, borderRadius: 6, zIndex: 10 },
  labelBox:        { position: "absolute", top: -24, left: 0, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  labelText:       { color: "white", fontSize: 11, fontWeight: "bold" },
  analyseWrap:     { marginHorizontal: 20, marginBottom: 14 },
  loadingCard:     { backgroundColor: C.cardBg, borderRadius: 16, padding: 28, alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border },
  loadingTitle:    { fontSize: 16, fontWeight: "700", color: C.textDark },
  loadingSub:      { fontSize: 13, color: C.textLight },
  analyseBtn:      { backgroundColor: C.secondary, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  analyseBtnTxt:   { color: "white", fontSize: 16, fontWeight: "700" },
  summaryRow:      { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 14 },
  summaryPill:     { flex: 1, backgroundColor: C.cardBg, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryPillVal:  { fontSize: 22, fontWeight: "800", color: C.primary },
  summaryPillLbl:  { fontSize: 11, color: C.textLight, marginTop: 2, fontWeight: "500" },
  catHero:         { marginHorizontal: 20, marginBottom: 8, borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  catHeroL:        { flexDirection: "row", alignItems: "center", gap: 12 },
  catHeroLbl:      { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "500" },
  catHeroVal:      { color: "white", fontSize: 18, fontWeight: "800" },
  catHeroConf:     { color: "white", fontSize: 28, fontWeight: "900", opacity: 0.9 },
  compBar:         { height: 14, borderRadius: 7, flexDirection: "row", overflow: "hidden", backgroundColor: C.border, marginBottom: 14 },
  compSeg:         { height: "100%" },
  compLegend:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  compLegendItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
  compDot:         { width: 8, height: 8, borderRadius: 4 },
  compLegendLabel: { fontSize: 12, color: C.textMid },
  compLegendVal:   { fontSize: 12, fontWeight: "700" },
  objRow:          { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 12, borderLeftWidth: 3, borderRadius: 10, marginBottom: 8, backgroundColor: C.cream },
  objDot:          { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  objInfo:         { flex: 1 },
  objInfoTop:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  objLabel:        { fontSize: 14, fontWeight: "700", color: C.textDark },
  objConf:         { fontSize: 14, fontWeight: "800" },
  objInfoBot:      { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  objType:         { fontSize: 12, color: C.textLight },
  objPlasticTag:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  objPlasticTagTxt:{ fontSize: 10, fontWeight: "800", color: "white" },
  saveBtn:         { backgroundColor: C.primary, borderRadius: 14, padding: 16, marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6, marginBottom: 14 },
  saveBtnDisabled: { backgroundColor: "#888", shadowOpacity: 0 },
  saveBtnTxt:      { color: "white", fontSize: 15, fontWeight: "700" },
  fullModal:       { flex: 1, backgroundColor: "rgba(10,20,14,0.96)", padding: 20, paddingTop: Platform.OS === "android" ? 50 : 60 },
  fullModalTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  fullModalTitle:  { color: "white", fontSize: 18, fontWeight: "800" },
  fullImg:         { flex: 1, borderRadius: 16 },
  fullModalInfo:   { color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center", marginTop: 14 },
  closeCircle:     { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet:      { backgroundColor: C.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === "android" ? 24 : 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 12 },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  modalTitle:      { fontSize: 17, fontWeight: "800", color: C.textDark },
  detailRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 7, gap: 8 },
  detailLbl:       { fontSize: 13, color: C.textLight, width: 65 },
  detailVal:       { fontSize: 13, color: C.textDark, fontWeight: "600", flex: 1 },
  notesSection:    { marginVertical: 16 },
  notesLbl:        { fontSize: 13, fontWeight: "600", color: C.textMid, marginBottom: 8 },
  notesInput:      { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 13, color: C.textDark, minHeight: 80, backgroundColor: C.cream },
  modalActions:    { flexDirection: "row", gap: 10 },
  cancelBtn:       { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: C.cream, borderWidth: 1.5, borderColor: C.border },
  cancelBtnTxt:    { color: C.textMid, fontSize: 14, fontWeight: "600" },
  confirmBtn:      { flex: 2, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  confirmBtnTxt:   { color: "white", fontSize: 14, fontWeight: "700" },
  modalBarangayErr:{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, padding: 12, backgroundColor: "#FFEBEE", borderRadius: 10 },
  modalBarangayErrTxt: { color: C.special, fontSize: 12, flex: 1, lineHeight: 17 },
  barangaySelector:{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  barangayHint:    { fontSize: 12, color: C.textLight, marginBottom: 10, lineHeight: 17 },
  barangayOption:  { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, marginBottom: 8 },
  barangayOptionDisabled:     { opacity: 0.45, backgroundColor: "#F5F5F5" },
  barangayOptionDot:   { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  barangayOptionLabel: { fontSize: 13, fontWeight: "600", color: C.textDark },
  locationInfoBanner:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F4FD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  locationInfoText:    { fontSize: 11, color: "#1A6B9A", flex: 1, lineHeight: 16 },
  singleOptionBanner:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5EE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  singleOptionText:    { fontSize: 11, color: "#2D7A4F", flex: 1, lineHeight: 16, fontWeight: "500" },
  placesLoadWrap:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, justifyContent: "center" },
  placesLoadTxt:       { fontSize: 13, fontWeight: "600" },
  placesErrWrap:       { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  placesErrTxt:        { fontSize: 13, color: C.residual, flex: 1 },
  placesEmptyWrap:     { alignItems: "center", paddingVertical: 20, gap: 6 },
  placesEmptyTitle:    { fontSize: 14, fontWeight: "700", color: C.textMid },
  placeCard:           { flexDirection: "row", alignItems: "center", backgroundColor: C.cream, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, gap: 10 },
  placeIdx:            { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  placeIdxTxt:         { color: "white", fontSize: 12, fontWeight: "800" },
  placeInfo:           { flex: 1 },
  placeName:           { fontSize: 14, fontWeight: "700", color: C.textDark, marginBottom: 2 },
  placeVic:            { fontSize: 12, color: C.textLight, marginBottom: 5 },
  placeMeta:           { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  placeChip:           { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.border, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  placeChipTxt:        { fontSize: 11, fontWeight: "600", color: C.textMid },
  openDot:             { width: 6, height: 6, borderRadius: 3 },
  mapsBtn:             { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5 },
  mapsBtnTxt:          { fontSize: 13, fontWeight: "600" },
  liveContainer:       { flex: 1, backgroundColor: "black" },
  liveTopBar:          { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 44 : 0, paddingBottom: 14, backgroundColor: "rgba(0,0,0,0.6)" },
  liveIconBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  liveTitleWrap:       { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
  livePulse:           { width: 8, height: 8, borderRadius: 4 },
  liveTitleText:       { color: "white", fontSize: 13, fontWeight: "700" },
  liveMsText:          { color: "rgba(255,255,255,0.45)", fontSize: 10 },
  liveBottomPanel:     { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, paddingBottom: Platform.OS === "android" ? 28 : 40, paddingTop: 16, paddingHorizontal: 16, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", gap: 16 },
  liveChipScroll:      { maxHeight: 50, width: "100%" },
  liveChip:            { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  liveChipText:        { color: "white", fontSize: 12, fontWeight: "700" },
  liveCaptureRow:      { alignItems: "center", gap: 8 },
  liveCaptureBtn:      { width: 70, height: 70, borderRadius: 35, backgroundColor: "#C62828", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.3)", shadowColor: "#C62828", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  liveCaptureTxt:      { color: "white", fontSize: 12, fontWeight: "600" },
  aiPanel:             { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, padding: 18, backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  aiHeader:            { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  aiAvatarWrap:        { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiTitle:             { color: "white", fontSize: 15, fontWeight: "800" },
  aiSubtitle:          { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 },
  aiModeRow:           { flexDirection: "row", gap: 8, marginBottom: 14 },
  aiModeBtn:           { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)" },
  aiModeBtnActive:     { backgroundColor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.4)" },
  aiModeBtnTxt:        { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.55)" },
  aiTab:               { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  aiTabTxt:            { fontSize: 12, fontWeight: "700" },
  aiTipsOuter:         { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, height: 260, overflow: "hidden" },
  aiTipsScrollView:    { flex: 1 },
  aiTipsContent:       { padding: 14, paddingBottom: 20 },
  aiLoadingRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, justifyContent: "center" },
  aiLoadingTxt:        { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  aiTipRow:            { flexDirection: "row", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  aiTipNum:            { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  aiTipNumTxt:         { color: "white", fontSize: 11, fontWeight: "800" },
  aiTipTxt:            { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 20, flex: 1 },
  aiAskHint:           { color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  aiSuggestChip:       { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200 },
  aiSuggestChipTxt:    { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  aiAskRow:            { flexDirection: "row", gap: 8, marginBottom: 10 },
  aiAskInput:          { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: "white", fontSize: 13, maxHeight: 80 },
  aiAskSendBtn:        { width: 44, height: 44, borderRadius: 12, backgroundColor: C.secondary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiAnswerBox:         { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", marginTop: 4 },
  aiAnswerHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  aiAnswerHeaderTxt:   { color: C.highlight, fontSize: 12, fontWeight: "700" },
  aiAnswerScroll:      { maxHeight: 200 },
  aiAnswerTxt:         { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 20 },
  plasticDetailsCard:  { backgroundColor: C.cream, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  plasticTypeTabs:     { flexDirection: "row", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, maxHeight: 50 },
  plasticTypeTab:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginRight: 8, backgroundColor: "white" },
  plasticTypeTabDot:   { width: 8, height: 8, borderRadius: 4 },
  plasticTypeTabText:  { fontSize: 11, fontWeight: "600", color: C.textDark },
  plasticDetailsHeader:{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderLeftWidth: 4 },
  plasticDetailsNum:   { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  plasticDetailsNumTxt:{ color: "white", fontSize: 18, fontWeight: "900" },
  plasticDetailsCode:  { fontSize: 16, fontWeight: "800" },
  plasticDetailsName:  { fontSize: 12, color: C.textMid, marginTop: 2 },
  plasticDetailsTag:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  plasticDetailsTagTxt:{ fontSize: 11, fontWeight: "700" },
  plasticDetailsBody:  { padding: 12, gap: 10 },
  plasticDetailsDesc:  { fontSize: 13, color: C.textDark, lineHeight: 18 },
  plasticDetailsSection:{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  plasticDetailsSectionTitle: { fontSize: 12, fontWeight: "700", color: C.textMid },
  plasticDetailsText:  { fontSize: 12, color: C.textLight, lineHeight: 17, marginLeft: 20 },
});
  
export default WasteDetection;