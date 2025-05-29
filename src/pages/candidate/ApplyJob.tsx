import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJob } from "@/hooks/useJob";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

const ApplyJob = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { job, loading: jobLoading, error: jobError } = useJob(jobId);
  const { profile, loading: profileLoading } = useProfile();
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !jobId) return;

    try {
      setIsSubmitting(true);

      // Check if user has already applied
      const { data: existingApplication } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('candidate_id', user.id)
        .single();

      if (existingApplication) {
        toast({
          title: "Already Applied",
          description: "You have already applied for this job.",
          variant: "destructive",
        });
        return;
      }

      // Create new application
      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id: jobId,
          candidate_id: user.id,
          cover_letter: coverLetter,
          status: 'applied'
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully.",
      });

      navigate('/candidate/applications');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (jobLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
        <p className="text-muted-foreground mb-4">
          {jobError || "The job you're looking for doesn't exist."}
        </p>
        <Button onClick={() => navigate('/candidate/jobs')}>
          Browse Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(`/candidate/jobs/${jobId}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Job Details
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Apply for {job.title}</CardTitle>
          <CardDescription>
            {job.company} • {job.location}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Cover Letter</h3>
              <p className="text-sm text-muted-foreground">
                Explain why you're a good fit for this role. Highlight your relevant experience and skills.
              </p>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Write your cover letter here..."
                className="min-h-[200px]"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplyJob; 