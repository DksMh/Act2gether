package com.example.act2gether.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExperienceDTO {
  private String id;
  private String title;
  private String description;
  private String meta;
}