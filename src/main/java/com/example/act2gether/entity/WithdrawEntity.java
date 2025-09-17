package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import com.example.act2gether.dto.WithdrawDTO;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "withdraw")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WithdrawEntity {
    @Id 
    @Column(name = "withdraw_id")
    private String withdrawId;

    private String reason;

    private String detail;

    @Column(name = "created_at")
    private String createdAt;

    public static WithdrawEntity of(WithdrawDTO withdrawDTO) {
        return WithdrawEntity.builder()
        .withdrawId(UUID.randomUUID().toString())
        .reason(withdrawDTO.getReason())
        .detail(withdrawDTO.getDetail())
        .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .build();
    }
}
