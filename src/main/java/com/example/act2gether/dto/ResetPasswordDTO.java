package com.example.act2gether.dto;

import lombok.Data;

@Data
public class ResetPasswordDTO {
    private String email;
    private String newPassword;
}
