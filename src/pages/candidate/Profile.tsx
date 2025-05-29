import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProfileData {
  id?: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  skills: string[];
  experience: string | null;
  education: string | null;
  resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  about: string | null;
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    user_id: user?.id || "",
    full_name: "",
    email: user?.email || "",
    phone: null,
    location: null,
    headline: null,
    skills: [],
    experience: null,
    education: null,
    resume_url: null,
    linkedin_url: null,
    github_url: null,
    portfolio_url: null,
    about: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const [resume, setResume] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
  }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error: fetchError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create new one
          const { data: newProfile, error: createError } = await supabase
            .from('candidate_profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              full_name: "",
              phone: null,
              location: null,
              headline: null,
              skills: [],
              experience: null,
              education: null,
              resume_url: null,
              linkedin_url: null,
              github_url: null,
              portfolio_url: null,
              about: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          if (newProfile) {
            setProfileData(newProfile as ProfileData);
          }
        } else {
          throw fetchError;
        }
      } else if (profile) {
        setProfileData(profile as ProfileData);
      }
    } catch (error) {
      console.error('Error in profile fetch:', error);
      toast({
        title: "Error Loading Profile",
        description: error instanceof Error ? error.message : "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value || null }));
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(Boolean);
    setProfileData(prev => ({ ...prev, skills }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setResume(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      let resumeUrl = profileData.resume_url;

      // Upload new resume if provided
      if (resume) {
        const fileExt = resume.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        // Delete old resume if exists
        if (profileData.resume_url) {
          const oldFileName = profileData.resume_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('resumes')
              .remove([oldFileName]);
    }
        }

        // Upload new resume
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, resume);

        if (uploadError) throw uploadError;
        resumeUrl = uploadData.path;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .upsert({
          id: profileData.id,
          user_id: user.id,
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          location: profileData.location,
          headline: profileData.headline,
          skills: profileData.skills,
          experience: profileData.experience,
          education: profileData.education,
          resume_url: resumeUrl,
          linkedin_url: profileData.linkedin_url,
          github_url: profileData.github_url,
          portfolio_url: profileData.portfolio_url,
          about: profileData.about,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Refresh profile data
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="candidate" currentPath="/candidate/profile">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="candidate" currentPath="/candidate/profile">
      <div className="max-w-2xl mx-auto space-y-6">
          <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">
            Manage your candidate profile information
          </p>
        </div>

            <Card>
              <CardHeader>
            <CardTitle>Profile Information</CardTitle>
                <CardDescription>
              Update your profile details and resume
                </CardDescription>
              </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleInputChange}
                  required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                  name="email"
                      type="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  required
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                  name="phone"
                      type="tel"
                  value={profileData.phone || ""}
                  onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                  name="location"
                  value={profileData.location || ""}
                  onChange={handleInputChange}
                      placeholder="e.g., San Francisco, CA"
                    />
                </div>

                <div className="space-y-2">
                <Label htmlFor="headline">Professional Headline</Label>
                  <Input
                  id="headline"
                  name="headline"
                  value={profileData.headline || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., Senior Software Engineer"
                        />
                      </div>

                      <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Input
                  id="skills"
                  name="skills"
                  value={profileData.skills.join(', ')}
                  onChange={handleSkillsChange}
                  placeholder="e.g., JavaScript, React, Node.js"
                        />
                    </div>

                      <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                  id="experience"
                  name="experience"
                  value={profileData.experience || ""}
                  onChange={handleInputChange}
                  placeholder="Describe your work experience"
                  className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Textarea
                  id="education"
                  name="education"
                  value={profileData.education || ""}
                  onChange={handleInputChange}
                  placeholder="Your educational background"
                  className="min-h-[100px]"
                />
                    </div>

                    <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                      <Textarea
                  id="about"
                  name="about"
                  value={profileData.about || ""}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself"
                  className="min-h-[100px]"
                      />
                    </div>

                      <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                        <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  value={profileData.linkedin_url || ""}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/your-profile"
                        />
                      </div>

                      <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                        <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  value={profileData.github_url || ""}
                  onChange={handleInputChange}
                  placeholder="https://github.com/your-username"
                        />
                    </div>

                      <div className="space-y-2">
                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                        <Input
                  id="portfolio_url"
                  name="portfolio_url"
                  type="url"
                  value={profileData.portfolio_url || ""}
                  onChange={handleInputChange}
                  placeholder="https://your-portfolio.com"
                        />
                      </div>

                      <div className="space-y-2">
                <Label htmlFor="resume">Resume (PDF)</Label>
                        <Input
                  id="resume"
                  name="resume"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                {profileData.resume_url && (
                  <p className="text-sm text-muted-foreground">
                    Current resume: {profileData.resume_url.split('/').pop()}
                  </p>
                )}
                  </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
                </Button>
            </form>
              </CardContent>
            </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
