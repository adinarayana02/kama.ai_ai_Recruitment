-- Create interview_questions table
CREATE TABLE interview_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN ('technical', 'behavioral', 'situational')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
-- Create interview_responses table
CREATE TABLE interview_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question_id UUID REFERENCES interview_questions(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
-- Create interview_evaluations table
CREATE TABLE interview_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (
        overall_score >= 0
        AND overall_score <= 100
    ),
    technical_score INTEGER NOT NULL CHECK (
        technical_score >= 0
        AND technical_score <= 100
    ),
    communication_score INTEGER NOT NULL CHECK (
        communication_score >= 0
        AND communication_score <= 100
    ),
    problem_solving_score INTEGER NOT NULL CHECK (
        problem_solving_score >= 0
        AND problem_solving_score <= 100
    ),
    feedback TEXT NOT NULL,
    strengths TEXT [] NOT NULL,
    areas_for_improvement TEXT [] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
-- Add RLS policies
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_evaluations ENABLE ROW LEVEL SECURITY;
-- Policies for interview_questions
CREATE POLICY "Interview questions are viewable by authenticated users" ON interview_questions FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Interview questions are insertable by hiring team" ON interview_questions FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'hiring_team'
        )
    );
-- Policies for interview_responses
CREATE POLICY "Interview responses are viewable by hiring team and the candidate" ON interview_responses FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'hiring_team'
        )
        OR EXISTS (
            SELECT 1
            FROM applications
            WHERE applications.id = interview_responses.application_id
                AND applications.candidate_id = auth.uid()
        )
    );
CREATE POLICY "Interview responses are insertable by candidates" ON interview_responses FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM applications
            WHERE applications.id = interview_responses.application_id
                AND applications.candidate_id = auth.uid()
        )
    );
-- Policies for interview_evaluations
CREATE POLICY "Interview evaluations are viewable by hiring team and the candidate" ON interview_evaluations FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'hiring_team'
        )
        OR candidate_id = auth.uid()
    );
CREATE POLICY "Interview evaluations are insertable by hiring team" ON interview_evaluations FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'hiring_team'
        )
    );
-- Create storage bucket for interview videos
INSERT INTO storage.buckets (id, name, public)
VALUES (
        'interview-responses',
        'interview-responses',
        false
    );
-- Storage policies for interview videos
CREATE POLICY "Interview videos are accessible by hiring team and the candidate" ON storage.objects FOR
SELECT TO authenticated USING (
        bucket_id = 'interview-responses'
        AND (
            EXISTS (
                SELECT 1
                FROM profiles
                WHERE profiles.id = auth.uid()
                    AND profiles.role = 'hiring_team'
            )
            OR EXISTS (
                SELECT 1
                FROM interview_responses
                WHERE interview_responses.video_url = storage.objects.name
                    AND interview_responses.application_id IN (
                        SELECT id
                        FROM applications
                        WHERE candidate_id = auth.uid()
                    )
            )
        )
    );
CREATE POLICY "Interview videos are uploadable by candidates" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (
        bucket_id = 'interview-responses'
        AND EXISTS (
            SELECT 1
            FROM applications
            WHERE applications.candidate_id = auth.uid()
                AND applications.id::text = (storage.foldername(name)) [1]
        )
    );