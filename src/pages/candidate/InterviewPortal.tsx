import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Video, Mic, MicOff, VideoOff, Send, CheckCircle, XCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useJob } from "@/hooks/useJob";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useInterview } from "@/hooks/useInterview";

interface Question {
  id: string;
  text: string;
  type: 'technical' | 'behavioral' | 'general';
}

interface InterviewQuestion {
  id: string;
  question: string;
  type: 'technical' | 'behavioral' | 'situational';
  answer?: string;
  evaluation?: {
    score: number;
    feedback: string;
  };
}

interface InterviewEvaluation {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
}

const InterviewPortal = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { job } = useJob(jobId || '');
  const { toast } = useToast();
  const { questions, generateQuestions, saveResponse, evaluation } = useInterview(jobId || '', user?.id || '');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!jobId || !user) {
      navigate('/candidate/jobs');
      return;
    }

    // Check if interview is scheduled
    const checkInterviewStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', jobId)
          .eq('candidate_id', user.id)
          .single();

        if (error) throw error;

        if (data.status !== 'interview_scheduled') {
          toast({
            title: "No Interview Scheduled",
            description: "You don't have any scheduled interviews for this position.",
            variant: "destructive",
          });
          navigate('/candidate/jobs');
          return;
        }

        // Generate questions if not already generated
        if (questions.length === 0) {
          await generateQuestions();
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error checking interview status:', err);
        toast({
          title: "Error",
          description: "Failed to load interview details. Please try again.",
          variant: "destructive",
        });
        navigate('/candidate/jobs');
      }
    };

    checkInterviewStatus();
  }, [jobId, user, navigate, toast, questions.length, generateQuestions]);

  useEffect(() => {
    if (videoRef.current && isVideoEnabled) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          videoRef.current!.srcObject = stream;
        })
        .catch(err => {
          console.error('Error accessing media devices:', err);
          toast({
            title: "Camera Access Error",
            description: "Please ensure you have granted camera and microphone permissions.",
            variant: "destructive",
          });
        });
    }
  }, [isVideoEnabled, toast]);

  useEffect(() => {
    if (questions.length > 0) {
      setCurrentQuestion(questions[0]);
    }
  }, [questions]);

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob);
      formData.append('questionId', questions[currentQuestionIndex].id);
      formData.append('candidateId', user?.id || '');
      formData.append('jobId', jobId || '');

      try {
        // Upload video to storage
        const fileName = `${user?.id}/${jobId}/${questions[currentQuestionIndex].id}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('interview-responses')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        // Save response to database
        await saveResponse(questions[currentQuestionIndex].id, fileName);

        // Move to next question or complete interview
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          setInterviewComplete(true);
        }
      } catch (err) {
        console.error('Error saving response:', err);
        toast({
          title: "Error",
          description: "Failed to save your response. Please try again.",
          variant: "destructive",
        });
      }
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const initializeInterview = async () => {
    try {
      // Fetch job details and generate questions
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Generate questions based on job requirements
      await generateQuestions();
      setIsLoading(false);

      // Initialize media stream
      await initializeMediaStream();
    } catch (error) {
      console.error('Error initializing interview:', error);
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const initializeMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Error",
        description: "Failed to access camera/microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const uploadRecording = async (blob: Blob) => {
    try {
      const fileName = `${user?.id}-${currentQuestion?.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('interview-recordings')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Move to next question or complete interview
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setCurrentQuestion(questions[currentIndex + 1]);
        setProgress(((currentIndex + 1) / questions.length) * 100);
      } else {
        await completeInterview();
      }
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const completeInterview = async () => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'interview_completed' })
        .eq('job_id', jobId)
        .eq('candidate_id', user?.id);

      if (updateError) throw updateError;

      setIsComplete(true);
      // Generate AI feedback
      const aiFeedback = await generateFeedback();
      setFeedback(aiFeedback);
    } catch (error) {
      console.error('Error completing interview:', error);
      toast({
        title: "Error",
        description: "Failed to complete interview. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const generateFeedback = async () => {
    // This would typically call an AI service to analyze the interview
    return "Thank you for completing the interview. Your responses will be reviewed by our team.";
  };

  if (isLoading) {
    return (
      <DashboardLayout userType="candidate" currentPath="/candidate/interviews">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </DashboardLayout>
    );
  }

  if (isComplete) {
    return (
      <DashboardLayout userType="candidate" currentPath="/candidate/interviews">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">{feedback}</p>
              <Button onClick={() => navigate('/candidate/jobs')}>
                Return to Jobs
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="candidate" currentPath="/candidate/interviews">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Interview</CardTitle>
            <CardDescription>
              Question {currentIndex + 1} of {questions.length}
            </CardDescription>
            <Progress value={progress} className="mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Avatar className="w-16 h-16 border-2 border-white">
                      <AvatarImage src="/ai-avatar.png" alt="AI Interviewer" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="w-full"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Question</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg">{currentQuestion?.question}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Badge variant="outline">
                        {currentQuestion?.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InterviewPortal; 