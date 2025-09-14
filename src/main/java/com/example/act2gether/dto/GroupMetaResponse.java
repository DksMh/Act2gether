package com.example.act2gether.dto;

public record GroupMetaResponse(
    String groupId,
        String title,
        String description,
        String departureRegion,    // "2024.11.30"
        String flexible,      // "2024.12.10"
        String noLimit, // "2024.11.30~12.10"
        String startDate,
        String endDate,
        String schedule,
        String genderPolicy,
        long   members
      
) {

}
