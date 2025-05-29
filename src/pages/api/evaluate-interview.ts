import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

interface InterviewResponse {
  question_id: string;
  question: string;
  video_url: string;
}

interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  skills: string[];
  experience: {
    company: string;
    position: string;
    duration: string;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduation_year: string;
  }[];
}

interface EvaluationRequest {
  responses: InterviewResponse[];
  jobDescription: string;
  candidateProfile: CandidateProfile;
}

interface EvaluationResponse {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { responses, jobDescription, candidateProfile }: EvaluationRequest = await req.json();

    // Analyze each response
    const responseAnalyses = await Promise.all(
      responses.map(async (response: InterviewResponse) => {
        const analysis = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert interviewer evaluating a candidate's response. 
              Consider the job description and candidate's profile in your evaluation.
              Provide a score (0-100) and detailed feedback.`
            },
            {
              role: "user",
              content: `Job Description: ${jobDescription}
              Candidate Profile: ${JSON.stringify(candidateProfile)}
              Question: ${response.question}
              Response: ${response.video_url}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        return {
          questionId: response.question_id,
          analysis: analysis.choices[0].message.content,
        };
      })
    );

    // Generate overall evaluation
    const overallEvaluation = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer providing a comprehensive evaluation of a candidate's interview performance.
          Consider all responses and provide:
          1. Overall score (0-100)
          2. Technical score (0-100)
          3. Communication score (0-100)
          4. Problem-solving score (0-100)
          5. Detailed feedback
          6. Key strengths
          7. Areas for improvement`
        },
        {
          role: "user",
          content: `Job Description: ${jobDescription}
          Candidate Profile: ${JSON.stringify(candidateProfile)}
          Response Analyses: ${JSON.stringify(responseAnalyses)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const evaluationContent = overallEvaluation.choices[0].message.content;
    
    // Parse the evaluation content to extract structured data
    const evaluationData: EvaluationResponse = {
      overall_score: extractScore(evaluationContent, 'Overall score'),
      technical_score: extractScore(evaluationContent, 'Technical score'),
      communication_score: extractScore(evaluationContent, 'Communication score'),
      problem_solving_score: extractScore(evaluationContent, 'Problem-solving score'),
      feedback: extractSection(evaluationContent, 'Detailed feedback'),
      strengths: extractList(evaluationContent, 'Key strengths'),
      areas_for_improvement: extractList(evaluationContent, 'Areas for improvement'),
    };

    return new Response(JSON.stringify(evaluationData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error evaluating interview:', error);
    return new Response(JSON.stringify({ message: 'Error evaluating interview' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function extractScore(content: string, label: string): number {
  const regex = new RegExp(`${label}:\\s*(\\d+)`);
  const match = content.match(regex);
  return match ? parseInt(match[1]) : 0;
}

function extractSection(content: string, label: string): string {
  const regex = new RegExp(`${label}:\\s*([^\\n]+)`);
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(content: string, label: string): string[] {
  const regex = new RegExp(`${label}:\\s*([^\\n]+)`);
  const match = content.match(regex);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
} 