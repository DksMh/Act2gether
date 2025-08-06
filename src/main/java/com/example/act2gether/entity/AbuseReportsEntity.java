package com.example.act2gether.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "abuse_reports")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AbuseReportsEntity {
    @Id
    @Column(name = "report_id")
    private String reportId; 

    @Column(name = "reporter_user_id")
    private String reporterUserId;

    @Column(name = "target_post_id")
    private String targetPostId; 

    @Column(name = "target_user_id")
    private String targetUserId; 

    @Column(name = "report_type")
    private String reportType;

    private String reason;

    @Column(name = "process_status")
    private String process_status;

    @Column(name = "reported_at")
    private String reportedAt;

    @Column(name = "resolved_at")
    private String resolvedAt;
}
