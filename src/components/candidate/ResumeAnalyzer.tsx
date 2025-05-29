import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, FileText, Check, AlertCircle, Star, Briefcase, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeResume } from "@/services/openai";
import { Progress } from "@/components/ui/progress";

interface ResumeAnalysisResult {
  skills: string[];
  experienceYears: number;
  recommendedJobs: string[];
  improvements: string[];
  skillMatch: number;
  experienceMatch: number;
  overallScore: number;
}

const ResumeAnalyzer = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  
  // This is a mock function to simulate file reading
  // In a real application, you would use actual file reading APIs
  const parseResumeText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`
          SARAH JOHNSON
          Software Engineer
          
          CONTACT
          Email: sarah.johnson@example.com
          Phone: (555) 123-4567
          Location: San Francisco, CA
          
          PROFESSIONAL SUMMARY
          Passionate software engineer with 5+ years of experience in React, TypeScript, and Node.js development. Specialized in creating intuitive user experiences and scalable applications in both startup and enterprise environments.
          
          SKILLS
          Technical: React.js, TypeScript, Node.js, JavaScript, HTML/CSS, GraphQL, Redux, REST APIs
          Soft Skills: Team leadership, project management, mentoring, agile methodologies
          
          EXPERIENCE
          Senior Frontend Developer
          TechStart Inc., San Francisco, CA
          January 2021 - Present
          - Lead developer for the company's main SaaS product
          - Managed a team of 3 frontend engineers
          - Implemented CI/CD pipeline that reduced deployment time by 40%
          - Refactored legacy codebase to React hooks, improving performance by 30%
          
          Frontend Developer
          WebSolutions Co., San Francisco, CA
          March 2018 - December 2020
          - Developed responsive web applications using React.js and Redux
          - Built reusable component library used across multiple projects
          - Collaborated with UX team to implement design system
          
          EDUCATION
          B.S. Computer Science
          University of California, Berkeley
          2014 - 2018
        `);
      }, 1500);
    });
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadedFileName(file.name);
      
      // In a real app, you'd extract text from the resume file
      // For this demo, we're using a mock function
      const resumeText = await parseResumeText(file);
      
      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully."
      });
      
      // Now analyze the resume
      setIsAnalyzing(true);
      const analysis = await analyzeResume(resumeText);
      setAnalysisResult({
        ...analysis,
        skillMatch: 85,
        experienceMatch: 90,
        overallScore: 88
      });
      
      toast({
        title: "Analysis complete",
        description: "Your resume has been analyzed by AI."
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive"
      });
      console.error("Resume upload error:", error);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>
            Upload your resume for AI-powered analysis and job matching
          </CardDescription>
        </div>
        <FileText className="h-5 w-5 text-brand-blue" />
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFileName && !analysisResult && (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium">Upload your resume</h3>
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, DOCX (Max 5MB)
              </p>
              <div className="mt-4">
                <label htmlFor="resume-upload">
                  <div className="inline-flex">
                    <Button
                      variant="default"
                      className={isUploading ? "pointer-events-none" : ""}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Select File
                        </>
                      )}
                    </Button>
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {uploadedFileName && isAnalyzing && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
            <div className="text-center">
              <h3 className="font-medium">Analyzing your resume</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our AI is extracting your skills and experience...
              </p>
            </div>
          </div>
        )}
        
        {analysisResult && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-md px-3 py-2">
              <Check className="h-5 w-5" />
              <span>Resume analyzed successfully</span>
            </div>
            
            {/* Overall Score */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Overall Resume Score</h3>
                <Badge variant="secondary" className="bg-white">
                  {analysisResult.overallScore}%
                </Badge>
              </div>
              <Progress value={analysisResult.overallScore} className="h-2" />
            </div>
            
            {/* Skills Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">SKILLS MATCH</h3>
                <Badge variant="secondary">{analysisResult.skillMatch}%</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysisResult.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Experience Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">EXPERIENCE MATCH</h3>
                <Badge variant="secondary">{analysisResult.experienceMatch}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{analysisResult.experienceYears} years of experience</span>
              </div>
            </div>
            
            {/* Recommended Jobs */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">RECOMMENDED JOBS</h3>
              <div className="space-y-2">
                {analysisResult.recommendedJobs.map((job, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{job}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Improvement Tips */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">IMPROVEMENT TIPS</h3>
              <div className="space-y-2">
                {analysisResult.improvements.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-amber-800">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setUploadedFileName(null);
                  setAnalysisResult(null);
                }}
              >
                Upload a Different Resume
              </Button>
              <Button 
                className="flex-1 bg-brand-blue hover:bg-brand-blue/90"
                onClick={() => {
                  // Navigate to jobs page with skills filter
                  window.location.href = '/candidate/jobs';
                }}
              >
                <Zap className="mr-2 h-4 w-4" />
                Find Matching Jobs
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResumeAnalyzer;
