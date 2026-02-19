export interface ScoreHistoryPoint {
  date: string;
  score: number;
}

export interface Complaint {
  topic: string;
  percentage: number;
  reviewCount: number;
  trend: "rising" | "stable" | "declining";
}

export interface ActionPlanItem {
  priority: number;
  action: string;
  expectedImpact: string;
  difficulty: "low" | "medium" | "high";
}

export interface DistrictComparison {
  venueScore: number;
  districtAvg: number;
  cityAvg: number;
  rank: number;
  totalInDistrict: number;
}

export interface AIAnalysis {
  summary: string;
  weakPoints: string[];
  strongPoints: string[];
  sentimentTrend: "improving" | "stable" | "declining";
}

export interface DashboardData {
  venue: {
    id: string;
    name: string;
    liveScore: number;
    category: string;
    address: string;
    reviewCount: number;
  };
  scoreHistory: ScoreHistoryPoint[];
  topComplaints: Complaint[];
  actionPlan: ActionPlanItem[];
  districtComparison: DistrictComparison;
  aiAnalysis: AIAnalysis | null;
  generatedAt: string;
}
