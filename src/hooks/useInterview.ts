import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InterviewQuestion {
  id: string;
  job_id: string;
  question: string;
  type: 'technical' | 'behavioral' | 'situational';
  created_at: string;
  updated_at: string;
}

interface InterviewResponse {
  id: string;
  application_id: string;
  question_id: string;
  video_url: string;
  created_at: string;
  updated_at: string;
}

interface InterviewEvaluation {
  id: string;
  application_id: string;
  candidate_id: string;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  created_at: string;
  updated_at: string;
}

export function useInterview(jobId: string, applicationId: string) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuestions();
    fetchResponses();
    fetchEvaluation();
  }, [jobId, applicationId]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load interview questions');
      toast({
        title: "Error",
        description: "Failed to load interview questions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_responses')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (err) {
      console.error('Error fetching responses:', err);
      setError('Failed to load interview responses');
      toast({
        title: "Error",
        description: "Failed to load interview responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchEvaluation = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_evaluations')
        .select('*')
        .eq('application_id', applicationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      setEvaluation(data);
    } catch (err) {
      console.error('Error fetching evaluation:', err);
      setError('Failed to load interview evaluation');
      toast({
        title: "Error",
        description: "Failed to load interview evaluation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveResponse = async (questionId: string, videoUrl: string) => {
    try {
      const { data, error } = await supabase
        .from('interview_responses')
        .insert({
          application_id: applicationId,
          question_id: questionId,
          video_url: videoUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setResponses(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error saving response:', err);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const generateQuestions = async () => {
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          applicationId,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate questions');

      const { questions: newQuestions } = await response.json();

      // Save questions to database
      const { data, error } = await supabase
        .from('interview_questions')
        .insert(
          newQuestions.map((q: any) => ({
            job_id: jobId,
            question: q.question,
            type: q.type,
          }))
        )
        .select();

      if (error) throw error;

      setQuestions(data || []);
      return data;
    } catch (err) {
      console.error('Error generating questions:', err);
      toast({
        title: "Error",
        description: "Failed to generate interview questions. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    questions,
    responses,
    evaluation,
    loading,
    error,
    saveResponse,
    generateQuestions,
    refreshQuestions: fetchQuestions,
    refreshResponses: fetchResponses,
    refreshEvaluation: fetchEvaluation,
  };
} 