import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Job } from './useJob';
import { PostgrestError } from '@supabase/supabase-js';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const fetchJobs = async () => {
      try {
        setLoading(true);
        console.log('Fetching jobs...'); // Debug log

        // Fetch initial jobs with detailed error logging
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select('id, title, company, location, description, requirements, salary, job_type, posted_date, created_at, updated_at, created_by')
          .order('created_at', { ascending: false });

        if (fetchError) {
          const pgError = fetchError as PostgrestError;
          console.error('Supabase error details:', {
            message: pgError.message,
            details: pgError.details,
            hint: pgError.hint,
            code: pgError.code
          });
          throw new Error(`Database error: ${pgError.message}`);
        }

        console.log('Jobs fetched successfully:', data?.length || 0, 'jobs found'); // Debug log

        if (mounted) {
          if (!data || data.length === 0) {
            console.log('No jobs found in the database'); // Debug log
            setJobs([]);
          } else {
            // Validate the data structure
            const validJobs = data.filter((job): job is Job => {
              if (!job || typeof job !== 'object') {
                console.warn('Invalid job data:', job);
                return false;
              }
              const requiredFields = ['id', 'title', 'company', 'description', 'job_type'];
              const isValid = requiredFields.every(field => field in job);
              if (!isValid) {
                console.warn('Job missing required fields:', job);
              }
              return isValid;
            });
            
            console.log('Valid jobs:', validJobs.length);
            setJobs(validJobs);
          }
          setError(null);
        }
      } catch (err) {
        console.error('Detailed error in fetchJobs:', err);
        if (mounted) {
          if (err instanceof Error) {
            const errorMessage = err.message.includes('Database error') 
              ? err.message 
              : `Failed to fetch jobs: ${err.message}`;
            setError(errorMessage);
          } else {
            setError('Failed to fetch jobs: Unexpected error occurred');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchJobs();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        async (payload) => {
          if (!mounted) return;

          try {
            console.log('Real-time update received:', payload.eventType); // Debug log

            switch (payload.eventType) {
              case 'INSERT':
                console.log('New job added:', payload.new.id); // Debug log
            setJobs(prev => [payload.new as Job, ...prev]);
                break;
              case 'UPDATE':
                console.log('Job updated:', payload.new.id); // Debug log
                setJobs(prev => 
                  prev.map(job => job.id === payload.new.id ? payload.new as Job : job)
                );
                break;
              case 'DELETE':
                console.log('Job deleted:', payload.old.id); // Debug log
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
                break;
          }
          } catch (err) {
            console.error('Error handling real-time update:', err);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status); // Debug log
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to jobs changes');
        } else if (status === 'CLOSED') {
          console.log('Subscription closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error');
          setError('Failed to subscribe to job updates');
        }
      });

    // Cleanup function
    return () => {
      console.log('Cleaning up jobs subscription'); // Debug log
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshJobs = async () => {
    try {
      setLoading(true);
      console.log('Manually refreshing jobs...'); // Debug log

      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select('id, title, company, location, description, requirements, salary, job_type, posted_date, created_at, updated_at, created_by')
        .order('created_at', { ascending: false });

      if (fetchError) {
        const pgError = fetchError as PostgrestError;
        console.error('Error refreshing jobs:', pgError);
        throw new Error(`Database error: ${pgError.message}`);
      }

      console.log('Jobs refreshed successfully:', data?.length || 0, 'jobs found'); // Debug log
      
      if (!data || data.length === 0) {
        setJobs([]);
      } else {
        const validJobs = data.filter((job): job is Job => {
          if (!job || typeof job !== 'object') {
            console.warn('Invalid job data:', job);
            return false;
          }
          const requiredFields = ['id', 'title', 'company', 'description', 'job_type'];
          const isValid = requiredFields.every(field => field in job);
          if (!isValid) {
            console.warn('Job missing required fields:', job);
          }
          return isValid;
        });
        
        setJobs(validJobs);
      }
      setError(null);
    } catch (err) {
      console.error('Error in refreshJobs:', err);
      if (err instanceof Error) {
        const errorMessage = err.message.includes('Database error') 
          ? err.message 
          : `Failed to refresh jobs: ${err.message}`;
        setError(errorMessage);
      } else {
        setError('Failed to refresh jobs: Unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (jobData: {
    title: string;
    location: string;
    work_type: string;
    description: string;
    requirements: string;
    salary_min: number;
    salary_max: number;
    company_id: string;
  }) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get company name from hiring_teams table
      const { data: teamData, error: teamError } = await supabase
        .from('hiring_teams')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (teamError) {
        console.error('Error fetching company name:', teamError);
        throw new Error('Failed to fetch company information');
      }

      // Format the data to match the database schema
      const formattedData = {
        title: jobData.title,
        company: teamData?.company_name || 'Company Name',
        location: jobData.location,
        job_type: jobData.work_type,
        description: jobData.description,
        requirements: jobData.requirements,
        salary: `${jobData.salary_min}-${jobData.salary_max}`,
        created_by: user.id,
        posted_date: new Date().toISOString()
      };

      console.log('Creating job with data:', formattedData); // Add logging

      const { data, error } = await supabase
        .from('jobs')
        .insert([formattedData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to create job');
      }

      if (!data) {
        throw new Error('No data returned after job creation');
      }

      console.log('Job created successfully:', data); // Add logging
      return data;
    } catch (err) {
      console.error('Error creating job:', err);
      throw err instanceof Error ? err : new Error('Failed to create job');
    }
  };

  return {
    jobs,
    loading,
    error,
    createJob,
    refreshJobs
  };
} 