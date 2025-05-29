import React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Calendar, FileText, MessageSquare, CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";
import { useJob } from "@/hooks/useJob";
import { useApplications } from "@/hooks/useApplications";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const JobApplications = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { job, loading: jobLoading, error: jobError } = useJob(jobId || '');
  const { applications, loading: appsLoading, error: appsError, refreshApplications } = useApplications();
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const { toast } = useToast();

  // Filter applications for this specific job
  const jobApplications = React.useMemo(() => {
    if (!jobId) return [];
    return applications
      .filter(app => app.job_id === jobId)
      .filter(app => statusFilter === "all" || app.status === statusFilter)
      .filter(app => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          app.candidate?.full_name?.toLowerCase().includes(query) ||
          app.candidate?.email?.toLowerCase().includes(query) ||
          app.cover_letter?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, jobId, statusFilter, searchQuery]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = jobApplications.length;
    const pending = jobApplications.filter(app => app.status === 'pending').length;
    const inProgress = jobApplications.filter(app => app.status === 'in_progress').length;
    const accepted = jobApplications.filter(app => app.status === 'accepted').length;
    const rejected = jobApplications.filter(app => app.status === 'rejected').length;

    return { total, pending, inProgress, accepted, rejected };
  }, [jobApplications]);

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      await refreshApplications();
      
      toast({
        title: "Status Updated",
        description: `Application status has been updated to ${newStatus}`,
      });
    } catch (err) {
      console.error('Error updating application status:', err);
      toast({
        title: "Error",
        description: "Failed to update application status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (jobLoading || appsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobError || appsError) {
    return (
      <div className="text-center text-sm text-red-500 py-4">
        {jobError || appsError}
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
          <h1 className="text-3xl font-bold tracking-tight">Applications for {job.title}</h1>
          <p className="text-muted-foreground">
            Review and manage applications for this position
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/hiring/jobs/${job.id}`}>
              <Briefcase className="mr-2 h-4 w-4" />
              View Job Details
            </Link>
          </Button>
          <Button onClick={refreshApplications} variant="outline">
            <Loader2 className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or cover letter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
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
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Not selected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>
            {jobApplications.length} {jobApplications.length === 1 ? 'application' : 'applications'} found
            {searchQuery && ` for "${searchQuery}"`}
            {statusFilter !== 'all' && ` (${statusFilter} status)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobApplications.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No applications found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? "Try adjusting your search or filter criteria"
                  : "Applications will appear here once candidates apply"}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {jobApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1 mb-4 sm:mb-0">
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
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{application.candidate?.email}</span>
                      </div>
                      {application.resume_url && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <Link
                            to={application.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Resume
                          </Link>
                        </div>
                      )}
                      {application.cover_letter && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>Cover Letter Provided</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <p>
                        Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                      </p>
                      {application.reviewed_at && (
                        <p>
                          • Last reviewed {formatDistanceToNow(new Date(application.reviewed_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={application.status}
                      onValueChange={(value) => updateApplicationStatus(application.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="accepted">Accept</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/hiring/candidates/${application.candidate_id}`}>
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobApplications; 