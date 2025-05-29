import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, MapPin, Building2, Calendar, DollarSign } from "lucide-react";
import { useJob } from "@/hooks/useJob";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useJob(jobId || '');
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error || "Job not found"}
        </p>
        <Button onClick={() => navigate('/candidate/jobs')}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{job.company}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span>{job.job_type}</span>
            </div>
            {job.salary && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{job.salary}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Posted {formatDistanceToNow(new Date(job.posted_date), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        {user?.user_metadata?.type === 'candidate' && (
          <Button size="lg" onClick={() => navigate(`/candidate/jobs/${job.id}/apply`)}>
            Apply Now
          </Button>
        )}
      </div>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="description" className="space-y-4">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="space-y-4">
              <div className="prose prose-sm max-w-none">
                {job.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="requirements" className="space-y-4">
              <div className="prose prose-sm max-w-none">
                {job.requirements.split('\n').map((requirement, index) => (
                  <p key={index}>{requirement}</p>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => navigate('/candidate/jobs')}>
          Back to Jobs
        </Button>
      </div>
    </div>
  );
};

export default JobDetails; 