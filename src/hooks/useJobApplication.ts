import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from 'supabase';

interface ApplicationData {
  job_id: string;
  cover_letter?: string;
  resume_url?: string;
}

interface CandidateProfile {
  created_at: string;
  education: string;
  email: string;
  experience: string;
  full_name: string;
  id: string;
  resume_url: string;
  skills: string[];
  updated_at: string;
  user_id: string;
  phone?: string;
  location?: string;
  headline?: string;
}

export const useJobApplication = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const submitApplication = async (data: ApplicationData) => {
    setLoading(true);
    setError(null);

    try {
      // First, get the current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to apply for jobs');
      }

      // Get candidate profile
      const { data: profile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: CandidateProfile | null, error: PostgrestError | null };

      if (profileError) {
        throw new Error('Failed to fetch candidate profile');
      }

      // Submit the application
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert([
          {
            job_id: data.job_id,
            candidate_id: user.id,
            cover_letter: data.cover_letter,
            resume_url: data.resume_url,
            status: 'pending',
            // The trigger will automatically fill these fields
            candidate_email: profile.email,
            candidate_name: profile.full_name,
            candidate_phone: profile.phone,
            candidate_location: profile.location,
            candidate_headline: profile.headline,
            candidate_skills: profile.skills,
            candidate_experience: profile.experience,
            candidate_education: profile.education
          }
        ])
        .select()
        .single();

      if (applicationError) {
        throw applicationError;
      }

      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully.",
      });

      return application;
    } catch (err) {
      console.error('Error submitting application:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadResume = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload a resume');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading resume:', err);
      throw err;
    }
  };

  return {
    submitApplication,
    uploadResume,
    loading,
    error
  };
}; 