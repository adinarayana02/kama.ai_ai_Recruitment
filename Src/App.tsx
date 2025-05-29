import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const CandidateDashboard = lazy(() => import("./pages/candidate/Dashboard"));
const CandidateProfile = lazy(() => import("./pages/candidate/Profile"));
const CandidateJobs = lazy(() => import("./pages/candidate/Jobs"));
const CandidateJobDetails = lazy(() => import("./pages/candidate/JobDetails"));
const HiringDashboard = lazy(() => import("./pages/hiring/Dashboard"));
const CreateJob = lazy(() => import("./pages/hiring/CreateJob"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Jobs = lazy(() => import("@/pages/hiring/Jobs"));
const Candidates = lazy(() => import("@/pages/hiring/Candidates"));
const Interviews = lazy(() => import("@/pages/hiring/Interviews"));
const Settings = lazy(() => import("@/pages/hiring/Settings"));
const JobApplications = lazy(() => import("@/pages/hiring/JobApplications"));
const JobDetails = lazy(() => import("@/pages/hiring/JobDetails"));
const HiringLayout = lazy(() => import("@/components/layout/HiringLayout"));
const ApplyJob = lazy(() => import("@/pages/candidate/ApplyJob"));
const InterviewPortal = lazy(() => import("@/pages/candidate/InterviewPortal"));
const Applications = lazy(() => import("@/pages/candidate/Applications"));
const InterviewSetup = lazy(() => import("@/pages/candidate/InterviewSetup"));

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loading component
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected route wrapper for candidate routes
const CandidateRoute = () => {
  const { user, loading, userType } = useAuth();
  
  if (loading) return <LoadingFallback />;
  
  if (!user) return <Navigate to="/login" replace />;
  if (userType !== 'candidate') return <Navigate to={userType === 'hiring' ? "/hiring/dashboard" : "/login"} replace />;
  
  return <Outlet />;
};

// Protected route wrapper for hiring team routes
const HiringRoute = () => {
  const { user, loading, userType } = useAuth();
  
  if (loading) return <LoadingFallback />;
  
  if (!user) return <Navigate to="/login" replace />;
  if (userType !== 'hiring') return <Navigate to={userType === 'candidate' ? "/candidate/dashboard" : "/login"} replace />;
  
  return <Outlet />;
};

// Auth wrapper to redirect if already logged in
const AuthRoute = () => {
  const { user, loading, userType } = useAuth();
  
  if (loading) return <LoadingFallback />;
  
  if (user && userType) {
    return <Navigate to={userType === 'candidate' ? "/candidate/dashboard" : "/hiring/dashboard"} replace />;
  }
  
  return <Outlet />;
};

const AppRoutes = () => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        
        {/* Static pages */}
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        
        {/* Auth routes */}
        <Route element={<AuthRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
        
        {/* Candidate Routes */}
        <Route element={<CandidateRoute />}>
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/jobs" element={<CandidateJobs />} />
          <Route path="/candidate/jobs/:jobId" element={<CandidateJobDetails />} />
          <Route path="/candidate/applications" element={<Applications />} />
          <Route path="/candidate/settings" element={<NotFound />} />
          <Route path="/candidate/jobs/:jobId/apply" element={<ApplyJob />} />
          <Route path="/candidate/interview/:jobId/setup" element={<InterviewSetup />} />
          <Route path="/candidate/interview/:jobId" element={<InterviewPortal />} />
          <Route path="/candidate/interviews" element={<Interviews />} />
        </Route>
        
        {/* Hiring Team Routes */}
        <Route element={<HiringRoute />}>
          <Route path="/hiring" element={<HiringLayout />}>
            <Route index element={<HiringDashboard />} />
            <Route path="dashboard" element={<HiringDashboard />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/new" element={<CreateJob />} />
            <Route path="jobs/:jobId" element={<JobDetails />} />
            <Route path="jobs/:jobId/applications" element={<JobApplications />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
