import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    description: string;
    requirements: string;
    salary_range: string;
    created_at: string;
  };
  candidate?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    location?: string;
    headline?: string;
    skills?: string[];
    experience?: string;
    education?: string;
    resume_url?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
  };
  interview_details?: {
    scheduled_at: string;
    duration: number;
    type: string;
    location?: string;
    notes?: string;
  };
}

export function useApplications(jobId?: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userType } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Initial fetch of applications
    fetchApplications();

    // Set up real-time subscription
    const subscription = supabase
      .channel('applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: userType === 'candidate' 
            ? `candidate_id=eq.${user.id}`
            : jobId 
              ? `job_id=eq.${jobId}`
              : undefined
        },
        (payload) => {
          console.log('Real-time application update:', payload);
          
          if (payload.eventType === 'INSERT') {
            fetchApplicationDetails(payload.new as Application).then(app => {
              if (app) setApplications(prev => [app, ...prev]);
            });
          } else if (payload.eventType === 'UPDATE') {
            fetchApplicationDetails(payload.new as Application).then(app => {
              if (app) {
                setApplications(prev => prev.map(application => 
                  application.id === app.id ? app : application
                ));
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setApplications(prev => prev.filter(app => app.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, userType, jobId]);

  const fetchApplicationDetails = async (application: Application): Promise<Application | null> => {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, company, description, requirements, location, job_type, salary_range, created_at')
        .eq('id', application.job_id)
        .single();

      if (jobError || !jobData) return null;

      // Transform the job data to match our Application type
      const typedJobData: Application['job'] = {
        id: (jobData as unknown as Application['job']).id,
        title: (jobData as unknown as Application['job']).title,
        company: (jobData as unknown as Application['job']).company,
        location: (jobData as unknown as Application['job']).location,
        type: (jobData as unknown as Application['job']).type,
        description: (jobData as unknown as Application['job']).description,
        requirements: (jobData as unknown as Application['job']).requirements,
        salary_range: (jobData as unknown as Application['job']).salary_range,
        created_at: (jobData as unknown as Application['job']).created_at
      };

      // Fetch candidate details
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          location,
          headline,
          skills,
          experience,
          education,
          resume_url,
          linkedin_url,
          github_url,
          portfolio_url
        `)
        .eq('user_id', application.candidate_id)
        .single();

      if (candidateError || !candidateData) return null;

      return {
        ...application,
        job: typedJobData,
        candidate: candidateData as unknown as Application['candidate']
      };
    } catch (err) {
      console.error('Error fetching application details:', err);
      return null;
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter based on user type and job ID
      if (userType === 'candidate') {
        query = query.eq('candidate_id', user?.id);
      } else if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch details for each application
      const applicationsWithDetails = await Promise.all(
        (data || []).map(app => fetchApplicationDetails(app))
      );

      setApplications(applicationsWithDetails.filter((app): app is Application => app !== null));
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const applyForJob = async (jobId: string, coverLetter?: string, resumeUrl?: string) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([
          {
            job_id: jobId,
            candidate_id: user?.id,
            status: 'applied',
            cover_letter: coverLetter,
            resume_url: resumeUrl
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Fetch full application details
      const application = await fetchApplicationDetails(data);
      if (application) {
        setApplications(prev => [application, ...prev]);
      }

      return application;
    } catch (err) {
      console.error('Error applying for job:', err);
      throw err;
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      // Fetch full application details
      const application = await fetchApplicationDetails(data);
      if (application) {
        setApplications(prev => prev.map(app => 
          app.id === application.id ? application : app
        ));
      }

      return application;
    } catch (err) {
      console.error('Error updating application status:', err);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    refreshApplications: fetchApplications,
    applyForJob,
    updateApplicationStatus
  };
} 