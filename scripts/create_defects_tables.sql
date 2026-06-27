CREATE TABLE IF NOT EXISTS defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_defect TEXT NOT NULL,
    purchase_date VARCHAR(50),
    current_mileage INTEGER,
    make VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    primary_decision VARCHAR(50),
    primary_component VARCHAR(255),
    primary_coverage_id VARCHAR(50),
    overall_confidence_score FLOAT,
    context_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS defect_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    evidence_json JSONB DEFAULT '[]'::jsonb,
    confidence_score FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defects_document_id ON defects(document_id);
CREATE INDEX IF NOT EXISTS idx_defects_created_by ON defects(created_by);
CREATE INDEX IF NOT EXISTS idx_defect_messages_defect_id ON defect_messages(defect_id);
