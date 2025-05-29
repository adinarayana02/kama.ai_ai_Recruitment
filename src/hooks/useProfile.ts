import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Education {
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
}

export interface Experience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  professional_headline?: string;
  phone_number?: string;
  location?: string;
  about_me?: string;
  resume_url?: string;
  skills: string[];
  experiences: Experience[];
  educations: Education[];
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    // eslint-disable-next-line
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create initial profile
          const initialProfile = {
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
            email: user.email || '',
            professional_headline: '',
            phone_number: '',
            location: '',
            about_me: '',
            resume_url: '',
            skills: [],
            experiences: [],
            educations: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: newProfile, error: createError } = await supabase
            .from('candidate_profiles')
            .insert(initialProfile)
            .select()
            .single();

          if (createError) throw createError;
          
          setProfile({
            ...newProfile,
            skills: (newProfile as any).skills || [],
            experiences: (newProfile as any).experiences ?? ((newProfile as any).experience ? JSON.parse((newProfile as any).experience) : []),
            educations: (newProfile as any).educations ?? ((newProfile as any).education ? JSON.parse((newProfile as any).education) : []),
          });
          return;
        }
        throw error;
      }

      if (data) {
        setProfile({
          ...data,
          skills: (data as any).skills || [],
          experiences: (data as any).experiences ?? ((data as any).experience ? JSON.parse((data as any).experience) : []),
          educations: (data as any).educations ?? ((data as any).education ? JSON.parse((data as any).education) : []),
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');
      if (!profile) throw new Error('No profile loaded');

      // Always include email from the current profile (never from updates)
      const updateData = {
        user_id: user.id,
        full_name: updates.full_name ?? profile.full_name ?? '',
        email: profile.email ?? user.email ?? '', // Always required by Supabase type
        professional_headline: updates.professional_headline ?? profile.professional_headline ?? '',
        phone_number: updates.phone_number ?? profile.phone_number ?? '',
        location: updates.location ?? profile.location ?? '',
        about_me: updates.about_me ?? profile.about_me ?? '',
        resume_url: updates.resume_url ?? profile.resume_url ?? '',
        skills: updates.skills ?? profile.skills ?? [],
        experiences: updates.experiences ?? profile.experiences ?? [],
        educations: updates.educations ?? profile.educations ?? [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('candidate_profiles')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          ...data,
          skills: (data as any).skills || [],
          experiences: (data as any).experiences ?? ((data as any).experience ? JSON.parse((data as any).experience) : []),
          educations: (data as any).educations ?? ((data as any).education ? JSON.parse((data as any).education) : []),
        });
      }

      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const handleSkillAdd = async (newSkill: string) => {
    if (!profile) return;
    try {
      const updatedSkills = [...profile.skills];
      if (!updatedSkills.includes(newSkill)) {
        updatedSkills.push(newSkill);
        await updateProfile({ skills: updatedSkills });
      }
    } catch (err) {
      console.error('Error adding skill:', err);
      throw err;
    }
  };

  const handleSkillRemove = async (skillToRemove: string) => {
    if (!profile) return;
    try {
      const updatedSkills = profile.skills.filter(skill => skill !== skillToRemove);
      await updateProfile({ skills: updatedSkills });
    } catch (err) {
      console.error('Error removing skill:', err);
      throw err;
    }
  };

  const handleExperienceUpdate = async (index: number, field: keyof Experience, value: string) => {
    if (!profile) return;
    try {
      const updatedExperiences = [...profile.experiences];
      updatedExperiences[index] = {
        ...updatedExperiences[index],
        [field]: value
      };
      await updateProfile({ experiences: updatedExperiences });
    } catch (err) {
      console.error('Error updating experience:', err);
      throw err;
    }
  };

  const handleEducationUpdate = async (index: number, field: keyof Education, value: string) => {
    if (!profile) return;
    try {
      const updatedEducations = [...profile.educations];
      updatedEducations[index] = {
        ...updatedEducations[index],
        [field]: value
      };
      await updateProfile({ educations: updatedEducations });
    } catch (err) {
      console.error('Error updating education:', err);
      throw err;
    }
  };

  const uploadResume = async (file: File) => {
    try {
      setIsUploading(true);
      if (!user) throw new Error('No user logged in');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('candidate-resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('candidate-resumes')
        .getPublicUrl(filePath);
      
      // Update profile with resume URL
      await updateProfile({ resume_url: publicUrl });

      return publicUrl;
    } catch (err) {
      console.error('Error uploading resume:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const parseResume = async (file: File) => {
    // Implement resume parsing logic here
    // This could involve calling an external API or using a library
    return {};
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return {
    profile,
    loading,
    error,
    isUploading,
    updateProfile,
    uploadResume,
    parseResume,
    refreshProfile,
    handleSkillAdd,
    handleSkillRemove,
    handleExperienceUpdate,
    handleEducationUpdate
  };
} 