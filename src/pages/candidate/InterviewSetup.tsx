import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ApplicationData {
  job_id: string;
  candidate_id: string;
  status: string;
  resume_url: string;
  cover_letter: string;
  created_at: string;
  updated_at: string;
}

const InterviewSetup = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    resume: null as File | null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, resume: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      if (!jobId) {
        throw new Error("Job ID is missing");
      }

      // Upload resume if provided
      let resumeUrl = "";
      if (formData.resume) {
        const fileExt = formData.resume.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, formData.resume);

        if (uploadError) {
          console.error("Resume upload error:", uploadError);
          throw uploadError;
        }
        resumeUrl = uploadData.path;
      }

      // First, check if application exists
      const { data: existingApplication, error: checkError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .eq('candidate_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking application:", checkError);
        throw checkError;
      }

      const now = new Date().toISOString();
      const applicationData: ApplicationData = {
        job_id: jobId,
        candidate_id: user.id,
        status: 'interview_ready',
        resume_url: resumeUrl,
        cover_letter: '',
        created_at: now,
        updated_at: now
      };

      if (existingApplication) {
        // Update existing application
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            ...applicationData,
            id: existingApplication.id
          })
          .eq('id', existingApplication.id);

        if (updateError) {
          console.error("Error updating application:", updateError);
          throw updateError;
        }
      } else {
        // Create new application
        const { error: insertError } = await supabase
          .from('applications')
          .insert(applicationData);

        if (insertError) {
          console.error("Error creating application:", insertError);
          throw insertError;
        }
      }

      // Update or create candidate profile
      const { error: profileError } = await supabase
        .from('candidate_profiles')
        .upsert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          resume_url: resumeUrl,
          updated_at: now
        });

      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw profileError;
      }

      toast({
        title: "Setup Complete",
        description: "Your interview is ready to begin.",
      });

      // Navigate to interview portal
      navigate(`/candidate/interview/${jobId}/portal`);
    } catch (error) {
      console.error('Detailed error in interview setup:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set up interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userType="candidate" currentPath="/candidate/interviews">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Setup</h1>
          <p className="text-muted-foreground">
            Please provide your information to start the interview
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>
              This information will be shared with the hiring team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
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
                  value={formData.email}
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
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
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
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Start Interview"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InterviewSetup; 