import React from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Building2, MapPin, Briefcase, Clock } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";

const Interviews = () => {
  const { jobs, loading } = useJobs();

  return (
    <DashboardLayout userType="candidate" currentPath="/candidate/interviews">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Available Interviews</h1>
            <p className="text-muted-foreground">
              Browse and start interviews for jobs that match your profile
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Interviews</CardTitle>
            <CardDescription>
              {jobs.length === 0 
                ? "No interviews available at the moment."
                : "Select a job to start your interview"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No interviews available</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back later for new interview opportunities.
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
                              {job.type}
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
                            {job.salary_range}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Posted {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button asChild>
                            <Link to={`/candidate/interview/${job.id}/setup`}>
                              Start Interview
                            </Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link to={`/candidate/jobs/${job.id}`}>
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

export default Interviews; 