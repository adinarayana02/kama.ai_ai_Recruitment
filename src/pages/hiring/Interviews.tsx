import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, Calendar, Clock, User, Video, MessageSquare, Search, Filter, CheckCircle, XCircle } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface InterviewSchedule {
  applicationId: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  location?: string;
  notes?: string;
}

const Interviews = () => {
  const { applications, loading, error, refreshApplications } = useApplications();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [activeTab, setActiveTab] = React.useState("upcoming");
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [selectedApplication, setSelectedApplication] = React.useState<string | null>(null);
  const [scheduleData, setScheduleData] = React.useState<InterviewSchedule>({
    applicationId: "",
    date: "",
    time: "",
    duration: "60",
    type: "video",
    location: "",
    notes: "",
  });
  const { toast } = useToast();

  // Filter and sort interviews
  const interviews = React.useMemo(() => {
    return applications
      .filter(app => app.status === 'in_progress')
      .filter(app => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          app.candidate?.full_name?.toLowerCase().includes(query) ||
          app.candidate?.email?.toLowerCase().includes(query) ||
          app.job?.title?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, searchQuery]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = interviews.length;
    const scheduled = interviews.filter(app => app.interview_scheduled).length;
    const completed = interviews.filter(app => app.interview_completed).length;
    const pending = interviews.filter(app => !app.interview_scheduled).length;

    return { total, scheduled, completed, pending };
  }, [interviews]);

  const updateInterviewStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      await refreshApplications();
      
      toast({
        title: "Status Updated",
        description: `Interview status has been updated to ${status}`,
      });
    } catch (err) {
      console.error('Error updating interview status:', err);
      toast({
        title: "Error",
        description: "Failed to update interview status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApplication) return;

    try {
      setIsScheduling(true);

      const { error } = await supabase
        .from('applications')
        .update({
          interview_scheduled: true,
          interview_date: scheduleData.date,
          interview_time: scheduleData.time,
          interview_duration: scheduleData.duration,
          interview_type: scheduleData.type,
          interview_location: scheduleData.location,
          interview_notes: scheduleData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication);

      if (error) throw error;

      await refreshApplications();
      
      toast({
        title: "Interview Scheduled",
        description: "The interview has been scheduled successfully.",
      });

      // Reset form
      setScheduleData({
        applicationId: "",
        date: "",
        time: "",
        duration: "60",
        type: "video",
        location: "",
        notes: "",
      });
      setSelectedApplication(null);
    } catch (err) {
      console.error('Error scheduling interview:', err);
      toast({
        title: "Error",
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const openScheduleDialog = (applicationId: string) => {
    setSelectedApplication(applicationId);
    setScheduleData(prev => ({ ...prev, applicationId }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-sm text-red-500 py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">
            Schedule and manage candidate interviews
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
        <Button className="bg-brand-blue hover:bg-brand-blue/90">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Interview
        </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
              <DialogDescription>
                Schedule a new interview with a candidate
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="candidate">Select Candidate</Label>
                <Select
                  value={selectedApplication || ""}
                  onValueChange={(value) => openScheduleDialog(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviews.map((interview) => (
                      <SelectItem key={interview.id} value={interview.id}>
                        {interview.candidate?.full_name || 'Anonymous Candidate'} - {interview.job?.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={scheduleData.duration}
                  onValueChange={(value) => setScheduleData(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Interview Type</Label>
                <Select
                  value={scheduleData.type}
                  onValueChange={(value) => setScheduleData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scheduleData.type === 'onsite' && (
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Enter interview location"
                    value={scheduleData.location}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes or instructions"
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleScheduleInterview}
                disabled={!selectedApplication || !scheduleData.date || !scheduleData.time || isScheduling}
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Interview'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate name, email, or job title..."
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
            <SelectItem value="all">All Interviews</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total interviews scheduled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming interviews
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Finished interviews
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting scheduling
            </p>
          </CardContent>
        </Card>
              </div>

      {/* Interview List */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Interviews</TabsTrigger>
          <TabsTrigger value="completed">Completed Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>
                {interviews.length} {interviews.length === 1 ? 'interview' : 'interviews'} scheduled
                {searchQuery && ` for "${searchQuery}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No upcoming interviews</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Schedule interviews with candidates to get started
                </p>
                <Button>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{interview.candidate?.full_name || 'Anonymous Candidate'}</h3>
                        <Badge variant="default">Interview</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{interview.job?.title || 'Unknown Position'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Not scheduled</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Application received {formatDistanceToNow(new Date(interview.created_at || ''), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openScheduleDialog(interview.id)}>
                        <Video className="mr-2 h-4 w-4" />
                        Schedule
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="completed">
        <Card>
          <CardHeader>
              <CardTitle>Completed Interviews</CardTitle>
              <CardDescription>
                View history of completed interviews
              </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
              </div>
                <h3 className="text-lg font-medium mb-2">No completed interviews</h3>
              <p className="text-sm text-muted-foreground">
                Completed interviews will appear here
              </p>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Interviews; 