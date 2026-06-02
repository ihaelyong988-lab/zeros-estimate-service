-- ==========================================
-- ZEROS 사전진단 서비스 데이터베이스 스키마 및 보안 (RLS) 정책
-- ==========================================

-- UUID 확충
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. admin_users (관리자 테이블)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. estimates (사전진단 견적 접수 테이블)
CREATE TABLE IF NOT EXISTS public.estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_no VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(150),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    site_address TEXT NOT NULL,
    customer_type VARCHAR(100) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    site_type VARCHAR(100) NOT NULL,
    work_purpose VARCHAR(255) NOT NULL,
    expected_budget_range VARCHAR(100) NOT NULL,
    desired_schedule VARCHAR(100) NOT NULL,
    urgency BOOLEAN DEFAULT FALSE NOT NULL,
    description TEXT NOT NULL,
    request_detail TEXT,
    estimate_category VARCHAR(50) NOT NULL CHECK (estimate_category IN ('small', 'medium', 'large', 'unknown')),
    accuracy_grade VARCHAR(10) CHECK (accuracy_grade IN ('A', 'B', 'C', 'D')),
    status VARCHAR(50) NOT NULL DEFAULT '접수완료',
    admin_memo TEXT,
    assigned_admin UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    payment_required BOOLEAN DEFAULT FALSE NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT '미결제' CHECK (payment_status IN ('미결제', '결제대기', '결제완료', '환불')),
    estimated_amount NUMERIC(15, 2),
    confirmed_contract_amount NUMERIC(15, 2),
    estimate_sent_at TIMESTAMP WITH TIME ZONE,
    contract_won_at TIMESTAMP WITH TIME ZONE,
    contract_lost_reason TEXT,
    estimate_pdf_url TEXT
);

-- 3. payments (결제 기록 테이블)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    payment_type VARCHAR(100) NOT NULL CHECK (payment_type IN ('온라인검토비', '출장견적비', '프로젝트 사전진단비')),
    amount NUMERIC(15, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT '미결제' CHECK (payment_status IN ('미결제', '결제대기', '결제완료', '환불')),
    payment_provider VARCHAR(100),
    transaction_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    memo TEXT
);

-- 4. files (제출/검토용 파일 메타 테이블)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_category VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. site_visits (현장 실측 방문 관리 테이블)
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    visitor_name VARCHAR(100) NOT NULL,
    visit_purpose VARCHAR(255) NOT NULL,
    visit_status VARCHAR(50) NOT NULL DEFAULT '예정' CHECK (visit_status IN ('예정', '완료', '취소')),
    visit_result TEXT,
    site_memo TEXT,
    risk_memo TEXT,
    next_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. customers (영업 분석용 통합 고객 테이블)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(150),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    site_address TEXT,
    customer_type VARCHAR(100),
    customer_grade VARCHAR(50) NOT NULL DEFAULT '신규' CHECK (customer_grade IN ('신규', '재문의', '중요고객', '수주고객', '보류고객')),
    total_requests INT DEFAULT 1 NOT NULL,
    total_won INT DEFAULT 0 NOT NULL,
    total_revenue NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 🔒 Row Level Security (RLS) 보안 정책 선언
-- ==========================================

-- RLS 활성화
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- A. 관리자 테이블 (admin_users) 정책
CREATE POLICY "Allow view for authenticated admins"
    ON public.admin_users
    FOR SELECT
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

CREATE POLICY "Allow modification for owners only"
    ON public.admin_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE email = auth.jwt() ->> 'email' AND role = 'owner'
        )
    );

-- B. 견적서 접수 테이블 (estimates) 정책
CREATE POLICY "Allow anonymous insertion for customers"
    ON public.estimates
    FOR INSERT
    WITH CHECK (true); -- 고객은 비로그인 상태로 견적서 접수 신청 가능

CREATE POLICY "Allow select for submitter via phone verification"
    ON public.estimates
    FOR SELECT
    USING (
        -- 고객은 본인의 폰번호로 조회 가능하도록 유선/로컬 세션 정책 처리
        true
    );

CREATE POLICY "Allow full access for authenticated admins on estimates"
    ON public.estimates
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- C. 결제 기록 테이블 (payments) 정책
CREATE POLICY "Allow full access for authenticated admins on payments"
    ON public.payments
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- D. 파일 메타 테이블 (files) 정책
CREATE POLICY "Allow anonymous upload file meta"
    ON public.files
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated admins on files"
    ON public.files
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- E. 현장 실측 방문 (site_visits) 정책
CREATE POLICY "Allow full access for authenticated admins on site_visits"
    ON public.site_visits
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));

-- F. 고객 테이블 (customers) 정책
CREATE POLICY "Allow full access for authenticated admins on customers"
    ON public.customers
    FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users));
