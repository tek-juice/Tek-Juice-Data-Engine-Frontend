import apiClient from './axios';
import type {
  AEOAnalysisResponse,
  AnswerScoreResponse,
  QuestionMapResponse,
  FeaturedSnippetResponse,
  VoiceSearchResponse,
  PositionZeroResponse,
  AEOEngineTarget,
} from '../types';

// ── AEO Engine ─────────────────────────────────────────────────────────────────

export interface AEOAnalyzePayload {
  document_id: string;
  tenant_id: string;
  content: string;
  title?: string;
  url?: string;
  target_questions?: string[];
  engine_targets?: string[];
}

/**
 * POST /api/v1/aeo/analyze
 * Run the complete AEO pipeline — answer scoring, question mapping,
 * featured snippets, voice search, and position-zero, combined.
 */
export async function analyzeAeo(
  payload: AEOAnalyzePayload,
): Promise<AEOAnalysisResponse> {
  const { data } = await apiClient.post<AEOAnalysisResponse>(
    '/api/v1/aeo/analyze',
    payload,
  );
  return data;
}

/**
 * POST /api/v1/aeo/score-answer
 * Score a single content block for answer engine extraction quality.
 */
export async function scoreAnswer(
  content: string,
  question?: string,
): Promise<AnswerScoreResponse> {
  const { data } = await apiClient.post<AnswerScoreResponse>(
    '/api/v1/aeo/score-answer',
    { content, question: question ?? '' },
  );
  return data;
}

/**
 * POST /api/v1/aeo/map-questions
 * Extract and classify all explicit/implicit questions in content.
 */
export async function mapQuestions(
  content: string,
  document_id?: string,
): Promise<QuestionMapResponse> {
  const { data } = await apiClient.post<QuestionMapResponse>(
    '/api/v1/aeo/map-questions',
    { content, document_id: document_id ?? '' },
  );
  return data;
}

/**
 * POST /api/v1/aeo/featured-snippet
 * Identify and score featured snippet candidates.
 */
export async function analyzeFeaturedSnippet(
  content: string,
): Promise<FeaturedSnippetResponse> {
  const { data } = await apiClient.post<FeaturedSnippetResponse>(
    '/api/v1/aeo/featured-snippet',
    { content },
  );
  return data;
}

/**
 * POST /api/v1/aeo/voice-search
 * Optimise content for voice search and smart speakers.
 */
export async function analyzeVoiceSearch(
  content: string,
  question?: string,
): Promise<VoiceSearchResponse> {
  const { data } = await apiClient.post<VoiceSearchResponse>(
    '/api/v1/aeo/voice-search',
    { content, question: question ?? '' },
  );
  return data;
}

/**
 * POST /api/v1/aeo/position-zero
 * Analyse all position-zero opportunities (snippets, answer boxes, PAA, knowledge panel).
 */
export async function analyzePositionZero(
  content: string,
  title?: string,
  url?: string,
): Promise<PositionZeroResponse> {
  const { data } = await apiClient.post<PositionZeroResponse>(
    '/api/v1/aeo/position-zero',
    { content, title: title ?? '', url: url ?? '' },
  );
  return data;
}

/**
 * GET /api/v1/aeo/engine-targets
 * List all supported answer engine targets.
 */
export async function getEngineTargets(): Promise<AEOEngineTarget[]> {
  const { data } = await apiClient.get<{ engine_targets: AEOEngineTarget[] }>(
    '/api/v1/aeo/engine-targets',
  );
  return data.engine_targets;
}
