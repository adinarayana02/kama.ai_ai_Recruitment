import React from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Briefcase, Clock, Video } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Jobs = () => {
  const { jobs, loading } = useJobs();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleStartInterview = async (jobId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start an interview.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if application already exists
      const { data: existingApplication } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .eq('candidate_id', user.id)
        .single();

      if (existingApplication) {
        // Redirect to interview bot
        window.location.href = 'https://interviewbot-kappa.vercel.app/';
        return;
      }

      // Create new application record
      const { error: applicationError } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          candidate_id: user.id,
          status: 'interview_scheduled',
          cover_letter: '',
          resume_url: '',
          created_at: new Date().toISOString()
        });

      if (applicationError) throw applicationError;

      // Redirect to interview bot
      window.location.href = 'https://interviewbot-kappa.vercel.app/';
    } catch (error) {
      console.error('Error starting interview:', error);
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout userType="candidate" currentPath="/candidate/jobs">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Available Jobs</h1>
            <p className="text-muted-foreground">
              Browse and apply for jobs that match your profile
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Listings</CardTitle>
            <CardDescription>
              {jobs.length === 0 
                ? "No jobs available at the moment."
                : "Browse through available positions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No jobs available</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back later for new opportunities.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{job.title}</h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {job.job_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            {job.company}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            {job.salary}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Posted {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={() => handleStartInterview(job.id)}>
                            <Video className="mr-2 h-4 w-4" />
                            Start Interview
                          </Button>
                          <Button variant="outline" asChild>
                            <Link to={`/candidate/jobs/${job.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Jobs; 