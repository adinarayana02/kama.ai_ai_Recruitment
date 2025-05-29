import React from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Building2, Calendar, Clock } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { formatDistanceToNow } from "date-fns";

const Applications = () => {
  const { applications, loading } = useApplications();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      applied: { label: "Applied", className: "bg-blue-50 text-blue-700 border-blue-200" },
      under_review: { label: "Under Review", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      interview_scheduled: { label: "Interview Scheduled", className: "bg-green-50 text-green-700 border-green-200" },
      rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
      accepted: { label: "Accepted", className: "bg-green-50 text-green-700 border-green-200" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      className: "bg-gray-50 text-gray-700 border-gray-200" 
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout userType="candidate" currentPath="/candidate/applications">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground">
              Track the status of your job applications
            </p>
          </div>
          <Button asChild>
            <Link to="/candidate/jobs">Find Jobs</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Applications</CardTitle>
            <CardDescription>
              {applications.length === 0 
                ? "You haven't applied to any jobs yet."
                : "View and track all your job applications"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No applications yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start applying to jobs to see them here.
                </p>
                <Button className="mt-4" asChild>
                  <Link to="/candidate/jobs">Find Jobs</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{application.job?.title}</h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            {application.job?.company}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                          </div>
                          {application.interview_details && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Interview scheduled for {new Date(application.interview_details.scheduled_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {application.status === 'interview_scheduled' && (
                            <Button asChild>
                              <Link to={`/candidate/interview/${application.job_id}`}>
                                Start Interview
                              </Link>
                            </Button>
                          )}
                          <Button variant="outline" asChild>
                            <Link to={`/candidate/jobs/${application.job_id}`}>
                              View Job
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

export default Applications; 