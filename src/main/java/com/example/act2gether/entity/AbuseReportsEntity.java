package com.example.act2gether.entity;

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
    private String report_id; 
    private String reporter_user_id;
    private String target_post_id; 
    private String target_user_id; 
    private String report_type;
    private String reason;
    private String process_status;
    private String reported_at;
    private String resolved_at;
}
