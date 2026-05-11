-- CreateIndex
CREATE INDEX "email_activity_logs_attempt_status_retry_count_createdAt_idx" ON "email_activity_logs"("attempt_status", "retry_count", "createdAt");
