import React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, MapPin, Clock, DollarSign, Building, Calendar, FileText, Users } from "lucide-react";
import { useJob } from "@/hooks/useJob";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplications } from "@/hooks/useApplications";

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { job, loading: jobLoading, error: jobError } = useJob(jobId || '');
  const { applications } = useApplications();

  // Get applications for this job
  const jobApplications = React.useMemo(() => {
    if (!jobId) return [];
    return applications.filter(app => app.job_id === jobId);
  }, [applications, jobId]);

  // Calculate application statistics
  const stats = React.useMemo(() => {
    const total = jobApplications.length;
    const pending = jobApplications.filter(app => app.status === 'pending').length;
    const inProgress = jobApplications.filter(app => app.status === 'in_progress').length;
    const accepted = jobApplications.filter(app => app.status === 'accepted').length;
    const rejected = jobApplications.filter(app => app.status === 'rejected').length;

    return { total, pending, inProgress, accepted, rejected };
  }, [jobApplications]);

  if (jobLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobError) {
    return (
      <div className="text-center text-sm text-red-500 py-4">
        {jobError}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">Job not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The job you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link to="/hiring/jobs">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground">
            Posted {formatDistanceToNow(new Date(job.posted_date), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/hiring/jobs/${job.id}/applications`}>
              <Users className="mr-2 h-4 w-4" />
              View Applications ({stats.total})
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/hiring/jobs">
              <Briefcase className="mr-2 h-4 w-4" />
              Back to Jobs
            </Link>
          </Button>
        </div>
      </div>

      {/* Job Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.company}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.location}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Type</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.job_type}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.salary}</div>
          </CardContent>
        </Card>
      </div>

      {/* Application Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total applicants
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Interview stage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">
              Successful applications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Not selected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Details Tabs */}
      <Tabs defaultValue="description" className="space-y-4">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="applications">Recent Applications</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {job.description.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {job.requirements.split('\n').map((requirement, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {requirement}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>
                Showing the 5 most recent applications for this position
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobApplications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Applications will appear here once candidates apply
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobApplications.slice(0, 5).map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{application.candidate?.full_name || 'Anonymous Candidate'}</h3>
                          <Badge
                            variant={
                              application.status === 'pending'
                                ? 'secondary'
                                : application.status === 'in_progress'
                                ? 'default'
                                : application.status === 'accepted'
                                ? 'outline'
                                : 'destructive'
                            }
                          >
                            {application.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/hiring/jobs/${job.id}/applications`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {jobApplications.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link to={`/hiring/jobs/${job.id}/applications`}>
                        View All Applications
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobDetails; 