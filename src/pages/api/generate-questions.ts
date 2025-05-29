import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateQuestionsRequest {
  jobId: string;
  applicationId: string;
}

interface Question {
  question: string;
  type: 'technical' | 'behavioral' | 'situational';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { jobId, applicationId }: GenerateQuestionsRequest = await req.json();

    // Get job details and candidate profile
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select(`
        *,
        candidate:profiles(*)
      `)
      .eq('id', applicationId)
      .single();

    if (applicationError) throw applicationError;

    // Generate questions using AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert interviewer creating questions for a technical interview.
          Generate 5-10 questions based on the job description and candidate's profile.
          Mix technical, behavioral, and situational questions.
          Focus on the candidate's experience and the job requirements.
          Format each question with a type (technical, behavioral, or situational).`
        },
        {
          role: "user",
          content: `Job Description: ${job.description}
          Candidate Profile: ${JSON.stringify(application.candidate)}
          Job Requirements: ${job.requirements}
          Job Title: ${job.title}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Parse the AI response into structured questions
    const questionsText = completion.choices[0].message.content;
    const questions: Question[] = parseQuestions(questionsText);

    // Save questions to database
    const { data: savedQuestions, error: saveError } = await supabase
      .from('interview_questions')
      .insert(
        questions.map(q => ({
          job_id: jobId,
          question: q.question,
          type: q.type,
        }))
      )
      .select();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ questions: savedQuestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify({ message: 'Error generating questions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function parseQuestions(text: string): Question[] {
  const questions: Question[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try to extract question type and content
    const typeMatch = line.match(/^(technical|behavioral|situational):/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase() as Question['type'];
      const question = line.slice(typeMatch[0].length).trim();
      if (question) {
        questions.push({ question, type });
      }
    } else {
      // If no type is specified, try to infer it
      const type = inferQuestionType(line);
      questions.push({ question: line.trim(), type });
    }
  }

  return questions;
}

function inferQuestionType(question: string): Question['type'] {
  const technicalKeywords = [
    'code', 'programming', 'algorithm', 'database', 'api', 'framework',
    'language', 'technology', 'system', 'architecture', 'design pattern'
  ];
  const behavioralKeywords = [
    'experience', 'worked', 'team', 'collaborate', 'challenge', 'situation',
    'handled', 'managed', 'lead', 'mentor', 'learned'
  ];

  const lowerQuestion = question.toLowerCase();
  
  if (technicalKeywords.some(keyword => lowerQuestion.includes(keyword))) {
    return 'technical';
  }
  if (behavioralKeywords.some(keyword => lowerQuestion.includes(keyword))) {
    return 'behavioral';
  }
  
  return 'situational';
} 