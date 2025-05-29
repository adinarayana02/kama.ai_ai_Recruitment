import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, User, Mail, Calendar, FileText, MessageSquare, Search, Filter, Users, Briefcase, CheckCircle, XCircle, Clock } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Candidate {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  headline?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  created_at: string;
  last_activity: string;
  applications: Array<{
    id: string;
    job_id: string;
    job_title: string;
    status: string;
    applied_at: string;
  }>;
}

const Candidates = () => {
  const { applications, loading: appsLoading, error: appsError, refreshApplications } = useApplications();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [activeTab, setActiveTab] = React.useState("all");

  const uniqueCandidates = React.useMemo(() => {
    const candidatesMap = new Map<string, Candidate>();
    
    applications?.forEach(application => {
      if (!application.candidate_id) return;
      
      if (!candidatesMap.has(application.candidate_id)) {
        candidatesMap.set(application.candidate_id, {
          id: application.candidate_id,
          email: application.candidate?.email || '',
          full_name: application.candidate?.full_name || 'Unknown Candidate',
          phone: application.candidate?.phone,
          location: application.candidate?.location,
          headline: application.candidate?.headline,
          skills: application.candidate?.skills,
          experience: application.candidate?.experience,
          education: application.candidate?.education,
          created_at: application.created_at,
          last_activity: application.updated_at,
          applications: [{
            id: application.id,
            job_id: application.job_id,
            job_title: application.job?.title || 'Unknown Position',
            status: application.status,
            applied_at: application.created_at
          }]
        });
      } else {
        const candidate = candidatesMap.get(application.candidate_id)!;
        candidate.applications.push({
          id: application.id,
          job_id: application.job_id,
          job_title: application.job?.title || 'Unknown Position',
          status: application.status,
          applied_at: application.created_at
        });
        // Update last activity if this application is more recent
        if (new Date(application.updated_at) > new Date(candidate.last_activity)) {
          candidate.last_activity = application.updated_at;
        }
      }
    });

    return Array.from(candidatesMap.values());
  }, [applications]);

  // Get unique candidates from applications
  const candidates = React.useMemo(() => {
    const uniqueCandidates = new Map();
    
    applications.forEach(app => {
      if (!app.candidate?.email) return;
      
      if (!uniqueCandidates.has(app.candidate.email)) {
        uniqueCandidates.set(app.candidate.email, {
          ...app.candidate,
          applications: [],
          lastActivity: new Date(app.created_at),
        });
      }
      
        const candidate = uniqueCandidates.get(app.candidate.email);
        candidate.applications.push(app);
      
        // Update last activity if this application is more recent
      const appDate = new Date(app.created_at);
        if (appDate > candidate.lastActivity) {
          candidate.lastActivity = appDate;
      }
    });

    return Array.from(uniqueCandidates.values())
      .filter(candidate => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          candidate.full_name?.toLowerCase().includes(query) ||
          candidate.email?.toLowerCase().includes(query) ||
          candidate.applications.some(app => 
            app.job?.title?.toLowerCase().includes(query) ||
            app.cover_letter?.toLowerCase().includes(query)
          )
        );
      })
      .filter(candidate => {
        if (statusFilter === "all") return true;
        return candidate.applications.some(app => app.status === statusFilter);
      })
      .filter(candidate => {
        if (activeTab === "all") return true;
        if (activeTab === "active") {
          return candidate.applications.some(app => 
            app.status === "pending" || app.status === "in_progress"
          );
        }
        if (activeTab === "accepted") {
          return candidate.applications.some(app => app.status === "accepted");
        }
        if (activeTab === "rejected") {
          return candidate.applications.some(app => app.status === "rejected");
        }
        return true;
      })
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }, [applications, searchQuery, statusFilter, activeTab]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalCandidates = candidates.length;
    const activeApplications = applications.filter(app => 
      app.status === "pending" || app.status === "in_progress"
    ).length;
    const pendingApplications = applications.filter(app => app.status === "pending").length;
    const inProgressApplications = applications.filter(app => app.status === "in_progress").length;
    const acceptedApplications = applications.filter(app => app.status === "accepted").length;
    const rejectedApplications = applications.filter(app => app.status === "rejected").length;

    return {
      totalCandidates,
      activeApplications,
      pendingApplications,
      inProgressApplications,
      acceptedApplications,
      rejectedApplications,
    };
  }, [candidates, applications]);

  if (appsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (appsError) {
    return (
      <div className="text-center text-sm text-red-500 py-4">
        {appsError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground">
            View and manage all candidates who have applied to your jobs
          </p>
        </div>
        <Button onClick={refreshApplications} variant="outline">
          <Loader2 className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, job title, or cover letter..."
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
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">
              Unique applicants
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeApplications}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingApplications} pending, {stats.inProgressApplications} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptedApplications}</div>
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
            <div className="text-2xl font-bold">{stats.rejectedApplications}</div>
            <p className="text-xs text-muted-foreground">
              Not selected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Candidates List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Candidates</CardTitle>
              <CardDescription>
                {candidates.length} {candidates.length === 1 ? 'candidate' : 'candidates'} found
                {searchQuery && ` for "${searchQuery}"`}
                {statusFilter !== 'all' && ` (${statusFilter} status)`}
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No candidates found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || activeTab !== 'all'
                  ? "Try adjusting your search or filter criteria"
                  : "Candidates will appear here once they apply to your jobs"}
              </p>
              {(searchQuery || statusFilter !== 'all' || activeTab !== 'all') && (
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setActiveTab("all");
                }}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <Card key={candidate.email}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                    <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{candidate.full_name}</h3>
                      <Badge variant="outline">
                            {candidate.applications.length} {candidate.applications.length === 1 ? 'Application' : 'Applications'}
                      </Badge>
                    </div>
                        <div className="text-sm text-muted-foreground">
                          {candidate.email}
                          {candidate.phone && ` • ${candidate.phone}`}
                          {candidate.location && ` • ${candidate.location}`}
                        </div>
                        {candidate.headline && (
                          <p className="text-sm text-muted-foreground">{candidate.headline}</p>
                      )}
                    </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link to={`/hiring/candidates/${candidate.id}`}>
                          <Button variant="outline" size="sm">
                            View Profile
                    </Button>
                        </Link>
                        <Link to={`/hiring/candidates/${candidate.id}/applications`}>
                          <Button variant="outline" size="sm">
                            View Applications
                    </Button>
                        </Link>
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
  );
};

export default Candidates; 